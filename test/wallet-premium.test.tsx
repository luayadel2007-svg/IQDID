/**
 * TASK-9 Premium Citizen Wallet — component/integration tests against ONE real
 * demo HTTP server (no in-app mocks). Synthetic data only.
 */
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createTransport, createVerifierGateway, createWalletGateway, ApiError } from '@iqdid/api-client';
import type { RequestSpec, Transport } from '@iqdid/api-client';
import { startDemoServer, type RunningDemoServer } from '@iqdid/mock-services';
import { primaryIdentityCredential } from '@iqdid/shared-types';
import { WalletApp } from '../apps/wallet-web/src/App.tsx';
import { demoTrustAdapter, type TrustView } from '../apps/wallet-web/src/trust.ts';
import { readFavorites } from '../apps/wallet-web/src/local.ts';

let srv: RunningDemoServer;
const POLL = 150;

/** Switchable network: `down` makes every call fail like a dropped connection. */
class FlakyTransport implements Transport {
  readonly mode = 'demo';
  down = false;
  private readonly inner: Transport;
  constructor(inner: Transport) { this.inner = inner; }
  request<T>(spec: RequestSpec<T>): Promise<T> {
    if (this.down) return Promise.reject(new ApiError({ kind: 'network', message: 'simulated network failure', requestId: 'test' }));
    return this.inner.request(spec);
  }
}
/** Reads go stale on demand (GET fails); writes still reach the server. Counts decisions the server refused. */
class StaleReadsTransport implements Transport {
  readonly mode = 'demo';
  staleReads = false;
  refusedDecisions = 0;
  private readonly inner: Transport;
  constructor(inner: Transport) { this.inner = inner; }
  async request<T>(spec: RequestSpec<T>): Promise<T> {
    if (this.staleReads && spec.method === 'GET') throw new ApiError({ kind: 'network', message: 'simulated stale screen', requestId: 'test' });
    try { return await this.inner.request(spec); } catch (e) { if (spec.method === 'POST') this.refusedDecisions++; throw e; }
  }
}
const demo = (baseUrl = srv.url) => createTransport('demo', { baseUrl, retries: 0, timeoutMs: 3000 });
const renderWallet = (path: string, transport: Transport = demo()) =>
  render(<MemoryRouter initialEntries={[path]}><WalletApp gateway={createWalletGateway(transport)} pollMs={POLL} /></MemoryRouter>);
const verifierGw = () => createVerifierGateway(demo());
const createSession = (organizationId = 'org-test-a', templateId: 'AGE_OVER_18' | 'IDENTITY_BASIC' = 'AGE_OVER_18', purpose = 'فتح حساب مصرفي تجريبي') =>
  verifierGw().createSession({ organizationId, templateId, purpose });

beforeAll(async () => { srv = await startDemoServer({ port: 0, ttlMs: 120_000 }); });
afterAll(async () => { await srv.close(); });
beforeEach(() => srv.store.reset(false));

