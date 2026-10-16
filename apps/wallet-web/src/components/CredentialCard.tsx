import type { DemoCredentialSummary } from '@iqdid/shared-types';
import { Badge, Icon, formatDate } from '@iqdid/ui';
import { CREDENTIAL_ICON, CREDENTIAL_THEME, ValidityBadge, isDisplayOnly } from './bits.tsx';

const SENSITIVE = /number|ref|document/;
const mask = (v: string): string => (v.length <= 4 ? '••••' : `${'•'.repeat(Math.max(4, v.length - 4))}${v.slice(-4)}`);

/** Visual face of a synthetic credential. Sensitive values are masked unless `reveal`; privacy mode hides the holder name. */
export function CredentialFace({ credential: c, reveal = false, privacy = false }: { credential: DemoCredentialSummary; reveal?: boolean; privacy?: boolean }) {
  const shown = c.claims.filter((cl) => cl.key !== 'full_name' && cl.key !== 'birth_date').slice(0, 2);
  return (
    <>
      <div className="cred-card__head">
        <span className="cred-card__icon"><Icon name={CREDENTIAL_ICON[c.type]} size={24} /></span>
        <span style={{ minWidth: 0 }}>
          <span className="cred-card__title" style={{ display: 'block' }}>{c.title}</span>
          <span className="cred-card__issuer">{c.issuerName}</span>
        </span>
      </div>
      <dl className="cred-card__body">
        <dt>الحامل</dt><dd>{privacy ? '••••••' : c.holderDisplayName}</dd>
        {shown.map((cl) => (
          <div key={cl.key} style={{ display: 'contents' }}>
            <dt>{cl.label}</dt><dd><span className={SENSITIVE.test(cl.key) ? 'mono' : undefined}>{SENSITIVE.test(cl.key) && (!reveal || privacy) ? mask(cl.value) : cl.value}</span></dd>
          </div>
        ))}
        <dt>تنتهي</dt><dd>{formatDate(c.expiresAt)}</dd>
      </dl>
      <div className="cred-card__foot">
        <ValidityBadge credential={c} />
        <span className="row" style={{ gap: 6 }}>
          {isDisplayOnly(c) && <Badge tone="neutral">للعرض فقط</Badge>}
          <span className="badge badge--demo">DEMO</span>
        </span>
      </div>
      <span className="cred-card__watermark" aria-hidden="true">DEMO</span>
    </>
  );
}

export const cardClass = (c: DemoCredentialSummary): string => `cred-card cred-card--${CREDENTIAL_THEME[c.type]}`;
