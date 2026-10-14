import type { DemoCredentialSummary, DemoOrganization, DemoRequestTemplate } from '@iqdid/shared-types';
import { DEMO_HOLDER_REF } from '@iqdid/shared-types';

/** Fictional organisations — names are invented for the demo. */
export const DEMO_ORGANIZATIONS: readonly DemoOrganization[] = [
  { id: 'org-test-a', name: 'مصرف تجريبي (أ)', kind: 'BANK' },
  { id: 'org-test-b', name: 'شركة اتصالات تجريبية (ب)', kind: 'TELECOM' },
];

export const DEMO_TEMPLATES: readonly DemoRequestTemplate[] = [
  { id: 'AGE_OVER_18', title: 'التحقق من العمر (18 سنة فأكثر)', fields: [{ key: 'age_over_18', label: 'العمر فوق 18 سنة' }] },
  {
    id: 'IDENTITY_BASIC',
    title: 'التحقق من الهوية الأساسية',
    fields: [
      { key: 'full_name', label: 'الاسم الكامل' },
      { key: 'birth_date', label: 'تاريخ الميلاد' },
      { key: 'document_number', label: 'رقم الوثيقة التجريبي' },
    ],
  },
];

/** Synthetic credential for the synthetic citizen TEST-001. No real person. */
export function seedCredential(now: number): DemoCredentialSummary {
  const day = 86_400_000;
  return {
    id: 'cred-test-001',
    type: 'DEMO_NATIONAL_ID',
    title: 'بطاقة الهوية الرقمية (تجريبية)',
    holderRef: DEMO_HOLDER_REF,
    holderDisplayName: 'مواطن تجريبي',
    issuerName: 'جهة إصدار تجريبية (محاكاة)',
    status: 'ACTIVE',
    issuedAt: new Date(now - 2 * day).toISOString(),
    expiresAt: new Date(now + 28 * day).toISOString(),
    claims: [
      { key: 'full_name', label: 'الاسم الكامل', value: 'مواطن تجريبي' },
      { key: 'birth_date', label: 'تاريخ الميلاد', value: '1990-01-01' },
      { key: 'document_number', label: 'رقم الوثيقة التجريبي', value: 'TEST-DOC-0001' },
      { key: 'age_over_18', label: 'العمر فوق 18 سنة', value: 'نعم' },
    ],
  };
}
