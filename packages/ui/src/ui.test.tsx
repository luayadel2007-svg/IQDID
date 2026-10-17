import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell, Alert, Badge, Button, ErrorState, SegmentedControl, StatCard, Input, Modal, ThemeToggle, contrastRatio, tokens, cardPalette, IQDIBrand, IQDI_BRAND_LABEL } from './index.ts';

describe('ui primitives', () => {
  it('Button shows loading state and blocks clicks', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>حفظ</Button>);
    const btn = screen.getByRole('button', { name: 'حفظ' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Input wires label, hint and error for assistive tech', () => {
    render(<Input label="الغرض" hint="مطلوب" error="قصير جداً" />);
    const input = screen.getByLabelText('الغرض');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('مطلوب قصير جداً');
  });

  it('Modal is a labelled dialog, traps focus, and closes on Escape', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>فتح</Button>
          <Modal open={open} title="تأكيد" onClose={() => setOpen(false)} footer={<><Button>أ</Button><Button>ب</Button></>}>نص</Modal>
        </>
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'فتح' }));
    const dialog = screen.getByRole('dialog', { name: 'تأكيد' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'أ' })).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'أ' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'فتح' })).toHaveFocus();
  });

  it('ThemeToggle switches html[data-theme] and remembers it', async () => {
    render(<ThemeToggle />);
    const start = document.documentElement.dataset.theme;
    await userEvent.click(screen.getByRole('button'));
    const next = document.documentElement.dataset.theme;
    expect(next).not.toBe(start);
    expect(window.localStorage.getItem('iqdid-demo-theme')).toBe(next);
  });

  it('ErrorState offers retry', async () => {
    const retry = vi.fn();
    render(<ErrorState message="تعذر الاتصال" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر الاتصال');
    await userEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('Badge renders text (status is never colour-only)', () => {
    render(<Badge tone="success">فعال</Badge>);
    expect(screen.getByText('فعال')).toBeInTheDocument();
  });
});

describe('design tokens meet WCAG 2.2 AA contrast (4.5:1 for text)', () => {
  for (const theme of ['light', 'dark'] as const) {
    const c = tokens.color[theme];
    const pairs: Array<[string, string, string]> = [
      ['text/bg', c.text, c.bg], ['text/surface', c.text, c.surface], ['muted/surface', c.textMuted, c.surface],
      ['primaryText/primary', c.primaryText, c.primary], ['primary/surface', c.primary, c.surface],
      ['success/surface', c.success, c.surface], ['warning/surface', c.warning, c.surface], ['danger/surface', c.danger, c.surface],
    ];
    for (const [name, fg, bg] of pairs) {
      it(`${theme}: ${name} ≥ 4.5`, () => expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5));
    }
  }
});

describe('useAsync', () => {
  it('never renders data from previous deps while the new deps load', async () => {
    const { useAsync } = await import('./hooks.ts');
    const seen: string[] = [];
    function Probe({ id }: { id: string }) {
      const { data, loading } = useAsync(async () => {
        await new Promise((r) => setTimeout(r, 20));
        return `data-${id}`;
      }, [id]);
      seen.push(loading ? `loading:${id}` : `${String(data)}@${id}`);
      return <span>{loading ? 'loading' : data}</span>;
    }
    const { rerender } = render(<Probe id="a" />);
    expect(await screen.findByText('data-a')).toBeInTheDocument();
    rerender(<Probe id="b" />);
    expect(await screen.findByText('data-b')).toBeInTheDocument();
    expect(seen).not.toContain('data-a@b');
  });

  it('polling never overlaps a slow request, so an older response cannot overwrite a newer one (TASK-12 M1)', async () => {
    const { useAsync } = await import('./hooks.ts');
    const resolvers: Array<(v: string) => void> = [];
    let calls = 0;
    function Probe() {
      const { data } = useAsync(() => { calls += 1; return new Promise<string>((r) => resolvers.push(r)); }, [], { pollMs: 10 });
      return <span>{data ?? 'none'}</span>;
    }
    render(<Probe />);
    await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
    expect(calls).toBe(1);
    await act(async () => { resolvers[0]?.('PENDING'); await new Promise((r) => setTimeout(r, 30)); });
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(calls).toBe(2);
    await act(async () => { resolvers[1]?.('DEMO_ACCEPTED'); await new Promise((r) => setTimeout(r, 5)); });
    expect(screen.getByText('DEMO_ACCEPTED')).toBeInTheDocument();
  });
});

describe('Modal focus stability (TASK-12 H1)', () => {
  it('keeps focus where the user put it while the parent re-renders with a new onClose each time', async () => {
    function Ticking() {
      const [n, setN] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setN((x) => x + 1)}>tick {n}</button>
          <Modal open title="تأكيد" onClose={() => undefined} footer={<><Button>تراجع</Button><Button>تأكيد</Button></>}>نص</Modal>
        </>
      );
    }
    render(<Ticking />);
    const confirm = screen.getByRole('button', { name: 'تأكيد' });
    act(() => confirm.focus());
    for (let i = 0; i < 3; i++) act(() => { screen.getByRole('button', { name: /^tick/ }).click(); });
    expect(confirm).toHaveFocus();
  });

});

