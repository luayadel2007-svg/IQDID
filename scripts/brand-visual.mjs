// IQDI brand visual regression — real screenshots of both apps (production builds, demo API, synthetic data).
// Run once before and once after a branding change; the two directories are compared side by side.
// Usage: npm run build && node scripts/brand-visual.mjs <out-dir-relative-to-evidence>
//        node scripts/brand-visual.mjs --compare <before-dir> <after-dir> <out-dir>   (all relative to evidence/)
import * as pw from 'playwright-core';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { startStack } from './stack.mjs';

const args = process.argv.slice(2);
const ev = (p) => path.resolve('evidence', p);
const launch = () => pw.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

if (args[0] === '--compare') {
  // Side-by-side sheets: BEFORE (left) and AFTER (right) for every capture present in both.
  const [before, after, out] = args.slice(1).map(ev);
  await mkdir(out, { recursive: true });
  const have = new Set(await readdir(before));
  const names = (await readdir(after)).filter((n) => n.endsWith('.png') && have.has(n)); // after-only captures have no pair
  const browser = await launch();
  const page = await browser.newPage();
  const data = async (dir, n) => `data:image/png;base64,${(await readFile(path.join(dir, n))).toString('base64')}`;
  for (const n of names) {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.setContent(`<body style="margin:0;padding:12px;background:#d9d6cf;font:600 14px system-ui;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
      <figure style="margin:0"><figcaption>BEFORE — ${n}</figcaption><img style="width:100%;border:1px solid #999" src="${await data(before, n)}"></figure>
      <figure style="margin:0"><figcaption>AFTER — ${n}</figcaption><img style="width:100%;border:1px solid #999" src="${await data(after, n)}"></figure></body>`);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    await page.screenshot({ path: path.join(out, n), fullPage: true });
  }
  await browser.close();
  console.log(`compared ${names.length} captures → ${out}`);
  process.exit(0);
}

const out = ev(args[0] ?? 'branding/visual/after');
await mkdir(out, { recursive: true });
const stack = startStack({ preview: true, env: { DEMO_LATENCY_MS: '0', DEMO_SESSION_TTL_MS: '600000' }, onLine: () => {} });
let browser;
try {
  await stack.ready();
  const api = `${stack.urls.api}/demo-api/v1`;
  const post = (p, b) => fetch(api + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }).then((r) => r.json());
  await post('/demo/reset');
  const pending = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'IDENTITY_BASIC', purpose: 'تحديث بيانات عميل مصرفي تجريبي' });
  const accepted = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'فتح حساب مصرفي تجريبي' });
  await post(`/wallet/requests/${accepted.id}/decision`, { decision: 'ACCEPT' });
  browser = await launch();
  const VIEWS = { phone: { width: 390, height: 844 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1440, height: 900 } };
  const SHOTS = [
    ['wallet', '/', 'wallet-home', ['phone', 'tablet', 'desktop'], ['light', 'dark']],
    ['wallet', '/cards', 'wallet-mustamsakati', ['phone', 'desktop'], ['light']],
    ['wallet', '/credentials/cred-test-001?from=cards', 'wallet-credential-detail', ['phone'], ['light']],
    ['wallet', '/requests', 'wallet-requests', ['phone'], ['light']],
    ['wallet', `/requests/${pending.id}`, 'wallet-request-review', ['phone'], ['light', 'dark']],
    ['wallet', '/welcome', 'wallet-welcome', ['phone'], ['light']],
    ['wallet', '/settings', 'wallet-settings', ['phone'], ['light']],
    ['verifier', '/', 'verifier-dashboard', ['desktop', 'tablet', 'phone'], ['light', 'dark']],
    ['verifier', '/sessions', 'verifier-sessions', ['desktop'], ['light']],
    ['verifier', `/sessions/${accepted.id}`, 'verifier-session-detail', ['desktop'], ['light']],
    ['verifier', '/settings', 'verifier-settings', ['desktop'], ['light']],
    ['wallet', '/settings#bottom', 'wallet-settings-about', ['phone'], ['light', 'dark']],
    ['verifier', '/settings#bottom', 'verifier-settings-about', ['desktop', 'phone'], ['light', 'dark']],
  ];
  let n = 0;
  for (const [app, route, name, views, themes] of SHOTS) {
    for (const view of views) {
      for (const theme of themes) {
        const ctx = await browser.newContext({ viewport: VIEWS[view], locale: 'ar', reducedMotion: 'reduce' });
        await ctx.addInitScript((t) => { try { localStorage.setItem('iqdid-demo-theme', t); } catch { /* ignore */ } }, theme);
        const page = await ctx.newPage();
        await page.goto((app === 'wallet' ? stack.urls.wallet : stack.urls.verifier) + route.replace('#bottom', ''));
        await page.locator('main h1').first().waitFor({ timeout: 15_000 });
        await page.waitForFunction(() => !document.querySelector('main .skeleton'), null, { timeout: 15_000 });
        await page.evaluate(() => document.fonts.ready);
        if (route.endsWith('#bottom')) await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
        await page.waitForTimeout(250);
        await page.screenshot({ path: path.join(out, `${name}-${view}-${theme}.png`) });
        await ctx.close();
        n++;
      }
    }
  }
  console.log(`captured ${n} screens → ${out}`);
} finally {
  await browser?.close();
  await stack.stopped();
}
