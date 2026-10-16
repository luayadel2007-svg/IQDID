import { useSearchParams } from 'react-router-dom';
import { SESSION_STATUSES } from '@iqdid/shared-types';
import { Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, Select, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useOrg, useVerifier } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { SessionTable } from '../SessionTable.tsx';
import { StaleNotice, UpdatedAt, useUpdatedAt } from '../parts.tsx';
import { SORT_LABEL, STATUS_FILTER_LABEL, TEMPLATE_LABEL, filterSessions, parseSort, parseStatus, parseTemplate, type SortKey } from '../model.ts';

export function SessionsPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const pollMs = usePollMs();
  const orgId = org.current?.id ?? '';
  const { data, error, loading, reload, stale } = useAsync((s) => (orgId ? verifier.sessions(orgId, { signal: s }) : Promise.resolve([])), [verifier, orgId], { pollMs });
  const updatedAt = useUpdatedAt(data);
  const [params, setParams] = useSearchParams();
  const filter = { q: params.get('q') ?? '', status: parseStatus(params.get('status')), template: parseTemplate(params.get('template')), sort: parseSort(params.get('sort')) };
  const set = (key: string, value: string, fallback: string): void => {
    const next = new URLSearchParams(params);
    if (value === fallback || value === '') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };
  const all = data ?? [];
  const rows = filterSessions(all, filter);
  const filtered = filter.q !== '' || filter.status !== 'ALL' || filter.template !== 'ALL';

  return (
    <>
      <PageHeader eyebrow="الجلسات" icon="folder" title="جلسات التحقق" description="كل الطلبات التي أنشأتها المؤسسة المختارة. اختيار المؤسسة تصفية تجريبية في المحاكاة، وليس صلاحيات دخول." />
      <StaleNotice stale={stale} onRetry={reload} />
      <Card>
        <div className="vf-toolbar" role="search" aria-label="بحث وتصفية الجلسات">
          <div className="field vf-toolbar__search">
            <label className="field__label" htmlFor="session-search">بحث في الجلسات</label>
            <span className="search">
              <span className="search__icon"><Icon name="search" size={18} /></span>
              <input id="session-search" className="input" type="search" placeholder="الرمز أو الغرض" value={filter.q} onChange={(e) => set('q', e.target.value, '')} />
            </span>
          </div>
          <Select label="الحالة" value={filter.status} onChange={(e) => set('status', e.target.value, 'ALL')} options={[{ value: 'ALL', label: 'كل الحالات' }, ...SESSION_STATUSES.map((s) => ({ value: s, label: STATUS_FILTER_LABEL[s] }))]} />
          <Select label="نوع الطلب" value={filter.template} onChange={(e) => set('template', e.target.value, 'ALL')} options={[{ value: 'ALL', label: 'كل الأنواع' }, { value: 'AGE_OVER_18', label: TEMPLATE_LABEL.AGE_OVER_18 }, { value: 'IDENTITY_BASIC', label: TEMPLATE_LABEL.IDENTITY_BASIC }]} />
          <Select label="الترتيب" value={filter.sort} onChange={(e) => set('sort', e.target.value, 'newest')} options={(Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({ value: k, label: SORT_LABEL[k] }))} />
        </div>
        <div className="vf-toolbar__meta">
          <p className="small muted" role="status" aria-live="polite" style={{ margin: 0 }}>{loading ? '' : `عرض ${rows.length} من ${all.length} جلسة`}</p>
          <span className="row" style={{ gap: 'var(--sp-3)' }}>
            {filtered && <button type="button" className="btn btn--ghost btn--sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>مسح التصفية</button>}
            <UpdatedAt at={updatedAt} />
          </span>
        </div>
        {loading || org.loading ? <LoadingState /> : error && !data ? <ErrorState message={describeError(error)} onRetry={reload} /> : all.length === 0 ? (
          <EmptyState title="لا توجد جلسات" description="أنشئ طلب تحقق تجريبياً ليظهر هنا." />
        ) : rows.length === 0 ? (
          <EmptyState icon="search" title="لا توجد جلسات مطابقة" description="غيّر البحث أو التصفية." />
        ) : <SessionTable sessions={rows} caption="جلسات التحقق" />}
      </Card>
    </>
  );
}
