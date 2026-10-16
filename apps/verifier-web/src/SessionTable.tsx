import { Link } from 'react-router-dom';
import type { DemoVerificationSession } from '@iqdid/shared-types';
import { SessionStatusBadge, formatDateTime } from '@iqdid/ui';
import { TEMPLATE_LABEL } from './model.ts';

/** Wide session table. The wrapper scrolls on narrow screens and is keyboard-focusable. */
export function SessionTable({ sessions, caption, timeColumn = 'created', compact = false }: { sessions: readonly DemoVerificationSession[]; caption: string; timeColumn?: 'created' | 'decided'; compact?: boolean }) {
  return (
    // A scrollable region must be keyboard-reachable (WCAG 2.1.1, axe scrollable-region-focusable).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className="table-wrap vf-table-wrap" role="region" aria-label={caption} tabIndex={0}>
      <table className="table vf-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">الرمز</th>
            {!compact && <th scope="col">نوع الطلب</th>}
            <th scope="col">الغرض</th>
            <th scope="col">الحالة</th>
            <th scope="col">{timeColumn === 'decided' ? 'أُغلقت' : 'أُنشئت'}</th>
            {!compact && <th scope="col">{timeColumn === 'decided' ? 'أُنشئت' : 'تنتهي'}</th>}
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td><Link to={`/sessions/${s.id}`} className="mono vf-code" aria-label={`فتح الجلسة ${s.shortCode}`}>{s.shortCode}</Link></td>
              {!compact && <td className="vf-nowrap">{TEMPLATE_LABEL[s.templateId]}</td>}
              <td className="vf-table__purpose">{s.purpose}</td>
              <td><SessionStatusBadge status={s.status} /></td>
              <td className="small vf-nowrap">{formatDateTime(timeColumn === 'decided' ? (s.decidedAt ?? s.expiresAt) : s.createdAt)}</td>
              {!compact && <td className="small vf-nowrap">{formatDateTime(timeColumn === 'decided' ? s.createdAt : s.expiresAt)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
