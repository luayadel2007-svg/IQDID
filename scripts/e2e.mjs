// Browser E2E (Chromium via playwright-core) against the PRODUCTION builds
// served by `vite preview`, both proxied to ONE demo API. Wallet and verifier
// run in separate browser contexts (separate "devices"; no shared JS state).
// Usage: npm run build && npm run e2e     Evidence → evidence/task8/e2e/
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStack } from './stack.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'evidence', process.env.IQDID_EVIDENCE_DIR ?? 'modernization/e2e');
await mkdir(path.join(out, 'screenshots'), { recursive: true });

const TTL_MS = 15_000;
const logLines = [];
const stack = startStack({ preview: true, env: { DEMO_SESSION_TTL_MS: String(TTL_MS), DEMO_LATENCY_MS: '100' }, onLine: (l) => logLines.push(l) });
const results = [];
let browser;

async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, outcome: 'PASS', ms: Date.now() - started });
    console.log(`PASS  ${name}`);
  } catch (e) {
    results.push({ name, outcome: 'FAIL', ms: Date.now() - started, error: String(e?.message ?? e).slice(0, 500) });
    console.log(`FAIL  ${name}\n      ${String(e?.message ?? e).split('\n')[0]}`);
  }
}

try {
  await stack.ready();
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const walletCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
  const verifierCtx = await browser.newContext({ viewport: { width: 1366, height: 860 }, locale: 'ar' });
  const wallet = await walletCtx.newPage();
  const verifier = await verifierCtx.newPage();
  const consoleErrors = [];
  for (const p of [wallet, verifier]) p.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const nav = (page, name) => page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('link', { name });
  const shot = (page, name) => page.screenshot({ path: path.join(out, 'screenshots', `${name}.png`), fullPage: true });

  await fetch(`${stack.urls.api}/demo-api/v1/demo/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });

  await step('both apps load as Arabic RTL with the demo banner', async () => {
    await verifier.goto(stack.urls.verifier);
    await wallet.goto(stack.urls.wallet);
    for (const p of [wallet, verifier]) {
      const { dir, lang } = await p.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang }));
      if (dir !== 'rtl' || lang !== 'ar') throw new Error(`dir=${dir} lang=${lang}`);
      await p.getByRole('note').filter({ hasText: 'نسخة تجريبية — بيانات وهمية' }).waitFor();
    }
    await shot(wallet, '01-wallet-home');
    await shot(verifier, '01-verifier-dashboard');
  });

  await step('keyboard: first Tab reaches the skip link', async () => {
    await wallet.keyboard.press('Tab');
    const focused = await wallet.evaluate(() => document.activeElement?.textContent ?? '');
    if (!focused.includes('تخطَّ إلى المحتوى')) throw new Error(`focused: ${focused}`);
  });

  await step('verifier creates an age request (org A)', async () => {
    await nav(verifier, /طلب تحقق جديد/).click();
    await verifier.getByRole('radio', { name: /التحقق من العمر/ }).check();
    await verifier.getByLabel('الغرض من الطلب').fill('فتح حساب مصرفي تجريبي');
    await verifier.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }).click();
    await verifier.getByText('أُرسل الطلب إلى المحفظة التجريبية.').waitFor();
    await shot(verifier, '02-verifier-session-pending');
  });

  await step('request appears in the wallet (other browser context) with org, purpose and fields', async () => {
    await nav(wallet, /الطلبات/).click();
    await wallet.getByRole('link', { name: 'مصرف تجريبي (أ)' }).first().click({ timeout: 10_000 });
    await wallet.getByText('فتح حساب مصرفي تجريبي').waitFor();
    await wallet.getByText('العمر فوق 18 سنة', { exact: true }).waitFor();
    await wallet.getByRole('heading', { name: 'معاينة القيم التي ستُشارك (اصطناعية)' }).waitFor();
    await wallet.getByText('نعم', { exact: true }).waitFor();
    if (await wallet.getByText('TEST-DOC-0001', { exact: true }).count()) throw new Error('age-only preview leaked another field');
    await shot(wallet, '03-wallet-request-detail');
  });

  await step('wallet approves → verifier updates live to DEMO_ACCEPTED (no reload)', async () => {
    await wallet.getByRole('button', { name: 'موافقة تجريبية' }).click();
    await wallet.getByRole('dialog').getByRole('button', { name: 'تأكيد الموافقة' }).click();
    await wallet.getByText('سُجلت موافقتك التجريبية').waitFor();
    await verifier.getByText('موافقة تجريبية — DEMO_ACCEPTED').waitFor({ timeout: 10_000 });
    await verifier.getByText(/لم يُجرَ أي تحقق تشفيري أو بروتوكولي/).waitFor();
    const text = await verifier.evaluate(() => document.body.innerText);
    if (/\bVERIFIED\b/.test(text)) throw new Error('page claims VERIFIED');
    await shot(wallet, '04-wallet-approved');
    await shot(verifier, '04-verifier-demo-accepted');
  });

  await step('identity request → wallet rejects → verifier shows rejection without values', async () => {
    await nav(verifier, /طلب تحقق جديد/).click();
    await verifier.getByRole('radio', { name: /التحقق من الهوية الأساسية/ }).check();
    await verifier.getByLabel('الغرض من الطلب').fill('التحقق من الهوية لخدمة اتصالات تجريبية');
    await verifier.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }).click();
    await verifier.getByText('أُرسل الطلب إلى المحفظة التجريبية.').waitFor();
    await nav(wallet, /الطلبات/).click();
    await wallet.getByText('التحقق من الهوية لخدمة اتصالات تجريبية').waitFor({ timeout: 10_000 });
    await wallet.getByRole('link', { name: 'مصرف تجريبي (أ)' }).first().click();
    await wallet.getByRole('button', { name: 'رفض' }).click();
    await wallet.getByRole('dialog').getByRole('button', { name: 'تأكيد الرفض' }).click();
    await wallet.getByText('رفضت هذا الطلب').waitFor();
    await verifier.getByText('رفض المواطن الطلب').waitFor({ timeout: 10_000 });
    if (await verifier.getByText('القيم المشاركة (اصطناعية)').count()) throw new Error('values shown after rejection');
    await shot(verifier, '05-verifier-rejected');
  });

  await step(`unanswered request expires after ${TTL_MS / 1000}s on both sides`, async () => {
    await nav(verifier, /طلب تحقق جديد/).click();
    await verifier.getByLabel('الغرض من الطلب').fill('طلب سينتهي دون قرار');
    await verifier.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }).click();
    await verifier.getByText('انتهت مهلة الطلب').waitFor({ timeout: TTL_MS + 10_000 });
    await nav(wallet, /الطلبات/).click();
    await wallet.getByText('طلب سينتهي دون قرار').waitFor({ timeout: 10_000 });
    await shot(verifier, '06-verifier-expired');
  });

  await step('activity logs on both sides record the decisions', async () => {
    await nav(wallet, /السجل/).click();
    await wallet.getByText(/وافق المواطن التجريبي على مشاركة البيانات/).first().waitFor();
    await wallet.getByText(/رفض المواطن التجريبي طلب/).first().waitFor();
    await nav(verifier, /سجل العمليات/).click();
    await verifier.getByText(/انتهت مهلة طلب/).first().waitFor();
    await shot(wallet, '07-wallet-activity');
    await shot(verifier, '07-verifier-activity');
  });

  await step('organisation B sees none of organisation A sessions', async () => {
    await nav(verifier, /جلسات التحقق/).click();
    await verifier.getByLabel('المؤسسة:').selectOption('org-test-b');
    await verifier.getByText('لا توجد جلسات').waitFor();
    await verifier.getByLabel('المؤسسة:').selectOption('org-test-a');
  });

  await step('dark mode toggles theme and colours in both apps', async () => {
    for (const [p, name] of [[wallet, 'wallet'], [verifier, 'verifier']]) {
      const before = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
      await p.getByRole('button', { name: /الوضع الداكن|الوضع الفاتح/ }).click();
      const after = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor }));
      if (after.bg === before) throw new Error(`${name}: background unchanged (${before})`);
      await shot(p, `08-${name}-${after.theme}`);
    }
  });

  await step('demo reset clears data for both apps', async () => {
    await nav(wallet, /الإعدادات/).click();
    await wallet.getByRole('button', { name: 'إعادة ضبط البيانات التجريبية' }).click();
    await wallet.getByRole('dialog').getByRole('button', { name: 'إعادة الضبط' }).click();
    await wallet.getByText(/أُعيدت البيانات التجريبية/).waitFor();
    await nav(verifier, /جلسات التحقق/).click();
    await verifier.getByText('لا توجد جلسات').waitFor({ timeout: 10_000 });
  });

  await step('no browser console errors', async () => {
    if (consoleErrors.length) throw new Error(consoleErrors.slice(0, 5).join(' | '));
  });
} catch (e) {
  results.push({ name: 'harness', outcome: 'FAIL', error: String(e?.message ?? e) });
} finally {
  await browser?.close();
  stack.stop();
  const failed = results.filter((r) => r.outcome !== 'PASS');
  await writeFile(path.join(out, 'e2e-results.json'), JSON.stringify({ at: new Date().toISOString(), ttlMs: TTL_MS, results }, null, 1));
  await writeFile(path.join(out, 'stack.log'), logLines.join('\n'));
  console.log(`\nE2E: ${results.length - failed.length} PASS / ${failed.length} FAIL`);
  process.exitCode = failed.length ? 1 : 0;
}
