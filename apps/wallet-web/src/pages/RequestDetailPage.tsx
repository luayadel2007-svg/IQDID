import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DEMO_SESSION_TTL_MS, previewDemoDisclosure, primaryIdentityCredential } from '@iqdid/shared-types';
import type { DemoSessionStatus } from '@iqdid/shared-types';
import { Alert, Card, CountdownRing, ErrorState, Icon, LoadingState, PageHeader, SessionStatusBadge, formatDateTime, useAsync, useCountdown } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { DecisionPanel } from '../components/DecisionPanel.tsx';
import { StaleNotice } from '../components/bits.tsx';
import { useTrust } from '../trust.ts';

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const wallet = useWallet();
  const trust = useTrust();
  const pollMs = usePollMs();
  const { data, error, loading, stale, reload } = useAsync((s) => wallet.request(id, { signal: s }), [wallet, id], { pollMs });
  const credentials = useAsync((signal) => wallet.credentials({ signal }), [wallet]);
  const left = useCountdown(data?.status === 'PENDING' ? data.expiresAt : null);
  const [actionError, setActionError] = useState<string | null>(null);
  const decided = (e: string | null) => { setActionError(e); reload(); };

  const refused = actionError && <Alert tone="danger" title="لم يُسجَّل القرار">{actionError}</Alert>;
  if (loading) return <>{refused}<LoadingState /></>;
  if (!data) return <>{refused}<ErrorState message={describeError(error)} onRetry={reload} /></>;
  const credential = primaryIdentityCredential(credentials.data, data.holderRef);
  const preview = credential ? previewDemoDisclosure(data, credential) : null;
  const pending = data.status === 'PENDING' && left !== 0;
  const total = Math.max(1, Math.round((Date.parse(data.expiresAt) - Date.parse(data.createdAt)) / 1000)) || DEMO_SESSION_TTL_MS / 1000;
  const view = trust.describeSession(data);

  return (
    <>
      <PageHeader eyebrow="مراجعة الطلب" icon="inbox" title="طلب مشاركة بيانات" description={`رمز الطلب ${data.shortCode}`} actions={<SessionStatusBadge status={data.status} />} />
      {stale && <StaleNotice onRetry={reload} />}
      {refused}
      <Card title="الجهة الطالبة" icon="building">
        <div className="row row--between" style={{ alignItems: 'flex-start' }}>
          <dl className="kv" style={{ flex: '1 1 220px' }}>
            <dt>المؤسسة</dt><dd>{data.organizationName}</dd>
            <dt>الغرض</dt><dd>{data.purpose}</dd>
            <dt>أُنشئ</dt><dd>{formatDateTime(data.createdAt)}</dd>
            {pending && left !== null && (<><dt>المهلة المتبقية</dt><dd aria-live="polite">{left} ثانية</dd></>)}
          </dl>
          {pending && left !== null && <CountdownRing seconds={left} total={total} />}
        </div>
      </Card>
      <Card title="البيانات المطلوبة" icon="list">
        <ul>
          {data.requestedFields.map((f) => <li key={f.key}>{f.label}</li>)}
        </ul>
        <p className="small muted">ستُشارك هذه الحقول فقط إذا وافقت. يمكنك الرفض دائماً.</p>
        <Link to={`/requests/${data.id}/disclosure`} className="btn btn--secondary btn--sm"><Icon name="eye" size={18} />معاينة الإفصاح الانتقائي</Link>
      </Card>
      {pending && <Card title="معاينة القيم التي ستُشارك (اصطناعية)" icon="eye">
        {credentials.loading ? <LoadingState /> : credentials.error || !preview ? <ErrorState message="تعذرت معاينة البيانات؛ أعد المحاولة قبل الموافقة." onRetry={credentials.reload} /> :
          <dl className="kv">{preview.map((c) => <div key={c.key}><dt>{`قيمة: ${c.label}`}</dt><dd>{c.value}</dd></div>)}</dl>}
      </Card>}
      {pending ? (
        <DecisionPanel session={data} canAccept={Boolean(preview) && !credentials.error && credential?.status === 'ACTIVE'} onDecided={decided} />
      ) : (
        <>
          <DecisionOutcome status={data.status} decidedAt={data.decidedAt} />
          {view.kind === 'DEMO_UNVERIFIED' && <p className="small muted">{view.detail}</p>}
        </>
      )}
      <p style={{ marginTop: 'var(--sp-5)' }}><Link to="/requests">العودة إلى الطلبات</Link></p>
    </>
  );
}

export function DecisionOutcome({ status, decidedAt }: { status: DemoSessionStatus; decidedAt: string | null }) {
  const when = decidedAt ? ` (${formatDateTime(decidedAt)})` : '';
  if (status === 'DEMO_ACCEPTED') return <Alert tone="success" title="سُجلت موافقتك التجريبية">{`شوركت القيم الاصطناعية مع المؤسسة${when}. لم يحدث تحقق بروتوكولي.`}</Alert>;
  if (status === 'DEMO_REJECTED') return <Alert tone="info" title="رفضت هذا الطلب">{`لم تُشارك أي بيانات${when}.`}</Alert>;
  if (status === 'CANCELLED') return <Alert tone="warning" title="ألغت المؤسسة الطلب">لا يلزم أي إجراء.</Alert>;
  return <Alert tone="warning" title="انتهت مهلة الطلب">لم يُتخذ قرار خلال المهلة، ولم تُشارك أي بيانات.</Alert>;
}
