// TASK-9 Premium Citizen Wallet — browser journeys (Chromium via playwright-core)
// against the PRODUCTION builds and ONE demo API. Wallet and verifier run in
// separate browser contexts. TEST ONLY, synthetic data.
// Usage: npm run build && node scripts/wallet-e2e.mjs   Evidence → evidence/task9/wallet-e2e/
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startStack } from './stack.mjs';

const out = path.resolve('evidence', process.env.IQDID_WALLET_EVIDENCE_DIR ?? 'task9/wallet-e2e');
await mkdir(path.join(out, 'screenshots'), { recursive: true });
const TTL_MS = 20_000;
const lines = [], results = [];
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
  await post('/demo/reset');
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const walletCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
  const verifierCtx = await browser.newContext({ viewport: { width: 1366, height: 860 }, locale: 'ar' });
  const wallet = await walletCtx.newPage();
  const verifier = await verifierCtx.newPage();
  const consoleErrors = [];
  for (const p of [wallet, verifier]) p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text()); });
  const nav = (p, name) => p.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('link', { name });
  const shot = (p, name, fullPage = false) => p.screenshot({ path: path.join(out, 'screenshots', `${name}.png`), fullPage });
  const W = stack.urls.wallet, V = stack.urls.verifier;
  const noProtocolClaim = async (p) => check(!/VERIFIED_BY_PROTOCOL|\bVERIFIED\b|تم التحقق من الهوية/.test(await p.evaluate(() => document.body.innerText)), 'page claims protocol verification');

  await verifier.goto(V); await wallet.goto(W);
  await wallet.getByRole('heading', { level: 1, name: 'أهلاً بك' }).waitFor();

  await step('journey: verifier creates → wallet notified (bell + nav badge + home alert)', async () => {
    await nav(verifier, /طلب تحقق جديد/).click();
    await verifier.getByRole('radio', { name: /التحقق من العمر/ }).check();
    await verifier.getByLabel('الغرض من الطلب').fill('فتح حساب مصرفي تجريبي');
    await verifier.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }).click();
    await verifier.getByText('أُرسل الطلب إلى المحفظة التجريبية.').waitFor();
    await wallet.getByRole('link', { name: /الإشعارات \(1 غير مقروءة\)/ }).waitFor({ timeout: 10_000 });
    await wallet.getByText(/لديك 1 طلب مشاركة بيانات بانتظار قرارك/).waitFor();
    await wallet.locator('.nav .nav__badge').first().waitFor({ timeout: 10_000 }).catch(() => { throw new Error('pending badge missing on nav'); });
    await shot(wallet, 'j1-wallet-home-notified');
  });

  await step('journey: wallet reviews request, selective disclosure shows 1 shared / 3 withheld', async () => {
    await nav(wallet, /الطلبات/).click();
    await wallet.getByRole('link', { name: 'مصرف تجريبي (أ)' }).first().click();
    await wallet.getByRole('timer').first().waitFor();
    await wallet.getByRole('link', { name: 'معاينة الإفصاح الانتقائي' }).click();
    await wallet.getByRole('heading', { level: 1, name: 'ما الذي سيُشارك؟' }).waitFor();
    await wallet.getByRole('heading', { name: 'سيُشارك (1)' }).waitFor();
    await wallet.getByRole('heading', { name: 'يبقى خاصاً (3)' }).waitFor();
    check(!(await wallet.evaluate(() => document.body.innerText.includes('TEST-DOC-0001'))), 'withheld value leaked');
    await shot(wallet, 'j2-wallet-disclosure', true);
  });

  await step('journey: page reload during review keeps the request and its countdown', async () => {
    const before = wallet.url();
    await wallet.reload();
    await wallet.getByRole('heading', { level: 1, name: 'ما الذي سيُشارك؟' }).waitFor();
    check(wallet.url() === before, 'URL changed after reload');
    await wallet.getByRole('button', { name: 'موافقة تجريبية' }).waitFor();
  });

  await step('journey: approve → verifier updates live → both histories record it, no protocol claim', async () => {
    await wallet.getByRole('button', { name: 'موافقة تجريبية' }).click();
    await wallet.getByRole('dialog').getByRole('button', { name: 'تأكيد الموافقة' }).click();
    await wallet.getByText('سُجلت موافقتك التجريبية').waitFor();
    await verifier.getByText('موافقة تجريبية — DEMO_ACCEPTED').waitFor({ timeout: 10_000 });
    await noProtocolClaim(wallet); await noProtocolClaim(verifier);
    await nav(wallet, /النشاط/).click();
    await wallet.getByText(/وافق المواطن التجريبي على مشاركة البيانات/).first().waitFor();
    await nav(verifier, /سجل العمليات/).click();
    await verifier.getByText(/وافق المواطن التجريبي على مشاركة البيانات/).first().waitFor();
    await shot(wallet, 'j4-wallet-activity'); await shot(verifier, 'j4-verifier-activity');
  });

  await step('reject via request code (QR screen) for organisation B → verifier B sees rejection', async () => {
    const created = await post('/verifier/sessions', { organizationId: 'org-test-b', templateId: 'IDENTITY_BASIC', purpose: 'تفعيل خط اتصالات تجريبي' });
    check(created.status === 201, `create failed ${created.status}`);
    await verifier.getByLabel('المؤسسة:').selectOption('org-test-b');
    await nav(verifier, /جلسات التحقق/).click();
    await verifier.getByText(created.body.shortCode).first().waitFor({ timeout: 10_000 });
    await wallet.goto(`${W}/qr`);
    await wallet.getByRole('img', { name: /رمز QR تجريبي/ }).waitFor();
    await shot(wallet, 'j5-wallet-qr');
    await wallet.getByLabel('رمز الطلب').fill(created.body.shortCode.toLowerCase());
    await wallet.getByRole('button', { name: 'فتح الطلب' }).click();
    await wallet.getByText('تفعيل خط اتصالات تجريبي').waitFor();
    await wallet.getByRole('button', { name: 'رفض' }).click();
    await wallet.getByRole('dialog').getByRole('button', { name: 'تأكيد الرفض' }).click();
    await wallet.getByText('رفضت هذا الطلب').waitFor();
    const s = await get(`/verifier/sessions/${created.body.id}?organizationId=org-test-b`);
    check(s.status === 'DEMO_REJECTED' && s.disclosed === null, `verifier B state ${s.status}`);
    await verifier.getByText('رُفض (DEMO_REJECTED)').first().waitFor({ timeout: 10_000 });
    const a = await get('/verifier/sessions?organizationId=org-test-a');
    check(!a.some((x) => x.id === created.body.id), 'org A can see org B session');
    await verifier.getByLabel('المؤسسة:').selectOption('org-test-a');
  });

  await step('multiple organisations: wallet filter isolates each organisation', async () => {
    await nav(wallet, /الطلبات/).click();
    await wallet.getByRole('button', { name: 'شركة اتصالات تجريبية (ب)' }).click();
    await wallet.getByText('تفعيل خط اتصالات تجريبي').waitFor();
    check(await wallet.getByText('فتح حساب مصرفي تجريبي').count() === 0, 'org A shown under org B filter');
    await wallet.getByRole('button', { name: 'كل المؤسسات' }).click();
  });

  await step('duplicate decision from a stale second tab is refused; tab shows real outcome', async () => {
    const { body: s } = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'طلب لاختبار القرار المكرر' });
    const tab2 = await walletCtx.newPage();
    await tab2.goto(`${W}/requests/${s.id}`);
    await tab2.getByRole('button', { name: 'رفض' }).waitFor();
    await tab2.route('**/demo-api/v1/wallet/requests/**', (r) => (r.request().method() === 'GET' ? r.abort('internetdisconnected') : r.continue()));
    await wallet.goto(`${W}/requests/${s.id}`);
    await wallet.getByRole('button', { name: 'موافقة تجريبية' }).click();
    await wallet.getByRole('dialog').getByRole('button', { name: 'تأكيد الموافقة' }).click();
    await wallet.getByText('سُجلت موافقتك التجريبية').waitFor();
    const labelled = (label, promise) => promise.catch((e) => { throw new Error(`${label}: ${String(e.message).split('\n')[0]}`); });
    await labelled('stale notice', tab2.getByText('اتصال ضعيف').waitFor({ timeout: 15_000 }));
    await labelled('stale reject', tab2.getByRole('button', { name: 'رفض' }).click());
    await labelled('confirm', tab2.getByRole('dialog').getByRole('button', { name: 'تأكيد الرفض' }).click());
    await labelled('refusal shown', tab2.getByText('لم يُسجَّل القرار').waitFor());
    await shot(tab2, 'j7-wallet-duplicate-refused');
    await tab2.unroute('**/demo-api/v1/wallet/requests/**');
    await tab2.reload();
    await tab2.getByText('سُجلت موافقتك التجريبية').waitFor();
    check((await get(`/verifier/sessions/${s.id}?organizationId=org-test-a`)).status === 'DEMO_ACCEPTED', 'second decision changed state');
    await tab2.close();
  });

  await step(`expired session (TTL ${TTL_MS / 1000}s): wallet closes it, decision refused by server`, async () => {
    const { body: s } = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'طلب سينتهي في المحفظة' });
    await wallet.goto(`${W}/requests/${s.id}`);
    await wallet.getByRole('timer').first().waitFor();
    await wallet.getByText('انتهت مهلة الطلب').waitFor({ timeout: TTL_MS + 10_000 });
    check(await wallet.getByRole('button', { name: 'موافقة تجريبية' }).count() === 0, 'approve still offered after expiry');
    const late = await post(`/wallet/requests/${s.id}/decision`, { decision: 'ACCEPT' });
    check(late.status >= 400, `late decision accepted (${late.status})`);
    await shot(wallet, 'j8-wallet-expired');
  });

  await step('network failure: error with retry, then recovery after retry', async () => {
    await walletCtx.route('**/demo-api/v1/**', (r) => r.abort('internetdisconnected'));
    await wallet.goto(`${W}/credentials`);
    await wallet.getByText('تعذر عرض البيانات').waitFor({ timeout: 20_000 });
    await shot(wallet, 'j9-wallet-network-error');
    await walletCtx.unroute('**/demo-api/v1/**');
    await wallet.getByRole('button', { name: 'إعادة المحاولة' }).click();
    await wallet.getByRole('list', { name: 'قائمة المستمسكات' }).waitFor();
  });

  await step('offline: banner shown and decisions disabled; restored when back online', async () => {
    const { body: s } = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'طلب أثناء انقطاع الشبكة' });
    await wallet.goto(`${W}/requests/${s.id}`);
    await wallet.getByRole('button', { name: 'رفض' }).waitFor();
    await walletCtx.setOffline(true);
    await wallet.getByText(/أنت غير متصل بالشبكة/).waitFor();
    check(await wallet.getByRole('button', { name: 'رفض' }).isDisabled(), 'reject enabled offline');
    await shot(wallet, 'j10-wallet-offline');
    await walletCtx.setOffline(false);
    await wallet.getByRole('button', { name: 'رفض' }).and(wallet.locator(':enabled')).waitFor();
  });

  await step('theme persists across reload and every wallet screen (dark)', async () => {
    await wallet.goto(`${W}/settings`);
    await wallet.getByRole('button', { name: 'داكن', exact: true }).click();
    await wallet.reload();
    for (const r of ['', 'card', 'credentials', 'qr', 'notifications', 'help']) {
      await wallet.goto(`${W}/${r}`);
      await wallet.getByRole('heading', { level: 1 }).first().waitFor();
      check(await wallet.evaluate(() => document.documentElement.dataset.theme) === 'dark', `not dark on /${r}`);
    }
    await shot(wallet, 'j11-wallet-help-dark');
    await wallet.goto(`${W}/settings`);
    await wallet.getByRole('button', { name: 'فاتح', exact: true }).click();
  });

  const ROUTES = ['', 'welcome', 'cards', 'cards?card=cred-test-001', 'card', 'credentials', 'credentials/cred-test-002', 'requests', 'qr', 'activity', 'notifications', 'settings', 'help'];
  await step('responsive RTL: 13 routes at 320 (larger text), 390 and 768 without horizontal overflow', async () => {
    const bad = [];
    for (const [w, text] of [[320, 'larger'], [390, 'normal'], [768, 'normal']]) {
      await wallet.setViewportSize({ width: w, height: 800 });
      await wallet.evaluate((t) => localStorage.setItem('iqdid-appearance-v1', JSON.stringify({ text: t, glass: true, motion: 'system' })), text);
      for (const r of ROUTES) {
        await wallet.goto(`${W}/${r}`);
        await wallet.getByRole('heading', { level: 1 }).first().waitFor();
        const ok = await wallet.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.dir === 'rtl');
        if (!ok) bad.push(`${w}/${r}`);
      }
    }
    await wallet.evaluate(() => localStorage.removeItem('iqdid-appearance-v1'));
    await wallet.setViewportSize({ width: 390, height: 844 });
    check(bad.length === 0, `overflow/RTL: ${bad.join(', ')}`);
  });

  await step('IQDI brand: titles and visible text use IQDI, never IQDID (both apps)', async () => {
    for (const [p, url, name] of [[wallet, W, 'IQDI Wallet'], [verifier, V, 'IQDI Verifier']]) {
      await p.goto(url); await p.getByRole('heading', { level: 1 }).first().waitFor();
      const { title, text } = await p.evaluate(() => ({ title: document.title, text: document.body.innerText }));
      check(title.startsWith(name) && !/IQDID/i.test(title + text) && text.includes(name), `brand wrong in ${name}: ${title}`);
    }
  });

  await step('card stack: tap brings a card to the front and expands it; details; Back restores it', async () => {
    await wallet.setViewportSize({ width: 390, height: 844 });
    await wallet.goto(`${W}/cards`);
    const stack = wallet.getByRole('list', { name: 'مجموعة المستمسكات' });
    await stack.waitFor();
    check(await stack.getByRole('button').count() === 5, 'expected 5 cards');
    // Tap the visible header strip of a covered card, as a person would (its centre is under the next card).
    await stack.getByRole('button', { name: /^الوثيقة الدراسية/ }).click({ position: { x: 60, y: 30 } });
    await wallet.waitForURL(/card=cred-test-005/);
    // The URL changes before React re-renders; wait for the rendered state, then assert it.
    await stack.getByRole('button', { name: /^الوثيقة الدراسية/ }).and(wallet.locator('[aria-expanded="true"]')).waitFor({ timeout: 10_000 });
    const first = stack.getByRole('button').first();
    check((await first.getAttribute('aria-label'))?.startsWith('الوثيقة الدراسية') && await first.getAttribute('aria-expanded') === 'true', 'selected card not in front/expanded');
    const box = await first.boundingBox();
    check(box !== null && box.height >= 180, `selected card not fully visible (${box?.height})`);
    await wallet.waitForTimeout(400);
    await shot(wallet, 'j14-card-selected');
    await first.click();
    await wallet.getByRole('heading', { level: 1, name: 'تفاصيل المستمسك' }).waitFor();
    await wallet.getByRole('list', { name: 'حالات الاعتماد' }).getByText('اعتماد تجريبي للعرض فقط').waitFor();
    await wallet.goBack();
    await wallet.waitForURL(/\/cards\?card=cred-test-005/);
    await stack.getByRole('button', { name: /^الوثيقة الدراسية/ }).and(wallet.locator('[aria-expanded="true"]')).waitFor({ timeout: 10_000 }).catch(() => undefined);
    check((await stack.getByRole('button').first().getAttribute('aria-label'))?.startsWith('الوثيقة الدراسية') && await stack.getByRole('button').first().getAttribute('aria-expanded') === 'true', 'selection lost after Back');
  });

  await step('card stack: keyboard + reduced motion + list view alternative', async () => {
    await wallet.emulateMedia({ reducedMotion: 'reduce' });
    await wallet.goto(`${W}/cards`);
    const stack = wallet.getByRole('list', { name: 'مجموعة المستمسكات' });
    await stack.getByRole('button').first().focus();
    await wallet.keyboard.press('ArrowDown');
    await wallet.keyboard.press('Enter');
    await wallet.waitForURL(/card=cred-test-002/);
    const animating = await wallet.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
    check(animating === 0, `animations running under reduced motion: ${animating}`);
    await wallet.keyboard.press('Escape');
    await wallet.waitForURL((u) => !u.search.includes('card='));
    await wallet.getByRole('button', { name: 'عرض القائمة' }).click();
    await wallet.getByRole('list', { name: 'قائمة المستمسكات' }).waitFor();
    await wallet.reload();
    await wallet.getByRole('list', { name: 'قائمة المستمسكات' }).waitFor();
    await wallet.getByRole('button', { name: 'عرض البطاقات' }).click();
    await wallet.emulateMedia({ reducedMotion: 'no-preference' });
  });

  await step('no browser console errors in either app', async () => {
    check(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  });
} finally {
  await browser?.close();
  stack.stop();
  await writeFile(path.join(out, 'wallet-e2e-results.json'), JSON.stringify({ at: new Date().toISOString(), ttlMs: TTL_MS, results }, null, 2));
  await writeFile(path.join(out, 'stack.log'), lines.join('\n'));
  const failed = results.filter((r) => r.outcome !== 'PASS').length;
  console.log(`\nWALLET E2E: ${results.length - failed} PASS / ${failed} FAIL`);
  process.exitCode = failed || results.length === 0 ? 1 : 0;
}
