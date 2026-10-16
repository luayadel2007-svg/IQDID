import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_HOLDER_REF, PURPOSE_MAX_LENGTH, type DemoRequestTemplate } from '@iqdid/shared-types';
import { Alert, Button, Card, ErrorState, Icon, LoadingState, PageHeader, Select, TextArea, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useOrg, useVerifier } from '../gateway.tsx';
import { Steps } from '../parts.tsx';
import { DEFAULT_TTL_SECONDS } from '../model.ts';

const STEPS = ['تفاصيل الطلب', 'المراجعة والتأكيد', 'رمز الجلسة'] as const;
const TEMPLATE_KEY = 'iqdid-demo-template';

/**
 * Create flow: organisation → purpose → template → preview → validity → confirm → session code.
 * Only fields the demo API supports are offered (organizationId, templateId, purpose).
 */
export function CreateRequestPage() {
  const verifier = useVerifier();
  const org = useOrg();
  const navigate = useNavigate();
  const templates = useAsync((s) => verifier.templates({ signal: s }), [verifier]);
  const [templateId, setTemplateId] = useState<DemoRequestTemplate['id']>(() => { try { return sessionStorage.getItem(TEMPLATE_KEY) === 'IDENTITY_BASIC' ? 'IDENTITY_BASIC' : 'AGE_OVER_18'; } catch { return 'AGE_OVER_18'; } });
  const [purpose, setPurpose] = useState('');
  const [purposeError, setPurposeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<0 | 1>(0);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    (step === 1 ? reviewHeading : formHeading).current?.focus();
  }, [step]);

  const review = (e: FormEvent): void => {
    e.preventDefault();
    if (purpose.trim().length < 3) {
      setPurposeError('اكتب غرضاً واضحاً (3 أحرف على الأقل).');
      return;
    }
    setPurposeError(null);
    moved.current = true;
    setStep(1);
  };

  const confirm = async (): Promise<void> => {
    if (!org.current) return;
    setSubmitError(null);
    setBusy(true);
    try {
      const session = await verifier.createSession({ organizationId: org.current.id, templateId, purpose: purpose.trim() });
      void navigate(`/sessions/${session.id}?created=1`);
    } catch (err) {
      setSubmitError(describeError(err));
      setBusy(false);
    }
  };

  if (templates.loading || org.loading) return <LoadingState />;
  if (templates.error) return <ErrorState message={describeError(templates.error)} onRetry={templates.reload} />;
  const selected = templates.data?.find((t) => t.id === templateId);
  const fields = selected?.fields ?? [];

  const preview = (
    <Card title="ما سيراه المواطن" icon="eye" className="vf-preview">
      <dl className="kv">
        <dt>الجهة الطالبة</dt><dd>{org.current?.name ?? '—'}</dd>
        <dt>الغرض</dt><dd>{purpose.trim() || <span className="muted">لم يُكتب بعد</span>}</dd>
        <dt>نوع التحقق</dt><dd>{selected?.title ?? '—'}</dd>
      </dl>
      <h3 className="vf-preview__h">البيانات المطلوبة ({fields.length})</h3>
      <ul className="vf-fields" aria-label="البيانات المطلوب مشاركتها">
        {fields.map((f) => <li key={f.key}><Icon name="lock" size={16} />{f.label}</li>)}
      </ul>
      <p className="small muted" style={{ marginBottom: 0 }}>لا تُطلب أي بيانات أخرى. يقرر المواطن الموافقة أو الرفض بعد مراجعة الطلب في محفظته.</p>
    </Card>
  );

  return (
    <>
      <PageHeader eyebrow="طلب جديد" icon="send" title="إنشاء طلب تحقق تجريبي" description={org.current ? `باسم: ${org.current.name}` : undefined} />
      <Steps steps={STEPS} current={step} />
      {submitError && <Alert tone="danger" title="تعذر إنشاء الطلب">{submitError}</Alert>}
      <div className="vf-split vf-split--form">
        {step === 0 ? (
          <Card>
            <h2 ref={formHeading} tabIndex={-1} className="card__title vf-section-title">تفاصيل الطلب</h2>
            <form onSubmit={review} noValidate>
              <Select label="المؤسسة الطالبة (تجريبية)" hint="مؤسسة وهمية ضمن المحاكاة. تتغير أيضاً من أعلى الصفحة." value={org.current?.id ?? ''} onChange={(e) => org.select(e.target.value)} options={org.organizations.map((o) => ({ value: o.id, label: o.name }))} />
              <TextArea label="الغرض من الطلب" hint={`يظهر للمواطن قبل قراره. حتى ${PURPOSE_MAX_LENGTH} حرف.`} maxLength={PURPOSE_MAX_LENGTH} value={purpose} error={purposeError} onChange={(e) => setPurpose(e.target.value)} required />
              <fieldset className="choice">
                <legend>نوع التحقق</legend>
                {templates.data?.map((t) => (
                  <label key={t.id}>
                    <input type="radio" name="template" value={t.id} checked={templateId === t.id} onChange={() => { setTemplateId(t.id); try { sessionStorage.setItem(TEMPLATE_KEY, t.id); } catch { /* session only */ } }} />
                    <span>
                      <strong>{t.title}</strong>
                      <span className="small muted" style={{ display: 'block' }}>{t.fields.map((f) => f.label).join('، ')}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <p className="vf-validity"><Icon name="clock" size={18} />مدة صلاحية الجلسة: {DEFAULT_TTL_SECONDS} ثانية افتراضياً من لحظة الإنشاء. تُعرض المدة الفعلية في صفحة الجلسة.</p>
              <Button type="submit"><Icon name="eye" size={18} />مراجعة الطلب</Button>
            </form>
          </Card>
        ) : (
          <Card variant="accent">
            <h2 ref={reviewHeading} tabIndex={-1} className="card__title vf-section-title">المراجعة والتأكيد</h2>
            <dl className="kv">
              <dt>المؤسسة الطالبة</dt><dd>{org.current?.name}</dd>
              <dt>الغرض</dt><dd>{purpose.trim()}</dd>
              <dt>نوع التحقق</dt><dd>{selected?.title}</dd>
              <dt>البيانات المطلوبة</dt><dd>{fields.map((f) => f.label).join('، ')}</dd>
              <dt>المستلم</dt><dd>المحفظة التجريبية للمواطن <span className="mono">{DEMO_HOLDER_REF}</span></dd>
              <dt>الصلاحية</dt><dd>{DEFAULT_TTL_SECONDS} ثانية افتراضياً</dd>
            </dl>
            <Alert tone="info" title="قبل التأكيد">سيظهر الطلب فوراً في المحفظة التجريبية. لا تُشارك أي بيانات إلا بعد موافقة المواطن، ولا يجري أي تحقق تشفيري.</Alert>
            <div className="row">
              <Button loading={busy} onClick={() => void confirm()}><Icon name="send" size={18} />إرسال الطلب إلى المحفظة</Button>
              <Button variant="secondary" disabled={busy} onClick={() => { moved.current = true; setStep(0); }}>تعديل الطلب</Button>
            </div>
          </Card>
        )}
        {preview}
      </div>
    </>
  );
}
