import { Link } from 'react-router-dom';
import { FavoriteShortcut, Card, Icon, StatCard, EmptyState, ErrorState, LoadingState, PageHeader, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { SessionTable } from '../SessionTable.tsx';

export function DashboardPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const { data, error, loading, reload } = useAsync((s) => (orgId ? verifier.sessions(orgId, { signal: s }) : Promise.resolve([])), [verifier, orgId], { pollMs });

  if (org.loading) return <LoadingState />;
  if (org.error) return <ErrorState message={describeError(org.error)} onRetry={org.reload} />;
  const all = data ?? [];
  const count = (st: string) => all.filter((s) => s.status === st).length;
  const stats = [
    { label: 'بانتظار القرار', value: count('PENDING'), icon: 'clock', tone: 'info' },
    { label: 'موافقات تجريبية', value: count('DEMO_ACCEPTED'), icon: 'check', tone: 'success' },
    { label: 'مرفوضة', value: count('DEMO_REJECTED'), icon: 'x', tone: 'danger' },
    { label: 'منتهية/ملغاة', value: count('EXPIRED') + count('CANCELLED'), icon: 'alert', tone: 'warning' },
  ] as const;
  return (
    <>
      <PageHeader eyebrow="بوابة التحقق" icon="shield" title="لوحة المتابعة" description={org.current ? `المؤسسة الحالية: ${org.current.name}` : undefined} actions={<Link className="btn btn--primary" to="/new"><Icon name="plus" size={18} />طلب تحقق جديد</Link>} />
      <FavoriteShortcut app="verifier" options={[{ href: '/new', label: 'طلب تحقق جديد' }, { href: '/sessions', label: 'جلسات التحقق' }, { href: '/results', label: 'النتائج' }]} />
      <div className="grid" style={{ marginBottom: 'var(--sp-4)' }}>
        {stats.map((s) => <StatCard key={s.label} label={s.label} value={loading ? '…' : s.value} icon={s.icon} tone={s.tone} />)}
      </div>
      <Card title="أحدث الجلسات" icon="folder" actions={<Link to="/sessions">كل الجلسات</Link>}>
        {loading ? <LoadingState /> : error ? <ErrorState message={describeError(error)} onRetry={reload} /> : all.length === 0 ? (
          <EmptyState icon="file" title="لا توجد جلسات بعد" description="ابدأ بإنشاء طلب تحقق تجريبي." action={<Link className="btn btn--primary" to="/new">إنشاء طلب</Link>} />
        ) : <SessionTable sessions={all.slice(0, 5)} caption="أحدث الجلسات" />}
      </Card>
    </>
  );
}
