import { useParams } from 'react-router-dom';
import { Alert, Card, CredentialStatusBadge, ErrorState, LoadingState, PageHeader, formatDateTime, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';

export function CredentialDetailPage() {
  const { id = '' } = useParams();
  const wallet = useWallet();
  const { data, error, loading, reload } = useAsync((s) => wallet.credential(id, { signal: s }), [wallet, id]);
  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={describeError(error)} onRetry={reload} />;
  return (
    <>
      <PageHeader title="تفاصيل الاعتماد" description={data.title} />
      <Alert tone="warning" title="اعتماد اصطناعي">قيم هذا الاعتماد مولدة للعرض فقط ولا تخص أي شخص حقيقي، ولم تصدر عن أي جهة رسمية.</Alert>
      <Card title="الحالة والصلاحية" actions={<CredentialStatusBadge status={data.status} />}>
        <dl className="kv">
          <dt>الجهة المصدرة</dt><dd>{data.issuerName}</dd>
          <dt>تاريخ الإصدار</dt><dd>{formatDateTime(data.issuedAt)}</dd>
          <dt>تاريخ الانتهاء</dt><dd>{formatDateTime(data.expiresAt)}</dd>
          <dt>النوع</dt><dd><span className="mono">{data.type}</span></dd>
        </dl>
      </Card>
      <Card title="البيانات المضمنة">
        <dl className="kv">
          {data.claims.map((c) => (
            <div key={c.key} style={{ display: 'contents' }}>
              <dt>{c.label}</dt><dd>{c.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
