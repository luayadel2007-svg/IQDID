import type { DemoCredentialSummary } from '@iqdid/shared-types';
import { formatDate } from '@iqdid/ui';
import { ValidityBadge } from './bits.tsx';

const mask = (v: string): string => (v.length <= 4 ? '••••' : `${'•'.repeat(Math.max(4, v.length - 4))}${v.slice(-4)}`);

/** Visual rendering of a synthetic credential. Sensitive values are masked unless revealed. */
export function IdCard({ card, reveal, mini = false }: { card: DemoCredentialSummary; reveal: boolean; mini?: boolean }) {
  const claim = (k: string) => card.claims.find((c) => c.key === k)?.value ?? '—';
  const doc = claim('document_number');
  return (
    <article className={`id-card${mini ? ' id-card--mini' : ''}`} aria-label="بطاقة الهوية الرقمية التجريبية">
      <div className="id-card__head">
        <div>
          <div className="id-card__title">{card.title}</div>
          <div className="id-card__issuer">{card.issuerName}</div>
        </div>
        <ValidityBadge credential={card} />
      </div>
      {!mini && <span className="id-card__chip" aria-hidden="true" />}
      <dl>
        <dt>الاسم</dt><dd>{claim('full_name')}</dd>
        {!mini && <><dt>المرجع</dt><dd><span className="mono">{card.holderRef}</span></dd></>}
        <dt>رقم الوثيقة</dt><dd><span className="mono">{reveal ? doc : mask(doc)}</span></dd>
        <dt>تنتهي في</dt><dd>{formatDate(card.expiresAt)}</dd>
      </dl>
      <span className="id-card__watermark" aria-hidden="true">TEST</span>
    </article>
  );
}
