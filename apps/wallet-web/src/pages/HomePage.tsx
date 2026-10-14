import { Link } from 'react-router-dom';
import { ActivityList, Alert, Card, CredentialStatusBadge, ErrorState, LoadingState, PageHeader, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { readNotifyPref } from '../prefs.ts';

export function HomePage() {
  const wallet = useWallet();
  const pollMs = usePollMs();
  const creds = useAsync((s) => wallet.credentials({ signal: s }), [wallet]);
  const reqs = useAsync((s) => wallet.requests({ signal: s }), [wallet], { pollMs });
  const activity = useAsync((s) => wallet.activity({ signal: s }), [wallet], { pollMs });
  const pending = reqs.data?.filter((r) => r.status === 'PENDING') ?? [];

  return (
    <>
      <PageHeader title="أهلاً بك" description="محفظة هوية رقمية تجريبية للمواطن الاصطناعي TEST-001." />
      {pending.length > 0 && readNotifyPref() && (
        <Alert tone="info" title={`لديك ${pending.length} طلب مشاركة بيانات بانتظار قرارك`}>
          <Link to="/requests">عرض الطلبات</Link>
        </Alert>
      )}
      <Card title="اعتماداتي" actions={<Link to="/card">بطاقتي الرقمية</Link>}>
        {creds.loading ? <LoadingState /> : creds.error ? <ErrorState message={describeError(creds.error)} onRetry={creds.reload} /> : (
          <ul className="list">
            {creds.data?.map((c) => (
              <li key={c.id} className="row row--between">
                <Link to={`/credentials/${c.id}`}>{c.title}</Link>
                <CredentialStatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="آخر النشاطات" actions={<Link to="/activity">السجل الكامل</Link>}>
        {activity.loading ? <LoadingState /> : activity.error ? <ErrorState message={describeError(activity.error)} onRetry={activity.reload} /> : <ActivityList events={(activity.data ?? []).slice(0, 3)} />}
      </Card>
    </>
  );
}
