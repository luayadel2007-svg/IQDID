import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CountdownRing, EmptyState, ErrorState, Icon, LoadingState, PageHeader, SegmentedControl, SessionStatusBadge, formatDateTime, useAsync, useCountdown } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import type { DemoVerificationSession } from '@iqdid/shared-types';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { StaleNotice } from '../components/bits.tsx';

export function RequestsPage() {
  const wallet = useWallet();
  const pollMs = usePollMs();
  const { data, error, loading, stale, reload } = useAsync((s) => wallet.requests({ signal: s }), [wallet], { pollMs });
  const [org, setOrg] = useState('all');
  const orgs = [...new Map((data ?? []).map((r) => [r.organizationId, r.organizationName])).entries()];
  const visible = (data ?? []).filter((r) => org === 'all' || r.organizationId === org);
  const pending = visible.filter((r) => r.status === 'PENDING');
  const closed = visible.filter((r) => r.status !== 'PENDING');
  return (
    <>
      <PageHeader eyebrow="طلبات المؤسسات" icon="inbox" title="طلبات مشاركة البيانات" description="الطلبات الواردة من المؤسسات التجريبية. القرار لك دائماً." />
      {loading ? <LoadingState /> : !data ? <ErrorState message={describeError(error)} onRetry={reload} /> : data.length === 0 ? (
        <EmptyState icon="inbox" title="لا توجد طلبات" description="عندما تنشئ مؤسسة تجريبية طلب تحقق سيظهر هنا تلقائياً." />
      ) : (
        <>
          {stale && <StaleNotice onRetry={reload} />}
          {orgs.length > 1 && (
            <div className="toolbar">
              <SegmentedControl label="تصفية حسب المؤسسة" value={org} onChange={setOrg} options={[{ value: 'all', label: 'كل المؤسسات' }, ...orgs.map(([value, label]) => ({ value, label }))]} />
            </div>
          )}
          <Card title={`بانتظار قرارك (${pending.length})`} icon="clock">
            {pending.length === 0 ? <p className="muted">لا توجد طلبات معلقة.</p> : <RequestList items={pending} />}
          </Card>
          <Card title="طلبات سابقة" icon="folder">{closed.length === 0 ? <p className="muted">لا شيء بعد.</p> : <RequestList items={closed} />}</Card>
        </>
      )}
    </>
  );
}

function PendingTimer({ session }: { session: DemoVerificationSession }) {
  const left = useCountdown(session.expiresAt);
  if (left === null || left === 0) return null;
  const total = Math.max(1, Math.round((Date.parse(session.expiresAt) - Date.parse(session.createdAt)) / 1000));
  return <CountdownRing seconds={left} total={total} size={48} />;
}

function RequestList({ items }: { items: readonly DemoVerificationSession[] }) {
  return (
    <ul className="item-list">
      {items.map((r) => (
        <li key={r.id} className="item item--link">
          <span className="item__icon"><Icon name="building" /></span>
          <div className="item__body">
            <Link className="item__title" to={`/requests/${r.id}`}>{r.organizationName}</Link>
            <span>{r.purpose}</span>
            <span className="item__meta">رمز الطلب <span className="mono">{r.shortCode}</span> · {formatDateTime(r.createdAt)}</span>
          </div>
          <div className="item__end">
            <SessionStatusBadge status={r.status} />
            {r.status === 'PENDING' && <PendingTimer session={r} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
