import { Link } from 'react-router-dom';
import { ActivityList, Card, CountdownRing, EmptyState, ErrorState, FavoriteShortcut, Icon, LoadingState, PageHeader, useAsync, useCountdown } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import type { DemoVerificationSession } from '@iqdid/shared-types';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { SessionTable } from '../SessionTable.tsx';
import { KpiLink, StaleNotice, UpdatedAt, useUpdatedAt } from '../parts.tsx';
import { TEMPLATE_LABEL, countByStatus, ttlSeconds } from '../model.ts';

const ORG_KIND = { BANK: 'مصرف', TELECOM: 'اتصالات' } as const;

export function DashboardPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const sessions = useAsync((s) => (orgId ? verifier.sessions(orgId, { signal: s }) : Promise.resolve([])), [verifier, orgId], { pollMs });
  const activity = useAsync((s) => (orgId ? verifier.activity(orgId, { signal: s }) : Promise.resolve([])), [verifier, orgId], { pollMs });
  const updatedAt = useUpdatedAt(sessions.data);

  if (org.loading) return <LoadingState />;
  if (org.error) return <ErrorState message={describeError(org.error)} onRetry={org.reload} />;
  const all = sessions.data ?? [];
  const n = countByStatus(all);
  const pending = all.filter((s) => s.status === 'PENDING').sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt));

  return (
    <>
      <PageHeader eyebrow="بوابة التحقق المؤسسي" icon="shield" title="لوحة المتابعة"
        description={org.current ? `المؤسسة الحالية: ${org.current.name}` : undefined}
        actions={<Link className="btn btn--primary" to="/new"><Icon name="plus" size={18} />طلب تحقق جديد</Link>} />
      <div className="vf-context">
        {org.current && <span className="vf-context__org"><Icon name="building" size={18} />{org.current.name}<span className="badge badge--neutral">{ORG_KIND[org.current.kind]} — تجريبية</span></span>}
        <UpdatedAt at={updatedAt} />
      </div>
      <StaleNotice stale={sessions.stale} onRetry={sessions.reload} />

      {sessions.loading ? <Card><LoadingState /></Card> : sessions.error && !sessions.data ? <Card><ErrorState message={describeError(sessions.error)} onRetry={sessions.reload} /></Card> : all.length === 0 ? (
        <Card variant="accent">
          <EmptyState icon="file" title="لا توجد جلسات بعد" description="لا توجد بيانات تجريبية لهذه المؤسسة حتى الآن. تظهر المؤشرات بعد إنشاء أول طلب." action={<Link className="btn btn--primary" to="/new">إنشاء طلب</Link>} />
        </Card>
      ) : (
        <>
          <section aria-label="مؤشرات الجلسات" className="vf-kpis">
            <KpiLink to="/sessions?status=PENDING" label="بانتظار القرار" value={n.PENDING} icon="clock" tone="info" hint="طلبات معلقة الآن" />
            <KpiLink to="/sessions?status=DEMO_ACCEPTED" label="موافقات تجريبية" value={n.DEMO_ACCEPTED} icon="check" tone="success" hint="ليست تحققاً تشفيرياً" />
            <KpiLink to="/sessions?status=DEMO_REJECTED" label="مرفوضة" value={n.DEMO_REJECTED} icon="x" tone="danger" hint="رفضها المواطن" />
            <KpiLink to="/sessions?status=EXPIRED" label="منتهية المهلة" value={n.EXPIRED} icon="alert" tone="warning" hint="دون قرار" />
            <KpiLink to="/sessions?status=CANCELLED" label="ملغاة" value={n.CANCELLED} icon="x" tone="neutral" hint="ألغتها المؤسسة" />
          </section>

          <div className="vf-split">
            <Card title="أحدث الجلسات" icon="folder" actions={<Link to="/sessions">كل الجلسات</Link>}>
              <SessionTable sessions={all.slice(0, 5)} caption="أحدث الجلسات" compact />
            </Card>
            <div className="vf-stack">
              <Card title="بانتظار قرار المواطن" icon="clock" headingLevel={2}>
                {pending.length === 0 ? <p className="muted" style={{ margin: 0 }}>لا توجد طلبات معلقة.</p> : (
                  <ul className="vf-pending" aria-label="الطلبات المعلقة">
                    {pending.slice(0, 4).map((s) => <PendingRow key={s.id} session={s} />)}
                  </ul>
                )}
              </Card>
              <Card title="النشاط الحديث" icon="activity" actions={<Link to="/activity">السجل الكامل</Link>}>
                {activity.loading ? <LoadingState /> : activity.error && !activity.data ? <ErrorState message={describeError(activity.error)} onRetry={activity.reload} /> : <ActivityList events={(activity.data ?? []).slice(0, 4)} />}
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Rendered only once data has settled, so nothing below the loading card jumps (layout shift). */}
      {!sessions.loading && <>
      <Card title="كيف تُقرأ النتائج؟" icon="info" variant="flat">
        <ul className="vf-legend">
          <li><strong>موافقة تجريبية:</strong> ضغط المواطن التجريبي «موافقة» في المحفظة. لا تثبت هوية أحد.</li>
          <li><strong>التحقق التشفيري:</strong> غير منفذ في هذا النموذج؛ كل الجلسات «غير متحقق منها تشفيرياً».</li>
          <li><strong>البيانات:</strong> اصطناعية بالكامل، ولا تمثل أي جهة حكومية.</li>
        </ul>
      </Card>
      <FavoriteShortcut app="verifier" options={[{ href: '/new', label: 'طلب تحقق جديد' }, { href: '/sessions', label: 'جلسات التحقق' }, { href: '/results', label: 'النتائج' }]} />
      </>}
    </>
  );
}

function PendingRow({ session: s }: { session: DemoVerificationSession }) {
  const left = useCountdown(s.expiresAt);
  return (
    <li className="vf-pending__row">
      <span className="vf-pending__body">
        <Link to={`/sessions/${s.id}`} className="mono vf-code" aria-label={`فتح الجلسة ${s.shortCode}`}>{s.shortCode}</Link>
        <span className="small muted">{TEMPLATE_LABEL[s.templateId]} · {s.purpose}</span>
      </span>
      {left !== null && left > 0 && <CountdownRing seconds={left} total={ttlSeconds(s)} size={44} />}
    </li>
  );
}
