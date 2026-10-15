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

/** Extra synthetic credentials shown in the wallet only; they never answer verification requests. */
export function seedExtraCredentials(now: number): DemoCredentialSummary[] {
  const day = 86_400_000;
  const base = { holderRef: DEMO_HOLDER_REF, holderDisplayName: 'مواطن تجريبي' } as const;
  return [
    {
      ...base, id: 'cred-test-002', type: 'DEMO_DRIVING_LICENCE', title: 'إجازة سوق (تجريبية)', issuerName: 'جهة مرور تجريبية (محاكاة)', status: 'ACTIVE',
      issuedAt: new Date(now - 400 * day).toISOString(), expiresAt: new Date(now + 5 * day).toISOString(),
      claims: [{ key: 'licence_class', label: 'فئة الإجازة', value: 'خصوصي (تجريبي)' }, { key: 'licence_number', label: 'رقم الإجازة التجريبي', value: 'TEST-DL-0002' }],
    },
    {
      ...base, id: 'cred-test-003', type: 'DEMO_RESIDENCE_CARD', title: 'بطاقة السكن (تجريبية)', issuerName: 'جهة إصدار تجريبية (محاكاة)', status: 'ACTIVE',
      issuedAt: new Date(now - 30 * day).toISOString(), expiresAt: new Date(now + 700 * day).toISOString(),
      claims: [{ key: 'governorate', label: 'المحافظة', value: 'محافظة تجريبية' }, { key: 'residence_ref', label: 'مرجع السكن التجريبي', value: 'TEST-RES-0003' }],
    },
    {
      ...base, id: 'cred-test-004', type: 'DEMO_HEALTH_CARD', title: 'بطاقة التأمين الصحي (تجريبية)', issuerName: 'جهة صحية تجريبية (محاكاة)', status: 'SUSPENDED',
      issuedAt: new Date(now - 200 * day).toISOString(), expiresAt: new Date(now + 165 * day).toISOString(),
      claims: [{ key: 'plan', label: 'الخطة', value: 'أساسية (تجريبية)' }, { key: 'member_ref', label: 'رقم العضوية التجريبي', value: 'TEST-HC-0004' }],
    },
  ];
}
