import { describe, expect, it, vi } from 'vitest';
import { ApiError, describeError } from './errors.ts';
import { DemoHttpTransport, RealTransportPlaceholder, createTransport, randomRequestId } from './transport.ts';
import { createWalletGateway } from './gateways.ts';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const ok = (raw: unknown) => raw;

describe('DemoHttpTransport', () => {
  it('sends a correlation id and JSON headers', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(200, { status: 'ok' }));
    const t = new DemoHttpTransport({ fetchImpl, newRequestId: () => 'req-00000001' });
    await t.request({ method: 'POST', path: '/x', body: { a: 1 }, query: { organizationId: 'org-test-a' }, decode: ok });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('/demo-api/v1/x?organizationId=org-test-a');
    expect(init?.headers).toMatchObject({ 'X-Request-Id': 'req-00000001', 'Content-Type': 'application/json' });
    expect(init?.body).toBe('{"a":1}');
  });

  it('retries idempotent GETs on transient 503 and keeps the same correlation id', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json(503, { error: { code: 'INTERNAL', message: 'busy' } }))
      .mockResolvedValueOnce(json(200, [1]));
    const t = new DemoHttpTransport({ fetchImpl, retryDelayMs: 1, newRequestId: () => 'req-00000002' });
    await expect(t.request({ method: 'GET', path: '/x', decode: ok })).resolves.toEqual([1]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const ids = fetchImpl.mock.calls.map((c) => (c[1]?.headers as Record<string, string>)['X-Request-Id']);
    expect(new Set(ids)).toEqual(new Set(['req-00000002']));
  });

  it('never retries POST', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(503, {}));
    const t = new DemoHttpTransport({ fetchImpl, retryDelayMs: 1 });
    await expect(t.request({ method: 'POST', path: '/x', body: {}, decode: ok })).rejects.toMatchObject({ kind: 'http', status: 503 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('maps 4xx error bodies to typed ApiError without retry', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(409, { error: { code: 'SESSION_EXPIRED', message: 'late', requestId: 'r' } }));
    const t = new DemoHttpTransport({ fetchImpl });
    const err = await t.request({ method: 'GET', path: '/x', decode: ok }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: 'http', status: 409, code: 'SESSION_EXPIRED' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(describeError(err)).toBe('انتهت صلاحية الطلب.');
  });

  it('times out slow requests', async () => {
    const fetchImpl: typeof fetch = (_u, init) => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))));
    const t = new DemoHttpTransport({ fetchImpl, timeoutMs: 20, retries: 0 });
    await expect(t.request({ method: 'GET', path: '/x', decode: ok })).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('honours caller cancellation and does not retry it', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>((_u, init) => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')))));
    const t = new DemoHttpTransport({ fetchImpl, retryDelayMs: 1 });
    const p = t.request({ method: 'GET', path: '/x', decode: ok, signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toMatchObject({ kind: 'cancelled' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports network failures and decode failures distinctly', async () => {
    const down = new DemoHttpTransport({ fetchImpl: async () => { throw new TypeError('fetch failed'); }, retries: 0 });
    await expect(down.request({ method: 'GET', path: '/x', decode: ok })).rejects.toMatchObject({ kind: 'network' });
    const gw = createWalletGateway(new DemoHttpTransport({ fetchImpl: async () => json(200, [{ id: 1 }]) }));
    await expect(gw.requests()).rejects.toMatchObject({ kind: 'decode' });
  });
});

describe('real transport placeholder', () => {
  it('is selectable but refuses every call with not_implemented', async () => {
    const t = createTransport('real');
    expect(t).toBeInstanceOf(RealTransportPlaceholder);
    const err = await createWalletGateway(t).credentials().catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: 'not_implemented' });
    expect(describeError(err)).toContain('غير متاحة');
  });
});

describe('randomRequestId — works outside secure contexts (iPhone over plain-HTTP LAN)', () => {
  const SERVER_RE = /^[A-Za-z0-9._-]{8,64}$/; // the demo API's accepted X-Request-Id format
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('falls back to getRandomValues when crypto.randomUUID is missing, producing a valid v4 id', () => {
    const insecure = { getRandomValues: <T extends ArrayBufferView>(a: T): T => globalThis.crypto.getRandomValues(a) };
    const ids = new Set(Array.from({ length: 50 }, () => randomRequestId(insecure)));
    expect(ids.size).toBe(50);
    for (const id of ids) { expect(id).toMatch(V4); expect(id).toMatch(SERVER_RE); }
  });

  it('uses crypto.randomUUID when it exists', () => {
    expect(randomRequestId({ getRandomValues: (a) => a, randomUUID: () => 'from-random-uuid' })).toBe('from-random-uuid');
  });

  it('the transport sends a request id even when randomUUID is unavailable', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis.crypto, 'randomUUID');
    const proto = Object.getPrototypeOf(globalThis.crypto) as object;
    const protoDesc = Object.getOwnPropertyDescriptor(proto, 'randomUUID');
    Object.defineProperty(proto, 'randomUUID', { value: undefined, configurable: true });
    if (original) Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      let seen = '';
      const fetchImpl = vi.fn(async (_u: RequestInfo | URL, init?: RequestInit) => { seen = new Headers(init?.headers).get('X-Request-Id') ?? ''; return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }); });
      const t = new DemoHttpTransport({ fetchImpl });
      await t.request({ method: 'GET', path: '/x', decode: (j) => j });
      expect(seen).toMatch(V4);
    } finally {
      if (protoDesc) Object.defineProperty(proto, 'randomUUID', protoDesc);
      if (original) Object.defineProperty(globalThis.crypto, 'randomUUID', original);
    }
  });
});
