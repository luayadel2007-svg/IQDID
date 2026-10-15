import { Card, EmptyState, ErrorState, LoadingState, PageHeader, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { SessionTable } from '../SessionTable.tsx';

export function SessionsPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const { data, error, loading, reload } = useAsync((s) => (orgId ? verifier.sessions(orgId, { signal: s }) : Promise.resolve([])), [verifier, orgId], { pollMs });
  return (
    <>
      <PageHeader eyebrow="الجلسات" icon="folder" title="جلسات التحقق" description="كل الطلبات التي أنشأتها مؤسستك التجريبية." />
      <Card>
        {loading || org.loading ? <LoadingState /> : error ? <ErrorState message={describeError(error)} onRetry={reload} /> : (data ?? []).length === 0 ? (
          <EmptyState title="لا توجد جلسات" />
        ) : <SessionTable sessions={data ?? []} caption="جلسات التحقق" />}
      </Card>
    </>
  );
}
