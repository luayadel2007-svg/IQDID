import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_HOLDER_REF } from '@iqdid/shared-types';
import { Alert, Button, Card, CountdownRing, Icon, Input, PageHeader, useCountdown } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { QrSvg } from '../components/QrSvg.tsx';

const LIFETIME_S = 60;
const nonce = (): string => {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
};
/** Payload carries no claims and no personal data: a DEMO marker, the synthetic holder ref, a random nonce and expiry. */
export const makeDemoQrPayload = () => {
  const exp = new Date(Date.now() + LIFETIME_S * 1000).toISOString();
  return { exp, text: `IQDI-DEMO:${JSON.stringify({ v: 1, kind: 'DEMO_ONLY_NOT_A_CREDENTIAL', holder: DEMO_HOLDER_REF, nonce: nonce(), exp })}` };
};
const CODE_RE = /^[A-Z0-9]{6}$/;

export function QrPage() {
  const wallet = useWallet();
  const navigate = useNavigate();
  const [payload, setPayload] = useState(makeDemoQrPayload);
  const left = useCountdown(payload.exp);
  useEffect(() => { if (left === 0) setPayload(makeDemoQrPayload()); }, [left]);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qr = useMemo(() => <QrSvg value={payload.text} label="رمز QR تجريبي — لا يصلح لأي تحقق حقيقي" />, [payload.text]);

  const lookup = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!CODE_RE.test(c)) { setError('أدخل رمزاً من 6 أحرف أو أرقام لاتينية كما يظهر عند المؤسسة.'); return; }
    setBusy(true); setError(null);
    try {
      const found = (await wallet.requests()).find((r) => r.shortCode === c);
      if (!found) setError('لا يوجد طلب بهذا الرمز في محفظتك.');
      else void navigate(`/requests/${found.id}`);
    } catch (err) { setError(describeError(err)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader eyebrow="المشاركة" icon="qr" title="رمز QR التجريبي" description="للعرض فقط: لا يحتوي الرمز أي بيانات شخصية أو اعتمادات." />
      <Alert tone="warning" title="DEMO — ليس رمز تحقق">يحمل الرمز علامة DEMO ومرجعاً اصطناعياً ورقماً عشوائياً فقط، ويتجدد كل {LIFETIME_S} ثانية. لا يقرؤه أي نظام حقيقي.</Alert>
      <Card title="رمزي" icon="qr">
        <div className="qr-box">{qr}<span className="qr-box__stamp" aria-hidden="true">DEMO</span></div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 'var(--sp-4)' }}>
          {left !== null && <CountdownRing seconds={left} total={LIFETIME_S} size={52} />}
          <Button variant="secondary" size="sm" onClick={() => setPayload(makeDemoQrPayload())}><Icon name="refresh" size={18} />تجديد الرمز</Button>
        </div>
      </Card>
      <Card title="فتح طلب برمزه" icon="search">
        <form onSubmit={(e) => void lookup(e)} noValidate>
          <Input label="رمز الطلب" hint="الرمز المكوّن من 6 خانات الظاهر في بوابة المؤسسة." value={code} maxLength={6} autoComplete="off" dir="ltr" error={error} onChange={(e) => { setCode(e.target.value); setError(null); }} />
          <Button type="submit" loading={busy}><Icon name="search" size={18} />فتح الطلب</Button>
        </form>
      </Card>
    </>
  );
}