describe('design system v2 components', () => {
  it('StatCard is a named region with a visible number and decorative icon', () => {
    const { container } = render(<StatCard label="بانتظار القرار" value={3} icon="clock" />);
    expect(screen.getByRole('region', { name: 'بانتظار القرار' })).toHaveTextContent('3');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
  it('SegmentedControl exposes exactly one pressed option', () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="الحالة" value="a" onChange={onChange} options={[{ value: 'a', label: 'الكل' }, { value: 'b', label: 'فعال' }]} />);
    expect(screen.getByRole('button', { name: 'الكل' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'فعال' })).toHaveAttribute('aria-pressed', 'false');
    screen.getByRole('button', { name: 'فعال' }).click();
    expect(onChange).toHaveBeenCalledWith('b');
  });
  it('Alert keeps danger as an assertive alert with an icon', () => {
    render(<Alert tone="danger" title="خطأ">تفاصيل</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('خطأتفاصيل');
  });
});

describe('PDF §5 adaptive top bar', () => {
  it('marks the header as scrolled after scrolling and keeps every header control', () => {
    render(<AppShell appName="محفظة" appSubtitle="تجريبي" layout="mobile" nav={<a href="/">الرئيسية</a>} headerExtra={<button type="button">إشعارات</button>}><h1>عنوان</h1></AppShell>);
    const header = screen.getByRole('banner');
    expect(header).toHaveAttribute('data-scrolled', 'false');
    act(() => { Object.defineProperty(window, 'scrollY', { value: 120, configurable: true }); window.dispatchEvent(new Event('scroll')); });
    expect(header).toHaveAttribute('data-scrolled', 'true');
    expect(screen.getByRole('button', { name: 'إشعارات' })).toBeVisible();
    expect(screen.getByRole('button', { name: /تفعيل الوضع/ })).toBeVisible();
    act(() => { Object.defineProperty(window, 'scrollY', { value: 0, configurable: true }); window.dispatchEvent(new Event('scroll')); });
    expect(header).toHaveAttribute('data-scrolled', 'false');
  });

  it('uses hysteresis so a page scrollable just past the threshold cannot make the header oscillate', () => {
    render(<AppShell appName="محفظة" appSubtitle="تجريبي" layout="mobile" nav={<a href="/">الرئيسية</a>}><h1>عنوان</h1></AppShell>);
    const header = screen.getByRole('banner');
    const scrollTo = (y: number) => act(() => { Object.defineProperty(window, 'scrollY', { value: y, configurable: true }); window.dispatchEvent(new Event('scroll')); });
    // The compact header is up to 12px shorter: each position it can bounce between stays in one state.
    scrollTo(20);
    expect(header).toHaveAttribute('data-scrolled', 'false');
    scrollTo(33);
    expect(header).toHaveAttribute('data-scrolled', 'true');
    scrollTo(21);
    expect(header).toHaveAttribute('data-scrolled', 'true');
    scrollTo(8);
    expect(header).toHaveAttribute('data-scrolled', 'false');
    scrollTo(20);
    expect(header).toHaveAttribute('data-scrolled', 'false');
    scrollTo(0);
  });
});

describe('Design System V3 credential-card palette', () => {
  it.each(['light', 'dark'] as const)('%s: card text and muted text meet WCAG AA on both gradient stops of every card', (mode) => {
    const p = cardPalette[mode];
    for (const kind of ['id', 'licence', 'residence', 'health', 'education'] as const) {
      for (const stop of p[kind]) {
        expect(contrastRatio(p.text, stop)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(p.muted, stop)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('IQDIBrand — one brand component for both apps', () => {
  afterEach(() => { try { localStorage.removeItem('iqdid-demo-theme'); } catch { /* ignore */ } });

  it('names the logo for screen readers and keeps the aspect ratio', () => {
    render(<IQDIBrand variant="logo" size={232} />);
    const img = screen.getByRole('img', { name: IQDI_BRAND_LABEL });
    expect(img).toHaveAttribute('width', '232');
    expect(img).toHaveAttribute('height', String(Math.round(232 * 1372 / 1040)));
    expect(IQDI_BRAND_LABEL).toMatch(/نموذج تجريبي/);
    expect(IQDI_BRAND_LABEL).not.toMatch(/وزارة|جمهورية|رسمي/);
  });

  it('follows the theme: Original artwork in light, Dark artwork in dark (same accessible name)', () => {
    localStorage.setItem('iqdid-demo-theme', 'light');
    const { unmount } = render(<IQDIBrand variant="mark" />);
    const light = screen.getByRole('img', { name: IQDI_BRAND_LABEL });
    expect(light.getAttribute('src')).toMatch(/iqdi-mark-original/);
    expect(light).toHaveAttribute('data-tone', 'light');
    unmount();
    localStorage.setItem('iqdid-demo-theme', 'dark');
    render(<IQDIBrand variant="mark" />);
    const dark = screen.getByRole('img', { name: IQDI_BRAND_LABEL });
    expect(dark.getAttribute('src')).toMatch(/iqdi-mark-dark/);
    expect(dark).toHaveAttribute('data-tone', 'dark');
  });

  it('a fixed tone overrides the theme', () => {
    localStorage.setItem('iqdid-demo-theme', 'dark');
    render(<IQDIBrand variant="logo" tone="light" />);
    expect(screen.getByRole('img').getAttribute('src')).toMatch(/iqdi-logo-original/);
  });

  it('the header symbol is decorative, so the app name is announced once', () => {
    render(<AppShell appName="IQDI Wallet" appSubtitle="تجريبي" layout="mobile" nav={<a href="/">الرئيسية</a>}><h1>عنوان</h1></AppShell>);
    const header = screen.getByRole('banner');
    const img = header.querySelector('img.iqdi-brand');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img?.getAttribute('src')).toMatch(/iqdi-app-icon/);
    expect(screen.queryAllByRole('img', { name: /IQDI/ })).toHaveLength(0);
    expect(header.textContent?.split('IQDI Wallet').length).toBe(2);
  });
});
