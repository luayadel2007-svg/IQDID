import { useState } from 'react';
import { Alert, Button, Card, Modal, PageHeader, useTheme } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { readNotifyPref, writeNotifyPref } from '../prefs.ts';


export function SettingsPage() {
  const wallet = useWallet();
  const { theme, setTheme } = useTheme();
  const [notify, setNotify] = useState(readNotifyPref);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const toggleNotify = (): void => {
    const next = !notify;
    setNotify(next);
    writeNotifyPref(next);
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
      <PageHeader title="الإعدادات" />
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Card title="المظهر">
        <div className="row" role="group" aria-label="اختيار المظهر">
          <Button variant={theme === 'light' ? 'primary' : 'secondary'} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>فاتح</Button>
          <Button variant={theme === 'dark' ? 'primary' : 'secondary'} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>داكن</Button>
        </div>
      </Card>
      <Card title="الإشعارات التجريبية">
        <div className="row row--between">
          <span>تنبيه داخل التطبيق عند وصول طلب جديد</span>
          <Button variant="secondary" role="switch" aria-checked={notify} onClick={toggleNotify}>{notify ? 'مفعّل' : 'معطّل'}</Button>
        </div>
        <p className="small muted">إشعارات محلية فقط؛ لا يُرسل أي إشعار خارج هذا المتصفح.</p>
      </Card>
      <Card title="العرض التجريبي">
        <p className="muted">إعادة الضبط تحذف كل الطلبات والسجل وتعيد الاعتماد الاصطناعي، وتؤثر في تطبيق المتحقق أيضاً.</p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>إعادة ضبط البيانات التجريبية</Button>
      </Card>
      <Card title="حول">
        <p className="small">نموذج تجريبي لمحفظة هوية رقمية. غير مرتبط بأي جهة حكومية. البيانات اصطناعية، ولا يجري أي تحقق تشفيري في هذه النسخة.</p>
      </Card>
      <Modal open={confirmReset} title="إعادة ضبط العرض؟" onClose={() => setConfirmReset(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirmReset(false)}>تراجع</Button><Button variant="danger" loading={busy} onClick={() => void reset()}>إعادة الضبط</Button></>}>
        <p>ستُحذف جميع الجلسات وسجلات النشاط التجريبية.</p>
      </Modal>
    </>
  );
}
