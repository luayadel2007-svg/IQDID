import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { DemoErrorCode } from '@iqdid/shared-types';
import { DEMO_API_PREFIX, DEMO_ENVIRONMENT, validateConsentDecision, validateVerificationRequest } from '@iqdid/shared-types';
import { DemoStore, type DemoStoreOptions, type Result } from './store.ts';

const MAX_BODY_BYTES = 16 * 1024;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
/** A browser POST from a non-loopback page (cross-site request forgery) is refused; tools without Origin are unaffected. */
const foreignOrigin = (origin: string | undefined): boolean => {
  if (origin === undefined) return false;
  try { return !LOOPBACK_HOSTS.has(new URL(origin).hostname); } catch { return true; }
};
const REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,64}$/;
const STATUS_BY_CODE: Record<DemoErrorCode, number> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  SESSION_EXPIRED: 409,
  SESSION_ALREADY_DECIDED: 409,
  CREDENTIAL_NOT_ACTIVE: 409,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL: 500,
};

export interface DemoServerOptions extends DemoStoreOptions {
  /** Artificial latency to make loading states visible in the demo UI. */
  readonly latencyMs?: number;
  readonly log?: (line: string) => void;
}

class HttpError extends Error {
  readonly code: DemoErrorCode;
  constructor(code: DemoErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function send(res: ServerResponse, status: number, requestId: string, body: unknown): void {
  const payload = status === 204 ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Environment': DEMO_ENVIRONMENT,
    'X-Request-Id': requestId,
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const type = req.headers['content-type'] ?? '';
  if (!type.startsWith('application/json')) throw new HttpError('BAD_REQUEST', 'Content-Type must be application/json');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError('PAYLOAD_TOO_LARGE', 'request body too large');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError('BAD_REQUEST', 'invalid JSON');
  }
}

const unwrap = <T>(r: Result<T>): T => {
  if (!r.ok) throw new HttpError(r.code, r.message);
  return r.value;
};

type Handler = (ctx: { req: IncomingMessage; params: string[]; query: URLSearchParams }) => Promise<unknown> | unknown;
interface Route { readonly method: string; readonly pattern: RegExp; readonly status: number; readonly handler: Handler }

function routes(store: DemoStore): Route[] {
  const requireOrg = (q: URLSearchParams): string => {
    const org = q.get('organizationId');
    if (!org) throw new HttpError('BAD_REQUEST', 'organizationId query parameter is required');
    return org;
  };
  const ID = '([A-Za-z0-9-]{1,64})';
  const r = (method: string, path: string, handler: Handler, status = 200): Route => ({
    method, status, handler, pattern: new RegExp(`^${DEMO_API_PREFIX}${path}$`),
  });
  return [
    r('GET', '/health', () => ({ status: 'ok', environment: DEMO_ENVIRONMENT, sessionTtlMs: store.ttlMs })),
    r('GET', '/organizations', () => store.organizations()),
    r('GET', '/request-templates', () => store.templates()),
    r('POST', '/verifier/sessions', async ({ req }) => {
      const v = validateVerificationRequest(await readJson(req));
      if (!v.ok) throw new HttpError('BAD_REQUEST', v.reason);
      return unwrap(store.createSession(v.value));
    }, 201),
    r('GET', '/verifier/sessions', ({ query }) => store.listSessionsForOrg(requireOrg(query))),
    r('GET', `/verifier/sessions/${ID}`, ({ params, query }) => unwrap(store.getSessionForOrg(params[0] ?? '', requireOrg(query)))),
    r('POST', `/verifier/sessions/${ID}/cancel`, ({ params, query }) => unwrap(store.cancelSession(params[0] ?? '', requireOrg(query)))),
    r('GET', '/verifier/activity', ({ query }) => store.activityForOrg(requireOrg(query))),
    r('GET', '/wallet/credentials', () => store.credentials()),
    r('GET', `/wallet/credentials/${ID}`, ({ params }) => unwrap(store.credentialById(params[0] ?? ''))),
    r('GET', '/wallet/requests', () => store.walletRequests()),
    r('GET', `/wallet/requests/${ID}`, ({ params }) => unwrap(store.walletRequest(params[0] ?? ''))),
    r('POST', `/wallet/requests/${ID}/decision`, async ({ req, params }) => {
      const v = validateConsentDecision(await readJson(req));
      if (!v.ok) throw new HttpError('BAD_REQUEST', v.reason);
      return unwrap(store.decide(params[0] ?? '', v.value.decision));
    }),
    r('GET', '/wallet/activity', () => store.activityForHolder()),
    r('POST', '/demo/reset', () => {
      store.reset();
      return { status: 'reset' };
    }),
  ];
}

export function createDemoServer(store: DemoStore, options: DemoServerOptions = {}): Server {
  const table = routes(store);
  const log = options.log ?? (() => undefined);
  return createServer((req, res) => {
    const incoming = req.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && REQUEST_ID_RE.test(incoming) ? incoming : crypto.randomUUID();
    const url = new URL(req.url ?? '/', 'http://localhost');
    const respond = (status: number, body: unknown): void => {
      send(res, status, requestId, body);
      log(`${req.method ?? '?'} ${url.pathname} ${status} ${requestId}`);
    };
    const run = async (): Promise<void> => {
      const matches = table.filter((rt) => rt.pattern.test(url.pathname));
      if (matches.length === 0) throw new HttpError('NOT_FOUND', 'unknown endpoint');
      const route = matches.find((rt) => rt.method === req.method);
      if (!route) throw new HttpError('BAD_REQUEST', 'method not allowed');
      if (req.method === 'POST' && foreignOrigin(req.headers.origin)) throw new HttpError('BAD_REQUEST', 'cross-origin request refused');
      const params = route.pattern.exec(url.pathname)?.slice(1) ?? [];
      if (options.latencyMs) await new Promise((r) => setTimeout(r, options.latencyMs));
      const body = await route.handler({ req, params, query: url.searchParams });
      respond(route.status, body);
    };
    run().catch((err: unknown) => {
      const code: DemoErrorCode = err instanceof HttpError ? err.code : 'INTERNAL';
      const message = err instanceof HttpError ? err.message : 'internal error';
      respond(STATUS_BY_CODE[code], { error: { code, message, requestId } });
    });
  });
}

export interface RunningDemoServer {
  readonly url: string;
  readonly store: DemoStore;
  close(): Promise<void>;
}

/** Starts the demo server on loopback only. port 0 picks a free port (tests). */
export async function startDemoServer(options: DemoServerOptions & { port?: number; host?: string } = {}): Promise<RunningDemoServer> {
  const store = new DemoStore(options);
  const server = createDemoServer(store, options);
  const host = options.host ?? '127.0.0.1';
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, host, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://${host}:${port}`,
    store,
    close: () => new Promise<void>((resolve, reject) => {
      server.closeAllConnections();
      server.close((e) => (e ? reject(e) : resolve()));
    }),
  };
}
