import { DEMO_SESSION_TTL_MS, SESSION_STATUSES, type DemoOutcome, type DemoRequestTemplate, type DemoSessionStatus, type DemoVerificationSession } from '@iqdid/shared-types';

/** Verifier-side view of session data. Pure functions over the existing demo contract — no new API. */

export const TEMPLATE_LABEL: Record<DemoRequestTemplate['id'], string> = {
  AGE_OVER_18: 'العمر (18 فأكثر)',
  IDENTITY_BASIC: 'الهوية الأساسية',
};

export const DEFAULT_TTL_SECONDS = Math.round(DEMO_SESSION_TTL_MS / 1000);

export const ttlSeconds = (s: DemoVerificationSession): number => Math.max(0, Math.round((Date.parse(s.expiresAt) - Date.parse(s.createdAt)) / 1000));

/** What the citizen decided, as recorded by the demo server. Never a verification result. */
export function recordedDecision(s: DemoVerificationSession): string {
  switch (s.status) {
    case 'PENDING': return 'لا يوجد قرار بعد';
    case 'DEMO_ACCEPTED': return 'وافق المواطن التجريبي (ACCEPT)';
    case 'DEMO_REJECTED': return 'رفض المواطن التجريبي (REJECT)';
    case 'EXPIRED': return 'لا قرار — انتهت المهلة';
    case 'CANCELLED': return 'لا قرار — ألغت المؤسسة الطلب';
  }
}

/**
 * Demo outcome in the shared typed form. Only DEMO_ACCEPTED / DEMO_REJECTED are outcomes;
 * the type has no way to express VERIFIED_BY_PROTOCOL, which only a server proof could carry.
 */
export function demoOutcome(s: DemoVerificationSession): DemoOutcome | null {
  return s.status === 'DEMO_ACCEPTED' || s.status === 'DEMO_REJECTED' ? { mode: 'demo', outcome: s.status, sessionId: s.id } : null;
}

/** Short filter labels; distinct from the status badge text so a badge is never confused with an option. */
export const STATUS_FILTER_LABEL: Record<DemoSessionStatus, string> = {
  PENDING: 'بانتظار القرار',
  DEMO_ACCEPTED: 'موافقات تجريبية',
  DEMO_REJECTED: 'مرفوضة',
  EXPIRED: 'منتهية المهلة',
  CANCELLED: 'ملغاة',
};

export type SortKey = 'newest' | 'oldest' | 'expiry';
export const SORT_LABEL: Record<SortKey, string> = { newest: 'الأحدث أولاً', oldest: 'الأقدم أولاً', expiry: 'الأقرب انتهاءً' };

export interface SessionFilter {
  readonly q: string;
  readonly status: DemoSessionStatus | 'ALL';
  readonly template: DemoRequestTemplate['id'] | 'ALL';
  readonly sort: SortKey;
}

export const parseStatus = (v: string | null): DemoSessionStatus | 'ALL' => ((SESSION_STATUSES as readonly string[]).includes(v ?? '') ? (v as DemoSessionStatus) : 'ALL');
export const parseTemplate = (v: string | null): DemoRequestTemplate['id'] | 'ALL' => (v === 'AGE_OVER_18' || v === 'IDENTITY_BASIC' ? v : 'ALL');
export const parseSort = (v: string | null): SortKey => (v === 'oldest' || v === 'expiry' ? v : 'newest');

export function filterSessions(all: readonly DemoVerificationSession[], f: SessionFilter): DemoVerificationSession[] {
  const q = f.q.trim().toLowerCase();
  const rows = all.filter((s) =>
    (f.status === 'ALL' || s.status === f.status) &&
    (f.template === 'ALL' || s.templateId === f.template) &&
    (!q || s.shortCode.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.purpose.toLowerCase().includes(q)),
  );
  const t = (iso: string): number => Date.parse(iso);
  if (f.sort === 'oldest') return rows.sort((a, b) => t(a.createdAt) - t(b.createdAt));
  if (f.sort === 'expiry') return rows.sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING') || t(a.expiresAt) - t(b.expiresAt));
  return rows.sort((a, b) => t(b.createdAt) - t(a.createdAt));
}

export function countByStatus(all: readonly DemoVerificationSession[]): Record<DemoSessionStatus, number> {
  const out = { PENDING: 0, DEMO_ACCEPTED: 0, DEMO_REJECTED: 0, EXPIRED: 0, CANCELLED: 0 } satisfies Record<DemoSessionStatus, number>;
  for (const s of all) out[s.status] += 1;
  return out;
}
