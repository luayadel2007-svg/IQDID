import { describe, expect, it } from 'vitest';
import {
  isDemoVerificationSession, isTerminalStatus, validateConsentDecision, validateVerificationRequest,
  type DemoVerificationSession,
} from './index.ts';

const session: DemoVerificationSession = {
  id: 's-1', shortCode: 'ABC123', organizationId: 'org-test-a', organizationName: 'مصرف تجريبي (أ)', templateId: 'AGE_OVER_18',
  purpose: 'فتح حساب', requestedFields: [{ key: 'age_over_18', label: 'العمر' }], holderRef: 'TEST-001', status: 'PENDING',
  createdAt: '2026-10-14T10:00:00.000Z', expiresAt: '2026-10-14T10:02:00.000Z', decidedAt: null, disclosed: null,
};

describe('shared-types guards', () => {
  it('accepts a well-formed session and rejects tampered ones', () => {
    expect(isDemoVerificationSession(session)).toBe(true);
    expect(isDemoVerificationSession({ ...session, status: 'VERIFIED' })).toBe(false);
    expect(isDemoVerificationSession({ ...session, createdAt: 'yesterday' })).toBe(false);
    expect(isDemoVerificationSession({ ...session, disclosed: [{ key: 'x' }] })).toBe(false);
  });

  it('validates verifier requests strictly', () => {
    expect(validateVerificationRequest({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: '  فتح حساب  ' }))
      .toEqual({ ok: true, value: { organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'فتح حساب' } });
    expect(validateVerificationRequest({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'ok' }).ok).toBe(false);
    expect(validateVerificationRequest({ organizationId: 'org-test-a', templateId: 'OTHER', purpose: 'فتح حساب' }).ok).toBe(false);
    expect(validateVerificationRequest({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'فتح حساب', admin: true }))
      .toEqual({ ok: false, reason: 'unknown fields: admin' });
    expect(validateVerificationRequest({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'x'.repeat(201) }).ok).toBe(false);
  });

  it('validates consent decisions', () => {
    expect(validateConsentDecision({ decision: 'ACCEPT' }).ok).toBe(true);
    expect(validateConsentDecision({ decision: 'MAYBE' }).ok).toBe(false);
    expect(validateConsentDecision({ decision: 'ACCEPT', extra: 1 }).ok).toBe(false);
  });

  it('classifies terminal statuses', () => {
    expect(isTerminalStatus('PENDING')).toBe(false);
    expect(isTerminalStatus('DEMO_ACCEPTED')).toBe(true);
    expect(isTerminalStatus('EXPIRED')).toBe(true);
  });
});
