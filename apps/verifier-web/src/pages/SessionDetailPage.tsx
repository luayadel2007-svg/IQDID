import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, CountdownRing, ErrorState, Icon, LoadingState, Modal, PageHeader, SessionStatusBadge, formatDateTime, useAsync, useCountdown } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import type { DemoVerificationSession } from '@iqdid/shared-types';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { StaleNotice } from '../parts.tsx';
import { TrustLayers } from '../trust.tsx';
import { TEMPLATE_LABEL, recordedDecision, ttlSeconds } from '../model.ts';

export function SessionDetailPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const { data, error, loading, reload, stale } = useAsync(
    (s) => (orgId ? verifier.session(id, orgId, { signal: s }) : Promise.reject(new Error('no organisation'))),
    [verifier, id, orgId],
    { pollMs },
  );
  const left = useCountdown(data?.status === 'PENDING' ? data.expiresAt : null);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
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
      setConfirmCancel(false);
      reload();
    }
  };

  if (loading || org.loading) return <LoadingState />;
  if (error && !data) return <ErrorState message={describeError(error)} onRetry={reload} />;
  if (!data) return <ErrorState message="تعذر عرض الجلسة." onRetry={reload} />;

  return (
    <>
      <PageHeader eyebrow="تفاصيل الجلسة" icon="file" title={`جلسة ${data.shortCode}`} description={data.organizationName} actions={<SessionStatusBadge status={data.status} />} />
      <StaleNotice stale={stale} onRetry={reload} />
      {params.get('created') === '1' && data.status === 'PENDING' && (
        <Alert tone="info" title="أُنشئ الطلب">شارك رمز الجلسة مع المواطن التجريبي إن لم يظهر الطلب في محفظته تلقائياً.</Alert>
      )}
      {actionError && <Alert tone="danger">{actionError}</Alert>}
      <div className="vf-split vf-split--detail">
        <div className="vf-stack">
          <Card title="النتيجة" icon="shield">
            <SessionResult session={data} />
            {data.status === 'PENDING' && (
              <div className="row" style={{ marginTop: 'var(--sp-3)' }}>
                <span className="muted small">تتحدث الحالة تلقائياً عند قرار المواطن.</span>
                <Button variant="secondary" size="sm" loading={busy} onClick={() => setConfirmCancel(true)}>إلغاء الطلب</Button>
              </div>
            )}
          </Card>
          <Card title="تفاصيل الطلب" icon="list">
            <dl className="kv">
              <dt>رقم الجلسة</dt><dd><span className="mono vf-id">{data.id}</span></dd>
              <dt>المؤسسة الطالبة</dt><dd>{data.organizationName}</dd>
              <dt>الغرض</dt><dd>{data.purpose}</dd>
              <dt>نوع الطلب</dt><dd>{TEMPLATE_LABEL[data.templateId]}</dd>
              <dt>البيانات المطلوبة</dt><dd>{data.requestedFields.map((f) => f.label).join('، ')}</dd>
              <dt>المواطن</dt><dd><span className="mono">{data.holderRef}</span> (اصطناعي)</dd>
              <dt>أُنشئ</dt><dd>{formatDateTime(data.createdAt)}</dd>
              <dt>ينتهي</dt><dd>{formatDateTime(data.expiresAt)} <span className="small muted">({ttlSeconds(data)} ثانية)</span></dd>
              <dt>القرار المسجل</dt><dd>{recordedDecision(data)}{data.decidedAt && data.status !== 'EXPIRED' ? ` — ${formatDateTime(data.decidedAt)}` : ''}</dd>
            </dl>
          </Card>
          <Card title="الخط الزمني" icon="clock">
            <Timeline session={data} />
          </Card>
        </div>
        <div className="vf-stack">
          <Card title="رمز الجلسة" icon="qr" variant="accent">
            <p className="vf-bigcode mono" aria-label={`رمز الجلسة ${data.shortCode.split('').join(' ')}`}>{data.shortCode}</p>
            <p className="small muted" style={{ margin: 0 }}>يظهر الطلب تلقائياً في المحفظة التجريبية للمواطن <span className="mono">{data.holderRef}</span>، ويمكن فتحه أيضاً بإدخال هذا الرمز في شاشة «QR تجريبي» في المحفظة.</p>
            {data.status === 'PENDING' && left !== null && left > 0 && (
              <div className="row" style={{ marginTop: 'var(--sp-3)' }}>
                <CountdownRing seconds={left} total={ttlSeconds(data)} size={56} />
                <span><span className="small muted">المهلة المتبقية</span><br /><strong>{left} ثانية</strong></span>
              </div>
            )}
          </Card>
          <Card title="طبقات الحالة والثقة" icon="lock">
            <TrustLayers session={data} connection={stale ? 'stale' : 'ok'} />
          </Card>
        </div>
      </div>
      <p><Link to="/sessions"><Icon name="chevron" size={16} />العودة إلى الجلسات</Link></p>
      <Modal open={confirmCancel} title="إلغاء الطلب؟" onClose={() => setConfirmCancel(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirmCancel(false)}>تراجع</Button><Button variant="danger" loading={busy} onClick={() => void cancel()}>تأكيد الإلغاء</Button></>}>
        <p>سيُغلق الطلب ولن يتمكن المواطن من الرد عليه. لا يمكن التراجع عن الإلغاء.</p>
      </Modal>
    </>
  );
}

function Timeline({ session: s }: { session: DemoVerificationSession }) {
  const items: Array<{ at: string; text: string }> = [{ at: s.createdAt, text: 'أنشأت المؤسسة الطلب وأُرسل إلى المحفظة التجريبية' }];
  if (s.status === 'DEMO_ACCEPTED' && s.decidedAt) items.push({ at: s.decidedAt, text: 'وافق المواطن التجريبي (موافقة تجريبية)' });
  if (s.status === 'DEMO_REJECTED' && s.decidedAt) items.push({ at: s.decidedAt, text: 'رفض المواطن التجريبي الطلب' });
  if (s.status === 'CANCELLED' && s.decidedAt) items.push({ at: s.decidedAt, text: 'ألغت المؤسسة الطلب' });
  if (s.status === 'EXPIRED') items.push({ at: s.expiresAt, text: 'انتهت المهلة دون قرار' });
  return (
    <ol className="vf-timeline">
      {items.map((i) => <li key={i.text}><time dateTime={i.at} className="small muted">{formatDateTime(i.at)}</time><span>{i.text}</span></li>)}
      {s.status === 'PENDING' && <li data-pending=""><span className="small muted">التالي</span><span>بانتظار قرار المواطن</span></li>}
    </ol>
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
          <p className="small muted">هذه هي الحقول المطلوبة فقط. أي بيانات أخرى في محفظة المواطن لا تصل إلى المؤسسة.</p>
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
