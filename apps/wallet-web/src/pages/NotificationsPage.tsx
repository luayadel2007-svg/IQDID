import { Link } from 'react-router-dom';
import { Alert, Badge, Button, EmptyState, Icon, PageHeader, formatDateTime } from '@iqdid/ui';
import { useFeed } from '../feed.tsx';
import { readNotifyPref } from '../prefs.ts';

export function NotificationsPage() {
  const { notifications, readIds, unread, markRead } = useFeed();
  const enabled = readNotifyPref();
  return (
    <>
      <PageHeader eyebrow="تنبيهات تجريبية" icon="bell" title="الإشعارات" description="تنبيهات داخل التطبيق فقط، مشتقة من سجل محفظتك. لا يُرسل أي إشعار خارج هذا المتصفح."
        actions={unread > 0 ? <Button variant="secondary" size="sm" onClick={() => markRead(notifications.map((n) => n.id))}><Icon name="check" size={18} />تعليم الكل كمقروء</Button> : undefined} />
      {!enabled && <Alert tone="info" title="التنبيهات على الصفحة الرئيسية معطلة">يمكنك تفعيلها من <Link to="/settings">الإعدادات</Link>. تبقى القائمة هنا متاحة دائماً.</Alert>}
      {notifications.length === 0 ? <EmptyState icon="bell" title="لا توجد إشعارات" description="ستظهر هنا الطلبات الجديدة وانتهاء المهلات وقراراتك." /> : (
        <ul className="item-list" aria-label="قائمة الإشعارات">
          {notifications.map((n) => {
            const isNew = !readIds.has(n.id);
            return (
              <li key={n.id} className={`item${isNew ? ' item--unread' : ''}`}>
                <span className="item__icon"><Icon name={n.icon} /></span>
                <div className="item__body">
                  <strong>{n.title}{isNew && <span className="visually-hidden"> (جديد)</span>}</strong>
                  <span>{n.body}</span>
                  <time className="item__meta" dateTime={n.at}>{formatDateTime(n.at)}</time>
                </div>
                <div className="item__end">
                  {isNew && <Badge tone="info">جديد</Badge>}
                  {n.href ? <Link className="btn btn--ghost btn--sm" to={n.href} onClick={() => markRead([n.id])}>فتح</Link>
                    : isNew && <Button variant="ghost" size="sm" onClick={() => markRead([n.id])}>تعليم كمقروء</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
