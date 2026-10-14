import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startDemoServer, type RunningDemoServer } from './server.ts';

let srv: RunningDemoServer;
const api = (path: string) => `${srv.url}/demo-api/v1${path}`;
const post = (path: string, body: unknown, headers: Record<string, string> = { 'Content-Type': 'application/json' }) =>
  fetch(api(path), { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });

beforeAll(async () => { srv = await startDemoServer({ port: 0 }); });
afterAll(async () => { await srv.close(); });

describe('demo HTTP server', () => {
  it('binds to loopback and sets demo headers, echoing a valid correlation id', async () => {
    expect(srv.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    const res = await fetch(api('/health'), { headers: { 'X-Request-Id': 'corr-12345678' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('corr-12345678');
    expect(res.headers.get('x-environment')).toBe('DEMO');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('replaces an invalid correlation id with a generated one', async () => {
    const res = await fetch(api('/health'), { headers: { 'X-Request-Id': 'bad id <script>' } });
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('runs the create → decide → read cycle over HTTP', async () => {
    const created = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'تحقق تجريبي' });
    expect(created.status).toBe(201);
    const s = (await created.json()) as { id: string };
    const decided = await post(`/wallet/requests/${s.id}/decision`, { decision: 'ACCEPT' });
    expect(decided.status).toBe(200);
    const read = await fetch(api(`/verifier/sessions/${s.id}?organizationId=org-test-a`));
    expect(await read.json()).toMatchObject({ status: 'DEMO_ACCEPTED', disclosed: [{ key: 'age_over_18', value: 'نعم' }] });
    const again = await post(`/wallet/requests/${s.id}/decision`, { decision: 'REJECT' });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: { code: 'SESSION_ALREADY_DECIDED' } });
  });

  it('hides sessions from other organisations (404) and requires organizationId', async () => {
    const created = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'تحقق تجريبي' });
    const s = (await created.json()) as { id: string };
    expect((await fetch(api(`/verifier/sessions/${s.id}?organizationId=org-test-b`))).status).toBe(404);
    expect((await fetch(api('/verifier/sessions'))).status).toBe(400);
  });

  it('rejects malformed input', async () => {
    expect((await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'ok ok', role: 'admin' })).status).toBe(400);
    expect((await post('/verifier/sessions', '{not json')).status).toBe(400);
    expect((await post('/verifier/sessions', { a: 1 }, { 'Content-Type': 'text/plain' })).status).toBe(400);
    expect((await post('/verifier/sessions', { purpose: 'x'.repeat(20_000) })).status).toBe(413);
    expect((await fetch(api('/verifier/sessions'), { method: 'DELETE' })).status).toBe(400);
    expect((await fetch(api('/nope'))).status).toBe(404);
  });

  it('resets state', async () => {
    expect((await post('/demo/reset', {})).status).toBe(200);
    expect(await (await fetch(api('/wallet/requests'))).json()).toEqual([]);
  });
});
