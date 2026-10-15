import { NavLink, Route, Routes } from 'react-router-dom';
import { AppShell, EmptyState, Icon, type IconName } from '@iqdid/ui';
import type { WalletGateway } from '@iqdid/api-client';
import { GatewayProvider } from './gateway.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { MyCardPage } from './pages/MyCardPage.tsx';
import { CredentialDetailPage } from './pages/CredentialDetailPage.tsx';
import { RequestsPage } from './pages/RequestsPage.tsx';
import { RequestDetailPage } from './pages/RequestDetailPage.tsx';
import { ActivityPage } from './pages/ActivityPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { PollContext } from './poll.ts';

const NAV = [
  { to: '/', label: 'الرئيسية', icon: 'home', end: true },
  { to: '/card', label: 'بطاقتي', icon: 'card', end: false },
  { to: '/requests', label: 'الطلبات', icon: 'inbox', end: false },
  { to: '/activity', label: 'السجل', icon: 'clock', end: false },
  { to: '/settings', label: 'الإعدادات', icon: 'settings', end: false },
];

export function WalletApp({ gateway, pollMs = 2000 }: { gateway: WalletGateway; pollMs?: number }) {
  return (
    <GatewayProvider gateway={gateway}>
      <PollContext.Provider value={pollMs}>
        <AppShell
          appName="محفظتي الرقمية"
          appSubtitle="تطبيق المواطن — نسخة تجريبية"
          layout="mobile"
          nav={NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span className="nav__icon" aria-hidden="true"><Icon name={n.icon as IconName} /></span>
              {n.label}
            </NavLink>
          ))}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/card" element={<MyCardPage />} />
            <Route path="/credentials/:id" element={<CredentialDetailPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/requests/:id" element={<RequestDetailPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<EmptyState icon="search" title="الصفحة غير موجودة" description="تحقق من الرابط أو عد إلى الرئيسية." />} />
          </Routes>
        </AppShell>
      </PollContext.Provider>
    </GatewayProvider>
  );
}
