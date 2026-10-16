import { Link } from 'react-router-dom';
import { primaryIdentityCredential, type DemoVerificationSession } from '@iqdid/shared-types';
import { ActivityList, Alert, Card, CountdownRing, ErrorState, Icon, LoadingState, useAsync, useCountdown } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { readNotifyPref } from '../prefs.ts';
import { SERVICES, isOnboarded, isPrivacyMode, readFavorites, setPrivacyMode } from '../local.ts';
import { useLocal } from '../components/useLocal.ts';
import { cardClass } from '../components/CredentialCard.tsx';
import { CREDENTIAL_ICON, ValidityBadge } from '../components/bits.tsx';

const QUICK = [
  { href: '/cards', label: 'مستمسكاتي', icon: 'wallet' },
  { href: '/qr', label: 'QR تجريبي', icon: 'qr' },
  { href: '/requests', label: 'مشاركة البيانات', icon: 'share' },
] as const;

const ageFrom = (birth: string | undefined): number | null => {
  const t = birth ? Date.parse(birth) : NaN;
  if (Number.isNaN(t)) return null;
  const b = new Date(t), now = new Date();
  return now.getFullYear() - b.getFullYear() - (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
};

export function HomePage() {
  const wallet = useWallet();
  const pollMs = usePollMs();
  const creds = useAsync((s) => wallet.credentials({ signal: s }), [wallet]);
  const reqs = useAsync((s) => wallet.requests({ signal: s }), [wallet], { pollMs });
  const activity = useAsync((s) => wallet.activity({ signal: s }), [wallet], { pollMs });
  const favorites = useLocal(readFavorites);
  const onboarded = useLocal(isOnboarded);
  const privacy = useLocal(isPrivacyMode);
  const pending = reqs.data?.filter((r) => r.status === 'PENDING') ?? [];
  const id = primaryIdentityCredential(creds.data);
  const age = ageFrom(id?.claims.find((c) => c.key === 'birth_date')?.value);

  return (
    <>
      <section className="card" aria-labelledby="home-title">
        <div className="row row--between" style={{ alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
          <h1 id="home-title" style={{ margin: 0, fontSize: 'var(--fs-xl)' }}>أهلاً بك</h1>
          <button type="button" className="btn btn--ghost btn--sm" aria-pressed={privacy} onClick={() => setPrivacyMode(!privacy)}>
            <Icon name={privacy ? 'eye-off' : 'eye'} size={18} />وضع الخصوصية
          </button>
        </div>
        {creds.loading ? <div className="home-reserve home-reserve--summary"><LoadingState /></div> : creds.error ? <ErrorState message={describeError(creds.error)} onRetry={creds.reload} /> : (
          <div className="welcome">
            <span className={`avatar${privacy ? ' avatar--hidden' : ''}`} aria-hidden="true"><Icon name={privacy ? 'eye-off' : 'user'} size={30} /></span>
            <div style={{ minWidth: 0 }}>
              <p className="welcome__name">{privacy ? 'مُخفى (وضع الخصوصية)' : (id?.holderDisplayName ?? 'مواطن تجريبي')}</p>
              <div className="welcome__meta">
                {!privacy && age !== null && <span>{`العمر: ${age} سنة`}</span>}
                <span>محفظة تجريبية نشطة</span>
                <span className="badge badge--demo">DEMO</span>
              </div>
              <Link to="/card" className="btn btn--secondary btn--sm" style={{ marginTop: 'var(--sp-3)' }}><Icon name="card" size={18} />عرض الهوية الرقمية</Link>
            </div>
          </div>
        )}
        {!onboarded && <p style={{ margin: 'var(--sp-3) 0 0' }}><Link to="/welcome" className="small"><Icon name="sparkle" size={16} /> جولة تعريفية سريعة</Link></p>}
      </section>

      {pending.length > 0 && readNotifyPref() && (
        <Alert tone="info" title={`لديك ${pending.length} طلب مشاركة بيانات بانتظار قرارك`}>
          <Link to="/requests">عرض الطلبات</Link>
        </Alert>
      )}

      <div className="section-title"><h2>الخدمات السريعة</h2></div>
      <nav className="quick3" aria-label="الخدمات السريعة">
        {QUICK.map((q) => <Link key={q.href} to={q.href} className="quick"><span className="quick__icon"><Icon name={q.icon} /></span>{q.label}</Link>)}
      </nav>

      <div className="section-title"><h2>طلبات التحقق</h2><Link to="/requests" className="small">عرض الكل</Link></div>
      {reqs.loading ? <div className="home-reserve home-reserve--requests"><LoadingState /></div> : pending.length === 0 ? <p className="empty-inline card card--flat" style={{ margin: 0 }}>لا توجد طلبات بانتظار قرارك.</p> : (
        <ul className="item-list" aria-label="طلبات التحقق الحديثة">
          {pending.slice(0, 3).map((r) => <PendingRequest key={r.id} request={r} />)}
        </ul>
      )}

      <div className="section-title"><h2>مستمسكاتي</h2><Link to="/cards" className="small">كل المستمسكات</Link></div>
      {!creds.data ? <div className="home-reserve home-reserve--cards" aria-hidden="true" /> : (
        <ul className="mini-cards" aria-label="المستمسكات">
          {creds.data.map((c) => (
            <li key={c.id} className={`${cardClass(c)} mini-card`}>
              <span className="cred-card__icon"><Icon name={CREDENTIAL_ICON[c.type]} size={20} /></span>
              <Link to={`/credentials/${c.id}`} className="mini-card__title">{c.title}</Link>
              <ValidityBadge credential={c} />
            </li>
          ))}
        </ul>
      )}

      <div className="section-title"><h2>خدماتي المفضلة</h2><Link to="/settings#favorites" className="small">تخصيص</Link></div>
      <nav className="quick-grid" aria-label="خدماتي المفضلة">
        {favorites.map((fid) => {
          const s = SERVICES.find((x) => x.id === fid);
          return s ? <Link key={s.id} to={s.href} className="quick"><span className="quick__icon"><Icon name={s.icon} /></span>{s.label}</Link> : null;
        })}
      </nav>

      <Card title="آخر النشاطات" icon="activity" actions={<Link to="/activity">السجل الكامل</Link>}>
        {activity.loading ? <LoadingState /> : activity.error && !activity.data ? <ErrorState message={describeError(activity.error)} onRetry={activity.reload} /> : <ActivityList events={(activity.data ?? []).slice(0, 3)} />}
      </Card>
    </>
  );
}

function PendingRequest({ request: r }: { request: DemoVerificationSession }) {
  const left = useCountdown(r.expiresAt);
  const total = Math.max(1, Math.round((Date.parse(r.expiresAt) - Date.parse(r.createdAt)) / 1000));
  return (
    <li className="item" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--sp-3)' }}>
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <span className="item__icon"><Icon name="building" /></span>
        <div className="item__body">
          <strong>{r.organizationName}</strong>
          <span>{r.purpose}</span>
          <span className="item__meta">{`البيانات المطلوبة: ${r.requestedFields.map((f) => f.label).join('، ')}`}</span>
        </div>
        {left !== null && left > 0 && <CountdownRing seconds={left} total={total} size={44} />}
      </div>
      <div className="row">
        <Link className="btn btn--primary btn--sm" to={`/requests/${r.id}`}>مراجعة الطلب</Link>
        <Link className="btn btn--secondary btn--sm" to={`/requests/${r.id}?decide=reject`}>رفض الطلب</Link>
      </div>
    </li>
  );
}
