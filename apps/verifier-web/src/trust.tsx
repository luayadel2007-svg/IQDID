import { createContext, useContext } from 'react';
import type { DemoVerificationSession, VerifiedByProtocol } from '@iqdid/shared-types';
import { Badge, Icon, SESSION_STATUS_LABEL, type IconName, type Tone } from '@iqdid/ui';
import { demoOutcome, recordedDecision } from './model.ts';

/**
 * Five separate trust layers (TASK-11 §11). They are never merged into one «verified» badge:
 * 1 app connectivity · 2 demo credential status · 3 citizen consent · 4 demo session outcome ·
 * 5 cryptographic verification. Layer 5 can only show a protocol result from a server-issued,
 * branded VerifiedByProtocol value that browser code cannot construct (same seam as the wallet).
 */
export type CryptoView =
  | { readonly kind: 'NOT_VERIFIED'; readonly detail: string }
  | { readonly kind: 'PROTOCOL'; readonly proof: VerifiedByProtocol };

export interface VerifierTrustAdapter {
  readonly mode: 'demo' | 'protocol';
  describeCrypto(session: DemoVerificationSession): CryptoView;
}

export const demoVerifierTrust: VerifierTrustAdapter = {
  mode: 'demo',
  describeCrypto: () => ({ kind: 'NOT_VERIFIED', detail: 'لا توجد خدمة تحقق تشفيري في هذا النموذج: لا توقيع، ولا سلسلة ثقة، ولا قائمة حالة.' }),
};

export const VerifierTrustContext = createContext<VerifierTrustAdapter>(demoVerifierTrust);
export const useVerifierTrust = (): VerifierTrustAdapter => useContext(VerifierTrustContext);

export interface TrustLayer {
  readonly id: 'app' | 'credential' | 'consent' | 'session' | 'crypto';
  readonly title: string;
  readonly value: string;
  readonly tone: Tone;
  readonly icon: IconName;
  readonly detail: string;
}

export function trustLayers(s: DemoVerificationSession, connection: 'ok' | 'stale', adapter: VerifierTrustAdapter): TrustLayer[] {
  const crypto = adapter.describeCrypto(s);
  const status = SESSION_STATUS_LABEL[s.status];
  const outcome = demoOutcome(s);
  return [
    {
      id: 'app', title: 'حالة التطبيق', icon: connection === 'ok' ? 'refresh' : 'wifi-off',
      value: connection === 'ok' ? 'متصل بخادم المحاكاة' : 'تعذر التحديث — آخر بيانات معروفة',
      tone: connection === 'ok' ? 'neutral' : 'warning',
      detail: 'حالة اتصال هذه الصفحة بخادم العرض التجريبي فقط.',
    },
    {
      id: 'credential', title: 'حالة الاعتماد التجريبي', icon: 'card',
      value: s.status === 'DEMO_ACCEPTED' ? 'كان فعالاً تجريبياً عند الموافقة' : 'غير مكشوفة للمؤسسة',
      tone: 'neutral',
      detail: s.status === 'DEMO_ACCEPTED' ? 'يرفض خادم المحاكاة الموافقة إذا لم يكن الاعتماد التجريبي فعالاً.' : 'لا تطلع المؤسسة على حالة اعتماد المواطن في هذا النموذج.',
    },
    {
      id: 'consent', title: 'قرار المواطن', icon: 'user',
      value: recordedDecision(s),
      tone: s.status === 'DEMO_ACCEPTED' ? 'success' : s.status === 'DEMO_REJECTED' ? 'danger' : 'neutral',
      detail: 'قرار مسجل في المحفظة التجريبية، وليس إثباتاً لهوية أحد.',
    },
    {
      id: 'session', title: 'نتيجة الجلسة التجريبية', icon: 'folder',
      value: outcome ? `${status.label} — نتيجة محاكاة` : status.label,
      tone: status.tone,
      detail: 'حالة الجلسة في خادم المحاكاة.',
    },
    {
      id: 'crypto', title: 'التحقق التشفيري', icon: 'lock',
      value: crypto.kind === 'PROTOCOL' ? 'نتيجة بروتوكولية صادرة عن الخادم' : 'غير متحقق منه تشفيرياً',
      tone: 'neutral',
      detail: crypto.kind === 'PROTOCOL' ? `معرف التحقق: ${crypto.proof.evidence.verificationId}` : crypto.detail,
    },
  ];
}

export function TrustLayers({ session, connection }: { session: DemoVerificationSession; connection: 'ok' | 'stale' }) {
  const adapter = useVerifierTrust();
  return (
    <ol className="vf-trust" aria-label="طبقات الحالة والثقة">
      {trustLayers(session, connection, adapter).map((l, i) => (
        <li key={l.id} className="vf-trust__row" data-layer={l.id}>
          <span className="vf-trust__n" aria-hidden="true">{i + 1}</span>
          <span className="vf-trust__icon"><Icon name={l.icon} size={18} /></span>
          <span className="vf-trust__body">
            <strong>{l.title}</strong>
            <span className="small muted">{l.detail}</span>
          </span>
          <Badge tone={l.tone}>{l.value}</Badge>
        </li>
      ))}
    </ol>
  );
}
