import { startDemoServer } from './server.ts';

const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);
const host = process.env.DEMO_HOST ?? '127.0.0.1';
if (!LOOPBACK.has(host)) {
  console.error(`Refusing to bind demo server to non-loopback host "${host}".`);
  process.exit(2);
}
const port = Number(process.env.DEMO_PORT ?? 4010);
const ttlMs = process.env.DEMO_SESSION_TTL_MS ? Number(process.env.DEMO_SESSION_TTL_MS) : undefined;
const latencyMs = process.env.DEMO_LATENCY_MS ? Number(process.env.DEMO_LATENCY_MS) : 250;

const server = await startDemoServer({
  host,
  port,
  latencyMs,
  ...(ttlMs ? { ttlMs } : {}),
  log: (line) => console.log(`[demo-api] ${line}`),
});
console.log(`[demo-api] TEST ONLY — synthetic data — listening on ${server.url} (session TTL ${server.store.ttlMs} ms)`);

const shutdown = (): void => {
  void server.close().then(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
