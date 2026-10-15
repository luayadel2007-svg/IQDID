import { createContext, useContext } from 'react';
import type { DemoCredentialSummary, DemoVerificationSession, VerifiedByProtocol } from '@iqdid/shared-types';

/**
 * Typed seam between wallet pages and any future cryptographic verification.
 * Pages render a TrustView only; they never import a crypto implementation.
 * `PROTOCOL` requires a server-issued, branded VerifiedByProtocol value that
 * browser code cannot construct — so a demo approval can never display it.
 */
export type TrustView =
  | { readonly kind: 'DEMO_UNVERIFIED'; readonly label: string; readonly detail: string }
  | { readonly kind: 'PROTOCOL'; readonly proof: VerifiedByProtocol };

export interface WalletTrustAdapter {
  readonly mode: 'demo' | 'protocol';
  describeCredential(credential: DemoCredentialSummary): TrustView;
  describeSession(session: DemoVerificationSession): TrustView;
}

export const demoTrustAdapter: WalletTrustAdapter = {
  mode: 'demo',
  describeCredential: () => ({ kind: 'DEMO_UNVERIFIED', label: 'اعتماد تجريبي — غير متحقق تشفيرياً', detail: 'لا توقيع ولا سلسلة ثقة ولا قائمة حالة حقيقية. الحالة المعروضة صادرة عن خادم العرض التجريبي.' }),
  describeSession: (s) => ({
    kind: 'DEMO_UNVERIFIED',
    label: s.status === 'DEMO_ACCEPTED' ? 'موافقة تجريبية فقط (DEMO_ACCEPTED)' : 'جلسة تجريبية',
    detail: 'لم يُجرَ أي تحقق بروتوكولي، ولا تُعرض نتيجة تحقق بروتوكولي في هذا الوضع.',
  }),
};

export const TrustContext = createContext<WalletTrustAdapter>(demoTrustAdapter);
export const useTrust = (): WalletTrustAdapter => useContext(TrustContext);
