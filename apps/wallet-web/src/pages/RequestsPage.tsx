import { Link } from 'react-router-dom';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, SessionStatusBadge, formatDateTime, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import type { DemoVerificationSession } from '@iqdid/shared-types';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';

export function RequestsPage() {
  const wallet = useWallet();
  const pollMs = usePollMs();
  const { data, error, loading, reload } = useAsync((s) => wallet.requests({ signal: s }), [wallet], { pollMs });
  const pending = data?.filter((r) => r.status === 'PENDING') ?? [];
  const closed = data?.filter((r) => r.status !== 'PENDING') ?? [];
  return (
    <>
      <PageHeader title="طلبات مشاركة البيانات" description="الطلبات الواردة من المؤسسات التجريبية." />
      {loading ? <LoadingState /> : error ? <ErrorState message={describeError(error)} onRetry={reload} /> : data?.length === 0 ? (
        <EmptyState icon="📭" title="لا توجد طلبات" description="عندما تنشئ مؤسسة تجريبية طلب تحقق سيظهر هنا تلقائياً." />
      ) : (
        <>
          <Card title={`بانتظار قرارك (${pending.length})`}>
            {pending.length === 0 ? <p className="muted">لا توجد طلبات معلقة.</p> : <RequestList items={pending} />}
          </Card>
          <Card title="طلبات سابقة">{closed.length === 0 ? <p className="muted">لا شيء بعد.</p> : <RequestList items={closed} />}</Card>
        </>
      )}
    </>
  );
}

function RequestList({ items }: { items: readonly DemoVerificationSession[] }) {
  return (
    <ul className="list">
      {items.map((r) => (
        <li key={r.id}>
          <div className="row row--between">
            <Link to={`/requests/${r.id}`}><strong>{r.organizationName}</strong></Link>
            <SessionStatusBadge status={r.status} />
          </div>
          <div>{r.purpose}</div>
          <div className="small muted">
            رمز الطلب <span className="mono">{r.shortCode}</span> · {formatDateTime(r.createdAt)}
          </div>
        </li>
      ))}
    </ul>
  );
}
