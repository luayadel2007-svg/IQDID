import { Link } from 'react-router-dom';
import { CredentialStatusBadge, EmptyState, ErrorState, LoadingState, PageHeader, formatDate, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';

export function MyCardPage() {
  const wallet = useWallet();
  const { data, error, loading, reload } = useAsync((s) => wallet.credentials({ signal: s }), [wallet]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={describeError(error)} onRetry={reload} />;
  const card = data?.[0];
  if (!card) return <EmptyState icon="card" title="لا توجد بطاقة في المحفظة" description="أعد ضبط العرض من الإعدادات." />;
  const claim = (k: string) => card.claims.find((c) => c.key === k)?.value ?? '—';
  return (
    <>
      <PageHeader title="بطاقتي الرقمية" description="عرض مرئي لاعتماد تجريبي — ليس وثيقة رسمية." />
      <article className="id-card" aria-label="بطاقة الهوية الرقمية التجريبية">
        <div className="row row--between">
          <strong>{card.title}</strong>
          <CredentialStatusBadge status={card.status} />
        </div>
        <dl>
          <dt>الاسم</dt><dd>{claim('full_name')}</dd>
          <dt>المرجع</dt><dd><span className="mono">{card.holderRef}</span></dd>
          <dt>رقم الوثيقة</dt><dd><span className="mono">{claim('document_number')}</span></dd>
          <dt>تنتهي في</dt><dd>{formatDate(card.expiresAt)}</dd>
        </dl>
        <span className="id-card__watermark" aria-hidden="true">TEST</span>
      </article>
      <p className="small muted" style={{ marginTop: 'var(--sp-4)' }}>
        الجهة المصدرة: {card.issuerName}. <Link to={`/credentials/${card.id}`}>تفاصيل الاعتماد</Link>
      </p>
    </>
  );
}
