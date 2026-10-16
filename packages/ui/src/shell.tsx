import { useEffect, useState, type ReactNode } from 'react';
import { Button, DemoBanner } from './components.tsx';
import { useTheme } from './hooks.ts';
import { useAppearance } from './preferences.tsx';
import { Icon } from './Icon.tsx';
import { BrandMark } from './BrandMark.tsx';

export function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme();
  const dark = resolvedTheme === 'dark';
  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}>
      <Icon name={dark ? 'sun' : 'moon'} />
      <span className="theme-toggle__label">{dark ? 'فاتح' : 'داكن'}</span>
    </Button>
  );
}

export interface AppShellProps {
  readonly appName: string;
  readonly appSubtitle: string;
  readonly layout: 'mobile' | 'desktop';
  readonly nav: ReactNode;
  readonly headerExtra?: ReactNode;
  /** Rendered between the header and the content (e.g. connectivity bar, toasts). */
  readonly topSlot?: ReactNode;
  readonly children: ReactNode;
}

/** Page frame: demo banner, header, navigation landmark and main content. */
export function AppShell({ appName, appSubtitle, layout, nav, headerExtra, topSlot, children }: AppShellProps) {
  useAppearance();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    // Hysteresis: the compact header is up to 12px shorter, so a single threshold makes a page that
    // scrolls only a little past it oscillate (compact → page shrinks → scrollY drops → expand → …).
    // The 24px gap between the two thresholds is wider than that height change.
    const onScroll = () => setScrolled((was) => (was ? window.scrollY > 8 : window.scrollY > 32));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const navEl = <nav className="nav" aria-label="التنقل الرئيسي">{nav}</nav>;
  return (
    <div className={`shell shell--${layout}`}>
      <a href="#main" className="visually-hidden">تخطَّ إلى المحتوى</a>
      <DemoBanner />
      <header className="shell__header" data-scrolled={scrolled}>
        <div className="shell__brand">
          <BrandMark />
          <span>
            {appName}
            <div className="shell__sub">{appSubtitle}</div>
          </span>
        </div>
        <div className="shell__actions">
          {headerExtra}
          <ThemeToggle />
        </div>
      </header>
      {topSlot}
      <div className="shell__body">
        {layout === 'desktop' && navEl}
        <main id="main" className="shell__main" tabIndex={-1}>{children}</main>
      </div>
      {layout === 'mobile' && navEl}
    </div>
  );
}
