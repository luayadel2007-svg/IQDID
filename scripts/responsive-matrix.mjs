// TASK-13 multi-device matrix — production builds + ONE demo API, synthetic data, TEST ONLY.
// For each browser engine × CSS width × route it measures: horizontal overflow, overlapping
// controls, clipped text, visible navigation, content hidden under fixed bars, reachable consent
// actions and dialogs. Extra modes: landscape, short viewports, 200 % / 400 % zoom (as CSS-pixel
// reflow), large text, device-pixel ratios, touch. Cross-device journeys at the end.
// Usage: npm run build && node scripts/responsive-matrix.mjs
//   IQDI_BROWSERS=chromium,firefox,webkit (default chromium)   IQDI_MATRIX=full|quick (default full)
// Evidence → evidence/<IQDID_RESPONSIVE_DIR | task13/responsive>/ (matrix.json, screenshots/)
import * as pw from 'playwright-core';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startStack } from './stack.mjs';

const out = path.resolve('evidence', process.env.IQDID_RESPONSIVE_DIR ?? 'task13/responsive');
await mkdir(path.join(out, 'screenshots'), { recursive: true });
const BROWSERS = (process.env.IQDI_BROWSERS ?? 'chromium').split(',').map((s) => s.trim()).filter(Boolean);
const QUICK = process.env.IQDI_MATRIX === 'quick';
const WIDTHS = QUICK ? [320, 390, 768, 1366] : [320, 360, 375, 390, 414, 480, 600, 768, 820, 1024, 1280, 1366, 1440, 1920, 2560];
const heightFor = (w) => (w < 600 ? 800 : w < 1024 ? 1024 : w < 1920 ? 900 : 1200);
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const rows = [], journeys = [], lines = [];
const stack = startStack({ preview: true, env: { DEMO_LATENCY_MS: '0', DEMO_SESSION_TTL_MS: '600000' }, onLine: (l) => lines.push(l) });

