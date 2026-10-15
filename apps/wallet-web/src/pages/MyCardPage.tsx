import { useState } from 'react';
import { Link } from 'react-router-dom';
import { primaryIdentityCredential } from '@iqdid/shared-types';
import { Alert, Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Switch, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { IdCard } from '../components/IdCard.tsx';
import { useTrust } from '../trust.ts';

export function MyCardPage() {
  const wallet = useWallet();
  const trust = useTrust();
  const [reveal, setReveal] = useState(false);
  const { data, error, loading, reload } = useAsync((s) => wallet.credentials({ signal: s }), [wallet]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={describeError(error)} onRetry={reload} />;
  const card = primaryIdentityCredential(data);
  if (!card) return <EmptyState icon="card" title="لا توجد بطاقة في المحفظة" description="أعد ضبط العرض من الإعدادات." />;
  const view = trust.describeCredential(card);
  return (
    <>
      <PageHeader eyebrow="الهوية الرقمية" icon="user" title="بطاقتي الرقمية" description="عرض مرئي لاعتماد تجريبي — ليس وثيقة رسمية." />
      <IdCard card={card} reveal={reveal} />
      <Card variant="flat">
        <Switch label="إظهار رقم الوثيقة" hint="يُخفى افتراضياً لحماية الخصوصية عند عرض الشاشة." checked={reveal} onChange={setReveal} />
      </Card>
      <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
        <Link className="btn btn--primary" to="/qr"><Icon name="qr" size={18} />عرض رمز QR التجريبي</Link>
        <Link className="btn btn--secondary" to={`/credentials/${card.id}`}><Icon name="file" size={18} />تفاصيل الاعتماد</Link>
        <Link className="btn btn--ghost" to="/credentials"><Icon name="folder" size={18} />كل الاعتمادات</Link>
      </div>
      {view.kind === 'DEMO_UNVERIFIED' && <div style={{ marginTop: 'var(--sp-4)' }}><Alert tone="warning" title={view.label}>{view.detail}</Alert></div>}
      <p className="small muted">الجهة المصدرة: {card.issuerName}.</p>
    </>
  );
}
