import type { ReactNode } from 'react';
import { Button, DemoBanner } from './components.tsx';
import { useTheme } from './hooks.ts';
import { useAppearance } from './preferences.tsx';
import { Icon } from './Icon.tsx';

export function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme();
  const dark = resolvedTheme === 'dark';
  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'} style={{ color: 'inherit' }}>
      <Icon name={dark ? 'sun' : 'moon'} />
      <span>{dark ? 'فاتح' : 'داكن'}</span>
    </Button>
  );
}

export interface AppShellProps {
  readonly appName: string;
  readonly appSubtitle: string;
  readonly layout: 'mobile' | 'desktop';
  readonly nav: ReactNode;
  readonly headerExtra?: ReactNode;
  readonly children: ReactNode;
}

/** Page frame: demo banner, header, navigation landmark and main content. */
export function AppShell({ appName, appSubtitle, layout, nav, headerExtra, children }: AppShellProps) {
  useAppearance();
  const navEl = <nav className="nav" aria-label="التنقل الرئيسي">{nav}</nav>;
  return (
    <div className={`shell shell--${layout}`}>
      <a href="#main" className="visually-hidden">تخطَّ إلى المحتوى</a>
      <DemoBanner />
      <header className="shell__header">
        <div className="shell__brand">
          <span className="shell__brand-mark" aria-hidden="true">ID</span>
          <span>
            {appName}
            <div className="shell__sub">{appSubtitle}</div>
          </span>
        </div>
        <div className="row">
          {headerExtra}
          <ThemeToggle />
        </div>
      </header>
      <div className="shell__body">
        {layout === 'desktop' && navEl}
        <main id="main" className="shell__main" tabIndex={-1}>{children}</main>
      </div>
      {layout === 'mobile' && navEl}
    </div>
  );
}
