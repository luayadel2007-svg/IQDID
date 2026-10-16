import { NavLink, Route, Routes } from 'react-router-dom';
import { AppShell, EmptyState, Icon, type IconName } from '@iqdid/ui';
import type { WalletGateway } from '@iqdid/api-client';
import { GatewayProvider } from './gateway.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { OnboardingPage } from './pages/OnboardingPage.tsx';
import { MyCardPage } from './pages/MyCardPage.tsx';
import { CredentialsPage } from './pages/CredentialsPage.tsx';
import { CredentialDetailPage } from './pages/CredentialDetailPage.tsx';
import { RequestsPage } from './pages/RequestsPage.tsx';
import { RequestDetailPage } from './pages/RequestDetailPage.tsx';
import { DisclosurePage } from './pages/DisclosurePage.tsx';
import { QrPage } from './pages/QrPage.tsx';
import { ActivityPage } from './pages/ActivityPage.tsx';
import { NotificationsPage } from './pages/NotificationsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { HelpPage } from './pages/HelpPage.tsx';
import { PollContext } from './poll.ts';
import { FeedProvider, useFeed } from './feed.tsx';
import { NotificationsButton, OfflineBar } from './components/bits.tsx';
import { TrustContext, demoTrustAdapter, type WalletTrustAdapter } from './trust.ts';

const NAV: ReadonlyArray<{ to: string; label: string; icon: IconName; end: boolean; badge?: 'pending' }> = [
  { to: '/', label: 'الرئيسية', icon: 'home', end: true },
  { to: '/card', label: 'بطاقتي', icon: 'card', end: false },
  { to: '/requests', label: 'الطلبات', icon: 'inbox', end: false, badge: 'pending' },
  { to: '/activity', label: 'السجل', icon: 'clock', end: false },
  { to: '/settings', label: 'الإعدادات', icon: 'settings', end: false },
];

function NavItems() {
  const { pending } = useFeed();
  return NAV.map((n) => (
    <NavLink key={n.to} to={n.to} end={n.end}>
      <span className="nav__icon" aria-hidden="true"><Icon name={n.icon} /></span>
      {n.label}
      {n.badge && pending > 0 && <span className="nav__badge" aria-hidden="true">{pending > 9 ? '9+' : pending}</span>}
    </NavLink>
  ));
}

export function WalletApp({ gateway, pollMs = 2000, trust = demoTrustAdapter }: { gateway: WalletGateway; pollMs?: number; trust?: WalletTrustAdapter }) {
  return (
    <GatewayProvider gateway={gateway}>
      <PollContext.Provider value={pollMs}>
        <TrustContext.Provider value={trust}>
          <FeedProvider>
            <AppShell
              appName="IQDI Wallet"
              appSubtitle="محفظة المواطن الرقمية — تجريبية"
              layout="mobile"
              headerExtra={<NotificationsButton />}
              topSlot={<OfflineBar />}
              nav={<NavItems />}
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/welcome" element={<OnboardingPage />} />
                <Route path="/card" element={<MyCardPage />} />
                <Route path="/credentials" element={<CredentialsPage />} />
                <Route path="/credentials/:id" element={<CredentialDetailPage />} />
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/requests/:id" element={<RequestDetailPage />} />
                <Route path="/requests/:id/disclosure" element={<DisclosurePage />} />
                <Route path="/qr" element={<QrPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="*" element={<EmptyState icon="search" title="الصفحة غير موجودة" description="تحقق من الرابط أو عد إلى الرئيسية." />} />
              </Routes>
            </AppShell>
          </FeedProvider>
        </TrustContext.Provider>
      </PollContext.Provider>
    </GatewayProvider>
  );
}
