import { useSearchParams } from 'react-router-dom';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, SegmentedControl, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import type { DemoSessionStatus } from '@iqdid/shared-types';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { SessionTable } from '../SessionTable.tsx';
import { StaleNotice } from '../parts.tsx';
import { countByStatus } from '../model.ts';

type Outcome = 'ALL' | Exclude<DemoSessionStatus, 'PENDING'>;
const OUTCOMES: ReadonlyArray<{ value: Outcome; label: string }> = [
  { value: 'ALL', label: 'كل النتائج' },
  { value: 'DEMO_ACCEPTED', label: 'موافقة تجريبية' },
  { value: 'DEMO_REJECTED', label: 'رفض' },
  { value: 'EXPIRED', label: 'انتهاء المهلة' },
  { value: 'CANCELLED', label: 'إلغاء' },
];

export function ResultsPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const { data, error, loading, reload, stale } = useAsync((s) => (orgId ? verifier.sessions(orgId, { signal: s }) : Promise.resolve([])), [verifier, orgId], { pollMs });
  const [params, setParams] = useSearchParams();
  const raw = params.get('outcome');
  const outcome: Outcome = OUTCOMES.some((o) => o.value === raw) ? (raw as Outcome) : 'ALL';
  const decided = (data ?? []).filter((s) => s.status !== 'PENDING').sort((a, b) => Date.parse(b.decidedAt ?? b.expiresAt) - Date.parse(a.decidedAt ?? a.expiresAt));
  const n = countByStatus(decided);
  const rows = outcome === 'ALL' ? decided : decided.filter((s) => s.status === outcome);

  return (
    <>
      <PageHeader eyebrow="النتائج" icon="check" title="نتائج الطلبات" description="الجلسات المغلقة لمؤسستك: موافقة تجريبية، رفض، انتهاء أو إلغاء. لا تشمل هذه النتائج أي تحقق تشفيري." />
      <StaleNotice stale={stale} onRetry={reload} />
      {loading || org.loading ? <Card><LoadingState /></Card> : error && !data ? <Card><ErrorState message={describeError(error)} onRetry={reload} /></Card> : decided.length === 0 ? (
        <Card><EmptyState icon="clock" title="لا توجد نتائج بعد" description="تظهر هنا الجلسات بعد قرار المواطن أو انتهاء المهلة." /></Card>
      ) : (
        <>
          <dl className="vf-summary" aria-label="ملخص النتائج">
            <div><dt>موافقة تجريبية</dt><dd>{n.DEMO_ACCEPTED}</dd></div>
            <div><dt>رفض</dt><dd>{n.DEMO_REJECTED}</dd></div>
            <div><dt>انتهاء المهلة</dt><dd>{n.EXPIRED}</dd></div>
            <div><dt>إلغاء</dt><dd>{n.CANCELLED}</dd></div>
            <div><dt>تحقق تشفيري</dt><dd className="vf-summary__na">غير منفذ</dd></div>
          </dl>
          <Card>
            <div className="vf-toolbar__meta">
              <SegmentedControl label="تصفية حسب النتيجة" value={outcome} options={OUTCOMES} onChange={(v) => { const next = new URLSearchParams(params); if (v === 'ALL') next.delete('outcome'); else next.set('outcome', v); setParams(next, { replace: true }); }} />
              <p className="small muted" role="status" aria-live="polite" style={{ margin: 0 }}>{`عرض ${rows.length} من ${decided.length} نتيجة`}</p>
            </div>
            {rows.length === 0 ? <EmptyState icon="search" title="لا توجد نتائج من هذا النوع" /> : <SessionTable sessions={rows} caption="نتائج الطلبات" timeColumn="decided" />}
          </Card>
        </>
      )}
    </>
  );
}
