// Real browser screenshots of the built apps against the demo API (TEST ONLY, synthetic data).
// Usage: npm run build && IQDID_SHOTS_DIR=task8-v2/screenshots node scripts/screenshots.mjs [shots.json]
// Each shot: { app, route, theme, width, height?, name, seed?, settle?, fullPage? } (viewport-only by default,
// so fixed navigation is shown where a user sees it). seed: 'pending' creates
// two demo requests (one per organisation) and decides nothing (route placeholder :pending); 'mixed' also accepts (:accepted) and rejects one.
import { chromium } from 'playwright-core';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { startStack } from './stack.mjs';

const out = path.resolve('evidence', process.env.IQDID_SHOTS_DIR ?? 'screenshots');
await mkdir(out, { recursive: true });
const DEFAULT = [
  ['wallet', '/', 'light', 390], ['wallet', '/', 'dark', 390], ['wallet', '/card', 'light', 390], ['wallet', '/requests', 'light', 390],
  ['wallet', '/settings', 'light', 390], ['wallet', '/settings', 'dark', 390], ['wallet', '/', 'light', 768],
  ['verifier', '/', 'light', 1366], ['verifier', '/', 'dark', 1366], ['verifier', '/new', 'light', 1366], ['verifier', '/sessions', 'light', 1366],
  ['verifier', '/settings', 'dark', 1366], ['verifier', '/', 'light', 768], ['verifier', '/', 'light', 390],
].map(([app, route, theme, width]) => ({ app, route, theme, width, seed: 'mixed', name: `${app}${route.replace(/\//g, '-').replace(/-$/, '') || ''}-${theme}-${width}` }));
const shots = process.argv[2] ? JSON.parse(await readFile(process.argv[2], 'utf8')) : DEFAULT;

const stack = startStack({ preview: true, onLine: () => {} });
let browser;
try {
  await stack.ready();
  const api = `${stack.urls.api}/demo-api/v1`;
  const post = (p, body) => fetch(api + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) }).then((r) => r.json());
  let seeded = null;
  const ids = {};
  const seed = async (kind) => {
    if (seeded === kind) return;
    await post('/demo/reset');
    const a = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'فتح حساب مصرفي تجريبي' });
    ids.pending = a.id;
    await post('/verifier/sessions', { organizationId: 'org-test-b', templateId: 'IDENTITY_BASIC', purpose: 'تفعيل خط اتصالات تجريبي' });
    if (kind === 'mixed') {
      const b = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'IDENTITY_BASIC', purpose: 'تحديث بيانات العميل التجريبي' });
      const c = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'خدمة إلكترونية تجريبية' });
      await post(`/wallet/requests/${b.id}/decision`, { decision: 'ACCEPT' });
      await post(`/wallet/requests/${c.id}/decision`, { decision: 'REJECT' });
      ids.accepted = b.id;
    }
    seeded = kind;
  };
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of shots) {
    if (s.seed) await seed(s.seed);
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height ?? (s.width < 800 ? 844 : 900) }, locale: 'ar', colorScheme: s.theme === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    await ctx.addInitScript(([theme, extra]) => { try { localStorage.setItem('iqdid-demo-theme', theme); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v); } catch { /* ignore */ } }, [s.theme, s.storage ?? {}]);
    const p = await ctx.newPage();
    await p.goto(stack.urls[s.app] + s.route.replace(':pending', ids.pending ?? '').replace(':accepted', ids.accepted ?? ''));
    await p.locator('main').waitFor();
    await p.waitForFunction(() => !document.querySelector('.skeleton'), null, { timeout: 15000 }).catch(() => undefined);
    await p.waitForTimeout(s.settle ?? 600);
    await p.screenshot({ path: path.join(out, `${s.name}.png`), fullPage: s.fullPage === true });
    console.log(`shot ${s.name}`);
    await ctx.close();
  }
} finally {
  await browser?.close();
  stack.stop();
}
