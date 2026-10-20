import { DEMO_API_PREFIX, DEMO_ERROR_CODES, type DemoErrorCode } from '@iqdid/shared-types';
import { ApiError } from './errors.ts';

export type HttpMethod = 'GET' | 'POST';

export interface RequestSpec<T> {
  readonly method: HttpMethod;
  readonly path: string;
  readonly query?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  readonly decode: (raw: unknown) => T;
}

export interface Transport {
  readonly mode: 'demo' | 'real';
  request<T>(spec: RequestSpec<T>): Promise<T>;
}

export interface DemoTransportOptions {
  /** '' uses same-origin (Vite proxy); tests pass the real server URL. */
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  /** Extra attempts for idempotent GETs on transient failures. */
  readonly retries?: number;
  readonly retryDelayMs?: number;
  readonly newRequestId?: () => string;
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('aborted', 'AbortError'));
    }, { once: true });
  });

/** AbortSignal.any where available (Safari ≥ 17.4, Chrome ≥ 116, Firefox ≥ 124); a linked controller otherwise. */
export function anySignal(signals: readonly AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([...signals]);
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) { controller.abort(s.reason); break; }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

const isErrorCode = (v: unknown): v is DemoErrorCode => typeof v === 'string' && (DEMO_ERROR_CODES as readonly string[]).includes(v);

/**
 * A random RFC 4122 v4 id for the X-Request-Id header.
 * `crypto.randomUUID` only exists in secure contexts (HTTPS or localhost) and in Safari 15.4+; when the
 * wallet is opened over plain HTTP on a LAN address (e.g. an iPhone on http://192.168.x.x:5173) it is
 * undefined and every API call failed with «حدث خطأ غير متوقع». `crypto.getRandomValues` is available in
 * every context, so it is the fallback. Not used for anything security-sensitive.
 */
export function randomRequestId(c: { getRandomValues<T extends ArrayBufferView>(a: T): T; randomUUID?: () => string } = globalThis.crypto): string {
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export class DemoHttpTransport implements Transport {
  readonly mode = 'demo' as const;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly newRequestId: () => string;

  constructor(options: DemoTransportOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.retries = options.retries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 300;
    this.newRequestId = options.newRequestId ?? (() => randomRequestId());
  }

  async request<T>(spec: RequestSpec<T>): Promise<T> {
    const requestId = this.newRequestId();
    const attempts = spec.method === 'GET' ? this.retries + 1 : 1;
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.once(spec, requestId);
      } catch (e) {
        const retryable = e instanceof ApiError && e.transient && attempt < attempts;
        if (!retryable) throw e;
        try {
          await sleep(this.retryDelayMs * attempt, spec.signal);
        } catch {
          throw new ApiError({ kind: 'cancelled', message: 'request cancelled', requestId });
        }
      }
    }
  }

  private async once<T>(spec: RequestSpec<T>, requestId: string): Promise<T> {
    if (spec.signal?.aborted) throw new ApiError({ kind: 'cancelled', message: 'request cancelled', requestId });
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal = spec.signal ? anySignal([spec.signal, timeout]) : timeout;
    const qs = spec.query ? `?${new URLSearchParams(spec.query).toString()}` : '';
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Request-Id': requestId };
    if (spec.body !== undefined) headers['Content-Type'] = 'application/json';
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${DEMO_API_PREFIX}${spec.path}${qs}`, {
        method: spec.method,
        headers,
        body: spec.body === undefined ? null : JSON.stringify(spec.body),
        signal,
      });
    } catch (e) {
      if (spec.signal?.aborted) throw new ApiError({ kind: 'cancelled', message: 'request cancelled', requestId });
      if (timeout.aborted) throw new ApiError({ kind: 'timeout', message: `timed out after ${this.timeoutMs} ms`, requestId });
      throw new ApiError({ kind: 'network', message: e instanceof Error ? e.message : 'network error', requestId });
    }
    let raw: unknown = null;
    try {
      raw = await res.json();
    } catch {
      if (res.ok) throw new ApiError({ kind: 'decode', message: 'response is not JSON', requestId, status: res.status });
    }
    if (!res.ok) {
      const err = (raw as { error?: { code?: unknown; message?: unknown } } | null)?.error;
      throw new ApiError({
        kind: 'http',
        status: res.status,
        code: isErrorCode(err?.code) ? err.code : null,
        message: typeof err?.message === 'string' ? err.message : `HTTP ${res.status}`,
        requestId,
      });
    }
    try {
      return spec.decode(raw);
    } catch (e) {
      throw new ApiError({ kind: 'decode', message: e instanceof Error ? e.message : 'decode failed', requestId, status: res.status });
    }
  }
}

/**
 * Placeholder for the future real services (C2-B/C3/C4/C5). Deliberately
 * unimplemented: the real OpenAPI v1.1 contracts are drafts and no service
 * exists yet. Selecting it surfaces a clear error instead of fake success.
 */
export class RealTransportPlaceholder implements Transport {
  readonly mode = 'real' as const;
  request<T>(spec: RequestSpec<T>): Promise<T> {
    return Promise.reject(new ApiError({ kind: 'not_implemented', message: `real transport not available (${spec.method} ${spec.path})`, requestId: 'n/a' }));
  }
}

export type TransportMode = 'demo' | 'real';

export function createTransport(mode: TransportMode, options: DemoTransportOptions = {}): Transport {
  if (mode === 'demo') return new DemoHttpTransport(options);
  return new RealTransportPlaceholder();
}
