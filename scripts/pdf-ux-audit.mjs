// Measures the pasted «معايير تجميل التطبيقات الحكومية» criteria in a real browser on the
// production builds (TEST ONLY, synthetic data) and captures screenshots at 320/390/768/1366 px
// and 200 % text. Usage: npm run build && node scripts/pdf-ux-audit.mjs
// Evidence → evidence/<IQDID_PDF_AUDIT_DIR | modernization/pdf-audit>/ (audit.json + PNGs)
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startStack } from './stack.mjs';

const out = path.resolve('evidence', process.env.IQDID_PDF_AUDIT_DIR ?? 'modernization/pdf-audit');
await mkdir(out, { recursive: true });
const stack = startStack({ preview: true, onLine: () => {} });
const checks = [];
const record = (app, id, criterion, pass, measured) => { checks.push({ app, id, criterion, outcome: pass ? 'PASS' : 'FAIL', measured }); console.log(`${pass ? 'PASS' : 'FAIL'} ${app} ${id} ${criterion} — ${JSON.stringify(measured)}`); };
let browser;
try {
  await stack.ready();
  const api = `${stack.urls.api}/demo-api/v1`;
  const post = (p, b) => fetch(api + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }).then((r) => r.json());
  await post('/demo/reset');
  const pending = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'فتح حساب مصرفي تجريبي' });
  const done = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'IDENTITY_BASIC', purpose: 'تحديث بيانات العميل التجريبي' });
  await post(`/wallet/requests/${done.id}/decision`, { decision: 'ACCEPT' });
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  for (const [app, url, wide] of [['wallet', stack.urls.wallet, 390], ['verifier', stack.urls.verifier, 1366]]) {
    const ctx = await browser.newContext({ viewport: { width: wide, height: 900 }, locale: 'ar' });
    const p = await ctx.newPage();
    const open = async (route) => { await p.goto(url + route); await p.getByRole('heading', { level: 1 }).first().waitFor(); await p.waitForFunction(() => !document.querySelector('.skeleton')); };
    await open('/');

    const m = await p.evaluate(() => {
      const visibleText = [...document.querySelectorAll('main *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length);
      const sizes = visibleText.map((e) => parseFloat(getComputedStyle(e).fontSize));
      const durations = new Set();
      for (const e of document.querySelectorAll('body *')) for (const d of getComputedStyle(e).transitionDuration.split(',')) { const ms = parseFloat(d) * (d.includes('ms') ? 1 : 1000); if (ms > 0) durations.add(Math.round(ms)); }
      const navIcons = [...document.querySelectorAll('nav[aria-label="التنقل الرئيسي"] svg')].map((s) => `${s.getAttribute('width')}x${s.getAttribute('height')}`);
      const css = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } }).join('\n');
      return {
        dir: document.documentElement.dir, lang: document.documentElement.lang,
        bodyPx: parseFloat(getComputedStyle(document.body).fontSize), minPx: Math.min(...sizes), under16: sizes.filter((s) => s < 16).length, textNodes: sizes.length,
        durations: [...durations].sort((a, b) => a - b), navIcons: [...new Set(navIcons)], navLinks: document.querySelectorAll('nav[aria-label="التنقل الرئيسي"] a').length,
        activeFeedback: /\.btn:not\(:disabled\):active/.test(css), skeletonCss: /\.skeleton i/.test(css) && /shimmer/.test(css),
        badges: [...document.querySelectorAll('.badge')].map((b) => b.textContent.trim()).filter((t) => !t).length,
      };
    });
    record(app, 'P1', 'Arabic RTL (§6.5)', m.dir === 'rtl' && m.lang === 'ar', { dir: m.dir, lang: m.lang });
    record(app, 'P2', 'base text ≥ 16px (§6.1)', m.bodyPx >= 16, { bodyPx: m.bodyPx, smallestPx: m.minPx, secondaryUnder16: `${m.under16}/${m.textNodes}` });
    record(app, 'P3', 'functional motion 200–400 ms (§5)', m.durations.every((d) => d >= 200 && d <= 400), { durationsMs: m.durations });
    record(app, 'P4', 'consistent icon size (§4.4)', m.navIcons.length === 1, { navIconSizes: m.navIcons });
    record(app, 'P5', 'status not by colour alone (§5.3)', m.badges === 0, { emptyBadges: m.badges });
    record(app, 'P6', 'button press feedback (§5.5) — stylesheet rule present', m.activeFeedback, { activeRule: m.activeFeedback });
    record(app, 'P7', 'skeleton loading, not a bare spinner (§5.2) — stylesheet rule present', m.skeletonCss, { shimmerSkeleton: m.skeletonCss });
    // Measured: from home, each primary service is opened with ONE click and shows its own h1.
    const reached = [];
    const labels = await p.locator('nav[aria-label="التنقل الرئيسي"] a').allTextContents();
    for (const label of labels) {
      await open('/');
      const before = await p.getByRole('heading', { level: 1 }).first().textContent();
      const link = p.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('link', { name: label.trim(), exact: true });
      const href = await link.getAttribute('href');
      await link.click();
      await p.waitForURL((u) => u.pathname === href);
      await p.getByRole('heading', { level: 1 }).first().waitFor();
      if (href !== '/') await p.waitForFunction((b) => document.querySelector('h1')?.textContent !== b, before, { timeout: 5000 }).catch(() => undefined);
      const after = await p.getByRole('heading', { level: 1 }).first().textContent();
      reached.push({ service: label.trim(), clicks: 1, heading: after, changed: label.trim() === labels[0]?.trim() || after !== before });
    }
    record(app, 'P8', 'core services ≤ 3 clicks (§3) — measured', reached.length >= 5 && reached.every((r) => r.changed), { reached });
    await open('/');

    await p.evaluate(() => window.scrollTo(0, 600));
    await p.waitForTimeout(200);
    const scrolled = await p.evaluate(() => { const h = document.querySelector('.shell__header'); const btns = [...h.querySelectorAll('button, a, select')]; return { state: h.dataset.scrolled, hidden: btns.filter((b) => !b.getClientRects().length).length }; });
    record(app, 'P9', 'top bar adapts to scroll, nothing hidden (§5.4)', scrolled.state === 'true' && scrolled.hidden === 0, scrolled);
    await p.evaluate(() => window.scrollTo(0, 0));

    await open('/settings');
    await p.getByLabel('تقليل الشفافية والتمويه').check();
    const glassOff = await p.evaluate(() => getComputedStyle(document.querySelector('nav[aria-label="التنقل الرئيسي"]')).backdropFilter);
    record(app, 'P10', 'user can turn transparency off (§2)', glassOff === 'none', { navBackdropFilter: glassOff });
    await p.getByLabel('تقليل الشفافية والتمويه').uncheck();
    const themes = {};
    for (const [label, key] of [['فاتح', 'light'], ['داكن', 'dark']]) { await p.getByRole('button', { name: label, exact: true }).click(); await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running')); themes[key] = await p.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color]); }
    await p.getByRole('button', { name: 'تلقائي', exact: true }).click();
    record(app, 'P11', 'light and dark are complete themes (§6.4, §7.1)', themes.light[0] !== themes.dark[0] && themes.light[1] !== themes.dark[1], themes);
    await p.emulateMedia({ reducedMotion: 'reduce' });
    const rm = await p.evaluate(() => { const all = [...document.querySelectorAll('body *')]; return { elements: all.length, moving: all.filter((e) => { const cs = getComputedStyle(e); return cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0) || (cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0); }).length }; });
    record(app, 'P12', 'motion can be reduced (§5) — every element', rm.moving === 0, rm);
    await p.emulateMedia({ reducedMotion: 'no-preference' });

    if (app === 'wallet') {
      await open(`/requests/${done.id}`);
      const anim = await p.locator('.alert--success .alert__icon').evaluate((e) => getComputedStyle(e).animationName);
      record(app, 'P13', 'animated confirmation after an important action (§5.1)', anim === 'confirm-pop', { successIconAnimation: anim });
    }

    const overflow = [];
    const routes = app === 'wallet' ? ['/', `/requests/${pending.id}`, '/settings'] : ['/', '/new', `/sessions/${done.id}`];
    for (const [w, scale] of [[320, '100%'], [390, '100%'], [768, '100%'], [1366, '100%'], [683, '200%']]) {
      await p.setViewportSize({ width: w, height: 900 });
      for (const r of routes) {
        await open(r);
        await p.evaluate((s) => { document.documentElement.style.fontSize = s === '100%' ? '' : s; }, scale);
        await p.waitForTimeout(150);
        const ok = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
        if (!ok) overflow.push(`${w}@${scale}${r}`);
        if (r === routes[0] || w === 390 || w === 1366) await p.screenshot({ path: path.join(out, `${app}${r.replace(/\/[0-9a-f-]{36}/, '/id').replace(/\//g, '-').replace(/-$/, '') || ''}-${w}${scale === '200%' ? '-text200' : ''}.png`) });
      }
    }
    record(app, 'P14', 'responsive 320/390/768/1366 + 200 % text, no horizontal scroll (§3, §6.6)', overflow.length === 0, { overflow });
    await ctx.close();
  }
} finally {
  await browser?.close();
  stack.stop();
  await writeFile(path.join(out, 'audit.json'), JSON.stringify({ at: new Date().toISOString(), checks }, null, 2));
  const failed = checks.filter((c) => c.outcome !== 'PASS').length;
  console.log(`\nPDF AUDIT: ${checks.length - failed} PASS / ${failed} FAIL`);
  process.exitCode = failed || checks.length === 0 ? 1 : 0;
}