describe('credentials', () => {
  it('lists five synthetic credentials; search and status filters narrow the list', async () => {
    const w = renderWallet('/credentials');
    const ui = within(w.container);
    const list = await ui.findByRole('list', { name: 'قائمة المستمسكات' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    await userEvent.type(ui.getByLabelText('بحث في المستمسكات'), 'سوق');
    expect(within(ui.getByRole('list', { name: 'قائمة المستمسكات' })).getAllByRole('listitem')).toHaveLength(1);
    await userEvent.clear(ui.getByLabelText('بحث في المستمسكات'));
    await userEvent.click(ui.getByRole('button', { name: 'تحتاج انتباهاً' }));
    const attention = within(ui.getByRole('list', { name: 'قائمة المستمسكات' })).getAllByRole('link').map((a) => a.textContent);
    expect(attention).toEqual(['إجازة سوق (تجريبية)', 'بطاقة التأمين الصحي (تجريبية)']);
    await userEvent.type(ui.getByLabelText('بحث في المستمسكات'), 'غير موجود');
    expect(ui.getByText('لا توجد نتائج')).toBeInTheDocument();
  });

  it('masks sensitive claims until revealed and blocks use of a suspended credential', async () => {
    const w = renderWallet('/credentials/cred-test-004');
    const ui = within(w.container);
    expect(await ui.findByText('لا يمكن استخدام هذا الاعتماد')).toBeInTheDocument();
    expect(ui.queryByText('TEST-HC-0004')).not.toBeInTheDocument();
    await userEvent.click(ui.getByRole('switch', { name: 'إظهار القيم الحساسة' }));
    expect(ui.getByText('TEST-HC-0004')).toBeInTheDocument();
  });

  it('only the national ID answers verification requests (wallet and server use the same rule)', () => {
    const list = srv.store.credentials();
    expect(list).toHaveLength(5);
    expect(primaryIdentityCredential(list)?.id).toBe('cred-test-001');
  });
});

describe('journey and edge cases', () => {
  it('selective disclosure shows exactly the requested claim as shared and the rest withheld; approve from there', async () => {
    const s = await createSession();
    const w = renderWallet(`/requests/${s.id}/disclosure`);
    const ui = within(w.container);
    const shared = await ui.findByRole('region', { name: /سيُشارك \(1\)/ });
    expect(within(shared).getByText('نعم')).toBeInTheDocument();
    const withheld = ui.getByRole('region', { name: /يبقى خاصاً \(3\)/ });
    expect(within(withheld).queryByText('TEST-DOC-0001')).not.toBeInTheDocument();
    expect(w.container.textContent).not.toContain('TEST-DOC-0001');
    await userEvent.click(ui.getByRole('button', { name: 'موافقة تجريبية' }));
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الموافقة' }));
    expect(await ui.findByText('سُجلت موافقتك التجريبية')).toBeInTheDocument();
    expect((await verifierGw().session(s.id, 'org-test-a')).status).toBe('DEMO_ACCEPTED');
    expect(document.body.textContent).not.toMatch(/VERIFIED_BY_PROTOCOL|تم التحقق من الهوية/);
  });

  it('duplicate decision from a stale screen is refused by the server and the page shows the real outcome', async () => {
    const s = await createSession();
    // The screen is made stale deterministically: after it loads, its refresh GETs fail (decision POSTs still go out),
    // so a poll can never update it before the second decision is attempted.
    const net = new StaleReadsTransport(demo());
    const stale = renderWallet(`/requests/${s.id}`, net);
    const ui = within(stale.container);
    await ui.findByRole('button', { name: 'رفض' });
    net.staleReads = true;
    await createWalletGateway(demo()).decide(s.id, 'ACCEPT'); // decided elsewhere (another device)
    await userEvent.click(ui.getByRole('button', { name: 'رفض' }));
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الرفض' }));
    expect(await ui.findByText('لم يُسجَّل القرار')).toBeInTheDocument();
    expect(net.refusedDecisions).toBe(1);
    net.staleReads = false;
    expect(await ui.findByText('سُجلت موافقتك التجريبية', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(srv.store.activityForHolder().filter((e) => e.type === 'CONSENT_REJECTED')).toHaveLength(0);
  });

  it('network failure shows an error with retry; recovery loads data; a later drop keeps data with a weak-connection notice', async () => {
    const net = new FlakyTransport(demo());
    net.down = true;
    const w = renderWallet('/activity', net);
    const ui = within(w.container);
    expect(await ui.findByText('تعذر عرض البيانات')).toBeInTheDocument();
    net.down = false;
    await userEvent.click(ui.getByRole('button', { name: 'إعادة المحاولة' }));
    await createSession('org-test-b', 'AGE_OVER_18', 'تفعيل خط تجريبي');
    expect(await ui.findByText(/طلبت: التحقق من العمر/, {}, { timeout: 3000 })).toBeInTheDocument();
    net.down = true;
    expect(await ui.findByText('اتصال ضعيف', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(ui.getByText(/طلبت: التحقق من العمر/)).toBeInTheDocument();
    net.down = false;
    await userEvent.click(ui.getByRole('button', { name: 'تحديث' }));
    await vi.waitFor(() => expect(ui.queryByText('اتصال ضعيف')).not.toBeInTheDocument());
  });

  it('offline: banner appears and decision buttons are disabled until the connection returns', async () => {
    const s = await createSession();
    const w = renderWallet(`/requests/${s.id}`);
    const ui = within(w.container);
    await ui.findByRole('button', { name: 'رفض' });
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(await ui.findByText(/أنت غير متصل بالشبكة/)).toBeInTheDocument();
    expect(ui.getByRole('button', { name: 'رفض' })).toBeDisabled();
    expect(ui.getByRole('button', { name: 'موافقة تجريبية' })).toBeDisabled();
    spy.mockReturnValue(true);
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(await ui.findByRole('button', { name: 'رفض' })).toBeEnabled();
    spy.mockRestore();
  });

  it('multiple demo organisations: wallet filter shows one organisation at a time', async () => {
    await createSession('org-test-a', 'AGE_OVER_18', 'طلب من المصرف');
    await createSession('org-test-b', 'IDENTITY_BASIC', 'طلب من شركة الاتصالات');
    const w = renderWallet('/requests');
    const ui = within(w.container);
    await ui.findByText('طلب من المصرف');
    await userEvent.click(ui.getByRole('button', { name: 'شركة اتصالات تجريبية (ب)' }));
    expect(ui.queryByText('طلب من المصرف')).not.toBeInTheDocument();
    expect(ui.getByText('طلب من شركة الاتصالات')).toBeInTheDocument();
  });

  it('request code entry on the QR screen opens the request; invalid and unknown codes are explained', async () => {
    const s = await createSession();
    const w = renderWallet('/qr');
    const ui = within(w.container);
    expect(ui.getByRole('img', { name: /رمز QR تجريبي/ })).toBeInTheDocument();
    const input = ui.getByLabelText('رمز الطلب');
    await userEvent.type(input, 'ab');
    await userEvent.click(ui.getByRole('button', { name: 'فتح الطلب' }));
    expect(ui.getByText(/أدخل رمزاً من 6 أحرف/)).toBeInTheDocument();
    await userEvent.clear(input); await userEvent.type(input, 'ZZZZZZ');
    await userEvent.click(ui.getByRole('button', { name: 'فتح الطلب' }));
    expect(await ui.findByText('لا يوجد طلب بهذا الرمز في محفظتك.')).toBeInTheDocument();
    await userEvent.clear(input); await userEvent.type(input, s.shortCode.toLowerCase());
    await userEvent.click(ui.getByRole('button', { name: 'فتح الطلب' }));
    expect(await ui.findByRole('heading', { level: 1, name: 'طلب مشاركة بيانات' })).toBeInTheDocument();
  });
});

describe('notifications, favorites, onboarding', () => {
  it('a new request raises an unread notification; mark-all-read persists across remounts', async () => {
    await createSession();
    const w = renderWallet('/notifications');
    const ui = within(w.container);
    expect(await ui.findByRole('link', { name: /الإشعارات \(1 غير مقروءة\)/ })).toBeInTheDocument();
    expect(ui.getByText('طلب مشاركة بيانات جديد')).toBeInTheDocument();
    await userEvent.click(ui.getByRole('button', { name: 'تعليم الكل كمقروء' }));
    expect(await ui.findByRole('link', { name: 'الإشعارات' })).toBeInTheDocument();
    w.unmount();
    const again = renderWallet('/');
    expect(await within(again.container).findByRole('link', { name: 'الإشعارات' })).toBeInTheDocument();
  });

  it('favorite services: settings change the home grid, max six, tampered storage ignored', async () => {
    localStorage.setItem('iqdid-wallet-favorites', JSON.stringify(['help', 'javascript:alert(1)', 'help', 7]));
    expect(readFavorites()).toEqual(['help']);
    const w = renderWallet('/settings');
    const ui = within(w.container);
    await userEvent.click(await ui.findByRole('checkbox', { name: 'رمز QR' }));
    for (const name of ['بطاقتي', 'قائمة المستمسكات', 'الطلبات', 'النشاط']) await userEvent.click(ui.getByRole('checkbox', { name }));
    expect(ui.getByRole('checkbox', { name: 'الإشعارات' })).toBeDisabled();
    w.unmount();
    const home = renderWallet('/');
    const grid = await within(home.container).findByRole('navigation', { name: 'خدماتي المفضلة' });
    expect(within(grid).getAllByRole('link').map((a) => a.textContent)).toEqual(['المساعدة', 'رمز QR', 'بطاقتي', 'قائمة المستمسكات', 'الطلبات', 'النشاط']);
  });

  it('onboarding: home offers the tour until finished; finishing returns home without the prompt', async () => {
    const w = renderWallet('/');
    const ui = within(w.container);
    await userEvent.click(await ui.findByRole('link', { name: 'جولة تعريفية سريعة' }));
    expect(await ui.findByRole('heading', { level: 1, name: 'محفظتك الرقمية' })).toBeInTheDocument();
    await userEvent.click(ui.getByRole('button', { name: 'التالي' }));
    await userEvent.click(ui.getByRole('button', { name: 'التالي' }));
    expect(ui.getByRole('heading', { level: 1, name: 'نسخة تجريبية فقط' })).toBeInTheDocument();
    await userEvent.click(ui.getByRole('button', { name: 'ابدأ استخدام المحفظة' }));
    expect(await ui.findByRole('heading', { level: 1, name: 'أهلاً بك' })).toBeInTheDocument();
    expect(ui.queryByRole('link', { name: 'جولة تعريفية سريعة' })).not.toBeInTheDocument();
  });

  it('every wallet screen renders with a level-1 heading and never claims protocol verification', async () => {
    const s = await createSession();
    await createWalletGateway(demo()).decide(s.id, 'ACCEPT');
    const routes: Array<[string, string]> = [
      ['/', 'أهلاً بك'], ['/welcome', 'محفظتك الرقمية'], ['/card', 'بطاقتي الرقمية'], ['/credentials', 'مستمسكاتي'],
      ['/credentials/cred-test-001', 'تفاصيل المستمسك'], ['/requests', 'طلبات مشاركة البيانات'], [`/requests/${s.id}`, 'طلب مشاركة بيانات'],
      [`/requests/${s.id}/disclosure`, 'ما الذي سيُشارك؟'], ['/qr', 'رمز QR التجريبي'], ['/activity', 'سجل الاستخدام'],
      ['/notifications', 'الإشعارات'], ['/settings', 'الإعدادات'], ['/help', 'المساعدة وحول التطبيق'],
    ];
    for (const [path, heading] of routes) {
      const w = renderWallet(path);
      expect(await within(w.container).findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      await vi.waitFor(() => expect(w.container.querySelector('.skeleton')).toBeNull());
      expect(w.container.textContent).not.toMatch(/VERIFIED_BY_PROTOCOL|\bVERIFIED\b|تم التحقق من الهوية/);
      w.unmount();
    }
  });
});

describe('typed trust adapter', () => {
  it('demo adapter never yields a protocol view, even for an accepted session', async () => {
    const s = await createSession();
    const decided = await createWalletGateway(demo()).decide(s.id, 'ACCEPT');
    expect(demoTrustAdapter.describeSession(decided).kind).toBe('DEMO_UNVERIFIED');
    for (const c of srv.store.credentials()) expect(demoTrustAdapter.describeCredential(c).kind).toBe('DEMO_UNVERIFIED');
    // @ts-expect-error a protocol view requires a branded, server-issued VerifiedByProtocol proof
    const forged: TrustView = { kind: 'PROTOCOL', proof: { mode: 'protocol', outcome: 'VERIFIED_BY_PROTOCOL', evidence: {} } };
    expect(forged.kind).toBe('PROTOCOL');
  });
});
