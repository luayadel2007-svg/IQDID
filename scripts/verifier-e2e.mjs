// TASK-10 Institutional Verifier — browser journeys (Chromium via playwright-core) against the
// PRODUCTION builds and ONE demo API. TEST ONLY, synthetic data.
// Usage: npm run build && node scripts/verifier-e2e.mjs   Evidence → evidence/<IQDID_VERIFIER_EVIDENCE_DIR | task10/verifier-e2e>/
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startStack } from './stack.mjs';

const require = createRequire(import.meta.url);
const axe = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const out = path.resolve('evidence', process.env.IQDID_VERIFIER_EVIDENCE_DIR ?? 'task10/verifier-e2e');
await mkdir(path.join(out, 'screenshots'), { recursive: true });
const TTL_MS = 15_000;
const lines = [], results = [], audits = [];
const stack = startStack({ preview: true, env: { DEMO_SESSION_TTL_MS: String(TTL_MS), DEMO_LATENCY_MS: '60' }, onLine: (l) => lines.push(l) });
const check = (v, why) => { if (!v) throw new Error(why); };
async function step(name, fn) {
  const t = Date.now();
  try { await fn(); results.push({ name, outcome: 'PASS', ms: Date.now() - t }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, outcome: 'FAIL', ms: Date.now() - t, error: String(e?.message ?? e).slice(0, 500) }); console.log(`FAIL  ${name}\n      ${String(e?.message ?? e).split('\n')[0]}`); }
}
let browser;
try {
  await stack.ready();
  const api = `${stack.urls.api}/demo-api/v1`;
  const post = (p, body) => fetch(api + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) }).then(async (r) => ({ status: r.status, body: await r.json() }));
  const get = (p) => fetch(api + p).then((r) => r.json());
  const create = (purpose, organizationId = 'org-test-a', templateId = 'AGE_OVER_18') => post('/verifier/sessions', { organizationId, templateId, purpose }).then((r) => r.body);
  const decide = (id, decision) => post(`/wallet/requests/${id}/decision`, { decision });
  await post('/demo/reset');
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'ar', colorScheme: 'light' });
  const p = await ctx.newPage();
  const consoleErrors = [];
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text()); });
  const V = stack.urls.verifier;
  const nav = (name) => p.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('link', { name });
  const shot = (name, fullPage = true) => p.screenshot({ path: path.join(out, 'screenshots', `${name}.png`), fullPage });
  const settled = async () => { await p.locator('main').waitFor(); await p.waitForFunction(() => !document.querySelector('main .skeleton')); };
  const open = async (route) => { await p.goto(V + route); await settled(); };
  const text = () => p.evaluate(() => document.body.innerText);
  const noProtocolClaim = async () => check(!/VERIFIED_BY_PROTOCOL|\bVERIFIED\b|تم التحقق من الهوية/.test(await text()), 'page claims protocol verification');
  const setTheme = async (theme) => { await p.evaluate((t) => { localStorage.setItem('iqdid-demo-theme', t); window.dispatchEvent(new Event('storage')); }, theme); await p.waitForFunction((t) => document.documentElement.dataset.theme === t, theme); await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running')); };
  const audit = async (label) => {
    await p.addScriptTag({ content: axe });
    const report = await p.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    audits.push({ label, violations: report.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })) });
    check(report.violations.length === 0, `${label}: ${report.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target).join(',')}`).join('; ')}`);
  };
  const rowCount = () => p.locator('table.vf-table tbody tr').count();
  let firstSession;

  await step('dashboard: empty state, no invented statistics before any data', async () => {
    await open('/');
    await p.getByRole('heading', { level: 1, name: 'لوحة المتابعة' }).waitFor();
    await p.getByText('لا توجد جلسات بعد').waitFor();
    check(await p.getByRole('region', { name: 'مؤشرات الجلسات' }).count() === 0, 'KPI tiles shown without data');
    await shot('t10-01-dashboard-empty');
  });

  await step('create flow: details → preview → review → confirm → session code', async () => {
    await nav('طلب تحقق جديد').click();
    await p.getByRole('heading', { level: 1, name: 'إنشاء طلب تحقق تجريبي' }).waitFor();
    await p.getByRole('radio', { name: /التحقق من الهوية الأساسية/ }).check();
    await p.getByLabel('الغرض من الطلب').fill('تحديث بيانات عميل مصرفي تجريبي');
    const fields = await p.getByRole('list', { name: 'البيانات المطلوب مشاركتها' }).getByRole('listitem').allTextContents();
    check(JSON.stringify(fields) === JSON.stringify(['الاسم الكامل', 'تاريخ الميلاد', 'رقم الوثيقة التجريبي']), `preview fields ${fields}`);
    await p.getByText(/مدة صلاحية الجلسة/).waitFor();
    await shot('t10-02-create-details');
    await p.getByRole('button', { name: 'مراجعة الطلب' }).click();
    await p.getByRole('heading', { name: 'المراجعة والتأكيد' }).waitFor();
    check((await get('/verifier/sessions?organizationId=org-test-a')).length === 0, 'session created before confirmation');
    await shot('t10-03-create-review');
    await p.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }).click();
    await p.getByText('أُرسل الطلب إلى المحفظة التجريبية.').waitFor();
    [firstSession] = await get('/verifier/sessions?organizationId=org-test-a');
    check(firstSession?.templateId === 'IDENTITY_BASIC' && firstSession.status === 'PENDING', 'API session mismatch');
    await p.getByRole('heading', { level: 1, name: `جلسة ${firstSession.shortCode}` }).waitFor();
    check((await p.locator('.vf-bigcode').textContent())?.trim() === firstSession.shortCode, 'session code not shown');
    await shot('t10-04-session-created');
  });

  await step('live update: wallet approval reaches the open session page as DEMO_ACCEPTED, five trust layers, no protocol claim', async () => {
    check((await decide(firstSession.id, 'ACCEPT')).status === 200, 'decision failed');
    await p.getByText('موافقة تجريبية — DEMO_ACCEPTED').waitFor({ timeout: 10_000 });
    const layers = p.getByRole('list', { name: 'طبقات الحالة والثقة' }).getByRole('listitem');
    check(await layers.count() === 5, 'trust layers != 5');
    check((await layers.nth(4).textContent()).includes('غير متحقق منه تشفيرياً'), 'crypto layer not explicit');
    await p.getByText('TEST-DOC-0001').waitFor();
    await noProtocolClaim();
    await shot('t10-05-session-accepted');
  });

  await step('many sessions: KPI tile opens the filtered list; search, status filter and sort agree with the API', async () => {
    const r = await create('طلب سيُرفض', 'org-test-a', 'AGE_OVER_18');
    await decide(r.id, 'REJECT');
    await create('خدمة إلكترونية تجريبية');
    await create('فتح حساب توفير تجريبي');
    await open('/');
    const kpis = p.getByRole('region', { name: 'مؤشرات الجلسات' });
    await kpis.waitFor();
    await shot('t10-06-dashboard');
    await kpis.getByRole('link', { name: /بانتظار القرار/ }).click();
    await p.waitForURL(/\/sessions\?status=PENDING$/);
    await p.getByRole('heading', { level: 1, name: 'جلسات التحقق' }).waitFor();
    const all = await get('/verifier/sessions?organizationId=org-test-a');
    const pending = all.filter((s) => s.status === 'PENDING').length;
    await p.getByText(`عرض ${pending} من ${all.length} جلسة`).waitFor();
    check(await rowCount() === pending, 'pending filter count');
    await p.getByLabel('بحث في الجلسات').fill(r.shortCode);
    await p.getByText('لا توجد جلسات مطابقة').waitFor();
    await p.getByRole('button', { name: 'مسح التصفية' }).click();
    await p.getByText(`عرض ${all.length} من ${all.length} جلسة`).waitFor();
    await p.getByLabel('بحث في الجلسات').fill(r.shortCode);
    check(await rowCount() === 1, 'search by code');
    await p.getByLabel('بحث في الجلسات').fill('');
    const fresh = await create('طلب لاختبار الترتيب');
    await p.getByText(fresh.shortCode).waitFor();
    await p.getByLabel('الترتيب').selectOption('oldest');
    check((await p.locator('table.vf-table tbody tr').last().textContent()).includes(fresh.shortCode), 'oldest-first sort');
    await p.getByLabel('الترتيب').selectOption('expiry');
    const now = await get('/verifier/sessions?organizationId=org-test-a');
    const expected = now.filter((s) => s.status === 'PENDING').sort((x, y) => Date.parse(x.expiresAt) - Date.parse(y.expiresAt))[0];
    check((await p.locator('table.vf-table tbody tr').first().textContent()).includes(expected.shortCode), 'expiry sort: nearest pending expiry first');
    await shot('t10-07-sessions-filtered');
  });

  await step('results: outcome summary and filter; pending sessions excluded', async () => {
    await nav('النتائج').click();
    await p.getByRole('heading', { level: 1, name: 'نتائج الطلبات' }).waitFor();
    await p.getByText('عرض 2 من 2 نتيجة').waitFor();
    await p.getByRole('button', { name: 'رفض', exact: true }).click();
    await p.getByText('عرض 1 من 2 نتيجة').waitFor();
    check(!(await text()).includes('خدمة إلكترونية تجريبية'), 'pending shown in results');
    await shot('t10-08-results');
  });

  await step('cancel needs confirmation; a cancelled session refuses a late citizen decision', async () => {
    const s = await create('طلب سيُلغى');
    await open(`/sessions/${s.id}`);
    await p.getByRole('button', { name: 'إلغاء الطلب' }).click();
    await p.getByRole('dialog').waitFor();
    check((await get(`/verifier/sessions/${s.id}?organizationId=org-test-a`)).status === 'PENDING', 'cancelled without confirmation');
    await p.getByRole('button', { name: 'تأكيد الإلغاء' }).click();
    await p.getByText('ألغت المؤسسة الطلب قبل القرار.').waitFor({ timeout: 10_000 });
    check((await decide(s.id, 'ACCEPT')).status === 409, 'late decision on cancelled session accepted');
  });

  await step('expiry: open session moves to EXPIRED on its own; a late decision is refused', async () => {
    const s = await create('طلب سينتهي دون قرار');
    await open(`/sessions/${s.id}`);
    await p.getByRole('timer').waitFor();
    await p.getByText('انتهت مهلة الطلب').waitFor({ timeout: TTL_MS + 10_000 });
    await p.getByText('انتهت المهلة دون قرار').waitFor();
    const late = await decide(s.id, 'ACCEPT');
    check(late.status === 409 && late.body.error.code === 'SESSION_EXPIRED', `late decision ${late.status}`);
    await shot('t10-09-session-expired');
  });

  await step('organisation isolation: org B sees none of org A sessions, details, results or activity', async () => {
    await open('/sessions');
    await p.getByLabel('المؤسسة:').selectOption('org-test-b');
    await p.getByText('لا توجد جلسات', { exact: true }).waitFor();
    for (const route of ['/', '/results', '/activity', `/sessions/${firstSession.id}`]) {
      await open(route);
      await p.waitForTimeout(300);
      const t = await text();
      check(!t.includes(firstSession.shortCode) && !t.includes('TEST-DOC-0001') && !t.includes('تحديث بيانات عميل مصرفي تجريبي'), `org A data visible at ${route}`);
    }
    await p.getByText('العنصر المطلوب غير موجود.').waitFor();
    await shot('t10-10-org-b-isolated');
    await p.getByLabel('المؤسسة:').selectOption('org-test-a');
  });

  await step('network failure: last good data stays with a notice and retry; recovers when the API returns', async () => {
    await open('/sessions');
    await p.locator('table.vf-table').waitFor();
    await ctx.route('**/demo-api/v1/**', (r) => r.abort('internetdisconnected'));
    try {
      await p.getByText('تعذر تحديث البيانات من خادم المحاكاة.').waitFor({ timeout: 15_000 });
      check(await rowCount() > 0, 'data dropped during outage');
      await shot('t10-11-stale-network');
    } finally { await ctx.unroute('**/demo-api/v1/**'); }
    await p.getByText('تعذر تحديث البيانات من خادم المحاكاة.').waitFor({ state: 'detached', timeout: 15_000 });
    await ctx.setOffline(true);
    await p.getByText(/لا يوجد اتصال بالشبكة/).waitFor();
    await ctx.setOffline(false);
    await p.getByText(/لا يوجد اتصال بالشبكة/).waitFor({ state: 'detached' });
  });

  await step('keyboard: create flow completes without a mouse and focus moves to the review step', async () => {
    await open('/new');
    await p.getByLabel('الغرض من الطلب').focus();
    await p.keyboard.type('طلب بلوحة المفاتيح');
    await p.getByRole('button', { name: 'مراجعة الطلب' }).focus();
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.activeElement?.textContent === 'المراجعة والتأكيد');
    await p.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }).focus();
    await p.keyboard.press('Enter');
    await p.getByText('أُرسل الطلب إلى المحفظة التجريبية.').waitFor();
  });

  await step('axe WCAG 2.2 AA on every TASK-10 state, light and dark', async () => {
    const sessions = await get('/verifier/sessions?organizationId=org-test-a');
    const byStatus = (st) => sessions.find((s) => s.status === st)?.id;
    const routes = ['/', '/new', '/sessions', '/sessions?status=PENDING', '/results', '/results?outcome=DEMO_REJECTED', '/activity', `/sessions/${byStatus('DEMO_ACCEPTED')}`, `/sessions/${byStatus('EXPIRED')}`, `/sessions/${byStatus('PENDING')}`, '/settings'];
    for (const theme of ['light', 'dark']) {
      for (const route of routes) { await open(route); await setTheme(theme); await audit(`${theme} ${route}`); }
      await open('/new');
      await setTheme(theme);
      await p.getByLabel('الغرض من الطلب').fill('مراجعة إمكانية الوصول');
      await p.getByRole('button', { name: 'مراجعة الطلب' }).click();
      await p.getByRole('heading', { name: 'المراجعة والتأكيد' }).waitFor();
      await audit(`${theme} /new (review step)`);
      if (theme === 'dark') { await shot('t10-12-create-review-dark'); await open('/'); await shot('t10-13-dashboard-dark'); await open(`/sessions/${byStatus('DEMO_ACCEPTED')}`); await shot('t10-14-session-accepted-dark'); }
    }
    await setTheme('light');
  });

  await step('responsive RTL: 320–1366 px and 200 % text without horizontal scroll', async () => {
    const id = (await get('/verifier/sessions?organizationId=org-test-a'))[0].id;
    const overflow = [];
    for (const [w, scale] of [[1366, ''], [1024, ''], [768, ''], [390, ''], [320, ''], [683, '200%']]) {
      await p.setViewportSize({ width: w, height: 900 });
      for (const route of ['/', '/new', '/sessions', `/sessions/${id}`, '/results']) {
        await open(route);
        await p.evaluate((s) => { document.documentElement.style.fontSize = s; }, scale);
        await p.waitForTimeout(100);
        if (!(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.dir === 'rtl'))) overflow.push(`${w}${scale}${route}`);
        if ((w === 1024 || w === 768 || w === 390) && (route === '/' || route === '/sessions')) await shot(`t10-15-${route === '/' ? 'dashboard' : 'sessions'}-${w}`);
      }
    }
    await p.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await p.setViewportSize({ width: 1366, height: 900 });
    check(overflow.length === 0, `overflow: ${overflow.join(', ')}`);
  });

  await step('reduced motion: no element animates or transitions', async () => {
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await open('/');
    const moving = await p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const cs = getComputedStyle(e); return cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0) || (cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0); }).length);
    await p.emulateMedia({ reducedMotion: 'no-preference' });
    check(moving === 0, `${moving} moving elements`);
  });

  await step('no browser console errors', async () => {
    check(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  });
} catch (e) { results.push({ name: 'harness', outcome: 'FAIL', error: String(e?.message ?? e) }); }
finally {
  await browser?.close();
  stack.stop();
  await writeFile(path.join(out, 'verifier-e2e-results.json'), JSON.stringify({ at: new Date().toISOString(), ttlMs: TTL_MS, results }, null, 2));
  await writeFile(path.join(out, 'axe.json'), JSON.stringify(audits, null, 2));
  await writeFile(path.join(out, 'stack.log'), lines.join('\n'));
  const failed = results.filter((r) => r.outcome !== 'PASS').length;
  console.log(`\nVERIFIER E2E: ${results.length - failed} PASS / ${failed} FAIL`);
  process.exitCode = failed || results.length === 0 ? 1 : 0;
}
