import { Link } from 'react-router-dom';
import type { DemoVerificationSession } from '@iqdid/shared-types';
import { SessionStatusBadge, formatDateTime } from '@iqdid/ui';

export function SessionTable({ sessions, caption }: { sessions: readonly DemoVerificationSession[]; caption: string }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">الرمز</th>
            <th scope="col">نوع الطلب</th>
            <th scope="col">الغرض</th>
            <th scope="col">الحالة</th>
            <th scope="col">الوقت</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td><Link to={`/sessions/${s.id}`} className="mono">{s.shortCode}</Link></td>
              <td>{s.templateId === 'AGE_OVER_18' ? 'العمر (18 فأكثر)' : 'الهوية الأساسية'}</td>
              <td>{s.purpose}</td>
              <td><SessionStatusBadge status={s.status} /></td>
              <td className="small">{formatDateTime(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
