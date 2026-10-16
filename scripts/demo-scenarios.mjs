// TASK-11 Government demonstration scenarios A–H — repeatable, evidence-based, TEST ONLY.
// Both real apps (production builds) + ONE demo API, driven in Chromium. Every scenario starts
// from a demo reset, so each one can be re-run on its own and in any order.
// Usage: npm run build && node scripts/demo-scenarios.mjs
// Evidence → evidence/<IQDID_SCENARIO_EVIDENCE_DIR | task11/scenarios>/ (scenarios.json, screenshots/, traces/)
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startStack } from './stack.mjs';

const out = path.resolve('evidence', process.env.IQDID_SCENARIO_EVIDENCE_DIR ?? 'task11/scenarios');
await mkdir(path.join(out, 'screenshots'), { recursive: true });
await mkdir(path.join(out, 'traces'), { recursive: true });
const TTL_MS = 12_000;
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const dirty = spawnSync('git', ['status', '--porcelain', '--', 'apps', 'packages', 'scripts'], { encoding: 'utf8' }).stdout.trim() !== '';
const lines = [], scenarios = [];
const env = { DEMO_SESSION_TTL_MS: String(TTL_MS), DEMO_LATENCY_MS: '60' };
let stack = startStack({ preview: true, env, onLine: (l) => lines.push(l) });
const check = (v, why) => { if (!v) throw new Error(why); };
let browser;

