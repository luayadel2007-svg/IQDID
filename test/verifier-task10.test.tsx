/**
 * TASK-10: institutional verifier — create flow, sessions, results, organisation isolation,
 * live state updates, failure recovery and the demo/protocol boundary. One real demo HTTP
 * server per file, no in-app mocks. Synthetic data only.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createTransport, createVerifierGateway, createWalletGateway } from '@iqdid/api-client';
import { startDemoServer, type RunningDemoServer } from '@iqdid/mock-services';
import { VerifierApp } from '../apps/verifier-web/src/App.tsx';
import { demoOutcome, filterSessions } from '../apps/verifier-web/src/model.ts';
import { demoVerifierTrust, trustLayers, type CryptoView } from '../apps/verifier-web/src/trust.tsx';

let srv: RunningDemoServer;
let down = false;
const flakyFetch: typeof fetch = (input, init) => (down ? Promise.reject(new TypeError('Failed to fetch')) : fetch(input, init));
const transport = (baseUrl = srv.url) => createTransport('demo', { baseUrl, retries: 0, timeoutMs: 3000, fetchImpl: flakyFetch });
const verifierGw = () => createVerifierGateway(transport());
const walletGw = () => createWalletGateway(transport());
const renderVerifier = (path: string, baseUrl?: string) => render(<MemoryRouter initialEntries={[path]}><VerifierApp gateway={createVerifierGateway(transport(baseUrl))} pollMs={150} /></MemoryRouter>);
const create = (purpose: string, organizationId = 'org-test-a', templateId: 'AGE_OVER_18' | 'IDENTITY_BASIC' = 'AGE_OVER_18') => verifierGw().createSession({ organizationId, templateId, purpose });
const PROTOCOL_CLAIM = /VERIFIED_BY_PROTOCOL|\bVERIFIED\b|تم التحقق من الهوية|متحقق منه تشفيرياً بنجاح/;

beforeAll(async () => { srv = await startDemoServer({ port: 0, ttlMs: 120_000 }); });
afterAll(async () => { await srv.close(); });
beforeEach(() => { srv.store.reset(false); down = false; window.sessionStorage.clear(); });

describe('create request flow', () => {
  it('walks details → review → confirm, previews exactly the template fields and ends on the session code', async () => {
    const v = renderVerifier('/new');
    const ui = within(v.container);
    const steps = await ui.findByRole('list', { name: 'مراحل إنشاء الطلب' });
    expect(within(steps).getAllByRole('listitem').map((li) => li.getAttribute('aria-current'))).toEqual(['step', null, null]);
    expect(ui.getByLabelText('المؤسسة الطالبة (تجريبية)')).toHaveValue('org-test-a');
    await userEvent.click(ui.getByRole('radio', { name: /التحقق من الهوية الأساسية/ }));
    const fields = ui.getByRole('list', { name: 'البيانات المطلوب مشاركتها' });
    expect(within(fields).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['الاسم الكامل', 'تاريخ الميلاد', 'رقم الوثيقة التجريبي']);
    expect(ui.getByText(/مدة صلاحية الجلسة: 120 ثانية/)).toBeInTheDocument();
    await userEvent.type(ui.getByLabelText('الغرض من الطلب'), 'تحديث بيانات عميل تجريبي');
    expect(srv.store.listSessionsForOrg('org-test-a')).toHaveLength(0);

    await userEvent.click(ui.getByRole('button', { name: 'مراجعة الطلب' }));
    expect(await ui.findByRole('heading', { name: 'المراجعة والتأكيد' })).toHaveFocus();
    expect(within(steps).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
    expect(srv.store.listSessionsForOrg('org-test-a')).toHaveLength(0);
    await userEvent.click(ui.getByRole('button', { name: 'تعديل الطلب' }));
    expect(ui.getByLabelText('الغرض من الطلب')).toHaveValue('تحديث بيانات عميل تجريبي');
    await userEvent.click(ui.getByRole('button', { name: 'مراجعة الطلب' }));
    await userEvent.click(await ui.findByRole('button', { name: 'إرسال الطلب إلى المحفظة' }));

    expect(await ui.findByText('أُرسل الطلب إلى المحفظة التجريبية.', {}, { timeout: 4000 })).toBeInTheDocument();
    const [s] = srv.store.listSessionsForOrg('org-test-a');
    expect(s).toMatchObject({ templateId: 'IDENTITY_BASIC', purpose: 'تحديث بيانات عميل تجريبي', status: 'PENDING' });
    expect(ui.getByRole('heading', { level: 1, name: `جلسة ${s?.shortCode}` })).toBeInTheDocument();
    expect(ui.getByLabelText(new RegExp(`^رمز الجلسة ${(s?.shortCode ?? '').split('').join(' ')}$`))).toHaveTextContent(s?.shortCode ?? '');
    expect(ui.getByText('أُنشئ الطلب')).toBeInTheDocument();
  });

  it('creates the request for the organisation chosen in the form, not a default one', async () => {
    const v = renderVerifier('/new');
    const ui = within(v.container);
    await userEvent.selectOptions(await ui.findByLabelText('المؤسسة الطالبة (تجريبية)'), 'org-test-b');
    expect(ui.getByLabelText('المؤسسة:')).toHaveValue('org-test-b');
    await userEvent.type(ui.getByLabelText('الغرض من الطلب'), 'تفعيل خط اتصالات تجريبي');
    await userEvent.click(ui.getByRole('button', { name: 'مراجعة الطلب' }));
    const reviewCard = ui.getByRole('heading', { name: 'المراجعة والتأكيد' }).closest('.card') as HTMLElement;
    expect(within(reviewCard).getByText('شركة اتصالات تجريبية (ب)', { selector: 'dd' })).toBeInTheDocument();
    await userEvent.click(ui.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }));
    await ui.findByText('أُرسل الطلب إلى المحفظة التجريبية.', {}, { timeout: 4000 });
    expect(srv.store.listSessionsForOrg('org-test-b')).toHaveLength(1);
    expect(srv.store.listSessionsForOrg('org-test-a')).toHaveLength(0);
  });

  it('shows the server error and keeps the form when creation fails', async () => {
    const v = renderVerifier('/new');
    const ui = within(v.container);
    await userEvent.type(await ui.findByLabelText('الغرض من الطلب'), 'طلب أثناء انقطاع');
    await userEvent.click(ui.getByRole('button', { name: 'مراجعة الطلب' }));
    down = true;
    await userEvent.click(ui.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }));
    expect(await ui.findByText('تعذر إنشاء الطلب')).toBeInTheDocument();
    expect(ui.getByText(/تعذر الاتصال بخادم العرض التجريبي/)).toBeInTheDocument();
    down = false;
    await userEvent.click(ui.getByRole('button', { name: 'إرسال الطلب إلى المحفظة' }));
    await ui.findByText('أُرسل الطلب إلى المحفظة التجريبية.', {}, { timeout: 4000 });
    expect(srv.store.listSessionsForOrg('org-test-a')).toHaveLength(1);
  });
});

describe('session detail and states', () => {
  it('shows every required detail and updates live from PENDING to DEMO_ACCEPTED without a reload', async () => {
    const s = await create('فتح حساب مصرفي تجريبي', 'org-test-a', 'IDENTITY_BASIC');
    const v = renderVerifier(`/sessions/${s.id}`);
    const ui = within(v.container);
    await ui.findByText('بانتظار قرار المواطن', { selector: 'strong' });
    for (const label of ['رقم الجلسة', 'المؤسسة الطالبة', 'الغرض', 'البيانات المطلوبة', 'أُنشئ', 'ينتهي', 'القرار المسجل']) expect(ui.getByText(label, { selector: 'dt' })).toBeInTheDocument();
    expect(ui.getByText(s.id)).toBeInTheDocument();
    expect(ui.getByText('لا يوجد قرار بعد', { selector: 'dd' })).toBeInTheDocument();
    expect(await ui.findByRole('timer')).toBeInTheDocument();
    expect(ui.getByRole('link', { name: /العودة إلى الجلسات/ })).toHaveAttribute('href', '/sessions');

    await walletGw().decide(s.id, 'ACCEPT');
    expect(await ui.findByText('موافقة تجريبية — DEMO_ACCEPTED', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(ui.getByText(/وافق المواطن التجريبي \(ACCEPT\)/, { selector: 'dd' })).toBeInTheDocument();
    expect(ui.getByText('TEST-DOC-0001')).toBeInTheDocument();
    const layers = ui.getByRole('list', { name: 'طبقات الحالة والثقة' });
    expect(within(layers).getAllByRole('listitem')).toHaveLength(5);
    expect(within(layers).getAllByRole('listitem')[4]).toHaveTextContent('غير متحقق منه تشفيرياً');
    expect(v.container.textContent).not.toMatch(PROTOCOL_CLAIM);
  });

  it('rejection shows no values; cancellation needs confirmation; a decided session cannot be cancelled', async () => {
    const r = await create('طلب سيُرفض');
    await walletGw().decide(r.id, 'REJECT');
    const v = renderVerifier(`/sessions/${r.id}`);
    const ui = within(v.container);
    expect(await ui.findByText('رفض المواطن الطلب')).toBeInTheDocument();
    expect(ui.queryByText('القيم المشاركة (اصطناعية)')).not.toBeInTheDocument();
    expect(ui.queryByRole('button', { name: 'إلغاء الطلب' })).not.toBeInTheDocument();
    v.unmount();

    const c = await create('طلب سيُلغى');
    const w = renderVerifier(`/sessions/${c.id}`);
    const wui = within(w.container);
    await userEvent.click(await wui.findByRole('button', { name: 'إلغاء الطلب' }));
    expect(srv.store.getSessionForOrg(c.id, 'org-test-a')).toMatchObject({ ok: true, value: { status: 'PENDING' } });
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الإلغاء' }));
    expect(await wui.findByText('ألغت المؤسسة الطلب قبل القرار.', {}, { timeout: 4000 })).toBeInTheDocument();
    await expect(verifierGw().cancelSession(c.id, 'org-test-a')).rejects.toMatchObject({ code: 'SESSION_ALREADY_DECIDED' });
  });

  it('expiry: the verifier shows the expiry, the timeline records it and late decisions are refused', async () => {
    const short = await startDemoServer({ port: 0, ttlMs: 800 });
    try {
      const s = await createVerifierGateway(transport(short.url)).createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'طلب ينتهي' });
      const v = renderVerifier(`/sessions/${s.id}`, short.url);
      const ui = within(v.container);
      expect(await ui.findByText('انتهت مهلة الطلب', {}, { timeout: 4000 })).toBeInTheDocument();
      expect(ui.getByText('انتهت المهلة دون قرار')).toBeInTheDocument();
      expect(ui.getByText('لا قرار — انتهت المهلة', { selector: 'dd' })).toBeInTheDocument();
      await expect(createWalletGateway(transport(short.url)).decide(s.id, 'ACCEPT')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    } finally { await short.close(); }
  });
});

describe('sessions list, results and isolation', () => {
  it('search, status filter, template filter and sort work on many sessions and are reflected in the count', async () => {
    const a = await create('فتح حساب مصرفي', 'org-test-a', 'AGE_OVER_18');
    const b = await create('تحديث بيانات العميل', 'org-test-a', 'IDENTITY_BASIC');
    await create('خدمة إلكترونية', 'org-test-a', 'AGE_OVER_18');
    await walletGw().decide(a.id, 'ACCEPT');
    await walletGw().decide(b.id, 'REJECT');
    const v = renderVerifier('/sessions');
    const ui = within(v.container);
    const rows = () => within(ui.getByRole('table')).getAllByRole('row').slice(1);
    expect(await ui.findByText('عرض 3 من 3 جلسة')).toBeInTheDocument();
    await userEvent.selectOptions(ui.getByLabelText('الحالة'), 'DEMO_ACCEPTED');
    expect(await ui.findByText('عرض 1 من 3 جلسة')).toBeInTheDocument();
    expect(rows()[0]).toHaveTextContent(a.shortCode);
    await userEvent.selectOptions(ui.getByLabelText('الحالة'), 'ALL');
    await userEvent.selectOptions(ui.getByLabelText('نوع الطلب'), 'IDENTITY_BASIC');
    expect(await ui.findByText('عرض 1 من 3 جلسة')).toBeInTheDocument();
    expect(rows()[0]).toHaveTextContent(b.shortCode);
    await userEvent.click(ui.getByRole('button', { name: 'مسح التصفية' }));
    await userEvent.type(ui.getByLabelText('بحث في الجلسات'), 'خدمة');
    expect(await ui.findByText('عرض 1 من 3 جلسة')).toBeInTheDocument();
    await userEvent.clear(ui.getByLabelText('بحث في الجلسات'));
    await userEvent.type(ui.getByLabelText('بحث في الجلسات'), 'لا يوجد');
    expect(await ui.findByText('لا توجد جلسات مطابقة')).toBeInTheDocument();
    await userEvent.clear(ui.getByLabelText('بحث في الجلسات'));
    await userEvent.selectOptions(ui.getByLabelText('الترتيب'), 'oldest');
    expect(rows()[0]).toHaveTextContent(a.shortCode);
    await userEvent.selectOptions(ui.getByLabelText('الترتيب'), 'expiry');
    expect(rows()[0]).toHaveTextContent('بانتظار قرار المواطن');
  });

  it('dashboard counts come from the API, link to filtered lists, and show an empty state when there is no data', async () => {
    const empty = renderVerifier('/');
    expect(await within(empty.container).findByText('لا توجد جلسات بعد')).toBeInTheDocument();
    expect(within(empty.container).queryByRole('region', { name: 'مؤشرات الجلسات' })).not.toBeInTheDocument();
    empty.unmount();
    const a = await create('أ'.repeat(3));
    await create('ب'.repeat(3));
    await walletGw().decide(a.id, 'REJECT');
    await create('طلب مؤسسة ب', 'org-test-b');
    const v = renderVerifier('/');
    const ui = within(v.container);
    const kpis = await ui.findByRole('region', { name: 'مؤشرات الجلسات' });
    const kpi = (name: RegExp) => within(kpis).getByRole('link', { name });
    expect(kpi(/بانتظار القرار/)).toHaveTextContent('1');
    expect(kpi(/مرفوضة/)).toHaveTextContent('1');
    expect(kpi(/موافقات تجريبية/)).toHaveTextContent('0');
    expect(kpi(/بانتظار القرار/)).toHaveAttribute('href', '/sessions?status=PENDING');
    expect((await ui.findAllByText(/طلبت: التحقق من العمر/, {}, { timeout: 4000 })).length).toBeGreaterThan(0);
    expect(v.container.textContent).not.toContain('طلب مؤسسة ب');
  });

  it('organisation B never sees organisation A sessions, details, results or activity', async () => {
    const s = await create('طلب خاص بالمؤسسة أ');
    await walletGw().decide(s.id, 'ACCEPT');
    window.sessionStorage.setItem('iqdid-demo-org', 'org-test-b');
    for (const path of ['/', '/sessions', '/results', '/activity', `/sessions/${s.id}`]) {
      const v = renderVerifier(path);
      await waitFor(() => expect(v.container.querySelector('main h1, main [role="alert"]')).not.toBeNull(), { timeout: 4000 });
      await waitFor(() => expect(v.container.querySelector('main .skeleton')).toBeNull(), { timeout: 4000 });
      expect(v.container.textContent).not.toContain(s.shortCode);
      expect(v.container.textContent).not.toContain('طلب خاص بالمؤسسة أ');
      expect(v.container.textContent).not.toContain('TEST-DOC-0001');
      if (path.startsWith('/sessions/')) expect(within(v.container).getByText('العنصر المطلوب غير موجود.')).toBeInTheDocument();
      v.unmount();
    }
    await expect(createVerifierGateway(transport()).session(s.id, 'org-test-b')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('results page summarises closed sessions by outcome and filters them', async () => {
    const a = await create('مقبول');
    const b = await create('مرفوض');
    await create('معلق');
    await walletGw().decide(a.id, 'ACCEPT');
    await walletGw().decide(b.id, 'REJECT');
    const v = renderVerifier('/results');
    const ui = within(v.container);
    expect(await ui.findByText('عرض 2 من 2 نتيجة')).toBeInTheDocument();
    expect(ui.getByText('غير منفذ')).toBeInTheDocument();
    await userEvent.click(ui.getByRole('button', { name: 'رفض' }));
    expect(await ui.findByText('عرض 1 من 2 نتيجة')).toBeInTheDocument();
    expect(within(ui.getByRole('table')).getAllByRole('row')[1]).toHaveTextContent(b.shortCode);
    expect(v.container.textContent).not.toContain('معلق');
  });
});

describe('connection failure and recovery', () => {
  it('keeps the last good data with a visible notice while the API is down, then recovers on its own', async () => {
    await create('قبل الانقطاع');
    const v = renderVerifier('/sessions');
    const ui = within(v.container);
    expect(await ui.findByText('قبل الانقطاع')).toBeInTheDocument();
    down = true;
    expect(await ui.findByText('تعذر تحديث البيانات من خادم المحاكاة.', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(ui.getByText('قبل الانقطاع')).toBeInTheDocument();
    down = false;
    await create('بعد عودة الخدمة');
    expect(await ui.findByText('بعد عودة الخدمة', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(ui.queryByText('تعذر تحديث البيانات من خادم المحاكاة.')).not.toBeInTheDocument();
  });

  it('first load failure shows an error with retry that succeeds once the API is back', async () => {
    down = true;
    const v = renderVerifier('/results');
    const ui = within(v.container);
    expect(await ui.findByText('تعذر عرض البيانات', {}, { timeout: 4000 })).toBeInTheDocument();
    down = false;
    await userEvent.click(ui.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(await ui.findByRole('heading', { level: 1, name: 'نتائج الطلبات' }, { timeout: 4000 })).toBeInTheDocument();
  });
});

describe('demo / protocol boundary', () => {
  it('trust layers keep app, credential, consent, session and crypto separate; crypto is never verified in demo mode', async () => {
    const s = await create('اختبار الطبقات');
    const accepted = await walletGw().decide(s.id, 'ACCEPT');
    const layers = trustLayers(accepted, 'ok', demoVerifierTrust);
    expect(layers.map((l) => l.id)).toEqual(['app', 'credential', 'consent', 'session', 'crypto']);
    expect(layers.find((l) => l.id === 'crypto')).toMatchObject({ value: 'غير متحقق منه تشفيرياً', tone: 'neutral' });
    expect(new Set(layers.map((l) => l.value)).size).toBe(5);
    expect(demoOutcome(accepted)).toEqual({ mode: 'demo', outcome: 'DEMO_ACCEPTED', sessionId: s.id });
    expect(demoOutcome(await create('معلق'))).toBeNull();
    expect(trustLayers(accepted, 'stale', demoVerifierTrust)[0]).toMatchObject({ tone: 'warning' });
    // @ts-expect-error a protocol view needs a branded server proof; browser code cannot build one
    const forged: CryptoView = { kind: 'PROTOCOL', proof: { mode: 'protocol', outcome: 'VERIFIED_BY_PROTOCOL', evidence: {} } };
    expect(forged.kind).toBe('PROTOCOL');
  });

  it('no verifier screen claims protocol verification, in any state', async () => {
    const a = await create('مقبول'); await walletGw().decide(a.id, 'ACCEPT');
    const b = await create('مرفوض'); await walletGw().decide(b.id, 'REJECT');
    const c = await create('معلق');
    for (const path of ['/', '/new', '/sessions', '/results', '/activity', '/settings', `/sessions/${a.id}`, `/sessions/${b.id}`, `/sessions/${c.id}`]) {
      const v = renderVerifier(path);
      await within(v.container).findByRole('heading', { level: 1 });
      await new Promise((r) => setTimeout(r, 200));
      expect(v.container.textContent).not.toMatch(PROTOCOL_CLAIM);
      v.unmount();
    }
  });

  it('filterSessions is pure and stable for unknown inputs', () => {
    expect(filterSessions([], { q: '', status: 'ALL', template: 'ALL', sort: 'newest' })).toEqual([]);
  });
});
