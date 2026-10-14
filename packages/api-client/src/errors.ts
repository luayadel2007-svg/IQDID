import type { DemoErrorCode } from '@iqdid/shared-types';

export type ApiErrorKind = 'network' | 'timeout' | 'cancelled' | 'http' | 'decode' | 'not_implemented';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: DemoErrorCode | null;
  readonly requestId: string;

  constructor(init: { kind: ApiErrorKind; message: string; requestId: string; status?: number | null; code?: DemoErrorCode | null }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.code = init.code ?? null;
    this.requestId = init.requestId;
  }

  /** Retrying makes sense only for transient failures. */
  get transient(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || (this.kind === 'http' && this.status !== null && this.status >= 502);
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Arabic user-facing message; never includes server internals. */
export function describeError(e: unknown): string {
  if (!isApiError(e)) return 'حدث خطأ غير متوقع.';
  switch (e.kind) {
    case 'cancelled':
      return 'أُلغي الطلب.';
    case 'timeout':
      return 'انتهت مهلة الاتصال بخادم العرض التجريبي.';
    case 'network':
      return 'تعذر الاتصال بخادم العرض التجريبي. تأكد من تشغيله.';
    case 'decode':
      return 'استجابة غير متوقعة من الخادم.';
    case 'not_implemented':
      return 'الواجهة الحقيقية غير متاحة في هذه النسخة التجريبية.';
    case 'http':
      switch (e.code) {
        case 'SESSION_EXPIRED':
          return 'انتهت صلاحية الطلب.';
        case 'SESSION_ALREADY_DECIDED':
          return 'سُجل قرار لهذا الطلب مسبقاً.';
        case 'CREDENTIAL_NOT_ACTIVE':
          return 'الاعتماد التجريبي غير فعال، لا يمكن الموافقة.';
        case 'NOT_FOUND':
          return 'العنصر المطلوب غير موجود.';
        case 'BAD_REQUEST':
          return 'بيانات الطلب غير صالحة.';
        default:
          return 'خطأ في الخادم التجريبي.';
      }
  }
}
