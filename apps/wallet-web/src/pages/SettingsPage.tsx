import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Icon, Modal, PageHeader, AppearanceSettings, Switch } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { readNotifyPref, writeNotifyPref } from '../prefs.ts';
import { MAX_FAVORITES, SERVICES, readFavorites, setOnboarded, writeFavorites, type ServiceId } from '../local.ts';

export function SettingsPage() {
  const wallet = useWallet();
  const [notify, setNotify] = useState(readNotifyPref);
  const [favorites, setFavorites] = useState(readFavorites);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const toggleFavorite = (id: ServiceId, on: boolean): void => {
    const next = on ? [...favorites, id] : favorites.filter((f) => f !== id);
    if (next.length > MAX_FAVORITES) return;
    setFavorites(next);
    writeFavorites(next);
  };

  const reset = async (): Promise<void> => {
    setBusy(true);
    try {
      await wallet.resetDemo();
      setMessage({ tone: 'success', text: 'أُعيدت البيانات التجريبية إلى حالتها الأولية في التطبيقين.' });
    } catch (e) {
      setMessage({ tone: 'danger', text: describeError(e) });
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="التفضيلات" icon="settings" title="الإعدادات" />
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <AppearanceSettings />
      <Card title="الإشعارات التجريبية" icon="bell">
        <Switch label="تنبيه داخل التطبيق عند وصول طلب جديد" hint="إشعارات محلية فقط؛ لا يُرسل أي إشعار خارج هذا المتصفح." checked={notify} onChange={(on) => { setNotify(on); writeNotifyPref(on); }} />
        <Link to="/notifications" className="small">فتح مركز الإشعارات</Link>
      </Card>
      <section id="favorites" className="card" aria-labelledby="fav-title">
        <div className="card__head"><h2 className="card__title" id="fav-title"><span className="card__icon"><Icon name="star" size={20} /></span>خدماتي المفضلة</h2><span className="small muted">{`${favorites.length} من ${MAX_FAVORITES}`}</span></div>
        <fieldset className="choice" style={{ marginBottom: 0 }}>
          <legend className="visually-hidden">اختر حتى {MAX_FAVORITES} خدمات تظهر في الصفحة الرئيسية</legend>
          {SERVICES.map((s) => {
            const on = favorites.includes(s.id);
            return (
              <label key={s.id} style={{ flexBasis: 150, alignItems: 'center' }}>
                <input type="checkbox" checked={on} disabled={!on && favorites.length >= MAX_FAVORITES} onChange={(e) => toggleFavorite(s.id, e.target.checked)} />
                <Icon name={s.icon} size={20} />{s.label}
              </label>
            );
          })}
        </fieldset>
      </section>
      <Card title="العرض التجريبي" icon="refresh">
        <p className="muted">إعادة الضبط تحذف كل الطلبات والسجل وتعيد الاعتمادات الاصطناعية، وتؤثر في تطبيق المتحقق أيضاً.</p>
        <div className="row">
          <Button variant="danger" onClick={() => setConfirmReset(true)}>إعادة ضبط البيانات التجريبية</Button>
          <Link className="btn btn--secondary" to="/welcome" onClick={() => setOnboarded(false)}>إعادة الجولة التعريفية</Link>
        </div>
      </Card>
      <Card title="حول" icon="info">
        <p className="small">نموذج تجريبي لمحفظة هوية رقمية. غير مرتبط بأي جهة حكومية. البيانات اصطناعية، ولا يجري أي تحقق تشفيري في هذه النسخة.</p>
        <Link to="/help">المساعدة وحول التطبيق</Link>
      </Card>
      <Modal open={confirmReset} title="إعادة ضبط العرض؟" onClose={() => setConfirmReset(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirmReset(false)}>تراجع</Button><Button variant="danger" loading={busy} onClick={() => void reset()}>إعادة الضبط</Button></>}>
        <p>ستُحذف جميع الجلسات وسجلات النشاط التجريبية.</p>
      </Modal>
    </>
  );
}
