import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge, Button, ErrorState, Input, Modal, ThemeToggle, contrastRatio, tokens } from './index.ts';

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
});
