import { useState } from 'react';
import { ACTIVITY_TYPES, type DemoActivityType } from '@iqdid/shared-types';
import { ACTIVITY_LABEL, ActivityList, Card, ErrorState, LoadingState, PageHeader, Select, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { StaleNotice, UpdatedAt, useUpdatedAt } from '../parts.tsx';

export function ActivityPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const { data, error, loading, reload, stale } = useAsync((s) => (orgId ? verifier.activity(orgId, { signal: s }) : Promise.resolve([])), [verifier, orgId], { pollMs });
  const updatedAt = useUpdatedAt(data);
  const [type, setType] = useState<DemoActivityType | 'ALL'>('ALL');
  const events = (data ?? []).filter((e) => type === 'ALL' || e.type === type);
  return (
    <>
      <PageHeader eyebrow="التدقيق" icon="clock" title="سجل العمليات" description="عمليات المؤسسة المختارة فقط. اختيار المؤسسة تصفية تجريبية وليس تسجيل دخول. سجل محاكاة، وليس سجل تدقيق رسمياً." />
      <StaleNotice stale={stale} onRetry={reload} />
      <Card>
        <div className="vf-toolbar__meta">
          <div style={{ minWidth: 220 }}>
            <Select label="نوع العملية" value={type} onChange={(e) => setType(e.target.value as DemoActivityType | 'ALL')} options={[{ value: 'ALL', label: 'كل العمليات' }, ...ACTIVITY_TYPES.map((t) => ({ value: t, label: ACTIVITY_LABEL[t] }))]} />
          </div>
          <UpdatedAt at={updatedAt} />
        </div>
        {loading || org.loading ? <LoadingState /> : error && !data ? <ErrorState message={describeError(error)} onRetry={reload} /> : <ActivityList events={events} emptyText={type === 'ALL' ? 'لا توجد عمليات مسجلة بعد.' : 'لا توجد عمليات من هذا النوع.'} />}
      </Card>
    </>
  );
}
