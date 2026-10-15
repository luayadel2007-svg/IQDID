/** SERVER-SIDE contracts only. No key material or crypto SDK enters browser DTOs.
 * Standards remain project-pinned; these ports do not implement a new protocol.
 */
import type { VerifiedByProtocol } from '@iqdid/shared-types';
export type KeyPurpose = 'credential_signing' | 'status_list_signing' | 'trust_list_signing' | 'verifier_request_signing' | 'storage_encryption';
export interface KeyHandle { readonly provider: string; readonly kid: string; readonly version: string; readonly purpose: KeyPurpose }
export interface KeyProvider {
  resolve(kid: string, purpose: KeyPurpose): Promise<KeyHandle>;
  rotate(key: KeyHandle): Promise<KeyHandle>;
  retire(key: KeyHandle): Promise<void>;
}
export interface SigningPort {
  sign(input: { key: KeyHandle; alg: string; payload: Uint8Array }): Promise<Uint8Array>;
}
export interface CredentialIssuerPort {
  issue(input: { subjectRef: string; authorizedRequestRef: string; credentialProfile: string }): Promise<{ credentialRef: string; schemaVersion: number }>;
}
export interface CredentialVerificationPort {
  verify(input: { presentation: string; audience: string; nonce: string; policyVersion: string }): Promise<VerifiedByProtocol>;
}
export interface TrustResolverPort {
  resolve(input: { issuer: string; kid: string; purpose: KeyPurpose; at: string }): Promise<{ key: JsonWebKey; trustVersion: string; validUntil: string }>;
}
export interface StatusResolverPort {
  resolve(input: { credentialRef: string; trustVersion: string }): Promise<{ state: 'active' | 'suspended' | 'revoked'; listVersion: string; publishedAt: string; checkedAt: string }>;
}
export interface AuthorizationPort {
  authorize(input: { principalRef: string; action: string; resourceRef: string; approvalRef?: string }): Promise<{ allowed: boolean; policyVersion: string }>;
}
export interface EncryptedEnvelope {
  readonly schemaVersion: 1; readonly key: KeyHandle; readonly alg: string;
  readonly ciphertext: Uint8Array; readonly iv: Uint8Array; readonly authenticationTag: Uint8Array;
}
/** At-rest encryption is distinct from signing and protocol verification. */
export interface SensitiveStoragePort {
  seal(plaintext: Uint8Array, context: { recordRef: string; schemaVersion: number }): Promise<EncryptedEnvelope>;
  open(envelope: EncryptedEnvelope, context: { recordRef: string; schemaVersion: number }): Promise<Uint8Array>;
}
export interface AuditPort {
  append(event: { correlationId: string; action: string; resourceRef: string; outcome: 'allowed' | 'denied' | 'error'; policyVersion: string }): Promise<void>;
}
/** Real mode has no configured provider: never no-op, success, or mock fallback. */
export class UnconfiguredCredentialVerificationProvider implements CredentialVerificationPort {
  verify(_input: Parameters<CredentialVerificationPort['verify']>[0]): Promise<VerifiedByProtocol> {
    void _input;
    return Promise.reject(new Error('REAL_CRYPTO_NOT_CONFIGURED'));
  }
}
