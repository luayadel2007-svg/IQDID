import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, Icon, LoadingState, PageHeader, SegmentedControl, formatDate, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { CREDENTIAL_ICON, CREDENTIAL_KIND, ValidityBadge, validityOf, type Validity } from '../components/bits.tsx';

type Filter = 'all' | 'active' | 'attention';
const ATTENTION: readonly Validity[] = ['EXPIRING', 'EXPIRED', 'SUSPENDED', 'REVOKED'];

export function CredentialsPage() {
  return (
    <>
      <PageHeader eyebrow="المحفظة" icon="folder" title="اعتماداتي" description="كل الاعتمادات الاصطناعية في محفظتك التجريبية." />
      <CredentialsBrowser />
    </>
  );
}

/** Searchable, filterable list of credentials (list view of «بطاقاتي» and the /credentials page). */
export function CredentialsBrowser() {
  const wallet = useWallet();
  const { data, error, loading, reload } = useAsync((s) => wallet.credentials({ signal: s }), [wallet]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const term = q.trim();
  const list = (data ?? []).filter((c) => {
    const v = validityOf(c);
    if (filter === 'active' && v !== 'ACTIVE') return false;
    if (filter === 'attention' && !ATTENTION.includes(v)) return false;
    return !term || c.title.includes(term) || c.issuerName.includes(term) || CREDENTIAL_KIND[c.type].includes(term);
  });
  return (
    <>
      <div className="toolbar">
        <div className="search">
          <span className="search__icon"><Icon name="search" size={18} /></span>
          <label htmlFor="cred-search" className="visually-hidden">بحث في الاعتمادات</label>
          <input id="cred-search" className="input" type="search" placeholder="ابحث بالاسم أو الجهة المصدرة" value={q} onChange={(e) => setQ(e.target.value.slice(0, 60))} />
        </div>
        <SegmentedControl label="تصفية حسب الحالة" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'الكل' }, { value: 'active', label: 'فعالة' }, { value: 'attention', label: 'تحتاج انتباهاً' }]} />
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState message={describeError(error)} onRetry={reload} /> : list.length === 0 ? (
        <EmptyState icon="search" title="لا توجد نتائج" description={term ? `لا يوجد اعتماد يطابق «${term}».` : 'لا توجد اعتمادات بهذه الحالة.'} />
      ) : (
        <ul className="item-list" aria-label="قائمة الاعتمادات">
          {list.map((c) => (
            <li key={c.id} className="item item--link">
              <span className="item__icon"><Icon name={CREDENTIAL_ICON[c.type]} /></span>
              <div className="item__body">
                <Link className="item__title" to={`/credentials/${c.id}`}>{c.title}</Link>
                <span className="item__meta">{c.issuerName} · تنتهي {formatDate(c.expiresAt)}</span>
              </div>
              <div className="item__end"><ValidityBadge credential={c} /></div>
            </li>
          ))}
        </ul>
      )}
      <p className="small muted" style={{ marginTop: 'var(--sp-4)' }}>{data ? `${list.length} من ${data.length} اعتمادات` : ''}</p>
    </>
  );
}
