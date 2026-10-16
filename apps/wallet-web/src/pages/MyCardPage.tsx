import { useState } from 'react';
import { Link } from 'react-router-dom';
import { primaryIdentityCredential } from '@iqdid/shared-types';
import { Alert, Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Switch, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { IdCard } from '../components/IdCard.tsx';
import { useLocal } from '../components/useLocal.ts';
import { isPrivacyMode } from '../local.ts';
import { useTrust } from '../trust.ts';

export function MyCardPage() {
  const wallet = useWallet();
  const trust = useTrust();
  const [reveal, setReveal] = useState(false);
  const privacy = useLocal(isPrivacyMode);
  const { data, error, loading, reload } = useAsync((s) => wallet.credentials({ signal: s }), [wallet]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={describeError(error)} onRetry={reload} />;
  const card = primaryIdentityCredential(data);
  if (!card) return <EmptyState icon="card" title="لا توجد بطاقة في المحفظة" description="أعد ضبط العرض من الإعدادات." />;
  const view = trust.describeCredential(card);
  return (
    <>
      <PageHeader eyebrow="الهوية الرقمية" icon="user" title="بطاقتي الرقمية" description="عرض مرئي لاعتماد تجريبي — ليس وثيقة رسمية." />
      <IdCard card={card} reveal={reveal && !privacy} privacy={privacy} />
      <Card variant="flat">
        {privacy ? <p className="small muted" style={{ margin: 0 }}>وضع الخصوصية مفعّل: الاسم والأرقام مخفية. يمكنك إيقافه من الرئيسية أو الإعدادات.</p> : <Switch label="إظهار رقم الوثيقة" hint="يُخفى افتراضياً لحماية الخصوصية عند عرض الشاشة." checked={reveal} onChange={setReveal} />}
      </Card>
      <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
        <Link className="btn btn--primary" to="/qr"><Icon name="qr" size={18} />عرض رمز QR التجريبي</Link>
        <Link className="btn btn--secondary" to={`/credentials/${card.id}`}><Icon name="file" size={18} />تفاصيل المستمسك</Link>
        <Link className="btn btn--ghost" to="/cards"><Icon name="wallet" size={18} />كل المستمسكات</Link>
      </div>
      {view.kind === 'DEMO_UNVERIFIED' && <div style={{ marginTop: 'var(--sp-4)' }}><Alert tone="warning" title={view.label}>{view.detail}</Alert></div>}
      <p className="small muted">الجهة المصدرة: {card.issuerName}.</p>
    </>
  );
}