try {
  await stack.ready();
  const api = `${stack.urls.api}/demo-api/v1`;
  const post = (p, body) => fetch(api + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) }).then(async (r) => ({ status: r.status, body: await r.json() }));
  const get = (p) => fetch(api + p).then((r) => r.json());
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const walletCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar' });
  const verifierCtx = await browser.newContext({ viewport: { width: 1366, height: 860 }, locale: 'ar' });
  const wallet = await walletCtx.newPage();
  const verifier = await verifierCtx.newPage();
  const consoleErrors = [];
  for (const [p, n] of [[wallet, 'wallet'], [verifier, 'verifier']]) p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(`${n}: ${m.text()}`); });
  const W = () => stack.urls.wallet, V = () => stack.urls.verifier;
  const text = (p) => p.evaluate(() => document.body.innerText);
  const noProtocolClaim = async (p) => check(!/VERIFIED_BY_PROTOCOL|\bVERIFIED\b|تم التحقق من الهوية/.test(await text(p)), 'page claims protocol verification');
  const useOrg = async (org) => { await verifier.goto(V()); await verifier.getByLabel('المؤسسة:').selectOption(org); };

  /** Creates a request through the verifier UI (the real create flow) and returns the API session. */
  const verifierCreate = async (purpose, template = /التحقق من العمر/) => {
    await verifier.goto(`${V()}/new`);
    await verifier.getByRole('radio', { name: template }).check();
    await verifier.getByLabel('الغرض من الطلب').fill(purpose);
    await verifier.getByRole('button', { name: 'مراجعة الطلب' }).click();
    await verifier.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }).click();
    await verifier.getByText('أُرسل الطلب إلى المحفظة التجريبية.').waitFor();
    const id = new URL(verifier.url()).pathname.split('/').pop();
    return get(`/wallet/requests/${id}`);
  };
  const walletDecide = async (id, decision) => {
    await wallet.goto(`${W()}/requests/${id}`);
    await wallet.getByRole('button', { name: decision === 'ACCEPT' ? 'موافقة تجريبية' : 'رفض' }).click();
    await wallet.getByRole('dialog').getByRole('button', { name: decision === 'ACCEPT' ? 'تأكيد الموافقة' : 'تأكيد الرفض' }).click();
    await wallet.getByText(decision === 'ACCEPT' ? 'سُجلت موافقتك التجريبية' : 'رفضت هذا الطلب').waitFor();
  };

  async function scenario(meta, fn) {
    const t = Date.now(), actual = [], screenshots = [];
    const note = (s) => actual.push(s);
    const shot = async (p, name, fullPage = false) => { const file = `${meta.id}-${name}.png`; await p.screenshot({ path: path.join(out, 'screenshots', file), fullPage }); screenshots.push(`screenshots/${file}`); };
    const trace = meta.trace ? `traces/${meta.id}-verifier.zip` : null;
    if (trace) { await verifierCtx.tracing.start({ screenshots: true, snapshots: true }); await walletCtx.tracing.start({ screenshots: true, snapshots: true }); }
    let outcome = 'PASS', error;
    try {
      check((await post('/demo/reset')).status === 200, 'demo reset failed');
      await useOrg('org-test-a');
      await fn({ note, shot });
    } catch (e) { outcome = 'FAIL'; error = String(e?.message ?? e).split('\n')[0].slice(0, 400); }
    if (trace) { await verifierCtx.tracing.stop({ path: path.join(out, trace) }); await walletCtx.tracing.stop({ path: path.join(out, `traces/${meta.id}-wallet.zip`) }); }
    scenarios.push({ ...meta, trace: undefined, traces: trace ? [trace, `traces/${meta.id}-wallet.zip`] : [], actual, outcome, ...(error ? { error } : {}), screenshots, commit, workingTreeDirty: dirty, ms: Date.now() - t });
    console.log(`${outcome}  ${meta.id} ${meta.title}${error ? `\n      ${error}` : ''}`);
  }

  await scenario({
    id: 'A', title: 'Approved demo request', trace: true,
    syntheticData: 'org-test-a «مصرف تجريبي (أ)»; template AGE_OVER_18; holder TEST-001; national ID cred-test-001 (ACTIVE)',
    start: 'Demo reset. Verifier (1366 px) on organisation A. Wallet (390 px) on home.',
    steps: ['Verifier creates the request through details → review → confirm', 'Wallet is notified and opens the request', 'Citizen reviews the selective-disclosure preview', 'Citizen approves and confirms', 'Verifier session page updates without reload', 'Both activity histories record the approval'],
    expected: 'Session DEMO_ACCEPTED; verifier shows «موافقة تجريبية — DEMO_ACCEPTED», the crypto layer «غير متحقق منه تشفيرياً», only the age claim; no protocol claim anywhere.',
  }, async ({ note, shot }) => {
    const s = await verifierCreate('فتح حساب مصرفي تجريبي');
    note(`created ${s.shortCode} (${s.status}) via verifier UI`);
    await shot(verifier, 'verifier-created');
    await wallet.goto(W());
    await wallet.getByText(/لديك 1 طلب مشاركة بيانات بانتظار قرارك/).waitFor({ timeout: 10_000 });
    note('wallet home shows the pending request');
    await wallet.goto(`${W()}/requests/${s.id}/disclosure`);
    await wallet.getByRole('heading', { name: 'سيُشارك (1)' }).waitFor();
    await wallet.getByRole('heading', { name: 'يبقى خاصاً (3)' }).waitFor();
    note('disclosure preview: 1 shared, 3 withheld');
    await shot(wallet, 'wallet-disclosure', true);
    await verifier.goto(`${V()}/sessions/${s.id}`);
    await verifier.getByText('بانتظار قرار المواطن', { exact: true }).first().waitFor();
    await wallet.getByRole('button', { name: 'موافقة تجريبية' }).click();
    await wallet.getByRole('dialog').getByRole('button', { name: 'تأكيد الموافقة' }).click();
    await wallet.getByText('سُجلت موافقتك التجريبية').waitFor();
    await verifier.getByText('موافقة تجريبية — DEMO_ACCEPTED').waitFor({ timeout: 10_000 });
    note('verifier page updated live to DEMO_ACCEPTED');
    const layer = await verifier.getByRole('list', { name: 'طبقات الحالة والثقة' }).getByRole('listitem').nth(4).textContent();
    check(layer.includes('غير متحقق منه تشفيرياً'), 'crypto layer');
    const api = await get(`/verifier/sessions/${s.id}?organizationId=org-test-a`);
    check(api.status === 'DEMO_ACCEPTED' && api.disclosed.length === 1 && api.disclosed[0].key === 'age_over_18', 'API state');
    note(`API: ${api.status}, disclosed keys = ${api.disclosed.map((c) => c.key).join(',')}`);
    await noProtocolClaim(verifier); await noProtocolClaim(wallet);
    await shot(verifier, 'verifier-accepted', true);
    await verifier.goto(`${V()}/activity`);
    await verifier.getByText(/وافق المواطن التجريبي على مشاركة البيانات/).first().waitFor();
    await wallet.goto(`${W()}/activity`);
    await wallet.getByText(/وافق المواطن التجريبي على مشاركة البيانات/).first().waitFor();
    note('approval recorded in both activity histories');
    await shot(wallet, 'wallet-activity');
  });

  await scenario({
    id: 'B', title: 'Rejected request',
    syntheticData: 'org-test-a; template IDENTITY_BASIC (3 fields); holder TEST-001',
    start: 'Demo reset. Verifier on organisation A.',
    steps: ['Verifier creates an identity request in the UI', 'Verifier keeps the session page open', 'Citizen rejects in the wallet and confirms', 'Verifier session and results update'],
    expected: 'DEMO_REJECTED, disclosed = null, no values shown on the verifier, results «رفض» count 1, activity in both apps.',
  }, async ({ note, shot }) => {
    const s = await verifierCreate('التحقق من الهوية لخدمة تجريبية', /التحقق من الهوية الأساسية/);
    await verifier.goto(`${V()}/sessions/${s.id}`);
    await walletDecide(s.id, 'REJECT');
    note('citizen rejected in the wallet');
    await verifier.getByText('رفض المواطن الطلب').waitFor({ timeout: 10_000 });
    check(await verifier.getByText('القيم المشاركة (اصطناعية)').count() === 0, 'values shown after rejection');
    const api = await get(`/verifier/sessions/${s.id}?organizationId=org-test-a`);
    check(api.status === 'DEMO_REJECTED' && api.disclosed === null, 'API state');
    note(`verifier updated live; API ${api.status}, disclosed ${api.disclosed}`);
    await shot(verifier, 'verifier-rejected', true);
    await verifier.goto(`${V()}/results?outcome=DEMO_REJECTED`);
    await verifier.getByText('عرض 1 من 1 نتيجة').waitFor();
    await verifier.goto(`${V()}/activity`);
    await verifier.getByText(/رفض المواطن التجريبي طلب/).first().waitFor();
    await wallet.goto(`${W()}/activity`);
    await wallet.getByText(/رفض المواطن التجريبي طلب/).first().waitFor();
    note('results and both activity histories show the rejection');
  });

  await scenario({
    id: 'C', title: 'Expired session',
    syntheticData: `org-test-a; AGE_OVER_18; demo API started with DEMO_SESSION_TTL_MS=${TTL_MS}`,
    start: 'Demo reset. Request created; both apps open on it.',
    steps: ['Wallet and verifier keep the request open', 'TTL elapses without a decision', 'Citizen tries to decide late (API)'],
    expected: 'Both apps show «انتهت مهلة الطلب»; the wallet offers no approval; a late decision gets 409 SESSION_EXPIRED; state EXPIRED.',
  }, async ({ note, shot }) => {
    const s = await verifierCreate('طلب سينتهي دون قرار');
    await wallet.goto(`${W()}/requests/${s.id}`);
    await wallet.getByRole('timer').first().waitFor();
    await wallet.getByText('انتهت مهلة الطلب').waitFor({ timeout: TTL_MS + 10_000 });
    await verifier.getByText('انتهت مهلة الطلب').waitFor({ timeout: 10_000 });
    note('both apps show the expiry');
    check(await wallet.getByRole('button', { name: 'موافقة تجريبية' }).count() === 0, 'approve offered after expiry');
    const late = await post(`/wallet/requests/${s.id}/decision`, { decision: 'ACCEPT' });
    check(late.status === 409 && late.body.error.code === 'SESSION_EXPIRED', `late decision ${late.status}`);
    note(`late decision → ${late.status} ${late.body.error.code}`);
    await shot(wallet, 'wallet-expired'); await shot(verifier, 'verifier-expired', true);
  });

  await scenario({
    id: 'D', title: 'Duplicate decision',
    syntheticData: 'org-test-a; AGE_OVER_18; two wallet tabs on the same request',
    start: 'Demo reset. Tab 2 opened on the request, then its refresh is cut (stale view).',
    steps: ['Tab 1 approves', 'Stale tab 2 tries to reject', 'A direct API second decision is attempted'],
    expected: 'Tab 2 shows «لم يُسجَّل القرار»; the API returns 409 SESSION_ALREADY_DECIDED; the session stays DEMO_ACCEPTED with exactly one consent event.',
  }, async ({ note, shot }) => {
    const s = await verifierCreate('طلب لاختبار القرار المكرر');
    const tab2 = await walletCtx.newPage();
    try {
      await tab2.goto(`${W()}/requests/${s.id}`);
      await tab2.getByRole('button', { name: 'رفض' }).waitFor();
      await tab2.route('**/demo-api/v1/wallet/requests/**', (r) => (r.request().method() === 'GET' ? r.abort('internetdisconnected') : r.continue()));
      await walletDecide(s.id, 'ACCEPT');
      note('tab 1 approved');
      await tab2.getByText('اتصال ضعيف').waitFor({ timeout: 15_000 });
      await tab2.getByRole('button', { name: 'رفض' }).click();
      await tab2.getByRole('dialog').getByRole('button', { name: 'تأكيد الرفض' }).click();
      await tab2.getByText('لم يُسجَّل القرار').waitFor();
      note('stale tab 2 reject refused and reported');
      await shot(tab2, 'wallet-duplicate-refused');
    } finally { await tab2.close(); }
    const again = await post(`/wallet/requests/${s.id}/decision`, { decision: 'REJECT' });
    check(again.status === 409 && again.body.error.code === 'SESSION_ALREADY_DECIDED', `second decision ${again.status}`);
    const st = await get(`/verifier/sessions/${s.id}?organizationId=org-test-a`);
    const consents = (await get('/verifier/activity?organizationId=org-test-a')).filter((e) => e.sessionId === s.id && e.type.startsWith('CONSENT_'));
    check(st.status === 'DEMO_ACCEPTED' && consents.length === 1, 'state or history changed');
    note(`API second decision → 409 ${again.body.error.code}; state ${st.status}; consent events ${consents.length}`);
  });

  await scenario({
    id: 'E', title: 'Multiple organisations',
    syntheticData: 'org-test-a «مصرف تجريبي (أ)» and org-test-b «شركة اتصالات تجريبية (ب)»; one request each',
    start: 'Demo reset.',
    steps: ['Organisation A creates a request in the verifier UI', 'Organisation B creates one after switching organisation', 'Citizen approves A and rejects B', 'Each organisation views its sessions, results and activity'],
    expected: 'The wallet lists both with their names; A sees only its own session and outcome, B only its own; reading A\'s session as B is «غير موجود».',
  }, async ({ note, shot }) => {
    const a = await verifierCreate('فتح حساب مصرفي تجريبي');
    await useOrg('org-test-b');
    const b = await verifierCreate('تفعيل خط اتصالات تجريبي', /التحقق من الهوية الأساسية/);
    note(`A=${a.shortCode} (${a.organizationId}), B=${b.shortCode} (${b.organizationId})`);
    await wallet.goto(`${W()}/requests`);
    await wallet.getByRole('link', { name: 'مصرف تجريبي (أ)' }).first().waitFor();
    await wallet.getByRole('link', { name: 'شركة اتصالات تجريبية (ب)' }).first().waitFor();
    await shot(wallet, 'wallet-two-orgs');
    await walletDecide(a.id, 'ACCEPT');
    await walletDecide(b.id, 'REJECT');
    for (const [org, mine, other] of [['org-test-a', a, b], ['org-test-b', b, a]]) {
      await useOrg(org);
      for (const route of ['/sessions', '/results', '/activity']) {
        await verifier.goto(`${V()}${route}`);
        if (route === '/activity') await verifier.getByText(/بواسطة:/).first().waitFor({ timeout: 10_000 });
        else await verifier.getByText(mine.shortCode, { exact: true }).first().waitFor({ timeout: 10_000 });
        const t = await text(verifier);
        check(!t.includes(other.shortCode) && !t.includes(other.purpose), `${org} sees the other organisation at ${route}`);
      }
      await verifier.goto(`${V()}/sessions/${other.id}`);
      await verifier.getByText('العنصر المطلوب غير موجود.').waitFor();
      note(`${org}: own session only on sessions/results/activity; other session → not found`);
    }
    await shot(verifier, 'verifier-b-isolated', true);
  });

  await scenario({
    id: 'F', title: 'Network failure and recovery',
    syntheticData: 'org-test-a; AGE_OVER_18; demo API calls blocked in the browser (route abort) and browser offline',
    start: 'Demo reset. Request pending; verifier sessions list and wallet request open.',
    steps: ['API becomes unreachable for both apps', 'Citizen tries to approve during the outage', 'Service returns', 'Citizen approves', 'Browser goes offline, then back'],
    expected: 'Verifier keeps last data with a stale notice; the wallet decision fails visibly and the state stays PENDING; after recovery the decision succeeds and the verifier updates; offline disables decisions.',
  }, async ({ note, shot }) => {
    const s = await verifierCreate('طلب أثناء انقطاع الشبكة');
    await verifier.goto(`${V()}/sessions`);
    await verifier.getByText(s.shortCode).first().waitFor();
    await wallet.goto(`${W()}/requests/${s.id}`);
    await wallet.getByRole('button', { name: 'موافقة تجريبية' }).waitFor();
    const block = (r) => r.abort('internetdisconnected');
    await verifierCtx.route('**/demo-api/v1/**', block);
    await walletCtx.route('**/demo-api/v1/**', block);
    try {
      await verifier.getByText('تعذر تحديث البيانات من خادم المحاكاة.').waitFor({ timeout: 15_000 });
      check(await verifier.getByText(s.shortCode).count() > 0, 'verifier dropped its data');
      note('verifier: stale notice, last data kept');
      await shot(verifier, 'verifier-stale');
      await wallet.getByRole('button', { name: 'موافقة تجريبية' }).click();
      await wallet.getByRole('dialog').getByRole('button', { name: 'تأكيد الموافقة' }).click();
      await wallet.getByText('لم يُسجَّل القرار').waitFor({ timeout: 15_000 });
      note('wallet: decision during outage refused and reported');
      await shot(wallet, 'wallet-decision-failed');
    } finally { await verifierCtx.unroute('**/demo-api/v1/**'); await walletCtx.unroute('**/demo-api/v1/**'); }
    check((await get(`/verifier/sessions/${s.id}?organizationId=org-test-a`)).status === 'PENDING', 'state changed during outage');
    await verifier.getByText('تعذر تحديث البيانات من خادم المحاكاة.').waitFor({ state: 'detached', timeout: 15_000 });
    note('verifier recovered on its own');
    await walletDecide(s.id, 'ACCEPT');
    await verifier.goto(`${V()}/sessions/${s.id}`);
    await verifier.getByText('موافقة تجريبية — DEMO_ACCEPTED').waitFor({ timeout: 10_000 });
    note('after recovery: approval recorded, verifier shows DEMO_ACCEPTED');
    const s2 = await verifierCreate('طلب أثناء انقطاع الاتصال بالكامل');
    await wallet.goto(`${W()}/requests/${s2.id}`);
    await wallet.getByRole('button', { name: 'رفض' }).waitFor();
    await walletCtx.setOffline(true);
    await wallet.getByText(/أنت غير متصل بالشبكة/).waitFor();
    check(await wallet.getByRole('button', { name: 'رفض' }).isDisabled(), 'decision enabled offline');
    await shot(wallet, 'wallet-offline');
    await walletCtx.setOffline(false);
    await wallet.getByRole('button', { name: 'رفض' }).and(wallet.locator(':enabled')).waitFor();
    note('browser offline: decisions disabled; restored when online');
  });

  await scenario({
    id: 'H', title: 'Privacy preservation',
    syntheticData: 'org-test-a; AGE_OVER_18 (1 of 4 national-ID claims); withheld synthetic values «1990-01-01», «TEST-DOC-0001», «مواطن تجريبي»',
    start: 'Demo reset.',
    steps: ['Verifier requests age only', 'Citizen opens the request and the disclosure preview', 'Citizen approves', 'Verifier and API responses are inspected'],
    expected: 'The preview names withheld fields without their values; only «العمر فوق 18 سنة: نعم» reaches the verifier; no withheld value in the verifier page, session JSON or activity.',
  }, async ({ note, shot }) => {
    const s = await verifierCreate('العمر فقط لخدمة تجريبية');
    check(s.disclosed === null, 'values present before decision');
    await wallet.goto(`${W()}/requests/${s.id}/disclosure`);
    await wallet.getByRole('heading', { name: 'يبقى خاصاً (3)' }).waitFor();
    const grid = await wallet.locator('.disclosure-grid').innerText();
    for (const v of ['1990-01-01', 'TEST-DOC-0001', 'مواطن تجريبي']) check(!grid.includes(v), `withheld value ${v} visible in preview`);
    for (const label of ['الاسم الكامل', 'تاريخ الميلاد', 'رقم الوثيقة التجريبي']) check(grid.includes(label), `withheld field ${label} not named`);
    note('preview: 1 shared value, 3 withheld fields named without values');
    await shot(wallet, 'wallet-disclosure', true);
    await walletDecide(s.id, 'ACCEPT');
    await verifier.goto(`${V()}/sessions/${s.id}`);
    await verifier.getByText('موافقة تجريبية — DEMO_ACCEPTED').waitFor({ timeout: 10_000 });
    const vt = await text(verifier);
    const sessionJson = JSON.stringify(await get(`/verifier/sessions/${s.id}?organizationId=org-test-a`));
    const activityJson = JSON.stringify(await get('/verifier/activity?organizationId=org-test-a'));
    for (const v of ['1990-01-01', 'TEST-DOC-0001']) check(!vt.includes(v) && !sessionJson.includes(v) && !activityJson.includes(v), `withheld ${v} reached the verifier`);
    check(!sessionJson.includes('مواطن تجريبي') && !activityJson.includes('مواطن تجريبي'), 'withheld name reached the verifier');
    note('verifier page, session JSON and activity contain only the age claim');
    await shot(verifier, 'verifier-only-age', true);
  });

  // Scenario G needs the demo API restarted with a suspended national ID (DEMO_CREDENTIAL_STATUS).
  await stack.stopped();
  stack = startStack({ preview: true, env: { ...env, DEMO_CREDENTIAL_STATUS: 'SUSPENDED' }, onLine: (l) => lines.push(`[G] ${l}`) });
  await stack.ready();
  await scenario({
    id: 'G', title: 'Credential restrictions',
    syntheticData: 'Demo API started with DEMO_CREDENTIAL_STATUS=SUSPENDED (national ID cred-test-001 SUSPENDED); org-test-a; AGE_OVER_18',
    start: 'Demo restarted with the suspended credential, then reset (the status survives reset).',
    steps: ['Verifier creates a request', 'Citizen opens it in the wallet', 'Citizen (or a direct API call) tries to approve', 'Citizen rejects'],
    expected: 'Wallet explains «اعتماد الهوية التجريبي موقوف» and disables approval; API approval → 409 CREDENTIAL_NOT_ACTIVE with state still PENDING; rejection works and reaches the verifier.',
  }, async ({ note, shot }) => {
    const id = (await get('/wallet/credentials')).find((c) => c.type === 'DEMO_NATIONAL_ID');
    check(id.status === 'SUSPENDED', `national ID ${id.status}`);
    const s = await verifierCreate('طلب مع اعتماد موقوف');
    await wallet.goto(`${W()}/requests/${s.id}`);
    await wallet.getByText('اعتماد الهوية التجريبي موقوف').waitFor();
    check(await wallet.getByRole('button', { name: 'موافقة تجريبية' }).isDisabled(), 'approve enabled for a suspended credential');
    note('wallet: restriction explained, approval disabled');
    await shot(wallet, 'wallet-suspended', true);
    const refused = await post(`/wallet/requests/${s.id}/decision`, { decision: 'ACCEPT' });
    check(refused.status === 409 && refused.body.error.code === 'CREDENTIAL_NOT_ACTIVE', `API approve ${refused.status}`);
    check((await get(`/verifier/sessions/${s.id}?organizationId=org-test-a`)).status === 'PENDING', 'state changed by refused approval');
    note(`API approve → 409 ${refused.body.error.code}; state PENDING`);
    await walletDecide(s.id, 'REJECT');
    await verifier.goto(`${V()}/sessions/${s.id}`);
    await verifier.getByText('رفض المواطن الطلب').waitFor({ timeout: 10_000 });
    note('rejection recorded and shown to the verifier');
  });

  scenarios.push({ id: 'console', title: 'No browser console errors in either app during all scenarios', outcome: consoleErrors.length === 0 ? 'PASS' : 'FAIL', actual: consoleErrors.slice(0, 5), commit, workingTreeDirty: dirty });
  console.log(`${consoleErrors.length === 0 ? 'PASS' : 'FAIL'}  console errors: ${consoleErrors.length}`);
} catch (e) { scenarios.push({ id: 'harness', title: 'harness', outcome: 'FAIL', error: String(e?.message ?? e), commit }); console.log(`FAIL  harness ${e?.message ?? e}`); }
finally {
  await browser?.close();
  await stack.stopped();
  scenarios.sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(path.join(out, 'scenarios.json'), JSON.stringify({ at: new Date().toISOString(), commit, workingTreeDirty: dirty, ttlMs: TTL_MS, node: process.version, platform: process.platform, scenarios }, null, 2));
  await writeFile(path.join(out, 'stack.log'), lines.join('\n'));
  const failed = scenarios.filter((s) => s.outcome !== 'PASS').length;
  console.log(`\nDEMO SCENARIOS: ${scenarios.length - failed} PASS / ${failed} FAIL`);
  process.exitCode = failed || scenarios.length === 0 ? 1 : 0;
}
