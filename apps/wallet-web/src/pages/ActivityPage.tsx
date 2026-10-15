import { useState } from 'react';
import type { DemoActivityEvent } from '@iqdid/shared-types';
import { ActivityList, Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader, SegmentedControl, formatDate, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { usePollMs } from '../poll.ts';
import { StaleNotice } from '../components/bits.tsx';

type Filter = 'all' | 'requests' | 'accepted' | 'rejected' | 'expired';
const MATCH: Record<Filter, (e: DemoActivityEvent) => boolean> = {
  all: () => true,
  requests: (e) => e.type === 'REQUEST_CREATED',
  accepted: (e) => e.type === 'CONSENT_ACCEPTED',
  rejected: (e) => e.type === 'CONSENT_REJECTED',
  expired: (e) => e.type === 'SESSION_EXPIRED' || e.type === 'SESSION_CANCELLED',
};

export function ActivityPage() {
  const wallet = useWallet();
  const pollMs = usePollMs();
  const { data, error, loading, stale, reload } = useAsync((s) => wallet.activity({ signal: s }), [wallet], { pollMs });
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const term = q.trim();
  const events = (data ?? []).filter((e) => MATCH[filter](e) && (!term || e.summary.includes(term)));
  const days = [...new Map(events.map((e) => [formatDate(e.at), [] as DemoActivityEvent[]])).entries()];
  for (const e of events) days.find(([d]) => d === formatDate(e.at))?.[1].push(e);
  return (
    <>
      <PageHeader eyebrow="الشفافية" icon="clock" title="سجل الاستخدام" description="كل طلب وقرار يخص محفظتك التجريبية." />
      <div className="toolbar">
        <div className="search">
          <span className="search__icon"><Icon name="search" size={18} /></span>
          <label htmlFor="act-search" className="visually-hidden">بحث في السجل</label>
          <input id="act-search" className="input" type="search" placeholder="ابحث باسم المؤسسة أو الوصف" value={q} onChange={(e) => setQ(e.target.value.slice(0, 60))} />
        </div>
        <div className="chip-filter">
          <SegmentedControl label="نوع العملية" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'الكل' }, { value: 'requests', label: 'الطلبات' }, { value: 'accepted', label: 'الموافقات' }, { value: 'rejected', label: 'الرفض' }, { value: 'expired', label: 'المنتهية' }]} />
        </div>
      </div>
      {stale && <StaleNotice onRetry={reload} />}
      {loading ? <Card><LoadingState /></Card> : !data ? <Card><ErrorState message={describeError(error)} onRetry={reload} /></Card> : data.length === 0 ? (
        <Card><ActivityList events={[]} /></Card>
      ) : events.length === 0 ? (
        <EmptyState icon="filter" title="لا توجد عمليات مطابقة" description="غيّر التصفية أو كلمة البحث." />
      ) : days.map(([day, list]) => (
        <Card key={day} title={day} headingLevel={2}><ActivityList events={list} /></Card>
      ))}
    </>
  );
}
