import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceSettings, ThemeToggle, LoadingState, FavoriteShortcut } from './index.ts';

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