// ---------------------------------------------------------------- in-page probes
/** Runs in the page. Returns layout problems for the current scroll position. */
const PROBE = () => {
  const vw = window.innerWidth, vh = window.innerHeight;
  // Visible to sighted users: excludes the screen-reader-only pattern (1px box, clip rect(0…)).
  const visible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && (cs.clip === 'auto' || cs.clip === '') && cs.clipPath !== 'inset(50%)'; };
  const label = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}:${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24)}`;
  const problems = [];
  if (document.documentElement.scrollWidth > vw + 1) problems.push(`overflow-x ${document.documentElement.scrollWidth}>${vw}`);
  // Overlapping controls (outside the intentionally overlapping card stack and the fixed nav).
  const fixedNav = document.querySelector('nav[aria-label="التنقل الرئيسي"]');
  const controls = [...document.querySelectorAll('main a, main button, main input, main select, main textarea, header a, header button, header select, nav[aria-label="التنقل الرئيسي"] a')]
    .filter((e) => visible(e) && !e.closest('.card-stack') && !e.closest('.visually-hidden') && !(e.tagName === 'INPUT' && ['radio', 'checkbox'].includes(e.type) && e.closest('label')));
  // The part of an element a user can actually see: clipped by every scrolling/overflow-hidden ancestor.
  const shown = (e) => {
    let r = e.getBoundingClientRect(); let l = r.left, t = r.top, rt = r.right, b = r.bottom;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const q = a.getBoundingClientRect(); l = Math.max(l, q.left); t = Math.max(t, q.top); rt = Math.min(rt, q.right); b = Math.min(b, q.bottom); }
    }
    return { left: l, top: t, right: rt, bottom: b };
  };
  const rects = controls.map((e) => [e, shown(e)]).filter(([, r]) => r.right - r.left > 1 && r.bottom - r.top > 1);
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const [a, ra] = rects[i], [b, rb] = rects[j];
    if (a.contains(b) || b.contains(a)) continue;
    // Page content scrolling beneath the floating nav overlay is by design (checked separately: nothing stays hidden under it).
    if (fixedNav && getComputedStyle(fixedNav).position === 'fixed' && fixedNav.contains(a) !== fixedNav.contains(b)) continue;
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 2 && iy > 2) problems.push(`overlap ${label(a)} × ${label(b)}`);
  }
  // Clipped text: text containers that hide overflow without an ellipsis.
  for (const e of document.querySelectorAll('main *, header *')) {
    if (!visible(e) || e.closest('.visually-hidden') || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(e);
    if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2) problems.push(`clipped-x ${label(e)}`);
    if ((cs.overflowY === 'hidden' || cs.overflowY === 'clip') && e.scrollHeight > e.clientHeight + 2 && !e.closest('.card-stack, .mini-cards')) problems.push(`clipped-y ${label(e)}`);
    const r = e.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) { const sc = e.closest('.table-wrap, .chip-filter, .mini-cards, .nav, .segmented'); if (!sc) problems.push(`offscreen ${label(e)}`); }
  }
  // Navigation labels must fit their own link (no label running into the next one).
  for (const a of document.querySelectorAll('nav[aria-label="التنقل الرئيسي"] a')) {
    if (!visible(a)) continue;
    const r = a.getBoundingClientRect();
    for (const t of a.querySelectorAll('*')) { if (!visible(t)) continue; const q = t.getBoundingClientRect(); if (q.left < r.left - 1 || q.right > r.right + 1) { problems.push(`nav label overflows ${label(a)}`); break; } }
    const range = document.createRange(); range.selectNodeContents(a); const q = range.getBoundingClientRect();
    if (q.width > 0 && (q.left < r.left - 1 || q.right > r.right + 1)) problems.push(`nav label overflows ${label(a)}`);
  }
  // Navigation present and on screen.
  if (!fixedNav || !visible(fixedNav)) problems.push('navigation hidden');
  else { const r = fixedNav.getBoundingClientRect(); if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) problems.push('navigation off page'); }
  return { problems, navFixed: fixedNav ? getComputedStyle(fixedNav).position === 'fixed' : false, vw, vh };
};
let browser;
try {
  await stack.ready();
  const api = `${stack.urls.api}/demo-api/v1`;
  const post = (p, b) => fetch(api + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }).then((r) => r.json());
  await post('/demo/reset');
  const pending = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'IDENTITY_BASIC', purpose: 'تحديث بيانات عميل مصرفي تجريبي لغرض اختبار التخطيط على الأجهزة المختلفة' });
  const accepted = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'فتح حساب مصرفي تجريبي' });
  await post(`/wallet/requests/${accepted.id}/decision`, { decision: 'ACCEPT' });
  const ROUTES = {
    wallet: ['/', '/cards', '/cards?card=cred-test-002', '/cards?view=list', '/credentials/cred-test-001?from=cards', `/requests/${pending.id}`, `/requests/${pending.id}/disclosure`, '/settings'],
    verifier: ['/', '/new', '/sessions', `/sessions/${accepted.id}`, '/results'],
  };
  const URL_OF = { wallet: stack.urls.wallet, verifier: stack.urls.verifier };
  const routeName = (r) => r.replace(pending.id, ':pending').replace(accepted.id, ':accepted');

  for (const engine of BROWSERS) {
    const type = pw[engine];
    if (!type) throw new Error(`unknown browser ${engine}`);
    browser = await type.launch(engine === 'chromium' && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const version = browser.version();
    const open = async (page, app, route) => {
      await page.goto(URL_OF[app] + route);
      await page.locator('main h1').first().waitFor({ timeout: 15_000 });
      await page.waitForFunction(() => !document.querySelector('main .skeleton'), null, { timeout: 15_000 });
      await page.evaluate(() => document.fonts.ready);
    };
    const record = (r) => { rows.push({ browser: engine, browserVersion: version, os: `${os.platform()} ${os.release()}`, ...r }); if (r.outcome !== 'PASS') console.log(`FAIL ${engine} ${r.app} ${r.mode} ${r.width}x${r.height} ${r.route}: ${r.problems.slice(0, 3).join(' | ')}`); };

    /** One page check: probe at top, probe after scrolling to the bottom, consent + dialog checks on request pages. */
    const check = async (page, app, route, mode, width, height, shot) => {
      const problems = [];
      try {
        await open(page, app, route);
        const top = await page.evaluate(PROBE);
        problems.push(...top.problems);
        // Scrolled to the very end (instant; the app uses smooth scrolling), the last control in <main>
        // must sit fully above a fixed bottom bar, i.e. nothing is permanently hidden under it.
        const under = await page.evaluate(() => {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
          const nav = document.querySelector('nav[aria-label="التنقل الرئيسي"]');
          if (!nav || getComputedStyle(nav).position !== 'fixed') return null;
          const n = nav.getBoundingClientRect();
          const c = [...document.querySelectorAll('main a, main button, main input, main select, main textarea')].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 1 && r.width > 1 && !e.closest('.card-stack, .visually-hidden'); });
          const e = c.at(-1); if (!e) return null;
          const r = e.getBoundingClientRect();
          const overlapsX = r.right > n.left && r.left < n.right;
          return overlapsX && r.bottom > n.top + 1 ? `last control «${e.textContent.trim().slice(0, 30)}» under fixed nav (${Math.round(r.bottom - n.top)}px)` : null;
        });
        if (under) problems.push(under);
        if (app === 'wallet' && route.startsWith('/requests/')) {
          for (const name of ['موافقة تجريبية', 'رفض']) {
            const btn = page.getByRole('button', { name, exact: true });
            const hit = await btn.evaluate((e) => { e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h && (h === e || e.contains(h)) ? 'ok' : `covered-by ${h?.tagName.toLowerCase()}.${String(h?.className).split(' ')[0]}`; });
            if (hit !== 'ok') problems.push(`consent «${name}» ${hit}`);
          }
          await page.getByRole('button', { name: 'رفض', exact: true }).click();
          const dlg = page.getByRole('dialog');
          await dlg.waitFor();
          const box = await dlg.boundingBox();
          if (!box || box.x < -1 || box.y < -1 || box.x + box.width > width + 1 || box.y + box.height > height + 1) problems.push(`dialog outside viewport ${JSON.stringify(box)}`);
          const confirm = dlg.getByRole('button', { name: 'تأكيد الرفض' });
          const reach = await confirm.evaluate((e) => { e.scrollIntoView({ block: 'nearest', behavior: 'instant' }); const r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.top >= 0 && r.bottom <= innerHeight + 1 && h && (h === e || e.contains(h)) ? 'ok' : 'unreachable'; });
          if (reach !== 'ok') problems.push('dialog confirm unreachable');
          await page.keyboard.press('Escape');
          await dlg.waitFor({ state: 'detached' });
        }
        if (shot) { await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(80); await page.screenshot({ path: path.join(out, 'screenshots', `${shot}.png`), fullPage: false }); }
      } catch (e) { problems.push(`error ${String(e.message).split('\n')[0]}`); }
      record({ app, route: routeName(route), mode, width, height, problems, outcome: problems.length ? 'FAIL' : 'PASS' });
    };

    // 0. Probe self-test: injected faults MUST be detected, so a green matrix is not vacuous.
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'ar' });
      const page = await ctx.newPage();
      const faults = [
        ['horizontal overflow', '/', '.home-block--summary { width: 640px !important; }', /^overflow-x/],
        // Engine-independent: all three tiles stacked on the same spot (a spacing-dependent shift passed in WebKit).
        ['overlapping controls', '/', '.quick3 { position: relative !important; display: block !important; height: 120px; } .quick3 .quick { position: absolute !important; top: 0; inset-inline-start: 0; width: 120px; }', /^overlap/],
        ['clipped text', '/', '.welcome__name { width: 30px; overflow: hidden; white-space: nowrap; }', /^clipped-x/],
        ['content under the fixed nav', '/credentials/cred-test-001?from=cards', '.shell--mobile .shell__main { padding-bottom: 0 !important; }', /under fixed nav/],
      ];
      for (const [name, route, css, expect] of faults) {
        await open(page, 'wallet', route);
        await page.addStyleTag({ content: css });
        await page.waitForTimeout(50);
        let found = (await page.evaluate(PROBE)).problems;
        if (/under fixed nav/.test(String(expect))) found = found.concat(await page.evaluate(() => { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); const n = document.querySelector('nav[aria-label="التنقل الرئيسي"]').getBoundingClientRect(); const c = [...document.querySelectorAll('main a, main button')].filter((e) => e.getBoundingClientRect().height > 1); const r = c.at(-1).getBoundingClientRect(); return r.bottom > n.top + 1 ? ['last control under fixed nav'] : []; }));
        const ok = found.some((p) => expect.test(p));
        record({ app: 'wallet', route, mode: `probe-selftest: ${name}`, width: 390, height: 800, detected: found.slice(0, 3), problems: ok ? [] : [`probe missed injected fault: ${name}`], outcome: ok ? 'PASS' : 'FAIL' });
      }
      await ctx.close();
    }

    // 1. Width matrix, portrait, normal text.
    for (const app of ['wallet', 'verifier']) {
      for (const width of WIDTHS) {
        const height = heightFor(width);
        const ctx = await browser.newContext({ viewport: { width, height }, locale: 'ar', ...(engine !== 'firefox' && width < 1024 ? { hasTouch: true } : {}) });
        const page = await ctx.newPage();
        for (const route of ROUTES[app]) {
          const key = `${route === '/' ? 'home' : route.split('?')[0].split('/').filter(Boolean)[0]}`;
          const shot = engine === 'chromium' && [320, 390, 820, 1024, 1440].includes(width) && ['/', '/cards', `/requests/${pending.id}`, '/sessions', `/sessions/${accepted.id}`].includes(route) ? `${app}-${key}${route.includes('requests') ? '-review' : ''}-${width}` : (engine !== 'chromium' && width === 390 && route === '/' ? `${engine}-${app}-home-390` : null);
          await check(page, app, route, 'portrait', width, height, shot);
        }
        await ctx.close();
      }
    }

    // 2. Extra modes (fewer routes): landscape, short viewport, zoom reflow, large text, DPR.
    const MODES = [
      { mode: 'landscape-phone', width: 844, height: 390, touch: true },
      { mode: 'landscape-phone-small', width: 667, height: 375, touch: true },
      { mode: 'landscape-tablet', width: 1180, height: 820, touch: true },
      { mode: 'foldable-unfolded', width: 673, height: 841, touch: true },
      { mode: 'split-screen-narrow', width: 340, height: 900 },
      { mode: 'short-viewport', width: 1280, height: 600 },
      { mode: 'zoom-200', width: 640, height: 450, dpr: 2 },
      { mode: 'zoom-400-reflow', width: 320, height: 256, dpr: 4 },
      { mode: 'text-larger-phone', width: 390, height: 844, text: 'larger' },
      { mode: 'text-larger-tablet', width: 820, height: 1180, text: 'larger' },
      { mode: 'dpr-3-phone', width: 390, height: 844, dpr: 3 },
    ];
    for (const m of MODES) {
      for (const app of ['wallet', 'verifier']) {
        const ctx = await browser.newContext({ viewport: { width: m.width, height: m.height }, locale: 'ar', ...(m.dpr && engine !== 'firefox' ? { deviceScaleFactor: m.dpr } : {}), ...(m.touch && engine !== 'firefox' ? { hasTouch: true } : {}) });
        if (m.text) await ctx.addInitScript((t) => { try { localStorage.setItem('iqdid-appearance-v1', JSON.stringify({ text: t, glass: true, motion: 'system' })); } catch { /* none */ } }, m.text);
        const page = await ctx.newPage();
        const routes = app === 'wallet' ? ['/', '/cards', `/requests/${pending.id}`, '/settings'] : ['/', '/new', `/sessions/${accepted.id}`];
        for (const route of routes) {
          const shot = engine === 'chromium' && route === routes[0] && ['zoom-400-reflow', 'text-larger-phone', 'landscape-phone', 'foldable-unfolded'].includes(m.mode) ? `${app}-${m.mode}` : (engine === 'chromium' && app === 'wallet' && m.mode === 'text-larger-phone' && route === '/cards' ? 'wallet-cards-text-larger' : null);
          await check(page, app, route, m.mode, m.width, m.height, shot);
        }
        await ctx.close();
      }
    }

    // 3. Dark theme captures + reduced motion/transparency sanity (chromium only, evidence).
    if (engine === 'chromium') {
      for (const [app, route, w, name] of [['wallet', '/cards', 390, 'wallet-cards-dark-390'], ['wallet', `/credentials/cred-test-001?from=cards`, 390, 'wallet-card-details-dark-390'], ['verifier', '/', 1440, 'verifier-dashboard-dark-1440'], ['wallet', '/', 820, 'wallet-home-dark-820']]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, locale: 'ar', colorScheme: 'dark', reducedMotion: 'reduce' });
        const page = await ctx.newPage();
        await check(page, app, route, 'dark+reduced-motion', w, heightFor(w), name);
        await ctx.close();
      }
    }

    // 3b. Accessibility/interaction states (chromium captures): keyboard focus on the stack, selected card, details, privacy mode.
    if (engine === 'chromium') {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
      const page = await ctx.newPage();
      const shotAt = async (name) => { await page.waitForTimeout(150); await page.screenshot({ path: path.join(out, 'screenshots', `${name}.png`) }); };
      const problems = [];
      try {
        await open(page, 'wallet', '/cards');
        await page.locator('.card-stack button').first().focus();
        await page.keyboard.press('ArrowDown');
        if (!(await page.evaluate(() => document.activeElement?.closest('.card-stack') && document.activeElement.matches(':focus-visible')))) problems.push('keyboard focus not visible on the stack');
        await shotAt('state-cards-keyboard-focus-390');
        await page.keyboard.press('Enter');
        await page.locator('.card-stack button[aria-expanded="true"]').waitFor();
        await shotAt('state-card-selected-390');
        await page.keyboard.press('Escape');
        await open(page, 'wallet', '/credentials/cred-test-001?from=cards');
        await shotAt('wallet-card-details-light-390');
        await open(page, 'wallet', '/');
        await page.getByRole('button', { name: 'وضع الخصوصية' }).click();
        if ((await page.locator('.welcome__name').textContent()).includes('مواطن تجريبي')) problems.push('privacy mode shows the name');
        await shotAt('state-privacy-mode-390');
        await page.getByRole('button', { name: 'وضع الخصوصية' }).click();
      } catch (e) { problems.push(String(e.message).split('\n')[0]); }
      record({ app: 'wallet', route: '/cards', mode: 'states: keyboard focus, selection, privacy', width: 390, height: 844, problems, outcome: problems.length ? 'FAIL' : 'PASS' });
      await ctx.close();
    }

    // 4. Cross-device journeys: verifier on one device creates, wallet on another decides (touch / mouse / keyboard).
    const JOURNEYS = [
      { name: 'phone-touch → tablet verifier', wallet: { width: 360, height: 780, touch: true }, verifier: { width: 768, height: 1024 }, input: 'touch', decision: 'ACCEPT' },
      { name: 'tablet-touch → desktop verifier', wallet: { width: 820, height: 1180, touch: true }, verifier: { width: 1440, height: 900 }, input: 'touch', decision: 'REJECT' },
      { name: 'desktop keyboard-only → small-screen verifier', wallet: { width: 1440, height: 900 }, verifier: { width: 390, height: 844 }, input: 'keyboard', decision: 'ACCEPT' },
    ];
    for (const j of JOURNEYS) {
      const t = Date.now();
      const steps = [];
      let outcome = 'PASS', error;
      const wctx = await browser.newContext({ viewport: { width: j.wallet.width, height: j.wallet.height }, locale: 'ar', ...(j.wallet.touch && engine !== 'firefox' ? { hasTouch: true, ...(engine === 'chromium' ? { isMobile: true } : {}) } : {}) });
      const vctx = await browser.newContext({ viewport: { width: j.verifier.width, height: j.verifier.height }, locale: 'ar' });
      try {
        const v = await vctx.newPage(), w = await wctx.newPage();
        const press = async (loc) => { if (j.input === 'touch' && engine !== 'firefox') await loc.tap(); else if (j.input === 'keyboard') { await loc.focus(); await w.keyboard.press('Enter'); } else await loc.click(); };
        await v.goto(`${stack.urls.verifier}/new`);
        await v.getByLabel('الغرض من الطلب').fill(`رحلة ${j.name}`);
        await v.getByRole('button', { name: 'مراجعة الطلب' }).click();
        await v.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }).click();
        await v.getByText('أُرسل الطلب إلى المحفظة التجريبية.').waitFor();
        const id = new URL(v.url()).pathname.split('/').pop();
        steps.push(`verifier ${j.verifier.width}px created ${id.slice(0, 8)}`);
        await w.goto(`${stack.urls.wallet}/requests`);
        await press(w.getByRole('link', { name: 'مصرف تجريبي (أ)' }).first());
        await w.getByRole('button', { name: 'رفض', exact: true }).waitFor();
        steps.push(`wallet ${j.wallet.width}px opened the request (${j.input})`);
        if (j.decision === 'ACCEPT') { await press(w.getByRole('button', { name: 'موافقة تجريبية' })); await press(w.getByRole('dialog').getByRole('button', { name: 'تأكيد الموافقة' })); await w.getByText('سُجلت موافقتك التجريبية').waitFor(); }
        else { await press(w.getByRole('button', { name: 'رفض', exact: true })); await press(w.getByRole('dialog').getByRole('button', { name: 'تأكيد الرفض' })); await w.getByText('رفضت هذا الطلب').waitFor(); }
        steps.push(`wallet decided ${j.decision}`);
        await v.getByText(j.decision === 'ACCEPT' ? 'موافقة تجريبية — DEMO_ACCEPTED' : 'رفض المواطن الطلب').waitFor({ timeout: 10_000 });
        steps.push('verifier updated live');
        const text = await v.evaluate(() => document.body.innerText);
        if (/\bVERIFIED\b|VERIFIED_BY_PROTOCOL|تم التحقق من الهوية/.test(text)) throw new Error('protocol claim');
        if (engine === 'chromium') { await w.screenshot({ path: path.join(out, 'screenshots', `journey-${j.wallet.width}-wallet-${j.decision.toLowerCase()}.png`) }); await v.screenshot({ path: path.join(out, 'screenshots', `journey-${j.verifier.width}-verifier-${j.decision.toLowerCase()}.png`) }); }
      } catch (e) { outcome = 'FAIL'; error = String(e.message).split('\n')[0]; console.log(`FAIL journey ${engine} ${j.name}: ${error}`); }
      journeys.push({ browser: engine, browserVersion: version, name: j.name, input: j.input, decision: j.decision, steps, outcome, ...(error ? { error } : {}), ms: Date.now() - t });
      await wctx.close(); await vctx.close();
    }
    // 5. PWA (wallet): manifest valid, icons load at their declared size, no service worker, Chromium installability.
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
      const page = await ctx.newPage();
      const problems = [];
      let installability = null;
      try {
        await open(page, 'wallet', '/');
        const m = await page.evaluate(async () => {
          const link = document.querySelector('link[rel="manifest"]');
          if (!link) return { error: 'no manifest link' };
          const res = await fetch(link.href);
          const json = await res.json();
          const icons = [];
          for (const i of json.icons ?? []) { const r = await fetch(new URL(i.src, link.href)); const bmp = await createImageBitmap(await r.blob()); icons.push({ src: i.src, declared: i.sizes, actual: `${bmp.width}x${bmp.height}`, purpose: i.purpose, status: r.status }); }
          const sw = 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0;
          return { status: res.status, contentType: res.headers.get('content-type'), name: json.name, short_name: json.short_name, start_url: json.start_url, display: json.display, lang: json.lang, dir: json.dir, icons, serviceWorkers: sw, appleTouch: Boolean(document.querySelector('link[rel="apple-touch-icon"]')) };
        });
        if (m.error) problems.push(m.error);
        else {
          if (m.status !== 200) problems.push(`manifest HTTP ${m.status}`);
          if (!m.name || !m.short_name || m.start_url !== '/' || m.display !== 'standalone' || m.lang !== 'ar' || m.dir !== 'rtl') problems.push('manifest fields');
          if (!m.icons.some((i) => i.actual === '192x192') || !m.icons.some((i) => i.actual === '512x512' && i.purpose === 'maskable')) problems.push('icons');
          for (const i of m.icons) if (i.declared !== i.actual || i.status !== 200) problems.push(`icon ${i.src} ${i.actual}`);
          if (m.serviceWorkers !== 0) problems.push('a service worker is registered');
          if (!m.appleTouch) problems.push('no apple-touch-icon');
        }
        if (engine === 'chromium') {
          const cdp = await ctx.newCDPSession(page);
          installability = (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors;
        }
        record({ app: 'wallet', route: '/', mode: 'pwa-manifest', width: 390, height: 844, manifest: m, installability, problems, outcome: problems.length ? 'FAIL' : 'PASS' });
        console.log(`PWA ${engine}: ${problems.length ? problems.join(', ') : 'manifest OK'}; installability errors: ${installability ? JSON.stringify(installability) : 'n/a'}`);
      } catch (e) { record({ app: 'wallet', route: '/', mode: 'pwa-manifest', width: 390, height: 844, problems: [String(e.message)], outcome: 'FAIL' }); }
      await ctx.close();
    }
    await browser.close(); browser = undefined;
  }
} catch (e) { rows.push({ browser: 'harness', outcome: 'FAIL', problems: [String(e?.message ?? e)] }); console.log(`FAIL harness ${e?.message ?? e}`); }
finally {
  await browser?.close();
  await stack.stopped();
  const results = [...rows.map((r) => ({ ...r, kind: 'layout' })), ...journeys.map((j) => ({ ...j, kind: 'journey' }))];
  const failed = results.filter((r) => r.outcome !== 'PASS');
  const byBrowser = {};
  for (const r of results) { const b = (byBrowser[r.browser] ??= { pass: 0, fail: 0 }); b[r.outcome === 'PASS' ? 'pass' : 'fail'] += 1; }
  await writeFile(path.join(out, 'matrix.json'), JSON.stringify({ at: new Date().toISOString(), commit, node: process.version, platform: `${os.platform()} ${os.release()} ${os.arch()}`, browsers: BROWSERS, widths: WIDTHS, summary: byBrowser, results }, null, 2));
  await writeFile(path.join(out, 'stack.log'), lines.join('\n'));
  console.log(`\nRESPONSIVE MATRIX: ${results.length - failed.length} PASS / ${failed.length} FAIL ${JSON.stringify(byBrowser)}`);
  process.exitCode = failed.length || results.length === 0 ? 1 : 0;
}
