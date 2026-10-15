import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, ErrorState, LoadingState, PageHeader, SessionStatusBadge, formatDateTime, useAsync, useCountdown } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import type { DemoVerificationSession } from '@iqdid/shared-types';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';

export function SessionDetailPage() {
  const { id = '' } = useParams();
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const { data, error, loading, reload } = useAsync(
    (s) => (orgId ? verifier.session(id, orgId, { signal: s }) : Promise.reject(new Error('no organisation'))),
    [verifier, id, orgId],
    { pollMs },
  );
  const left = useCountdown(data?.status === 'PENDING' ? data.expiresAt : null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const cancel = async (): Promise<void> => {
    setBusy(true);
    setActionError(null);
    try {
      await verifier.cancelSession(id, orgId);
    } catch (e) {
      setActionError(describeError(e));
    } finally {
      setBusy(false);
      reload();
    }
  };

  if (loading || org.loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={describeError(error)} onRetry={reload} />;

  return (
    <>
      <PageHeader eyebrow="تفاصيل الجلسة" icon="file" title={`جلسة ${data.shortCode}`} description={data.organizationName} actions={<SessionStatusBadge status={data.status} />} />
      {actionError && <Alert tone="danger">{actionError}</Alert>}
      <Card title="تفاصيل الطلب" icon="list">
        <dl className="kv">
          <dt>الغرض</dt><dd>{data.purpose}</dd>
          <dt>المواطن</dt><dd><span className="mono">{data.holderRef}</span></dd>
          <dt>الحقول المطلوبة</dt><dd>{data.requestedFields.map((f) => f.label).join('، ')}</dd>
          <dt>أُنشئ</dt><dd>{formatDateTime(data.createdAt)}</dd>
          {data.status === 'PENDING' && left !== null && (<><dt>المهلة المتبقية</dt><dd aria-live="polite">{left} ثانية</dd></>)}
        </dl>
      </Card>
      <Card title="النتيجة" icon="shield">
        <SessionResult session={data} />
        {data.status === 'PENDING' && (
          <div className="row" style={{ marginTop: 'var(--sp-3)' }}>
            <span className="muted small">تتحدث الحالة تلقائياً عند قرار المواطن.</span>
            <Button variant="secondary" size="sm" loading={busy} onClick={() => void cancel()}>إلغاء الطلب</Button>
          </div>
        )}
      </Card>
      <p><Link to="/sessions">العودة إلى الجلسات</Link></p>
    </>
  );
}

function SessionResult({ session }: { session: DemoVerificationSession }) {
  switch (session.status) {
    case 'PENDING':
      return <Alert tone="info" title="بانتظار قرار المواطن">أُرسل الطلب إلى المحفظة التجريبية.</Alert>;
    case 'DEMO_ACCEPTED':
      return (
        <>
          <Alert tone="success" title="موافقة تجريبية — DEMO_ACCEPTED">
            وافق المواطن التجريبي داخل المحفظة التجريبية. لم يُجرَ أي تحقق تشفيري أو بروتوكولي، ولا تثبت هذه النتيجة هوية أحد.
          </Alert>
          <h3>القيم المشاركة (اصطناعية)</h3>
          <dl className="kv">
            {session.disclosed?.map((c) => (
              <div key={c.key} style={{ display: 'contents' }}>
                <dt>{c.label}</dt><dd>{c.value}</dd>
              </div>
            ))}
          </dl>
        </>
      );
    case 'DEMO_REJECTED':
      return <Alert tone="danger" title="رفض المواطن الطلب">لم تُشارك أي بيانات.</Alert>;
    case 'EXPIRED':
      return <Alert tone="warning" title="انتهت مهلة الطلب">لم يتخذ المواطن قراراً خلال المهلة. أنشئ طلباً جديداً إن لزم.</Alert>;
    case 'CANCELLED':
      return <Alert tone="warning" title="أُلغي الطلب">ألغت المؤسسة الطلب قبل القرار.</Alert>;
  }
}
