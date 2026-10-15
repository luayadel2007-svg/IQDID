import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DemoActivityEvent, DemoVerificationSession } from '@iqdid/shared-types';
import { useAsync } from '@iqdid/ui';
import type { IconName, Tone } from '@iqdid/ui';
import { useWallet } from './gateway.tsx';
import { usePollMs } from './poll.ts';
import { LOCAL_EVENT, readNotificationIds, writeNotificationIds } from './local.ts';

export interface WalletNotification {
  readonly id: string; readonly at: string; readonly title: string; readonly body: string;
  readonly href: string | null; readonly tone: Tone; readonly icon: IconName;
}
const KIND: Record<DemoActivityEvent['type'], { title: string; tone: Tone; icon: IconName }> = {
  REQUEST_CREATED: { title: 'طلب مشاركة بيانات جديد', tone: 'info', icon: 'inbox' },
  CONSENT_ACCEPTED: { title: 'سُجلت موافقتك التجريبية', tone: 'success', icon: 'check' },
  CONSENT_REJECTED: { title: 'سُجل رفضك للطلب', tone: 'neutral', icon: 'x' },
  SESSION_EXPIRED: { title: 'انتهت مهلة طلب', tone: 'warning', icon: 'clock' },
  SESSION_CANCELLED: { title: 'ألغت مؤسسة طلبها', tone: 'neutral', icon: 'x' },
  DEMO_RESET: { title: 'أُعيد ضبط العرض التجريبي', tone: 'neutral', icon: 'refresh' },
};
/** Demo notifications are derived from the wallet activity feed; nothing leaves the browser. */
export const toNotifications = (events: readonly DemoActivityEvent[]): WalletNotification[] =>
  events.map((e) => ({ id: e.id, at: e.at, body: e.summary, href: e.sessionId ? `/requests/${e.sessionId}` : null, ...KIND[e.type] }));

interface Feed {
  readonly requests: readonly DemoVerificationSession[];
  readonly notifications: readonly WalletNotification[];
  readonly pending: number;
  readonly unread: number;
  readonly readIds: ReadonlySet<string>;
  markRead(ids: readonly string[]): void;
}
const Ctx = createContext<Feed>({ requests: [], notifications: [], pending: 0, unread: 0, readIds: new Set(), markRead: () => undefined });

/** One app-level poll for badges (pending requests, unread notifications). Failures stay silent here; pages show errors. */
export function FeedProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const pollMs = usePollMs();
  const reqs = useAsync((s) => wallet.requests({ signal: s }), [wallet], { pollMs });
  const act = useAsync((s) => wallet.activity({ signal: s }), [wallet], { pollMs });
  const [readIds, setReadIds] = useState(readNotificationIds);
  useEffect(() => {
    const sync = () => setReadIds(readNotificationIds());
    window.addEventListener(LOCAL_EVENT, sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener(LOCAL_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const value = useMemo<Feed>(() => {
    const notifications = toNotifications(act.data ?? []);
    const requests = reqs.data ?? [];
    return {
      requests, notifications, readIds,
      pending: requests.filter((r) => r.status === 'PENDING' && Date.parse(r.expiresAt) > Date.now()).length,
      unread: notifications.filter((n) => !readIds.has(n.id)).length,
      markRead: (ids) => writeNotificationIds(new Set([...readIds, ...ids])),
    };
  }, [act.data, reqs.data, readIds]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useFeed = (): Feed => useContext(Ctx);
