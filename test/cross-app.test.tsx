/**
 * Cross-app integration: both real React apps talk to ONE real demo HTTP
 * server (no in-app mocks). Mirrors the user journey verifier → wallet → verifier.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createTransport, createVerifierGateway, createWalletGateway } from '@iqdid/api-client';
import { startDemoServer, type RunningDemoServer } from '@iqdid/mock-services';
import { WalletApp } from '../apps/wallet-web/src/App.tsx';
import { VerifierApp } from '../apps/verifier-web/src/App.tsx';

let srv: RunningDemoServer;
const POLL = 150;

const renderVerifier = (path: string, baseUrl = srv.url) =>
  render(<MemoryRouter initialEntries={[path]}><VerifierApp gateway={createVerifierGateway(createTransport('demo', { baseUrl, retries: 0, timeoutMs: 3000 }))} pollMs={POLL} /></MemoryRouter>);
const renderWallet = (path: string, baseUrl = srv.url) =>
  render(<MemoryRouter initialEntries={[path]}><WalletApp gateway={createWalletGateway(createTransport('demo', { baseUrl, retries: 0, timeoutMs: 3000 }))} pollMs={POLL} /></MemoryRouter>);

async function createRequestInVerifier(purpose: string, template: RegExp = /التحقق من العمر/): Promise<{ unmount: () => void; container: HTMLElement }> {
  const v = renderVerifier('/new');
  const ui = within(v.container);
  await userEvent.click(await ui.findByRole('radio', { name: template }));
  await userEvent.type(ui.getByLabelText('الغرض من الطلب'), purpose);
  await userEvent.click(ui.getByRole('button', { name: 'مراجعة الطلب' }));
  await userEvent.click(await ui.findByRole('button', { name: 'إرسال الطلب إلى المحفظة' }));
  await ui.findByText('أُرسل الطلب إلى المحفظة التجريبية.', {}, { timeout: 4000 });
  return v;
}

beforeAll(async () => { srv = await startDemoServer({ port: 0, ttlMs: 120_000 }); });
afterAll(async () => { await srv.close(); });
beforeEach(() => srv.store.reset(false));

describe('verifier → wallet → verifier journey', () => {
  it('approve: request appears in wallet with org, purpose and fields; verifier shows DEMO_ACCEPTED; both logs record it', async () => {
    const verifier = await createRequestInVerifier('فتح حساب مصرفي تجريبي');
    const vui = within(verifier.container);

    const wallet = renderWallet('/requests');
    const wui = within(wallet.container);
    await userEvent.click(await wui.findByRole('link', { name: 'مصرف تجريبي (أ)' }));
    expect(await wui.findByText('فتح حساب مصرفي تجريبي')).toBeInTheDocument();
    expect(wui.getByText('العمر فوق 18 سنة')).toBeInTheDocument();
    await userEvent.click(wui.getByRole('button', { name: 'موافقة تجريبية' }));
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الموافقة' }));
    expect(await wui.findByText('سُجلت موافقتك التجريبية')).toBeInTheDocument();

    expect(await vui.findByText('موافقة تجريبية — DEMO_ACCEPTED', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(vui.getByText(/لم يُجرَ أي تحقق تشفيري أو بروتوكولي/)).toBeInTheDocument();
    expect(vui.getByText('نعم')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bVERIFIED\b|تم التحقق من الهوية/);
    verifier.unmount();
    wallet.unmount();

    const wActivity = renderWallet('/activity');
    expect(await within(wActivity.container).findByText(/وافق المواطن التجريبي على مشاركة البيانات/)).toBeInTheDocument();
    wActivity.unmount();
    const vActivity = renderVerifier('/activity');
    expect(await within(vActivity.container).findByText(/وافق المواطن التجريبي على مشاركة البيانات/)).toBeInTheDocument();
  });

  it('reject: verifier sees DEMO_REJECTED and no disclosed values', async () => {
    const verifier = await createRequestInVerifier('التحقق من الهوية لخدمة تجريبية', /التحقق من الهوية الأساسية/);
    const vui = within(verifier.container);
    const wallet = renderWallet('/requests');
    const wui = within(wallet.container);
    await userEvent.click(await wui.findByRole('link', { name: 'مصرف تجريبي (أ)' }));
    await userEvent.click(await wui.findByRole('button', { name: 'رفض' }));
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الرفض' }));
    expect(await wui.findByText('رفضت هذا الطلب')).toBeInTheDocument();
    expect(await vui.findByText('رفض المواطن الطلب', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(vui.queryByText('القيم المشاركة (اصطناعية)')).not.toBeInTheDocument();
    expect(vui.queryByText('مواطن تجريبي')).not.toBeInTheDocument();
  });

  it('organisation isolation: org B does not see org A sessions', async () => {
    const verifier = await createRequestInVerifier('طلب خاص بالمؤسسة أ');
    verifier.unmount();
    window.sessionStorage.setItem('iqdid-demo-org', 'org-test-b');
    const v = renderVerifier('/sessions');
    expect(await within(v.container).findByText('لا توجد جلسات')).toBeInTheDocument();
  });
});

describe('expiry', () => {
  it('an expired request cannot be approved and both apps show the expiry', async () => {
    const short = await startDemoServer({ port: 0, ttlMs: 1200 });
    try {
      const verifier = renderVerifier('/new', short.url);
      const vui = within(verifier.container);
      await userEvent.type(await vui.findByLabelText('الغرض من الطلب'), 'طلب ينتهي سريعاً');
      await userEvent.click(vui.getByRole('button', { name: 'مراجعة الطلب' }));
      await userEvent.click(await vui.findByRole('button', { name: 'إرسال الطلب إلى المحفظة' }));
      expect(await vui.findByText('انتهت مهلة الطلب', {}, { timeout: 5000 })).toBeInTheDocument();
      const wallet = renderWallet('/requests', short.url);
      const wui = within(wallet.container);
      await userEvent.click(await wui.findByRole('link', { name: 'مصرف تجريبي (أ)' }));
      expect(await wui.findByText('انتهت مهلة الطلب')).toBeInTheDocument();
      expect(wui.queryByRole('button', { name: 'موافقة تجريبية' })).not.toBeInTheDocument();
      // direct API attempt after expiry is refused by the server, not only hidden in the UI
      await expect(createWalletGateway(createTransport('demo', { baseUrl: short.url })).decide(short.store.walletRequests()[0]?.id ?? '', 'ACCEPT'))
        .rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    } finally {
      await short.close();
    }
  });
});

describe('error handling and navigation', () => {
  it('shows an error state with retry when the demo server is unreachable', async () => {
    const dead = await startDemoServer({ port: 0 });
    const url = dead.url;
    await dead.close();
    const wallet = renderWallet('/requests', url);
    const wui = within(wallet.container);
    expect(await wui.findByText('تعذر عرض البيانات')).toBeInTheDocument();
    expect(wui.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });

  it('wallet navigation reaches every screen', async () => {
    const wallet = renderWallet('/');
    const wui = within(wallet.container);
    const nav = wui.getByRole('navigation', { name: 'التنقل الرئيسي' });
    const expectations: Array<[string, string]> = [['مستمسكاتي', 'مستمسكاتي'], ['الطلبات', 'طلبات مشاركة البيانات'], ['النشاط', 'سجل الاستخدام'], ['الإعدادات', 'الإعدادات'], ['الرئيسية', 'أهلاً بك']];
    for (const [link, heading] of expectations) {
      await userEvent.click(within(nav).getByRole('link', { name: new RegExp(link) }));
      expect(await wui.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    }
  });

  it('verifier navigation reaches every screen', async () => {
    const v = renderVerifier('/');
    const vui = within(v.container);
    const nav = vui.getByRole('navigation', { name: 'التنقل الرئيسي' });
    const expectations: Array<[string, string]> = [['طلب تحقق جديد', 'إنشاء طلب تحقق تجريبي'], ['جلسات التحقق', 'جلسات التحقق'], ['النتائج', 'نتائج الطلبات'], ['سجل العمليات', 'سجل العمليات'], ['الإعدادات', 'الإعدادات'], ['لوحة المتابعة', 'لوحة المتابعة']];
    for (const [link, heading] of expectations) {
      await userEvent.click(within(nav).getByRole('link', { name: new RegExp(link) }));
      expect(await vui.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    }
  });

  it('demo reset from wallet settings clears requests for both apps', async () => {
    await createRequestInVerifier('طلب سيُحذف');
    expect(srv.store.walletRequests()).toHaveLength(1);
    const wallet = renderWallet('/settings');
    const wui = within(wallet.container);
    await userEvent.click(wui.getByRole('button', { name: 'إعادة ضبط البيانات التجريبية' }));
    await userEvent.click(screen.getByRole('button', { name: 'إعادة الضبط' }));
    expect(await wui.findByText(/أُعيدت البيانات التجريبية/)).toBeInTheDocument();
    expect(srv.store.walletRequests()).toHaveLength(0);
  });

  it('rejects a too-short purpose before calling the server', async () => {
    const v = renderVerifier('/new');
    const vui = within(v.container);
    await userEvent.type(await vui.findByLabelText('الغرض من الطلب'), 'أ');
    await userEvent.click(vui.getByRole('button', { name: 'مراجعة الطلب' }));
    expect(await vui.findByText('اكتب غرضاً واضحاً (3 أحرف على الأقل).')).toBeInTheDocument();
    expect(vui.queryByRole('button', { name: 'إرسال الطلب إلى المحفظة' })).not.toBeInTheDocument();
    expect(srv.store.listSessionsForOrg('org-test-a')).toHaveLength(0);
  });
});
