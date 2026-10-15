/**
 * Demo-only data transfer objects shared by the mock server, the API client
 * and both web apps. TEST ONLY — synthetic data. These are NOT the OpenAPI
 * v1.1 contracts and carry no protocol (OpenID4VCI / OpenID4VP) semantics.
 */

export const DEMO_API_PREFIX = '/demo-api/v1';
export const DEMO_ENVIRONMENT = 'DEMO';
export const DEMO_HOLDER_REF = 'TEST-001';
/** Default life of a demo verification session (mirrors M-05: 120 s). */
export const DEMO_SESSION_TTL_MS = 120_000;

export const CREDENTIAL_STATUSES = ['ACTIVE', 'SUSPENDED', 'REVOKED'] as const;
/** Synthetic credential kinds. Only DEMO_NATIONAL_ID answers verification requests. */
export const CREDENTIAL_TYPES = ['DEMO_NATIONAL_ID', 'DEMO_DRIVING_LICENCE', 'DEMO_RESIDENCE_CARD', 'DEMO_HEALTH_CARD'] as const;
export type DemoCredentialType = (typeof CREDENTIAL_TYPES)[number];
export type DemoCredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

/**
 * Session outcomes. DEMO_ACCEPTED means the synthetic holder pressed "approve"
 * in the demo wallet — no cryptographic or protocol verification happened.
 */
export const SESSION_STATUSES = ['PENDING', 'DEMO_ACCEPTED', 'DEMO_REJECTED', 'EXPIRED', 'CANCELLED'] as const;
export type DemoSessionStatus = (typeof SESSION_STATUSES)[number];
export const TERMINAL_SESSION_STATUSES: readonly DemoSessionStatus[] = ['DEMO_ACCEPTED', 'DEMO_REJECTED', 'EXPIRED', 'CANCELLED'];

export const CONSENT_DECISIONS = ['ACCEPT', 'REJECT'] as const;
export type DemoConsentDecisionValue = (typeof CONSENT_DECISIONS)[number];

export const ACTIVITY_TYPES = [
  'REQUEST_CREATED',
  'CONSENT_ACCEPTED',
  'CONSENT_REJECTED',
  'SESSION_EXPIRED',
  'SESSION_CANCELLED',
  'DEMO_RESET',
] as const;
export type DemoActivityType = (typeof ACTIVITY_TYPES)[number];

export type DemoActor = 'CITIZEN' | 'VERIFIER' | 'SYSTEM';

