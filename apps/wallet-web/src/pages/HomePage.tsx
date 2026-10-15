import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { primaryIdentityCredential } from '@iqdid/shared-types';
import { ActivityList, Alert, Card, CredentialStatusBadge, ErrorState, Icon, LoadingState, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { readNotifyPref } from '../prefs.ts';
import { LOCAL_EVENT, SERVICES, isOnboarded, readFavorites } from '../local.ts';
import { IdCard } from '../components/IdCard.tsx';

function useLocal<T>(read: () => T): T {
  const [v, setV] = useState(read);
  useEffect(() => {
    const sync = () => setV(read());
    window.addEventListener(LOCAL_EVENT, sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener(LOCAL_EVENT, sync); window.removeEventListener('storage', sync); };
  }, [read]);
  return v;
}

export function HomePage() {
  const wallet = useWallet();
  const pollMs = usePollMs();
  const creds = useAsync((s) => wallet.credentials({ signal: s }), [wallet]);
  const reqs = useAsync((s) => wallet.requests({ signal: s }), [wallet], { pollMs });
  const activity = useAsync((s) => wallet.activity({ signal: s }), [wallet], { pollMs });
  const favorites = useLocal(readFavorites);
  const onboarded = useLocal(isOnboarded);
  const pending = reqs.data?.filter((r) => r.status === 'PENDING') ?? [];
  const card = primaryIdentityCredential(creds.data);

  return (
    <>
      <section className="hero" aria-labelledby="home-title">
        <div className="row row--between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 id="home-title">أهلاً بك</h1>
            <p>محفظة هوية رقمية تجريبية للمواطن الاصطناعي TEST-001.</p>
          </div>
          <span className="badge badge--warning" style={{ background: 'rgb(255 255 255 / 92%)', color: '#6b4100' }}>DEMO</span>
        </div>
        {!onboarded && (
          <div className="row" style={{ marginTop: 'var(--sp-4)' }}>
            <Link className="btn btn--secondary btn--sm" to="/welcome"><Icon name="sparkle" size={18} />جولة تعريفية سريعة</Link>
          </div>
        )}
      </section>

      {pending.length > 0 && readNotifyPref() && (
        <Alert tone="info" title={`لديك ${pending.length} طلب مشاركة بيانات بانتظار قرارك`}>
          <Link to="/requests">عرض الطلبات</Link>
        </Alert>
      )}

      <div className="section-title"><h2>خدماتي المفضلة</h2><Link to="/settings#favorites" className="small">تخصيص</Link></div>
      <nav className="quick-grid" aria-label="خدماتي المفضلة">
        {favorites.map((id) => {
          const s = SERVICES.find((x) => x.id === id);
          return s ? <Link key={s.id} to={s.href} className="quick"><span className="quick__icon"><Icon name={s.icon} /></span>{s.label}</Link> : null;
        })}
      </nav>

      <div className="section-title"><h2>بطاقتي الرقمية</h2><Link to="/card" className="small">عرض البطاقة</Link></div>
      {card && <IdCard card={card} reveal={false} mini />}

      <Card title="اعتماداتي" icon="folder" actions={<Link to="/credentials">كل الاعتمادات</Link>}>
        {creds.loading ? <LoadingState /> : creds.error ? <ErrorState message={describeError(creds.error)} onRetry={creds.reload} /> : (
          <ul className="list">
            {creds.data?.map((c) => (
              <li key={c.id} className="row row--between">
                <Link to={`/credentials/${c.id}`}>{c.title}</Link>
                <CredentialStatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="آخر النشاطات" icon="clock" actions={<Link to="/activity">السجل الكامل</Link>}>
        {activity.loading ? <LoadingState /> : activity.error && !activity.data ? <ErrorState message={describeError(activity.error)} onRetry={activity.reload} /> : <ActivityList events={(activity.data ?? []).slice(0, 3)} />}
      </Card>
    </>
  );
}
