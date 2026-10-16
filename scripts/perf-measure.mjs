// TASK-11 performance and demo-readiness measurements on the PRODUCTION builds — TEST ONLY.
// Records only what it measures on the machine it runs on: bundle sizes, stack start time,
// page load timings (unthrottled and 4× CPU throttle as a mid-range device proxy), layout
// shift, polling request rates, console errors and horizontal overflow. Not a pass/fail gate
// except for the harness itself and console errors / overflow.
// Usage: npm run build && node scripts/perf-measure.mjs   Evidence → evidence/<IQDID_PERF_DIR | task11/perf>/perf.json
import { chromium } from 'playwright-core';
import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { startStack } from './stack.mjs';

const out = path.resolve('evidence', process.env.IQDID_PERF_DIR ?? 'task11/perf');
await mkdir(out, { recursive: true });
const result = { at: new Date().toISOString(), commit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), node: process.version, platform: process.platform, cpus: (await import('node:os')).cpus().length };
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

result.bundles = {};
for (const app of ['wallet-web', 'verifier-web']) {
  const dir = path.join('apps', app, 'dist', 'assets');
  const files = await readdir(dir);
  const rows = [];
  for (const f of files.filter((x) => /\.(js|css)$/.test(x))) {
    const buf = await readFile(path.join(dir, f));
    rows.push({ file: f, bytes: (await stat(path.join(dir, f))).size, gzipBytes: gzipSync(buf).length });
  }
  const sum = (ext, k) => rows.filter((r) => r.file.endsWith(ext)).reduce((a, r) => a + r[k], 0);
  result.bundles[app] = { js: { bytes: sum('.js', 'bytes'), gzipBytes: sum('.js', 'gzipBytes') }, css: { bytes: sum('.css', 'bytes'), gzipBytes: sum('.css', 'gzipBytes') }, files: rows };
}

const t0 = Date.now();
const stack = startStack({ preview: true, env: { DEMO_LATENCY_MS: '0' }, onLine: () => {} });
let browser, failed = false;
try {
  await stack.ready();
  result.stackReadyMs = Date.now() - t0;
  const api = `${stack.urls.api}/demo-api/v1`;
  const post = (p, b) => fetch(api + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }).then((r) => r.json());
  await post('/demo/reset');
  const s = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'قياس الأداء' });
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const pages = {
    wallet: { url: stack.urls.wallet, width: 390, routes: ['/', '/cards', '/requests', `/requests/${s.id}`] },
    verifier: { url: stack.urls.verifier, width: 1366, routes: ['/', '/new', '/sessions', `/sessions/${s.id}`] },
  };
  result.pageLoads = [];
  result.consoleErrors = [];
  result.overflow = [];
  for (const [app, cfg] of Object.entries(pages)) {
    for (const throttle of [1, 4]) {
      for (const route of cfg.routes) {
        const runs = [];
        for (let i = 0; i < 3; i++) {
          const ctx = await browser.newContext({ viewport: { width: cfg.width, height: 900 }, locale: 'ar' });
          await ctx.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
          const p = await ctx.newPage();
          p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) result.consoleErrors.push(`${app}${route}: ${m.text()}`); });
          const cdp = await ctx.newCDPSession(p);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
          const start = Date.now();
          await p.goto(cfg.url + route);
          await p.getByRole('heading', { level: 1 }).first().waitFor();
          await p.waitForFunction(() => !document.querySelector('main .skeleton'));
          const ready = Date.now() - start;
          const nav = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: fcp ? Math.round(fcp.startTime) : null, transferKB: Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), n.transferSize || 0) / 1024) }; });
          await p.waitForTimeout(300);
          const cls = await p.evaluate(() => Math.round(window.__cls * 1000) / 1000);
          if (throttle === 1 && i === 0 && !(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))) result.overflow.push(`${app}${route}`);
          runs.push({ ...nav, dataReadyMs: ready, cls });
          await ctx.close();
        }
        const pick = (k) => median(runs.map((r) => r[k]).filter((v) => v !== null));
        result.pageLoads.push({ app, route: route.replace(/[0-9a-f-]{36}/, ':id'), cpuThrottle: throttle, runs: runs.length, medianMs: { fcp: pick('fcp'), domContentLoaded: pick('dcl'), load: pick('load'), dataReady: pick('dataReadyMs') }, maxCls: Math.max(...runs.map((r) => r.cls)), transferKB: pick('transferKB') });
        console.log(`${app.padEnd(8)} ${route.replace(/[0-9a-f-]{36}/, ':id').padEnd(16)} cpu×${throttle}  FCP ${pick('fcp')} ms  data-ready ${pick('dataReadyMs')} ms  CLS ${Math.max(...runs.map((r) => r.cls))}`);
      }
    }
  }

  // Polling: demo-API requests per 10 s while each app sits idle on its main screens.
  result.polling = [];
  for (const [app, route] of [['wallet', '/'], ['verifier', '/'], ['verifier', `/sessions/${s.id}`]]) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'ar' });
    const p = await ctx.newPage();
    await p.goto(pages[app].url + route);
    await p.getByRole('heading', { level: 1 }).first().waitFor();
    await p.waitForTimeout(1000);
    const seen = [];
    p.on('request', (r) => { if (r.url().includes('/demo-api/v1/')) seen.push(new URL(r.url()).pathname.replace('/demo-api/v1', '').replace(/[0-9a-f-]{36}/, ':id')); });
    await p.waitForTimeout(10_000);
    const byPath = {};
    for (const x of seen) byPath[x] = (byPath[x] ?? 0) + 1;
    result.polling.push({ app, route: route.replace(/[0-9a-f-]{36}/, ':id'), windowMs: 10_000, requests: seen.length, byPath });
    console.log(`polling ${app}${route.replace(/[0-9a-f-]{36}/, ':id')}: ${seen.length} requests / 10 s ${JSON.stringify(byPath)}`);
    await ctx.close();
  }
} catch (e) { failed = true; result.error = String(e?.message ?? e); console.log(`FAIL harness ${result.error}`); }
finally {
  await browser?.close();
  await stack.stopped();
  await writeFile(path.join(out, 'perf.json'), JSON.stringify(result, null, 2));
  for (const [app, b] of Object.entries(result.bundles)) console.log(`bundle ${app}: JS ${b.js.bytes} B (${b.js.gzipBytes} gz), CSS ${b.css.bytes} B (${b.css.gzipBytes} gz)`);
  console.log(`stack ready: ${result.stackReadyMs} ms; console errors: ${result.consoleErrors?.length}; overflow: ${result.overflow?.join(', ') || 'none'}`);
  process.exitCode = failed || result.consoleErrors?.length || result.overflow?.length ? 1 : 0;
}
