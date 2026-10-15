import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Card, ErrorState, LoadingState, PageHeader, Switch, formatDateTime, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { ValidityBadge, daysLeft, validityOf } from '../components/bits.tsx';
import { useTrust } from '../trust.ts';

const SENSITIVE = /number|ref|document/;

export function CredentialDetailPage() {
  const { id = '' } = useParams();
  const wallet = useWallet();
  const trust = useTrust();
  const [reveal, setReveal] = useState(false);
  const { data, error, loading, reload } = useAsync((s) => wallet.credential(id, { signal: s }), [wallet, id]);
  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={describeError(error)} onRetry={reload} />;
  const total = Math.max(1, Date.parse(data.expiresAt) - Date.parse(data.issuedAt));
  const ratio = Math.max(0, Math.min(1, (Date.parse(data.expiresAt) - Date.now()) / total));
  const v = validityOf(data);
  const view = trust.describeCredential(data);
  return (
    <>
      <PageHeader eyebrow="اعتماد" icon="file" title="تفاصيل الاعتماد" description={data.title} />
      <Alert tone="warning" title="اعتماد اصطناعي">قيم هذا الاعتماد مولدة للعرض فقط ولا تخص أي شخص حقيقي، ولم تصدر عن أي جهة رسمية.</Alert>
      {data.status !== 'ACTIVE' && <Alert tone="danger" title="لا يمكن استخدام هذا الاعتماد">{data.status === 'SUSPENDED' ? 'الاعتماد موقوف من الجهة المصدرة التجريبية.' : 'الاعتماد ملغى.'}</Alert>}
      <Card title="الحالة والصلاحية" icon="shield" actions={<ValidityBadge credential={data} />}>
        <dl className="kv">
          <dt>الجهة المصدرة</dt><dd>{data.issuerName}</dd>
          <dt>تاريخ الإصدار</dt><dd>{formatDateTime(data.issuedAt)}</dd>
          <dt>تاريخ الانتهاء</dt><dd>{formatDateTime(data.expiresAt)}</dd>
          <dt>النوع</dt><dd><span className="mono">{data.type}</span></dd>
          <dt>الأيام المتبقية</dt><dd>{Math.max(0, daysLeft(data.expiresAt))}</dd>
        </dl>
        <div className={`meter${v === 'EXPIRING' ? ' meter--warning' : v === 'ACTIVE' ? '' : ' meter--danger'}`} style={{ marginTop: 'var(--sp-4)' }} role="img" aria-label={`الصلاحية المتبقية ${Math.round(ratio * 100)}٪`}>
          <i style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
      </Card>
      <Card title="البيانات المضمنة" icon="list">
        <dl className="kv">
          {data.claims.map((c) => (
            <div key={c.key} style={{ display: 'contents' }}>
              <dt>{c.label}</dt><dd>{SENSITIVE.test(c.key) && !reveal ? '••••••' : c.value}</dd>
            </div>
          ))}
        </dl>
        <Switch label="إظهار القيم الحساسة" checked={reveal} onChange={setReveal} />
      </Card>
      <Card title="الثقة والتحقق" icon="lock" variant="flat">
        <p style={{ margin: 0 }}><strong>{view.kind === 'DEMO_UNVERIFIED' ? view.label : 'تحقق بروتوكولي'}</strong></p>
        {view.kind === 'DEMO_UNVERIFIED' && <p className="small muted" style={{ margin: 0 }}>{view.detail}</p>}
      </Card>
      <p style={{ marginTop: 'var(--sp-4)' }}><Link to="/credentials">العودة إلى الاعتمادات</Link></p>
    </>
  );
}
