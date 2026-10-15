import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, type IconName } from '@iqdid/ui';
import { setOnboarded } from '../local.ts';

const STEPS: ReadonlyArray<{ icon: IconName; title: string; body: string }> = [
  { icon: 'card', title: 'محفظتك الرقمية', body: 'احمل بطاقة هوية واعتمادات رقمية تجريبية في مكان واحد، واطلع على حالتها وصلاحيتها.' },
  { icon: 'shield', title: 'أنت من يقرر', body: 'كل مؤسسة تطلب بيانات تحتاج موافقتك. ترى بالضبط ما سيُشارك وما يبقى خاصاً، ويمكنك الرفض دائماً.' },
  { icon: 'alert', title: 'نسخة تجريبية فقط', body: 'كل البيانات اصطناعية، ولا يجري أي توقيع أو تحقق تشفيري. لا تُدخل أي بيانات حقيقية.' },
];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const s = STEPS[Math.min(step, STEPS.length - 1)];
  const finish = () => { setOnboarded(true); void navigate('/'); };
  const last = step === STEPS.length - 1;
  if (!s) return null;
  return (
    <section className="onboard" aria-labelledby="onboard-title">
      <p className="page-head__eyebrow" style={{ justifyContent: 'center' }}>{`الخطوة ${step + 1} من ${STEPS.length}`}</p>
      <div className="onboard__art" aria-hidden="true"><Icon name={s.icon} size={56} /></div>
      <h1 id="onboard-title" tabIndex={-1}>{s.title}</h1>
      <p className="muted">{s.body}</p>
      <div className="steps" aria-hidden="true">{STEPS.map((x, i) => <i key={x.title} aria-current={i === step ? 'step' : undefined} />)}</div>
      <div className="row" style={{ justifyContent: 'center' }}>
        {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>السابق</Button>}
        {last ? <Button onClick={finish}><Icon name="check" size={18} />ابدأ استخدام المحفظة</Button> : <Button onClick={() => setStep(step + 1)}>التالي</Button>}
      </div>
      {!last && <p style={{ marginTop: 'var(--sp-4)' }}><button type="button" className="btn btn--ghost btn--sm" onClick={finish}>تخطي الجولة</button></p>}
    </section>
  );
}
