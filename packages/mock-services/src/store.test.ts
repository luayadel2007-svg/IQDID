import { describe, expect, it } from 'vitest';
import { DemoStore } from './store.ts';

const setup = (opts: ConstructorParameters<typeof DemoStore>[0] = {}) => {
  let t = Date.parse('2026-10-14T10:00:00Z');
  let n = 0;
  const store = new DemoStore({ now: () => t, newId: () => `id-${String(++n).padStart(4, '0')}`, ttlMs: 120_000, ...opts });
  return { store, advance: (ms: number) => (t += ms) };
};
const req = { organizationId: 'org-test-a', templateId: 'AGE_OVER_18' as const, purpose: 'فتح حساب مصرفي تجريبي' };

describe('DemoStore', () => {
  it('creates a pending session visible to the wallet and the creating organisation only', () => {
    const { store } = setup();
    const s = store.createSession(req);
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.value.status).toBe('PENDING');
    expect(store.walletRequests().map((r) => r.id)).toEqual([s.value.id]);
    expect(store.listSessionsForOrg('org-test-a')).toHaveLength(1);
    expect(store.listSessionsForOrg('org-test-b')).toHaveLength(0);
    expect(store.getSessionForOrg(s.value.id, 'org-test-b')).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });

  it('accept releases only requested synthetic fields and logs for both sides', () => {
    const { store } = setup();
    const s = store.createSession({ ...req, templateId: 'IDENTITY_BASIC' });
    if (!s.ok) throw new Error('setup');
    const d = store.decide(s.value.id, 'ACCEPT');
    expect(d).toMatchObject({ ok: true, value: { status: 'DEMO_ACCEPTED' } });
    if (!d.ok) return;
    expect(d.value.disclosed?.map((c) => c.key)).toEqual(['full_name', 'birth_date', 'document_number']);
    expect(store.activityForHolder().map((e) => e.type)).toEqual(['CONSENT_ACCEPTED', 'REQUEST_CREATED']);
    expect(store.activityForOrg('org-test-a').map((e) => e.type)).toEqual(['CONSENT_ACCEPTED', 'REQUEST_CREATED']);
    expect(store.activityForOrg('org-test-b')).toEqual([]);
  });

  it('reject discloses nothing; a second decision is refused', () => {
    const { store } = setup();
    const s = store.createSession(req);
    if (!s.ok) throw new Error('setup');
    expect(store.decide(s.value.id, 'REJECT')).toMatchObject({ ok: true, value: { status: 'DEMO_REJECTED', disclosed: null } });
    expect(store.decide(s.value.id, 'ACCEPT')).toMatchObject({ ok: false, code: 'SESSION_ALREADY_DECIDED' });
  });

  it('expires after the TTL exactly once and refuses late decisions', () => {
    const { store, advance } = setup();
    const s = store.createSession(req);
    if (!s.ok) throw new Error('setup');
    advance(119_999);
    expect(store.walletRequest(s.value.id)).toMatchObject({ ok: true, value: { status: 'PENDING' } });
    advance(1);
    expect(store.decide(s.value.id, 'ACCEPT')).toMatchObject({ ok: false, code: 'SESSION_EXPIRED' });
    store.walletRequests();
    store.activityForOrg('org-test-a');
    expect(store.activityForHolder().filter((e) => e.type === 'SESSION_EXPIRED')).toHaveLength(1);
  });

  it('blocks acceptance when the credential is not active, but allows rejection', () => {
    const { store } = setup({ credentialStatus: 'REVOKED' });
    const a = store.createSession(req);
    const b = store.createSession(req);
    if (!a.ok || !b.ok) throw new Error('setup');
    expect(store.decide(a.value.id, 'ACCEPT')).toMatchObject({ ok: false, code: 'CREDENTIAL_NOT_ACTIVE' });
    expect(store.decide(b.value.id, 'REJECT').ok).toBe(true);
  });

  it('cancel works only while pending and only for the owning organisation', () => {
    const { store } = setup();
    const s = store.createSession(req);
    if (!s.ok) throw new Error('setup');
    expect(store.cancelSession(s.value.id, 'org-test-b')).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    expect(store.cancelSession(s.value.id, 'org-test-a')).toMatchObject({ ok: true, value: { status: 'CANCELLED' } });
    expect(store.decide(s.value.id, 'ACCEPT')).toMatchObject({ ok: false, code: 'SESSION_ALREADY_DECIDED' });
  });

  it('reset clears sessions and activity but records the reset', () => {
    const { store } = setup();
    store.createSession(req);
    store.reset();
    expect(store.walletRequests()).toEqual([]);
    expect(store.activityForHolder().map((e) => e.type)).toEqual(['DEMO_RESET']);
  });

  it('rejects unknown organisations', () => {
    const { store } = setup();
    expect(store.createSession({ ...req, organizationId: 'org-real-bank' })).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });
});
