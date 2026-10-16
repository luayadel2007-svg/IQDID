import { Link } from 'react-router-dom';
import type { DemoCredentialSummary, DemoCredentialType } from '@iqdid/shared-types';
import { Badge, CredentialStatusBadge, Icon, useOnline, type IconName } from '@iqdid/ui';
import { useFeed } from '../feed.tsx';

export const CREDENTIAL_ICON: Record<DemoCredentialType, IconName> = {
  DEMO_NATIONAL_ID: 'card', DEMO_DRIVING_LICENCE: 'car', DEMO_RESIDENCE_CARD: 'home', DEMO_HEALTH_CARD: 'heart', DEMO_EDUCATION: 'graduation',
};
export const CREDENTIAL_KIND: Record<DemoCredentialType, string> = {
  DEMO_NATIONAL_ID: 'هوية', DEMO_DRIVING_LICENCE: 'مرور', DEMO_RESIDENCE_CARD: 'سكن', DEMO_HEALTH_CARD: 'صحة', DEMO_EDUCATION: 'تعليم',
};
/** Card colour family (Design System V3 .cred-card--*). */
export const CREDENTIAL_THEME: Record<DemoCredentialType, string> = {
  DEMO_NATIONAL_ID: 'id', DEMO_DRIVING_LICENCE: 'licence', DEMO_RESIDENCE_CARD: 'residence', DEMO_HEALTH_CARD: 'health', DEMO_EDUCATION: 'education',
};
/** Only the national ID answers verification requests; every other credential is display-only in this demo. */
export const isDisplayOnly = (c: DemoCredentialSummary): boolean => c.type !== 'DEMO_NATIONAL_ID';

/**
 * What the wallet may say about a credential. There is deliberately no "protocol verified" state:
 * actual protocol verification is not available in this build.
 */
export type CredentialState = 'ACTIVE_DEMO' | 'DISPLAY_ONLY' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
export function credentialState(c: DemoCredentialSummary, now = Date.now()): CredentialState {
  const v = validityOf(c, now);
  if (v === 'SUSPENDED' || v === 'REVOKED' || v === 'EXPIRED') return v;
  return isDisplayOnly(c) ? 'DISPLAY_ONLY' : 'ACTIVE_DEMO';
}
export const CREDENTIAL_STATE_TEXT: Record<CredentialState, { label: string; detail: string }> = {
  ACTIVE_DEMO: { label: 'اعتماد تجريبي فعال', detail: 'يمكن استخدامه للرد على طلبات التحقق التجريبية. ليس تحققاً تشفيرياً.' },
  DISPLAY_ONLY: { label: 'اعتماد تجريبي للعرض فقط', detail: 'يُعرض في المحفظة فقط ولا يُستخدم في أي طلب تحقق.' },
  EXPIRED: { label: 'اعتماد تجريبي منتهي الصلاحية', detail: 'انتهت مدة صلاحيته ولا يمكن استخدامه.' },
  SUSPENDED: { label: 'اعتماد تجريبي موقوف', detail: 'أوقفته الجهة المصدرة التجريبية.' },
  REVOKED: { label: 'اعتماد تجريبي ملغى', detail: 'ألغته الجهة المصدرة التجريبية.' },
};
const DAY = 86_400_000;
export const EXPIRING_DAYS = 14;
export const daysLeft = (iso: string, now = Date.now()): number => Math.ceil((Date.parse(iso) - now) / DAY);
/** Display-only validity derived from server status + expiry date. */
export type Validity = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
export function validityOf(c: DemoCredentialSummary, now = Date.now()): Validity {
  if (c.status !== 'ACTIVE') return c.status;
  const d = daysLeft(c.expiresAt, now);
  return d <= 0 ? 'EXPIRED' : d <= EXPIRING_DAYS ? 'EXPIRING' : 'ACTIVE';
}
export function ValidityBadge({ credential }: { credential: DemoCredentialSummary }) {
  const v = validityOf(credential);
  if (v === 'EXPIRING') return <Badge tone="warning">{`ينتهي خلال ${daysLeft(credential.expiresAt)} يوم`}</Badge>;
  if (v === 'EXPIRED') return <Badge tone="danger">منتهي الصلاحية</Badge>;
  return <CredentialStatusBadge status={credential.status} />;
}

/** Shown when a refresh failed but the last loaded data is still displayed. */
export function StaleNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="stale-bar" role="status">
      <Icon name="wifi-off" size={18} />اتصال ضعيف<span>— تُعرض آخر بيانات محمّلة.</span>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry} style={{ marginInlineStart: 'auto' }}>تحديث</button>
    </div>
  );
}

export function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return <div className="offline-bar" role="status"><Icon name="wifi-off" size={18} />أنت غير متصل بالشبكة. القرارات معطلة حتى يعود الاتصال.</div>;
}

export function NotificationsButton() {
  const { unread } = useFeed();
  const label = unread > 0 ? `الإشعارات (${unread} غير مقروءة)` : 'الإشعارات';
  return (
    <Link to="/notifications" className="btn btn--ghost btn--sm btn--icon icon-btn-badge" aria-label={label} title="الإشعارات">
      <Icon name="bell" size={20} />
      {unread > 0 && <span className="nav__badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}

export function DemoTag({ children = 'DEMO' }: { children?: string }) {
  return <span className="badge badge--warning" style={{ letterSpacing: '.03em' }}>{children}</span>;
}