export interface DemoClaim {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export interface DemoCredentialSummary {
  readonly id: string;
  readonly type: DemoCredentialType;
  readonly title: string;
  readonly holderRef: string;
  readonly holderDisplayName: string;
  readonly issuerName: string;
  readonly status: DemoCredentialStatus;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly claims: readonly DemoClaim[];
}

export interface DemoOrganization {
  readonly id: string;
  readonly name: string;
  readonly kind: 'BANK' | 'TELECOM';
}

export interface DemoRequestedField {
  readonly key: string;
  readonly label: string;
}

export interface DemoRequestTemplate {
  readonly id: 'AGE_OVER_18' | 'IDENTITY_BASIC';
  readonly title: string;
  readonly fields: readonly DemoRequestedField[];
}

/** What a verifier sends to start a demo session. */
export interface DemoVerificationRequest {
  readonly organizationId: string;
  readonly templateId: DemoRequestTemplate['id'];
  readonly purpose: string;
}

export interface DemoVerificationSession {
  readonly id: string;
  readonly shortCode: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly templateId: DemoRequestTemplate['id'];
  readonly purpose: string;
  readonly requestedFields: readonly DemoRequestedField[];
  readonly holderRef: string;
  readonly status: DemoSessionStatus;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly decidedAt: string | null;
  /** Synthetic values released only after DEMO_ACCEPTED. Never real data. */
  readonly disclosed: readonly DemoClaim[] | null;
}

export interface DemoConsentDecision {
  readonly decision: DemoConsentDecisionValue;
}

export interface DemoActivityEvent {
  readonly id: string;
  readonly at: string;
  readonly type: DemoActivityType;
  readonly actor: DemoActor;
  readonly holderRef: string | null;
  readonly organizationId: string | null;
  readonly sessionId: string | null;
  readonly summary: string;
}

export const DEMO_ERROR_CODES = [
  'BAD_REQUEST',
  'NOT_FOUND',
  'SESSION_EXPIRED',
  'SESSION_ALREADY_DECIDED',
  'CREDENTIAL_NOT_ACTIVE',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL',
] as const;
export type DemoErrorCode = (typeof DEMO_ERROR_CODES)[number];

export interface DemoErrorBody {
  readonly error: { readonly code: DemoErrorCode; readonly message: string; readonly requestId: string };
}

// ---------------------------------------------------------------- guards

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isIsoDate = (v: unknown): v is string => isString(v) && !Number.isNaN(Date.parse(v));
const oneOf = <T extends string>(values: readonly T[], v: unknown): v is T => isString(v) && (values as readonly string[]).includes(v);

export function isDemoClaim(v: unknown): v is DemoClaim {
  return isRecord(v) && isString(v.key) && isString(v.label) && isString(v.value);
}

export function isDemoCredentialSummary(v: unknown): v is DemoCredentialSummary {
  return (
    isRecord(v) && isString(v.id) && oneOf(CREDENTIAL_TYPES, v.type) && isString(v.title) && isString(v.holderRef) &&
    isString(v.holderDisplayName) && isString(v.issuerName) && oneOf(CREDENTIAL_STATUSES, v.status) &&
    isIsoDate(v.issuedAt) && isIsoDate(v.expiresAt) && Array.isArray(v.claims) && v.claims.every(isDemoClaim)
  );
}

export function isDemoOrganization(v: unknown): v is DemoOrganization {
  return isRecord(v) && isString(v.id) && isString(v.name) && (v.kind === 'BANK' || v.kind === 'TELECOM');
}

const isField = (v: unknown): v is DemoRequestedField => isRecord(v) && isString(v.key) && isString(v.label);

export function isDemoRequestTemplate(v: unknown): v is DemoRequestTemplate {
  return isRecord(v) && (v.id === 'AGE_OVER_18' || v.id === 'IDENTITY_BASIC') && isString(v.title) && Array.isArray(v.fields) && v.fields.every(isField);
}

export function isDemoVerificationSession(v: unknown): v is DemoVerificationSession {
  return (
    isRecord(v) && Object.keys(v).every((k) => ['id', 'shortCode', 'organizationId', 'organizationName', 'templateId', 'purpose', 'requestedFields', 'holderRef', 'status', 'createdAt', 'expiresAt', 'decidedAt', 'disclosed'].includes(k)) && isString(v.id) && isString(v.shortCode) && isString(v.organizationId) && isString(v.organizationName) &&
    (v.templateId === 'AGE_OVER_18' || v.templateId === 'IDENTITY_BASIC') && isString(v.purpose) &&
    Array.isArray(v.requestedFields) && v.requestedFields.every(isField) && isString(v.holderRef) &&
    oneOf(SESSION_STATUSES, v.status) && isIsoDate(v.createdAt) && isIsoDate(v.expiresAt) &&
    (v.decidedAt === null || isIsoDate(v.decidedAt)) &&
    (v.disclosed === null || (Array.isArray(v.disclosed) && v.disclosed.every(isDemoClaim)))
  );
}

export function isDemoActivityEvent(v: unknown): v is DemoActivityEvent {
  return (
    isRecord(v) && isString(v.id) && isIsoDate(v.at) && oneOf(ACTIVITY_TYPES, v.type) &&
    (v.actor === 'CITIZEN' || v.actor === 'VERIFIER' || v.actor === 'SYSTEM') &&
    (v.holderRef === null || isString(v.holderRef)) && (v.organizationId === null || isString(v.organizationId)) &&
    (v.sessionId === null || isString(v.sessionId)) && isString(v.summary)
  );
}

export const PURPOSE_MAX_LENGTH = 200;

/** Validates an incoming verifier request; returns a reason string when invalid. */
export function validateVerificationRequest(v: unknown): { ok: true; value: DemoVerificationRequest } | { ok: false; reason: string } {
  if (!isRecord(v)) return { ok: false, reason: 'body must be an object' };
  const extra = Object.keys(v).filter((k) => !['organizationId', 'templateId', 'purpose'].includes(k));
  if (extra.length > 0) return { ok: false, reason: `unknown fields: ${extra.join(', ')}` };
  if (!isString(v.organizationId) || v.organizationId.length === 0) return { ok: false, reason: 'organizationId is required' };
  if (v.templateId !== 'AGE_OVER_18' && v.templateId !== 'IDENTITY_BASIC') return { ok: false, reason: 'templateId is invalid' };
  if (!isString(v.purpose)) return { ok: false, reason: 'purpose is required' };
  const purpose = v.purpose.trim();
  if (purpose.length < 3 || purpose.length > PURPOSE_MAX_LENGTH) return { ok: false, reason: `purpose must be 3–${PURPOSE_MAX_LENGTH} characters` };
  return { ok: true, value: { organizationId: v.organizationId, templateId: v.templateId, purpose } };
}

export function validateConsentDecision(v: unknown): { ok: true; value: DemoConsentDecision } | { ok: false; reason: string } {
  if (!isRecord(v) || Object.keys(v).length !== 1 || !oneOf(CONSENT_DECISIONS, v.decision)) {
    return { ok: false, reason: 'body must be {"decision":"ACCEPT"|"REJECT"}' };
  }
  return { ok: true, value: { decision: v.decision } };
}

export const isTerminalStatus = (s: DemoSessionStatus): boolean => TERMINAL_SESSION_STATUSES.includes(s);

export type { DemoOutcome, VerifiedByProtocol, VerificationOutcome } from './verification.ts';

/** The single credential that answers demo verification requests (server uses the same rule). */
export function primaryIdentityCredential<T extends DemoCredentialSummary>(list: readonly T[] | undefined, holderRef: string = DEMO_HOLDER_REF): T | undefined {
  return list?.find((c) => c.type === 'DEMO_NATIONAL_ID' && c.holderRef === holderRef);
}

/** Exact synthetic projection. No protocol or selective-disclosure claim. */
export function previewDemoDisclosure(session: DemoVerificationSession, credential: DemoCredentialSummary): readonly DemoClaim[] {
  if (session.holderRef !== credential.holderRef) throw new Error('holder mismatch');
  return session.requestedFields.map((f) => ({ key: f.key, label: f.label, value: credential.claims.find((c) => c.key === f.key)?.value ?? '—' }));
}
