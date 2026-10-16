/**
 * TASK-11 integration contract tests: Wallet gateway ↔ demo API ↔ Verifier gateway.
 * Typed contracts, session ids, organisation boundaries, state transitions, error responses,
 * retry behaviour, credential restrictions, privacy of withheld claims, reset, and the
 * demo/protocol boundary. Real demo HTTP server, synthetic data only.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createTransport, createVerifierGateway, createWalletGateway, describeError, type VerifierGateway, type WalletGateway } from '@iqdid/api-client';
import { DEMO_API_PREFIX, isDemoVerificationSession, isTerminalStatus, previewDemoDisclosure, type DemoSessionStatus } from '@iqdid/shared-types';
import { startDemoServer, type RunningDemoServer } from '@iqdid/mock-services';

let srv: RunningDemoServer;
let wallet: WalletGateway;
let verifier: VerifierGateway;
const raw = (path: string, init?: RequestInit) => fetch(`${srv.url}${DEMO_API_PREFIX}${path}`, init);
const create = (purpose: string, organizationId = 'org-test-a', templateId: 'AGE_OVER_18' | 'IDENTITY_BASIC' = 'AGE_OVER_18') => verifier.createSession({ organizationId, templateId, purpose });
const PROTOCOL = /VERIFIED|verified|protocol|signature|proof/;

beforeAll(async () => {
  srv = await startDemoServer({ port: 0, ttlMs: 120_000 });
  const t = createTransport('demo', { baseUrl: srv.url, retries: 0 });
  wallet = createWalletGateway(t);
  verifier = createVerifierGateway(t);
});
afterAll(async () => { await srv.close(); });
beforeEach(() => srv.store.reset(false));

describe('journey contract (verifier → wallet → verifier)', () => {
  it('one session id links both sides; both histories record each step with the same session id', async () => {
    const s = await create('فتح حساب مصرفي تجريبي', 'org-test-a', 'IDENTITY_BASIC');
    expect(s.status).toBe('PENDING');
    const inWallet = await wallet.request(s.id);
    expect(inWallet).toEqual(s);
    expect((await wallet.requests()).map((r) => r.id)).toContain(s.id);
    expect(inWallet.disclosed).toBeNull();
    const decided = await wallet.decide(s.id, 'ACCEPT');
    const seen = await verifier.session(s.id, 'org-test-a');
    expect(seen).toEqual(decided);
    expect(seen.status).toBe('DEMO_ACCEPTED');
    const walletLog = (await wallet.activity()).filter((e) => e.sessionId === s.id).map((e) => e.type);
    const orgLog = (await verifier.activity('org-test-a')).filter((e) => e.sessionId === s.id).map((e) => e.type);
    expect(walletLog).toEqual(['CONSENT_ACCEPTED', 'REQUEST_CREATED']);
    expect(orgLog).toEqual(['CONSENT_ACCEPTED', 'REQUEST_CREATED']);
  });
});

describe('state transitions', () => {
  const reach = async (target: 'DEMO_ACCEPTED' | 'DEMO_REJECTED' | 'CANCELLED'): Promise<string> => {
    const s = await create(`حالة ${target}`);
    if (target === 'DEMO_ACCEPTED') await wallet.decide(s.id, 'ACCEPT');
    if (target === 'DEMO_REJECTED') await wallet.decide(s.id, 'REJECT');
    if (target === 'CANCELLED') await verifier.cancelSession(s.id, 'org-test-a');
    return s.id;
  };

  it.each(['DEMO_ACCEPTED', 'DEMO_REJECTED', 'CANCELLED'] as const)('%s is terminal: no decision or cancel changes it', async (target) => {
    const id = await reach(target);
    const before = await verifier.session(id, 'org-test-a');
    expect(isTerminalStatus(before.status)).toBe(true);
    for (const d of ['ACCEPT', 'REJECT'] as const) await expect(wallet.decide(id, d)).rejects.toMatchObject({ status: 409, code: 'SESSION_ALREADY_DECIDED' });
    await expect(verifier.cancelSession(id, 'org-test-a')).rejects.toMatchObject({ status: 409, code: 'SESSION_ALREADY_DECIDED' });
    expect(await verifier.session(id, 'org-test-a')).toEqual(before);
  });

  it('EXPIRED is terminal and reported as SESSION_EXPIRED to late decisions and cancels', async () => {
    const short = await startDemoServer({ port: 0, ttlMs: 300 });
    try {
      const t = createTransport('demo', { baseUrl: short.url, retries: 0 });
      const v = createVerifierGateway(t), w = createWalletGateway(t);
      const s = await v.createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'ينتهي' });
      await new Promise((r) => setTimeout(r, 450));
      expect((await v.session(s.id, 'org-test-a')).status).toBe('EXPIRED');
      await expect(w.decide(s.id, 'ACCEPT')).rejects.toMatchObject({ status: 409, code: 'SESSION_EXPIRED' });
      await expect(w.decide(s.id, 'REJECT')).rejects.toMatchObject({ status: 409, code: 'SESSION_EXPIRED' });
      await expect(v.cancelSession(s.id, 'org-test-a')).rejects.toMatchObject({ status: 409, code: 'SESSION_EXPIRED' });
      expect((await v.activity('org-test-a')).filter((e) => e.type === 'SESSION_EXPIRED')).toHaveLength(1);
    } finally { await short.close(); }
  });

  it('duplicate decision: two concurrent decisions → exactly one wins, the other gets 409', async () => {
    const s = await create('قرار مكرر');
    const results = await Promise.allSettled([wallet.decide(s.id, 'ACCEPT'), wallet.decide(s.id, 'REJECT'), wallet.decide(s.id, 'ACCEPT')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const r of results.filter((x) => x.status === 'rejected')) expect((r as PromiseRejectedResult).reason).toMatchObject({ code: 'SESSION_ALREADY_DECIDED' });
    const winner = (results.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ status: DemoSessionStatus }>).value.status;
    expect((await verifier.session(s.id, 'org-test-a')).status).toBe(winner);
    expect((await wallet.activity()).filter((e) => e.sessionId === s.id && e.type.startsWith('CONSENT_'))).toHaveLength(1);
  });
});

describe('organisation boundaries', () => {
  it('organisation B cannot list, read, cancel or see activity of organisation A sessions', async () => {
    const a = await create('خاص بالمؤسسة أ');
    const b = await create('خاص بالمؤسسة ب', 'org-test-b');
    expect((await verifier.sessions('org-test-b')).map((s) => s.id)).toEqual([b.id]);
    expect((await verifier.sessions('org-test-a')).map((s) => s.id)).toEqual([a.id]);
    await expect(verifier.session(a.id, 'org-test-b')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    await expect(verifier.cancelSession(a.id, 'org-test-b')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect((await verifier.session(a.id, 'org-test-a')).status).toBe('PENDING');
    expect((await verifier.activity('org-test-b')).some((e) => e.sessionId === a.id || e.organizationId === 'org-test-a')).toBe(false);
    // the citizen wallet sees both requests, each with its own organisation
    expect((await wallet.requests()).map((r) => r.organizationName).sort()).toEqual(['شركة اتصالات تجريبية (ب)', 'مصرف تجريبي (أ)'].sort());
  });

  it('a missing or unknown organisation id is rejected, never answered with all sessions', async () => {
    await create('لا يُكشف');
    expect((await raw('/verifier/sessions')).status).toBe(400);
    expect(await (await raw('/verifier/sessions?organizationId=org-unknown')).json()).toEqual([]);
    expect((await raw('/verifier/activity')).status).toBe(400);
    expect((await raw('/verifier/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId: 'org-unknown', templateId: 'AGE_OVER_18', purpose: 'مؤسسة غير موجودة' }) })).status).toBe(404);
  });
});

describe('credential restrictions (Scenario G)', () => {
  it.each(['SUSPENDED', 'REVOKED'] as const)('a %s national ID cannot approve; reject still works; state stays PENDING after the refused approval', async (status) => {
    const restricted = await startDemoServer({ port: 0, credentialStatus: status });
    try {
      const t = createTransport('demo', { baseUrl: restricted.url, retries: 0 });
      const v = createVerifierGateway(t), w = createWalletGateway(t);
      expect((await w.credentials()).find((c) => c.type === 'DEMO_NATIONAL_ID')?.status).toBe(status);
      const s = await v.createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'اعتماد غير فعال' });
      const refused = await w.decide(s.id, 'ACCEPT').catch((e: unknown) => e);
      expect(refused).toMatchObject({ status: 409, code: 'CREDENTIAL_NOT_ACTIVE' });
      expect(describeError(refused)).toBe('الاعتماد التجريبي غير فعال، لا يمكن الموافقة.');
      expect((await v.session(s.id, 'org-test-a')).status).toBe('PENDING');
      expect((await w.decide(s.id, 'REJECT')).status).toBe('DEMO_REJECTED');
      restricted.store.reset();
      expect((await w.credentials()).find((c) => c.type === 'DEMO_NATIONAL_ID')?.status).toBe(status);
    } finally { await restricted.close(); }
  });

  it('display-only credentials never answer a request; only the national ID is projected', async () => {
    const s = await create('هوية أساسية', 'org-test-a', 'IDENTITY_BASIC');
    const decided = await wallet.decide(s.id, 'ACCEPT');
    const all = await wallet.credentials();
    const others = all.filter((c) => c.type !== 'DEMO_NATIONAL_ID').flatMap((c) => c.claims.map((x) => x.value));
    expect(others.length).toBeGreaterThan(0);
    for (const v of others) expect(JSON.stringify(decided)).not.toContain(v);
  });

  it('the demo server refuses an invalid DEMO_CREDENTIAL_STATUS at start-up', () => {
    const r = spawnSync(process.execPath, ['packages/mock-services/src/server-main.ts'], { env: { ...process.env, DEMO_CREDENTIAL_STATUS: 'VERIFIED', DEMO_PORT: '0' }, encoding: 'utf8', timeout: 20_000 });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('DEMO_CREDENTIAL_STATUS must be one of ACTIVE, SUSPENDED, REVOKED');
  });
});

describe('privacy of withheld claims (Scenario H)', () => {
  it('before a decision neither side receives claim values; after ACCEPT only the requested fields leave the wallet', async () => {
    const s = await create('العمر فقط', 'org-test-a', 'AGE_OVER_18');
    const id = (await wallet.credentials()).find((c) => c.type === 'DEMO_NATIONAL_ID');
    if (!id) throw new Error('national ID missing');
    const withheld = id.claims.filter((c) => c.key !== 'age_over_18').map((c) => c.value);
    for (const body of [await (await raw(`/verifier/sessions/${s.id}?organizationId=org-test-a`)).text(), await (await raw(`/wallet/requests/${s.id}`)).text()]) {
      for (const v of id.claims.map((c) => c.value)) expect(body).not.toContain(`"${v}"`);
    }
    await wallet.decide(s.id, 'ACCEPT');
    const verifierText = await (await raw(`/verifier/sessions/${s.id}?organizationId=org-test-a`)).text();
    const activityText = await (await raw('/verifier/activity?organizationId=org-test-a')).text();
    for (const v of withheld) {
      expect(verifierText).not.toContain(v);
      expect(activityText).not.toContain(v);
    }
    const seen = await verifier.session(s.id, 'org-test-a');
    expect(seen.disclosed).toEqual(previewDemoDisclosure(s, id));
    expect(seen.disclosed?.map((c) => c.key)).toEqual(['age_over_18']);
  });

  it('a rejection releases nothing', async () => {
    const s = await create('هوية', 'org-test-a', 'IDENTITY_BASIC');
    expect((await wallet.decide(s.id, 'REJECT')).disclosed).toBeNull();
    expect((await verifier.session(s.id, 'org-test-a')).disclosed).toBeNull();
  });
});

describe('error responses and retry behaviour', () => {
  it('every error has {error:{code,message,requestId}} and echoes the correlation id', async () => {
    const cases: Array<[string, RequestInit | undefined, number, string]> = [
      ['/verifier/sessions/missing-id?organizationId=org-test-a', undefined, 404, 'NOT_FOUND'],
      ['/nope', undefined, 404, 'NOT_FOUND'],
      ['/verifier/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"organizationId":"org-test-a"}' }, 400, 'BAD_REQUEST'],
      ['/wallet/requests/missing-id/decision', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"decision":"MAYBE"}' }, 400, 'BAD_REQUEST'],
    ];
    for (const [path, init, status, code] of cases) {
      const res = await raw(path, { ...init, headers: { ...(init?.headers ?? {}), 'X-Request-Id': 'contract-test-0001' } });
      expect(res.status).toBe(status);
      const body = await res.json() as { error: { code: string; message: string; requestId: string } };
      expect(body.error).toMatchObject({ code, requestId: 'contract-test-0001' });
      expect(typeof body.error.message).toBe('string');
      expect(res.headers.get('x-request-id')).toBe('contract-test-0001');
    }
  });

  it('GETs are retried on transient network failure; POSTs (decisions, creation) are never retried', async () => {
    let calls = 0;
    const flaky: typeof fetch = (input, init) => { calls += 1; return calls === 1 ? Promise.reject(new TypeError('Failed to fetch')) : fetch(input, init); };
    const t = createTransport('demo', { baseUrl: srv.url, retries: 2, retryDelayMs: 1, fetchImpl: flaky });
    expect(await createVerifierGateway(t).organizations()).toHaveLength(2);
    expect(calls).toBe(2);
    let posts = 0;
    const down: typeof fetch = () => { posts += 1; return Promise.reject(new TypeError('Failed to fetch')); };
    const t2 = createTransport('demo', { baseUrl: srv.url, retries: 2, retryDelayMs: 1, fetchImpl: down });
    await expect(createVerifierGateway(t2).createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'لا يُعاد' })).rejects.toMatchObject({ kind: 'network' });
    expect(posts).toBe(1);
    const s = await create('قرار لا يُعاد');
    posts = 0;
    await expect(createWalletGateway(t2).decide(s.id, 'ACCEPT')).rejects.toMatchObject({ kind: 'network' });
    expect(posts).toBe(1);
    expect((await verifier.session(s.id, 'org-test-a')).status).toBe('PENDING');
  });
});

describe('reset and demo/protocol boundary', () => {
  it('reset clears sessions and history for both apps and is visible to both', async () => {
    await create('سيُحذف');
    await create('سيُحذف ب', 'org-test-b');
    await verifier.resetDemo();
    expect(await wallet.requests()).toEqual([]);
    expect(await verifier.sessions('org-test-a')).toEqual([]);
    expect((await wallet.activity()).map((e) => e.type)).toEqual(['DEMO_RESET']);
    expect((await verifier.activity('org-test-b')).map((e) => e.type)).toEqual(['DEMO_RESET']);
  });

  it('no API response in the full journey carries a protocol-verification field or value', async () => {
    const s = await create('حدود البروتوكول', 'org-test-a', 'IDENTITY_BASIC');
    await wallet.decide(s.id, 'ACCEPT');
    for (const path of [`/verifier/sessions/${s.id}?organizationId=org-test-a`, '/verifier/sessions?organizationId=org-test-a', `/wallet/requests/${s.id}`, '/wallet/requests', '/wallet/activity', '/verifier/activity?organizationId=org-test-a']) {
      const text = await (await raw(path)).text();
      expect(text).not.toMatch(PROTOCOL);
    }
    const session = await verifier.session(s.id, 'org-test-a');
    expect(Object.keys(session).sort()).toEqual(['createdAt', 'decidedAt', 'disclosed', 'expiresAt', 'holderRef', 'id', 'organizationId', 'organizationName', 'purpose', 'requestedFields', 'shortCode', 'status', 'templateId']);
    expect(isDemoVerificationSession({ ...session, verified: true })).toBe(false);
  });
});
