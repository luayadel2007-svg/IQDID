/** Protocol results are server-owned; JSON and consent cannot manufacture proof. */
declare const protocolProof: unique symbol;
export interface VerifiedByProtocol {
  readonly mode: 'protocol';
  readonly outcome: 'VERIFIED_BY_PROTOCOL';
  readonly [protocolProof]: true;
  readonly evidence: {
    readonly verificationId: string;
    readonly policyVersion: string;
    readonly verifiedAt: string;
    readonly issuer: string;
    readonly audience: string;
    readonly nonce: string;
    readonly keyId: string;
    readonly trustVersion: string;
    readonly statusVersion: string;
  };
}
export interface DemoOutcome {
  readonly mode: 'demo';
  readonly outcome: 'DEMO_ACCEPTED' | 'DEMO_REJECTED';
  readonly sessionId: string;
}
export type VerificationOutcome = DemoOutcome | VerifiedByProtocol;
