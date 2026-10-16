/**
 * TASK-9 V3: card stack, list view, privacy mode, credential states, bottom nav and the
 * reject deep link — against ONE real demo HTTP server. Synthetic data only.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { createTransport, createVerifierGateway, createWalletGateway } from '@iqdid/api-client';
import { startDemoServer, type RunningDemoServer } from '@iqdid/mock-services';
import { WalletApp } from '../apps/wallet-web/src/App.tsx';

let srv: RunningDemoServer;
const t = () => createTransport('demo', { baseUrl: srv.url, retries: 0, timeoutMs: 3000 });
function Where() { const l = useLocation(); return <output data-testid="where">{l.pathname + l.search}</output>; }
const renderWallet = (path: string) => render(<MemoryRouter initialEntries={[path]}><WalletApp gateway={createWalletGateway(t())} pollMs={200} /><Where /></MemoryRouter>);
const cardButtons = (root: HTMLElement) => within(within(root).getByRole('list', { name: 'مجموعة البطاقات' })).getAllByRole('button');

beforeAll(async () => { srv = await startDemoServer({ port: 0, ttlMs: 120_000 }); });
afterAll(async () => { await srv.close(); });
beforeEach(() => srv.store.reset(false));

describe('card stack', () => {
  it('shows all five cards with readable titles and status in their accessible names', async () => {
    const w = renderWallet('/cards');
    const ui = within(w.container);
    await ui.findByRole('list', { name: 'مجموعة البطاقات' });
    const names = cardButtons(w.container).map((b) => b.getAttribute('aria-label') ?? '');
    expect(names).toHaveLength(5);
    expect(names[0]).toMatch(/^بطاقة الهوية الرقمية \(تجريبية\)، اعتماد تجريبي فعال، البطاقة 1 من 5$/);
    expect(names.some((n) => n.includes('الوثيقة الدراسية (تجريبية)، اعتماد تجريبي للعرض فقط'))).toBe(true);
    expect(names.some((n) => n.includes('بطاقة التأمين الصحي (تجريبية)، اعتماد تجريبي موقوف'))).toBe(true);
    for (const title of ['بطاقة الهوية الرقمية (تجريبية)', 'إجازة سوق (تجريبية)', 'بطاقة السكن (تجريبية)', 'الوثيقة الدراسية (تجريبية)']) expect(ui.getByText(title)).toBeInTheDocument();
  });

  it('selecting a card brings it to the front, expands it, keeps focus, and stores the selection in the URL', async () => {
    const w = renderWallet('/cards');
    const ui = within(w.container);
    await ui.findByRole('list', { name: 'مجموعة البطاقات' });
    const licence = cardButtons(w.container).find((b) => b.getAttribute('aria-label')?.startsWith('إجازة سوق'));
    expect(licence).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(licence as HTMLElement);
    const after = cardButtons(w.container);
    expect(after[0]?.getAttribute('aria-label')).toMatch(/^إجازة سوق \(تجريبية\).*اضغط لفتح التفاصيل$/);
    expect(after[0]).toHaveAttribute('aria-expanded', 'true');
    expect(after[0]).toHaveFocus();
    expect(screen.getByTestId('where')).toHaveTextContent('/cards?card=cred-test-002');
    expect(ui.getByRole('link', { name: 'عرض التفاصيل' })).toHaveAttribute('href', '/credentials/cred-test-002?from=cards');
  });

  it('second press opens the details; «العودة إلى بطاقاتي» returns to the same selected card', async () => {
    const w = renderWallet('/cards?card=cred-test-003');
    const ui = within(w.container);
    await ui.findByRole('list', { name: 'مجموعة البطاقات' });
    await userEvent.click(cardButtons(w.container)[0] as HTMLElement);
    expect(await ui.findByRole('heading', { level: 1, name: 'تفاصيل الاعتماد' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/credentials/cred-test-003?from=cards');
    await userEvent.click(await ui.findByRole('link', { name: 'العودة إلى بطاقاتي' }));
    await ui.findByRole('list', { name: 'مجموعة البطاقات' });
    const first = cardButtons(w.container)[0];
    expect(first?.getAttribute('aria-label')).toMatch(/^بطاقة السكن/);
    expect(first).toHaveAttribute('aria-expanded', 'true');
  });

  it('keyboard: Arrow keys move between cards, Enter selects, Escape returns to the stack', async () => {
    const w = renderWallet('/cards');
    const ui = within(w.container);
    await ui.findByRole('list', { name: 'مجموعة البطاقات' });
    (cardButtons(w.container)[0] as HTMLElement).focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^بطاقة السكن/);
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/cards?card=cred-test-003');
    await userEvent.keyboard('{Escape}');
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/cards$/);
    expect(cardButtons(w.container).every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
  });

  it('list view is a full alternative (search, filters) and the choice persists', async () => {
    const w = renderWallet('/cards');
    const ui = within(w.container);
    await ui.findByRole('list', { name: 'مجموعة البطاقات' });
    await userEvent.click(ui.getByRole('button', { name: 'عرض القائمة' }));
    const list = await ui.findByRole('list', { name: 'قائمة الاعتمادات' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(ui.getByLabelText('بحث في الاعتمادات')).toBeInTheDocument();
    w.unmount();
    const again = renderWallet('/cards');
    expect(await within(again.container).findByRole('list', { name: 'قائمة الاعتمادات' })).toBeInTheDocument();
    expect(within(again.container).getByRole('button', { name: 'عرض القائمة' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('home, privacy and credential states', () => {
  it('home shows a short summary (name, age, DEMO) and never the ID number or a verification claim', async () => {
    const w = renderWallet('/');
    const ui = within(w.container);
    expect(await ui.findByText('مواطن تجريبي')).toBeInTheDocument();
    expect(ui.getByText(/^العمر: \d+ سنة$/)).toBeInTheDocument();
    expect(w.container.textContent).not.toContain('TEST-DOC-0001');
    expect(w.container.textContent).not.toMatch(/موثق|تم التحقق|VERIFIED/);
    expect(within(ui.getByRole('navigation', { name: 'الخدمات السريعة' })).getAllByRole('link').map((a) => a.textContent)).toEqual(['بطاقاتي', 'QR تجريبي', 'مشاركة البيانات']);
  });

  it('privacy mode hides name, age and holder on cards; it persists and the settings switch reflects it', async () => {
    const w = renderWallet('/');
    const ui = within(w.container);
    await ui.findByText('مواطن تجريبي');
    await userEvent.click(ui.getByRole('button', { name: 'وضع الخصوصية' }));
    expect(ui.getByRole('button', { name: 'وضع الخصوصية' })).toHaveAttribute('aria-pressed', 'true');
    expect(ui.queryByText('مواطن تجريبي')).not.toBeInTheDocument();
    expect(ui.queryByText(/^العمر:/)).not.toBeInTheDocument();
    expect(localStorage.getItem('iqdi-wallet-privacy')).toBe('on');
    w.unmount();
    const cards = renderWallet('/cards');
    await within(cards.container).findByRole('list', { name: 'مجموعة البطاقات' });
    expect(cards.container.textContent).not.toContain('مواطن تجريبي');
    cards.unmount();
    const settings = renderWallet('/settings');
    expect(await within(settings.container).findByRole('switch', { name: 'وضع الخصوصية' })).toBeChecked();
  });

  it.each([
    ['cred-test-001', 'اعتماد تجريبي فعال', true],
    ['cred-test-005', 'اعتماد تجريبي للعرض فقط', false],
    ['cred-test-004', 'اعتماد تجريبي موقوف', false],
  ])('details of %s mark «%s» as current, never protocol verification', async (id, current, shareable) => {
    const w = renderWallet(`/credentials/${id}`);
    const ui = within(w.container);
    const states = await ui.findByRole('list', { name: 'حالات الاعتماد' });
    const currentRow = within(states).getAllByRole('listitem').find((li) => li.getAttribute('aria-current') === 'true');
    expect(currentRow).toHaveTextContent(current);
    expect(within(states).getByText('تحقق بروتوكولي فعلي').closest('li')).toHaveTextContent('غير متوفر حالياً');
    expect(ui.queryByRole('link', { name: 'مشاركة عبر طلب تحقق' }) !== null).toBe(shareable);
    expect(w.container.textContent).not.toContain('VERIFIED_BY_PROTOCOL');
  });
});

describe('navigation and requests', () => {
  it('bottom nav has exactly five sections and keeps «بطاقاتي» active on card details', async () => {
    const w = renderWallet('/credentials/cred-test-002');
    const nav = within(w.container).getByRole('navigation', { name: 'التنقل الرئيسي' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['الرئيسية', 'بطاقاتي', 'الطلبات', 'النشاط', 'الإعدادات']);
    expect(within(nav).getByRole('link', { name: 'بطاقاتي' })).toHaveAttribute('aria-current', 'page');
  });

  it('home «رفض الطلب» opens the reject confirmation without sending; only «تأكيد الرفض» rejects', async () => {
    const s = await createVerifierGateway(t()).createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'فتح حساب تجريبي' });
    const w = renderWallet('/');
    const ui = within(w.container);
    await userEvent.click(await ui.findByRole('link', { name: 'رفض الطلب' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('تأكيد الرفض');
    expect((await createWalletGateway(t()).request(s.id)).status).toBe('PENDING');
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الرفض' }));
    expect(await ui.findByText('رفضت هذا الطلب')).toBeInTheDocument();
    expect((await createWalletGateway(t()).request(s.id)).status).toBe('DEMO_REJECTED');
  });
});

describe('independent-review fixes', () => {
  it('privacy mode also hides name, birth date and identifiers on credential details (no reveal switch)', async () => {
    localStorage.setItem('iqdi-wallet-privacy', 'on');
    const w = renderWallet('/credentials/cred-test-001');
    const ui = within(w.container);
    await ui.findByRole('list', { name: 'حالات الاعتماد' });
    expect(w.container.textContent).not.toMatch(/مواطن تجريبي|1990-01-01|TEST-DOC-0001/);
    expect(ui.queryByRole('switch', { name: 'إظهار القيم الحساسة' })).not.toBeInTheDocument();
    expect(ui.getAllByText('مُخفى (وضع الخصوصية)').length).toBeGreaterThanOrEqual(3);
  });

  it('cards expose expiry, DEMO and display-only status to screen readers; the open card controls its actions', async () => {
    const w = renderWallet('/cards?card=cred-test-005');
    const ui = within(w.container);
    await ui.findByRole('list', { name: 'مجموعة البطاقات' });
    const first = cardButtons(w.container)[0] as HTMLElement;
    expect(first).toHaveAccessibleDescription(/تنتهي .*للعرض فقط\. بيانات تجريبية DEMO\./);
    expect(first).toHaveAttribute('aria-controls', 'card-actions');
    expect(w.container.querySelector('#card-actions')).not.toBeNull();
  });

  it('«رجوع إلى المجموعة» returns focus to the card that was open', async () => {
    const w = renderWallet('/cards?card=cred-test-003');
    const ui = within(w.container);
    await ui.findByRole('list', { name: 'مجموعة البطاقات' });
    await userEvent.click(ui.getByRole('button', { name: 'رجوع إلى المجموعة' }));
    expect(document.activeElement?.getAttribute('data-card-id')).toBe('cred-test-003');
    expect(document.activeElement).toHaveAttribute('aria-expanded', 'false');
  });

  it('selecting a card keeps an explicit ?view=stack even when the saved preference is list', async () => {
    localStorage.setItem('iqdi-wallet-cards-view', 'list');
    const w = renderWallet('/cards?view=stack');
    const ui = within(w.container);
    await ui.findByRole('list', { name: 'مجموعة البطاقات' });
    await userEvent.click(cardButtons(w.container)[1] as HTMLElement);
    expect(screen.getByTestId('where')).toHaveTextContent('view=stack');
    expect(screen.getByTestId('where')).toHaveTextContent('card=cred-test-002');
    expect(ui.getByRole('list', { name: 'مجموعة البطاقات' })).toBeInTheDocument();
  });

  it('the reject deep link opens once: the param is removed and the dialog stays closed after «تراجع» and refreshes', async () => {
    const s = await createVerifierGateway(t()).createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'رابط رفض لمرة واحدة' });
    renderWallet(`/requests/${s.id}?decide=reject`);
    expect(await screen.findByRole('dialog')).toHaveTextContent('تأكيد الرفض');
    expect(screen.getByTestId('where')).not.toHaveTextContent('decide=');
    await userEvent.click(screen.getByRole('button', { name: 'تراجع' }));
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect((await createWalletGateway(t()).request(s.id)).status).toBe('PENDING');
  });
});

