import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startStack } from './stack.mjs';
const require = createRequire(import.meta.url);
const axe = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const out = path.resolve('evidence', process.env.IQDID_UX_EVIDENCE_DIR ?? 'modernization/ux-final');
await mkdir(out, { recursive: true });
const lines = [], results = [];
const stack = startStack({ preview: true, onLine: (l) => lines.push(l) });
let browser;
const check = (v, why) => { if (!v) throw new Error(why); };
async function step(name, fn) {
  try { await fn(); results.push({ name, outcome: 'PASS' }); console.log(`PASS ${name}`); }
  catch (e) { results.push({ name, outcome: 'FAIL', error: String(e.message) }); console.log(`FAIL ${name}: ${e.message}`); }
}
try {
  await stack.ready();
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [app, url] of [['wallet', stack.urls.wallet], ['verifier', stack.urls.verifier]]) {
    const ctx = await browser.newContext({ viewport: { width: app === 'wallet' ? 390 : 1366, height: 900 }, locale: 'ar', colorScheme: 'light' });
    const p = await ctx.newPage();
    const nav = (name) => p.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('link', { name });
    await p.goto(url); await p.getByRole('heading', { level: 1 }).waitFor();
    await step(`${app}: primary service reached in one navigation interaction`, async () => {
      await nav(app === 'wallet' ? 'مستمسكاتي' : 'طلب تحقق جديد').click();
      await p.getByRole('heading', { name: app === 'wallet' ? 'مستمسكاتي' : 'إنشاء طلب تحقق تجريبي' }).waitFor();
    });
    await nav('الإعدادات').click();
    await step(`${app}: settings synchronize header + persist after reload`, async () => {
      await p.getByRole('button', { name: 'داكن', exact: true }).click();
      check(await p.getByRole('button', { name: 'تفعيل الوضع الفاتح' }).getAttribute('aria-pressed') === 'true', 'header out of sync');
      await p.getByLabel('حجم النص').selectOption('larger');
      await p.getByLabel('تقليل الشفافية والتمويه').check();
      await p.reload();
      check(await p.getByLabel('حجم النص').inputValue() === 'larger', 'text not persisted');
      check(await p.getByLabel('تقليل الشفافية والتمويه').isChecked(), 'transparency not persisted');
      check(await p.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'theme not persisted');
    });
    await step(`${app}: automatic theme follows live operating-system changes`, async () => {
      await p.getByRole('button', { name: 'تلقائي', exact: true }).click();
      await p.emulateMedia({ colorScheme: 'dark' });
      await p.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
      await p.emulateMedia({ colorScheme: 'light' });
      await p.waitForFunction(() => document.documentElement.dataset.theme === 'light');
      check(await p.evaluate(() => localStorage.getItem('iqdid-demo-theme')) === 'system', 'system stored as override');
    });
    for (const mode of ['light', 'dark']) {
      await p.getByRole('button', { name: mode === 'light' ? 'فاتح' : 'داكن', exact: true }).click();
      await p.getByLabel('حجم النص').selectOption('normal');
      await p.getByLabel('تقليل الشفافية والتمويه').uncheck();
      await step(`${app}: axe WCAG 2.2 AA settings (${mode}) including contrast`, async () => {
        // Theme changes animate colours; audit the settled state, not a mid-transition frame.
        await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
        await p.addScriptTag({ content: axe });
        const report = await p.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
        await writeFile(path.join(out, `${app}-${mode}-axe.json`), JSON.stringify(report, null, 2));
        check(report.violations.length === 0, report.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(',')}`).join('; '));
      });
    }
    await step(`${app}: axe audits all main routes in both themes`, async () => {
      const response = await fetch(`${stack.urls.api}/demo-api/v1/verifier/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'اختبار معاينة البيانات' }) });
      const session = await response.json();
      check(typeof session.id === 'string', 'could not create QA session');
      const routes = app === 'wallet' ? ['', 'welcome', 'cards', 'cards?card=cred-test-002', 'cards?view=list', 'card', 'credentials', 'credentials/cred-test-001', 'credentials/cred-test-004', 'requests', `requests/${session.id}`, `requests/${session.id}/disclosure`, 'qr', 'activity', 'notifications', 'settings', 'help'] : ['', 'new', 'sessions', `sessions/${session.id}`, 'results', 'activity'];
      const audits = [];
      for (const mode of ['light', 'dark']) {
        for (const route of routes) {
          await p.goto(`${url}/${route}`);
          await p.locator('main').waitFor();
          await p.waitForFunction(() => !document.querySelector('.skeleton'));
          await p.evaluate((theme) => { localStorage.setItem('iqdid-demo-theme', theme); window.dispatchEvent(new Event('storage')); }, mode);
          await p.waitForFunction((theme) => document.documentElement.dataset.theme === theme, mode);
          // Theme changes animate colours; audit the settled state, not a mid-transition frame.
        await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
        await p.addScriptTag({ content: axe });
          const report = await p.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
          audits.push({ route, mode, violations: report.violations, incomplete: report.incomplete.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })) });
        }
      }
      await writeFile(path.join(out, `${app}-routes-axe.json`), JSON.stringify(audits, null, 2));
      check(audits.every((a) => a.violations.length === 0), audits.filter((a) => a.violations.length).map((a) => `${a.mode}/${a.route}: ${a.violations.map((v) => v.id).join(',')}`).join('; '));
    });
    await nav('الإعدادات').click();
    await step(`${app}: reduced motion disables animated skeleton and transitions`, async () => {
      await p.emulateMedia({ reducedMotion: 'reduce' });
      check(await p.locator('button').first().evaluate((e) => getComputedStyle(e).transitionDuration) === '0s', 'motion still active');
    });
    await step(`${app}: RTL responsive reflow at 320, 390, 768, 1366 and 200% text`, async () => {
      for (const width of [320, 390, 768, 1366]) {
        await p.setViewportSize({ width, height: 900 });
        await p.getByLabel('حجم النص').selectOption(width === 320 ? 'larger' : 'normal');
        check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `horizontal overflow at ${width}`);
        check(await p.evaluate(() => document.documentElement.dir) === 'rtl', 'not RTL');
      }
      await p.setViewportSize({ width: 640, height: 900 });
      await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow at 200% text');
      await p.evaluate(() => { document.documentElement.style.fontSize = ''; });
    });
    await step(`${app}: keyboard controls and visible skip-link target`, async () => {
      await p.goto(url); await p.getByRole('heading', { level: 1 }).waitFor(); await p.keyboard.press('Tab');
      check((await p.evaluate(() => document.activeElement?.textContent ?? '')).includes('تخطَّ'), 'skip not first');
      await p.keyboard.press('Enter');
      check(await p.waitForFunction(() => document.activeElement?.id === 'main', null, { timeout: 3000 }).then(() => true, () => false), 'skip not focusing main');
    });
    await step(`${app}: offline API error is visible, retry offered`, async () => {
      await ctx.route('**/demo-api/v1/**', (route) => route.abort('internetdisconnected'));
      try {
      await p.goto(`${url}/${app === 'wallet' ? 'card' : 'sessions'}`);
      await p.getByRole('alert').first().waitFor({ timeout: 20000 });
      check(await p.getByRole('button', { name: 'إعادة المحاولة' }).count() > 0, 'retry missing');
      } finally { await ctx.unroute('**/demo-api/v1/**'); }
    });
    await p.goto(url); await p.getByRole('heading', { level: 1 }).waitFor();
    await p.setViewportSize({ width: app === 'wallet' ? 390 : 1366, height: 900 });
    await p.waitForFunction(() => !document.querySelector('.skeleton'));
    await p.screenshot({ path: path.join(out, `${app}-home.png`), fullPage: true });
    await ctx.close();
  }
} catch (e) { results.push({ name: 'harness', outcome: 'FAIL', error: String(e.message) }); }
finally {
  await browser?.close(); stack.stop();
  await writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  await writeFile(path.join(out, 'stack.log'), lines.join('\n'));
  process.exitCode = results.some((r) => r.outcome !== 'PASS') ? 1 : 0;
}
