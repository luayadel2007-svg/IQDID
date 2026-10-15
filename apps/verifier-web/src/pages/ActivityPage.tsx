import { ActivityList, Card, ErrorState, LoadingState, PageHeader, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';

export function ActivityPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const { data, error, loading, reload } = useAsync((s) => (orgId ? verifier.activity(orgId, { signal: s }) : Promise.resolve([])), [verifier, orgId], { pollMs });
  return (
    <>
      <PageHeader eyebrow="التدقيق" icon="clock" title="سجل العمليات" description="عمليات مؤسستك فقط (عزل بين المؤسسات)." />
      <Card>
        {loading || org.loading ? <LoadingState /> : error ? <ErrorState message={describeError(error)} onRetry={reload} /> : <ActivityList events={data ?? []} />}
      </Card>
    </>
  );
}
