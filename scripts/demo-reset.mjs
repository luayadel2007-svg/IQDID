// Resets the local demo API (sessions + activity for both apps) — TEST ONLY.
// Refuses any non-loopback target so it can never touch another system.
// Usage: npm run demo:reset            (default http://127.0.0.1:4010)
//        DEMO_API_URL=http://127.0.0.1:4010 npm run demo:reset
const target = new URL(process.env.DEMO_API_URL ?? 'http://127.0.0.1:4010');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) || target.protocol !== 'http:') {
  console.error(`Refusing to reset a non-loopback demo API: ${target.origin}`);
  process.exit(2);
}
const base = `${target.origin}/demo-api/v1`;
try {
  const health = await fetch(`${base}/health`).then((r) => r.json());
  if (health?.environment !== 'DEMO') throw new Error('target is not the IQDI demo API');
  const res = await fetch(`${base}/demo/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (!res.ok) throw new Error(`reset failed: HTTP ${res.status}`);
  console.log(`IQDI demo data reset at ${target.origin} (synthetic data only).`);
} catch (e) {
  console.error(`Demo reset failed: ${e instanceof Error ? e.message : e}. Is \`npm run dev\` or \`npm run preview\` running?`);
  process.exit(1);
}
