import { useState } from 'react';
import { Alert, Button, Card, Modal, PageHeader, Select, AppearanceSettings } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useOrg, useVerifier } from '../gateway.tsx';

export function SettingsPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const reset = async (): Promise<void> => {
    setBusy(true);
    try {
      await verifier.resetDemo();
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
      <Card title="المؤسسة التجريبية">
        <Select label="المؤسسة الحالية" value={org.current?.id ?? ''} onChange={(e) => org.select(e.target.value)} options={org.organizations.map((o) => ({ value: o.id, label: o.name }))} />
      </Card>
      <AppearanceSettings />
      <Card title="العرض التجريبي">
        <p className="muted">تحذف إعادة الضبط كل الجلسات والسجل في التطبيقين.</p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>إعادة ضبط البيانات التجريبية</Button>
      </Card>
      <Modal open={confirmReset} title="إعادة ضبط العرض؟" onClose={() => setConfirmReset(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirmReset(false)}>تراجع</Button><Button variant="danger" loading={busy} onClick={() => void reset()}>إعادة الضبط</Button></>}>
        <p>ستُحذف جميع الجلسات وسجلات النشاط التجريبية.</p>
      </Modal>
    </>
  );
}
