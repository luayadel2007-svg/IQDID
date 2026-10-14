import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DemoConsentDecisionValue, DemoSessionStatus } from '@iqdid/shared-types';
import { Alert, Button, Card, ErrorState, LoadingState, Modal, PageHeader, SessionStatusBadge, formatDateTime, useAsync, useCountdown } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';

export function RequestDetailPage() {
  const { id = '' } = useParams();
  const wallet = useWallet();
  const pollMs = usePollMs();
  const { data, error, loading, reload } = useAsync((s) => wallet.request(id, { signal: s }), [wallet, id], { pollMs });
  const left = useCountdown(data?.status === 'PENDING' ? data.expiresAt : null);
  const [confirm, setConfirm] = useState<DemoConsentDecisionValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const close = useCallback(() => setConfirm(null), []);

  const submit = async (decision: DemoConsentDecisionValue): Promise<void> => {
    setSubmitting(true);
    setActionError(null);
    try {
      await wallet.decide(id, decision);
      setConfirm(null);
      reload();
    } catch (e) {
      setConfirm(null);
      setActionError(describeError(e));
      reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={describeError(error)} onRetry={reload} />;
  const pending = data.status === 'PENDING' && left !== 0;

  return (
    <>
      <PageHeader title="طلب مشاركة بيانات" description={`رمز الطلب ${data.shortCode}`} actions={<SessionStatusBadge status={data.status} />} />
      {actionError && <Alert tone="danger" title="لم يُسجَّل القرار">{actionError}</Alert>}
      <Card title="الجهة الطالبة">
        <dl className="kv">
          <dt>المؤسسة</dt><dd>{data.organizationName}</dd>
          <dt>الغرض</dt><dd>{data.purpose}</dd>
          <dt>أُنشئ</dt><dd>{formatDateTime(data.createdAt)}</dd>
          {pending && left !== null && (<><dt>المهلة المتبقية</dt><dd aria-live="polite">{left} ثانية</dd></>)}
        </dl>
      </Card>
      <Card title="البيانات المطلوبة">
        <ul>
          {data.requestedFields.map((f) => <li key={f.key}>{f.label}</li>)}
        </ul>
        <p className="small muted">ستُشارك هذه الحقول فقط إذا وافقت. يمكنك الرفض دائماً.</p>
      </Card>
      {pending ? (
        <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
          <Button onClick={() => setConfirm('ACCEPT')}>موافقة تجريبية</Button>
          <Button variant="danger" onClick={() => setConfirm('REJECT')}>رفض</Button>
        </div>
      ) : (
        <DecisionOutcome status={data.status} decidedAt={data.decidedAt} />
      )}
      <p style={{ marginTop: 'var(--sp-5)' }}><Link to="/requests">العودة إلى الطلبات</Link></p>
      <Modal
        open={confirm !== null}
        title={confirm === 'ACCEPT' ? 'تأكيد الموافقة التجريبية' : 'تأكيد الرفض'}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={submitting}>تراجع</Button>
            <Button variant={confirm === 'REJECT' ? 'danger' : 'primary'} loading={submitting} onClick={() => confirm && void submit(confirm)}>
              {confirm === 'ACCEPT' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
            </Button>
          </>
        }
      >
        {confirm === 'ACCEPT' ? (
          <p>ستُرسل الحقول المطلوبة (قيم اصطناعية) إلى {data.organizationName}. هذه موافقة محاكاة داخل العرض التجريبي، ولا يجري أي توقيع أو تحقق تشفيري.</p>
        ) : (
          <p>لن تُشارك أي بيانات مع {data.organizationName}.</p>
        )}
      </Modal>
    </>
  );
}

function DecisionOutcome({ status, decidedAt }: { status: DemoSessionStatus; decidedAt: string | null }) {
  const when = decidedAt ? ` (${formatDateTime(decidedAt)})` : '';
  if (status === 'DEMO_ACCEPTED') return <Alert tone="success" title="سُجلت موافقتك التجريبية">{`شوركت القيم الاصطناعية مع المؤسسة${when}. لم يحدث تحقق بروتوكولي.`}</Alert>;
  if (status === 'DEMO_REJECTED') return <Alert tone="info" title="رفضت هذا الطلب">{`لم تُشارك أي بيانات${when}.`}</Alert>;
  if (status === 'CANCELLED') return <Alert tone="warning" title="ألغت المؤسسة الطلب">لا يلزم أي إجراء.</Alert>;
  return <Alert tone="warning" title="انتهت مهلة الطلب">لم يُتخذ قرار خلال المهلة، ولم تُشارك أي بيانات.</Alert>;
}
