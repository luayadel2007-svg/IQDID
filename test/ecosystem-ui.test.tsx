/**
 * TASK-11 UI integration: credential restriction (Scenario G) and privacy of withheld values
 * (Scenario H) as the citizen and the institution actually see them. Real demo HTTP server.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { createTransport, createVerifierGateway, createWalletGateway } from '@iqdid/api-client';
import { startDemoServer } from '@iqdid/mock-services';
import { WalletApp } from '../apps/wallet-web/src/App.tsx';
import { VerifierApp } from '../apps/verifier-web/src/App.tsx';

const t = (url: string) => createTransport('demo', { baseUrl: url, retries: 0, timeoutMs: 3000 });
const renderWallet = (url: string, path: string) => render(<MemoryRouter initialEntries={[path]}><WalletApp gateway={createWalletGateway(t(url))} pollMs={150} /></MemoryRouter>);
const renderVerifier = (url: string, path: string) => render(<MemoryRouter initialEntries={[path]}><VerifierApp gateway={createVerifierGateway(t(url))} pollMs={150} /></MemoryRouter>);

beforeEach(() => window.sessionStorage.clear());

describe('Scenario G — suspended national ID', () => {
  it('wallet explains why approval is unavailable, still allows rejection, and the verifier sees DEMO_REJECTED', async () => {
    const srv = await startDemoServer({ port: 0, credentialStatus: 'SUSPENDED' });
    try {
      const s = await createVerifierGateway(t(srv.url)).createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'اعتماد موقوف' });
      const w = renderWallet(srv.url, `/requests/${s.id}`);
      const ui = within(w.container);
      expect(await ui.findByText('اعتماد الهوية التجريبي موقوف')).toBeInTheDocument();
      expect(ui.getByRole('button', { name: 'موافقة تجريبية' })).toBeDisabled();
      await userEvent.click(ui.getByRole('button', { name: 'رفض' }));
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'تأكيد الرفض' }));
      expect(await ui.findByText('رفضت هذا الطلب')).toBeInTheDocument();
      w.unmount();
      const v = renderVerifier(srv.url, `/sessions/${s.id}`);
      expect(await within(v.container).findByText('رفض المواطن الطلب', {}, { timeout: 4000 })).toBeInTheDocument();
    } finally { await srv.close(); }
  });

  it('an ACTIVE credential shows no restriction notice', async () => {
    const srv = await startDemoServer({ port: 0 });
    try {
      const s = await createVerifierGateway(t(srv.url)).createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'اعتماد فعال' });
      const w = renderWallet(srv.url, `/requests/${s.id}`);
      const ui = within(w.container);
      expect(await ui.findByRole('button', { name: 'موافقة تجريبية' })).toBeEnabled();
      expect(ui.queryByText(/اعتماد الهوية التجريبي (موقوف|ملغى)/)).not.toBeInTheDocument();
    } finally { await srv.close(); }
  });
});

describe('Scenario H — privacy of withheld values', () => {
  it('disclosure preview lists withheld fields by name only; the verifier never receives them', async () => {
    const srv = await startDemoServer({ port: 0 });
    try {
      const s = await createVerifierGateway(t(srv.url)).createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'العمر فقط' });
      const w = renderWallet(srv.url, `/requests/${s.id}/disclosure`);
      const ui = within(w.container);
      expect(await ui.findByRole('heading', { name: 'سيُشارك (1)' })).toBeInTheDocument();
      expect(ui.getByRole('heading', { name: 'يبقى خاصاً (3)' })).toBeInTheDocument();
      for (const label of ['الاسم الكامل', 'تاريخ الميلاد', 'رقم الوثيقة التجريبي']) expect(ui.getByText(label)).toBeInTheDocument();
      for (const value of ['مواطن تجريبي', '1990-01-01', 'TEST-DOC-0001']) expect(w.container.querySelector('.disclosure-grid')?.textContent).not.toContain(value);
      await userEvent.click(ui.getByRole('button', { name: 'موافقة تجريبية' }));
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'تأكيد الموافقة' }));
      await ui.findByText('سُجلت موافقتك التجريبية');
      w.unmount();
      const v = renderVerifier(srv.url, `/sessions/${s.id}`);
      const vui = within(v.container);
      expect(await vui.findByText('موافقة تجريبية — DEMO_ACCEPTED', {}, { timeout: 4000 })).toBeInTheDocument();
      expect(vui.getByText('نعم')).toBeInTheDocument();
      for (const value of ['1990-01-01', 'TEST-DOC-0001']) expect(v.container.textContent).not.toContain(value);
    } finally { await srv.close(); }
  });
});
