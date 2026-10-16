import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, formatDateTime, type IconName, type Tone } from '@iqdid/ui';

/** Shown when a refresh failed but the last good data is still on screen (weak or lost connection). */
export function StaleNotice({ stale, onRetry }: { stale: boolean; onRetry: () => void }) {
  if (!stale) return null;
  return (
    <div className="stale-bar" role="status">
      <Icon name="wifi-off" size={18} />
      تعذر تحديث البيانات من خادم المحاكاة.
      <span>تُعرض آخر بيانات وصلت بنجاح.</span>
      <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry} style={{ marginInlineStart: 'auto' }}>إعادة المحاولة</button>
    </div>
  );
}

/** Client time of the last successful load — measured, never a server claim. */
export function useUpdatedAt(data: unknown): string | null {
  const [at, setAt] = useState<string | null>(null);
  useEffect(() => { if (data !== undefined) setAt(new Date().toISOString()); }, [data]);
  return at;
}

export function UpdatedAt({ at }: { at: string | null }) {
  return at ? <span className="small muted">آخر تحديث: <time dateTime={at}>{formatDateTime(at)}</time></span> : null;
}

/** Dashboard metric that opens the matching filtered list. */
export function KpiLink({ to, label, value, icon, tone, hint }: { to: string; label: string; value: number | string; icon: IconName; tone: Tone; hint: string }) {
  return (
    <Link to={to} className={`vf-kpi vf-kpi--${tone}`}>
      <span className="vf-kpi__top">
        <span className="vf-kpi__label">{label}</span>
        <span className="vf-kpi__icon"><Icon name={icon} size={20} /></span>
      </span>
      <span className="vf-kpi__value">{value}</span>
      <span className="vf-kpi__hint">{hint}</span>
    </Link>
  );
}

export function Steps({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="vf-steps" aria-label="مراحل إنشاء الطلب">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? 'step' : undefined} data-done={i < current || undefined}>
          <span className="vf-steps__n" aria-hidden="true">{i < current ? <Icon name="check" size={16} /> : i + 1}</span>
          <span>{s}{i < current && <span className="visually-hidden"> (مكتملة)</span>}</span>
        </li>
      ))}
    </ol>
  );
}
