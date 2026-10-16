import { Fragment } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { AppShell, EmptyState, Icon, useOnline, type IconName } from '@iqdid/ui';
import type { VerifierGateway } from '@iqdid/api-client';
import { VerifierProviders, OrgBoundary } from './gateway.tsx';
import { PollContext } from './poll.ts';
import { OrgSwitcher } from './OrgSwitcher.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { CreateRequestPage } from './pages/CreateRequestPage.tsx';
import { SessionsPage } from './pages/SessionsPage.tsx';
import { SessionDetailPage } from './pages/SessionDetailPage.tsx';
import { ResultsPage } from './pages/ResultsPage.tsx';
import { ActivityPage } from './pages/ActivityPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

const NAV = [
  { to: '/', label: 'لوحة المتابعة', icon: 'chart', end: true, group: 'العمليات' },
  { to: '/new', label: 'طلب تحقق جديد', icon: 'plus', end: false },
  { to: '/sessions', label: 'جلسات التحقق', icon: 'folder', end: false },
  { to: '/results', label: 'النتائج', icon: 'check', end: false, group: 'المتابعة والتدقيق' },
  { to: '/activity', label: 'سجل العمليات', icon: 'clock', end: false },
  { to: '/settings', label: 'الإعدادات', icon: 'settings', end: false, group: 'الإدارة' },
];

/** Browser connectivity only; API failures are reported per page (error / stale states). */
function ConnectionBar() {
  const online = useOnline();
  if (online) return null;
  return <div className="offline-bar" role="status"><Icon name="wifi-off" size={18} />لا يوجد اتصال بالشبكة. تُعرض آخر بيانات محمّلة، وتُستأنف التحديثات عند عودة الاتصال.</div>;
}

export function VerifierApp({ gateway, pollMs = 1500 }: { gateway: VerifierGateway; pollMs?: number }) {
  return (
    <VerifierProviders gateway={gateway}>
      <PollContext.Provider value={pollMs}>
        <AppShell
          appName="IQDI Verifier"
          appSubtitle="بوابة التحقق المؤسسي — تجريبية"
          layout="desktop"
          headerExtra={<OrgSwitcher />}
          topSlot={<ConnectionBar />}
          nav={NAV.map((n) => (
            <Fragment key={n.to}>
              {n.group && <span className="vf-nav__group" aria-hidden="true">{n.group}</span>}
              <NavLink to={n.to} end={n.end}>
                <span className="nav__icon" aria-hidden="true"><Icon name={n.icon as IconName} /></span>
                {n.label}
              </NavLink>
            </Fragment>
          ))}
        >
          <OrgBoundary><Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/new" element={<CreateRequestPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:id" element={<SessionDetailPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<EmptyState icon="search" title="الصفحة غير موجودة" />} />
          </Routes></OrgBoundary>
        </AppShell>
      </PollContext.Provider>
    </VerifierProviders>
  );
}
