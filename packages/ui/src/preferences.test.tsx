import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceSettings, ThemeToggle, LoadingState, FavoriteShortcut, useOnline } from './index.ts';

describe('shared display preferences', () => {
  it('synchronizes settings and header, persists text and transparency after remount', async () => {
    const view = render(<><ThemeToggle /><AppearanceSettings /></>);
    await userEvent.click(screen.getByRole('button', { name: 'داكن' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'تفعيل الوضع الفاتح' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.selectOptions(screen.getByLabelText('حجم النص'), 'larger');
    await userEvent.click(screen.getByLabelText('تقليل الشفافية والتمويه'));
    expect(document.documentElement.dataset.text).toBe('larger');
    expect(document.documentElement.dataset.glass).toBe('off');
    view.unmount(); render(<AppearanceSettings />);
    expect(screen.getByLabelText('حجم النص')).toHaveValue('larger');
    expect(screen.getByLabelText('تقليل الشفافية والتمويه')).toBeChecked();
  });
  it('retains system preference rather than freezing it as a light or dark override', async () => {
    render(<AppearanceSettings />);
    await userEvent.click(screen.getByRole('button', { name: 'داكن' }));
    await userEvent.click(screen.getByRole('button', { name: 'تلقائي' }));
    expect(localStorage.getItem('iqdid-demo-theme')).toBe('system');
    expect(within(screen.getByRole('group')).getByRole('button', { name: 'تلقائي' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('loading skeleton announces a readable status independently of animation', () => {
    const { container } = render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ التحميل');
    expect(container.querySelector('.skeleton')).toHaveAttribute('aria-hidden', 'true');
  });
});

it('pins a route and restores it without saving free-text or personal data', async () => {
  const options = [{ href: '/card', label: 'بطاقتي' }, { href: '/requests', label: 'الطلبات' }];
  const view = render(<FavoriteShortcut app="wallet" options={options} />);
  await userEvent.selectOptions(screen.getByLabelText('خدمتي المفضلة'), '/requests');
  expect(screen.getByRole('link', { name: 'فتح الطلبات' })).toHaveAttribute('href', '/requests');
  view.unmount(); render(<FavoriteShortcut app="wallet" options={options} />);
  expect(screen.getByLabelText('خدمتي المفضلة')).toHaveValue('/requests');
});

describe('design system v2 preferences and primitives', () => {
  it('reads legacy v1 appearance storage without motion and persists the reduced-motion switch', async () => {
    localStorage.setItem('iqdid-appearance-v1', JSON.stringify({ text: 'large', glass: false }));
    const view = render(<AppearanceSettings />);
    expect(screen.getByLabelText('حجم النص')).toHaveValue('large');
    expect(screen.getByRole('switch', { name: 'تقليل الشفافية والتمويه' })).toBeChecked();
    const motion = screen.getByRole('switch', { name: 'تقليل الحركة' });
    expect(motion).not.toBeChecked();
    await userEvent.click(motion);
    expect(document.documentElement.dataset.motion).toBe('reduced');
    view.unmount(); render(<AppearanceSettings />);
    expect(screen.getByRole('switch', { name: 'تقليل الحركة' })).toBeChecked();
    expect(JSON.parse(localStorage.getItem('iqdid-appearance-v1') ?? '{}')).toEqual({ text: 'large', glass: false, motion: 'reduced' });
  });
  it('ignores tampered motion values', () => {
    localStorage.setItem('iqdid-appearance-v1', JSON.stringify({ motion: '<script>' }));
    render(<AppearanceSettings />);
    expect(screen.getByRole('switch', { name: 'تقليل الحركة' })).not.toBeChecked();
    expect(document.documentElement.dataset.motion).toBe('system');
  });
});

it('useOnline catches a connectivity change that happens before its listener is attached', () => {
  // Online while rendering, offline by the time effects run, and no event in between.
  let reads = 0;
  const spy = vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => reads++ === 0);
  function Probe() { return <span>{useOnline() ? 'online' : 'offline'}</span>; }
  try {
    const { container } = render(<Probe />);
    expect(container.textContent).toBe('offline');
  } finally { spy.mockRestore(); }
});
