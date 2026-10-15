import { Card, EmptyState, ErrorState, LoadingState, PageHeader, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { SessionTable } from '../SessionTable.tsx';

export function ResultsPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const { data, error, loading, reload } = useAsync((s) => (orgId ? verifier.sessions(orgId, { signal: s }) : Promise.resolve([])), [verifier, orgId], { pollMs });
  const decided = (data ?? []).filter((s) => s.status !== 'PENDING');
  return (
    <>
      <PageHeader eyebrow="النتائج" icon="check" title="نتائج الطلبات" description="الجلسات المغلقة: موافقة تجريبية، رفض، انتهاء أو إلغاء." />
      <Card>
        {loading || org.loading ? <LoadingState /> : error ? <ErrorState message={describeError(error)} onRetry={reload} /> : decided.length === 0 ? (
          <EmptyState icon="clock" title="لا توجد نتائج بعد" />
        ) : <SessionTable sessions={decided} caption="نتائج الطلبات" />}
      </Card>
    </>
  );
}
