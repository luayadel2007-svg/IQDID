import { ActivityList, Card, ErrorState, LoadingState, PageHeader, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';

export function ActivityPage() {
  const wallet = useWallet();
  const pollMs = usePollMs();
  const { data, error, loading, reload } = useAsync((s) => wallet.activity({ signal: s }), [wallet], { pollMs });
  return (
    <>
      <PageHeader title="سجل الاستخدام" description="كل طلب وقرار يخص محفظتك التجريبية." />
      <Card>
        {loading ? <LoadingState /> : error ? <ErrorState message={describeError(error)} onRetry={reload} /> : <ActivityList events={data ?? []} />}
      </Card>
    </>
  );
}
