import type { DemoActivityType, DemoCredentialStatus, DemoSessionStatus } from '@iqdid/shared-types';
import { Badge, type Tone } from './components.tsx';

export const SESSION_STATUS_LABEL: Record<DemoSessionStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'بانتظار قرار المواطن', tone: 'info' },
  DEMO_ACCEPTED: { label: 'موافقة تجريبية (DEMO_ACCEPTED)', tone: 'success' },
  DEMO_REJECTED: { label: 'رُفض (DEMO_REJECTED)', tone: 'danger' },
  EXPIRED: { label: 'انتهت المهلة', tone: 'warning' },
  CANCELLED: { label: 'أُلغي', tone: 'neutral' },
};

export const CREDENTIAL_STATUS_LABEL: Record<DemoCredentialStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'فعال (تجريبي)', tone: 'success' },
  SUSPENDED: { label: 'موقوف', tone: 'warning' },
  REVOKED: { label: 'ملغى', tone: 'danger' },
};

export const ACTIVITY_LABEL: Record<DemoActivityType, string> = {
  REQUEST_CREATED: 'طلب تحقق جديد',
  CONSENT_ACCEPTED: 'موافقة تجريبية',
  CONSENT_REJECTED: 'رفض',
  SESSION_EXPIRED: 'انتهاء مهلة',
  SESSION_CANCELLED: 'إلغاء',
  DEMO_RESET: 'إعادة ضبط العرض',
};

export function SessionStatusBadge({ status }: { status: DemoSessionStatus }) {
  const s = SESSION_STATUS_LABEL[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function CredentialStatusBadge({ status }: { status: DemoCredentialStatus }) {
  const s = CREDENTIAL_STATUS_LABEL[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const dateFmt = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
const dayFmt = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { dateStyle: 'long' });
export const formatDateTime = (iso: string): string => dateFmt.format(new Date(iso));
export const formatDate = (iso: string): string => dayFmt.format(new Date(iso));
