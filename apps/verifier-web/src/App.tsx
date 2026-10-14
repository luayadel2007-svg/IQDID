import { NavLink, Route, Routes } from 'react-router-dom';
import { AppShell, EmptyState } from '@iqdid/ui';
import type { VerifierGateway } from '@iqdid/api-client';
import { VerifierProviders } from './gateway.tsx';
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
  { to: '/', label: 'لوحة المتابعة', icon: '📊', end: true },
  { to: '/new', label: 'طلب تحقق جديد', icon: '➕', end: false },
  { to: '/sessions', label: 'جلسات التحقق', icon: '🗂️', end: false },
  { to: '/results', label: 'النتائج', icon: '✅', end: false },
  { to: '/activity', label: 'سجل العمليات', icon: '🕘', end: false },
  { to: '/settings', label: 'الإعدادات', icon: '⚙️', end: false },
];

export function VerifierApp({ gateway, pollMs = 1500 }: { gateway: VerifierGateway; pollMs?: number }) {
  return (
    <VerifierProviders gateway={gateway}>
      <PollContext.Provider value={pollMs}>
        <AppShell
          appName="بوابة التحقق للمؤسسات"
          appSubtitle="واجهة الموظف — نسخة تجريبية"
          layout="desktop"
          headerExtra={<OrgSwitcher />}
          nav={NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span className="nav__icon" aria-hidden="true">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        >
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/new" element={<CreateRequestPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/:id" element={<SessionDetailPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<EmptyState icon="🧭" title="الصفحة غير موجودة" />} />
          </Routes>
        </AppShell>
      </PollContext.Provider>
    </VerifierProviders>
  );
}
