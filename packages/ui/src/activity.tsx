import type { DemoActivityEvent } from '@iqdid/shared-types';
import { Badge } from './components.tsx';
import { ACTIVITY_LABEL, formatDateTime } from './status.tsx';

const TONE = { CONSENT_ACCEPTED: 'success', CONSENT_REJECTED: 'danger', SESSION_EXPIRED: 'warning', SESSION_CANCELLED: 'neutral', REQUEST_CREATED: 'info', DEMO_RESET: 'neutral' } as const;
const ACTOR = { CITIZEN: 'المواطن', VERIFIER: 'المؤسسة', SYSTEM: 'النظام' } as const;

export function ActivityList({ events, emptyText = 'لا توجد عمليات مسجلة بعد.' }: { events: readonly DemoActivityEvent[]; emptyText?: string }) {
  if (events.length === 0) return <p className="muted">{emptyText}</p>;
  return (
    <ul className="list" aria-label="سجل العمليات">
      {events.map((e) => (
        <li key={e.id}>
          <div className="row row--between">
            <Badge tone={TONE[e.type]}>{ACTIVITY_LABEL[e.type]}</Badge>
            <time className="small muted" dateTime={e.at}>{formatDateTime(e.at)}</time>
          </div>
          <div>{e.summary}</div>
          <div className="small muted">بواسطة: {ACTOR[e.actor]}</div>
        </li>
      ))}
    </ul>
  );
}
