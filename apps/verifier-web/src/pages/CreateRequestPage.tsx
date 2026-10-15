import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PURPOSE_MAX_LENGTH, type DemoRequestTemplate } from '@iqdid/shared-types';
import { Alert, Button, Card, ErrorState, LoadingState, PageHeader, TextArea, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useOrg, useVerifier } from '../gateway.tsx';

export function CreateRequestPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const navigate = useNavigate();
  const templates = useAsync((s) => verifier.templates({ signal: s }), [verifier]);
  const [templateId, setTemplateId] = useState<DemoRequestTemplate['id']>(() => { try { return sessionStorage.getItem('iqdid-demo-template') === 'IDENTITY_BASIC' ? 'IDENTITY_BASIC' : 'AGE_OVER_18'; } catch { return 'AGE_OVER_18'; } });
  const [purpose, setPurpose] = useState('');
  const [purposeError, setPurposeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const p = purpose.trim();
    if (p.length < 3) {
      setPurposeError('اكتب غرضاً واضحاً (3 أحرف على الأقل).');
      return;
    }
    if (!org.current) return;
    setPurposeError(null);
    setSubmitError(null);
    setBusy(true);
    try {
      const session = await verifier.createSession({ organizationId: org.current.id, templateId, purpose: p });
      void navigate(`/sessions/${session.id}`);
    } catch (err) {
      setSubmitError(describeError(err));
      setBusy(false);
    }
  };

  if (templates.loading || org.loading) return <LoadingState />;
  if (templates.error) return <ErrorState message={describeError(templates.error)} onRetry={templates.reload} />;
  const selected = templates.data?.find((t) => t.id === templateId);

  return (
    <>
      <PageHeader title="إنشاء طلب تحقق تجريبي" description={org.current ? `باسم: ${org.current.name}` : undefined} />
      {submitError && <Alert tone="danger" title="تعذر إنشاء الطلب">{submitError}</Alert>}
      <Card>
        <form onSubmit={(e) => void onSubmit(e)} noValidate>
          <fieldset className="choice">
            <legend>نوع التحقق</legend>
            {templates.data?.map((t) => (
              <label key={t.id}>
                <input type="radio" name="template" value={t.id} checked={templateId === t.id} onChange={() => { setTemplateId(t.id); try { sessionStorage.setItem('iqdid-demo-template', t.id); } catch { /* session only */ } }} />
                <span>
                  <strong>{t.title}</strong>
                  <span className="small muted" style={{ display: 'block' }}>{t.fields.map((f) => f.label).join('، ')}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <TextArea label="الغرض من الطلب" hint={`يظهر للمواطن قبل قراره. حتى ${PURPOSE_MAX_LENGTH} حرف.`} maxLength={PURPOSE_MAX_LENGTH} value={purpose} error={purposeError} onChange={(e) => setPurpose(e.target.value)} required />
          {selected && (
            <p className="small muted">البيانات المطلوبة: {selected.fields.map((f) => f.label).join('، ')}. سيُرسل الطلب إلى المحفظة التجريبية للمواطن TEST-001 وتنتهي صلاحيته بعد 120 ثانية.</p>
          )}
          <Button type="submit" loading={busy}>إرسال الطلب إلى المحفظة</Button>
        </form>
      </Card>
    </>
  );
}
