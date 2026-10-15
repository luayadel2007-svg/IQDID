import { Icon, type IconName } from './Icon.tsx';
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(' ');

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  readonly size?: 'md' | 'sm';
  readonly block?: boolean;
  readonly loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', block = false, loading = false, disabled, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx('btn', `btn--${variant}`, size === 'sm' && 'btn--sm', block && 'btn--block', className)}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Card({ title, actions, children, className, headingLevel = 2, icon, variant = 'default' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; headingLevel?: 2 | 3; icon?: IconName; variant?: 'default' | 'flat' | 'accent' }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className={cx('card', variant !== 'default' && `card--${variant}`, className)}>
      {(title || actions) && (
        <div className="card__head">
          {title && <Heading className="card__title">{icon && <span className="card__icon"><Icon name={icon} size={20} /></span>}{title}</Heading>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Dashboard metric. The number is the accessible focus; the icon is decorative. */
export function StatCard({ label, value, icon, tone = 'info', hint }: { label: string; value: ReactNode; icon: IconName; tone?: Tone; hint?: ReactNode }) {
  return (
    <section className={`card stat-card stat-card--${tone}`} aria-label={label}>
      <div className="stat-card__top">
        <h2 className="stat-card__label" style={{ margin: 0 }}>{label}</h2>
        <span className="stat-card__icon"><Icon name={icon} size={20} /></span>
      </div>
      <div className="stat">{value}</div>
      {hint && <div className="small muted">{hint}</div>}
    </section>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

const ALERT_ICON = { info: 'info', success: 'check', warning: 'alert', danger: 'alert' } as const;

export function Alert({ tone = 'info', title, children }: { tone?: Exclude<Tone, 'neutral'>; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="alert__icon"><Icon name={ALERT_ICON[tone]} size={20} /></span>
      <div className="alert__body">
        {title && <strong className="alert__title">{title}</strong>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

interface FieldProps { readonly label: string; readonly hint?: string; readonly error?: string | null }

function Field({ label, hint, error, children }: FieldProps & { children: (ids: { id: string; describedBy: string | undefined }) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      {children({ id, describedBy })}
      {hint && <span id={hintId} className="field__hint">{hint}</span>}
      {error && <span id={errorId} className="field__error">{error}</span>}
    </div>
  );
}

export function Input({ label, hint, error, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return <Field label={label} hint={hint} error={error}>{({ id, describedBy }) => <input {...rest} id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} />}</Field>;
}

export function TextArea({ label, hint, error, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <Field label={label} hint={hint} error={error}>{({ id, describedBy }) => <textarea {...rest} id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} />}</Field>;
}

export function Select({ label, hint, error, options, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <select {...rest} id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

export function LoadingState({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="skeleton" aria-hidden="true"><i /><i /><i /></div>
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action, icon = 'folder' }: { title: string; description?: string; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="state">
      <span className="state__icon"><Icon name={icon} size={30} /></span>
      <span className="state__title">{title}</span>
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <span className="state__icon" style={{ color: 'var(--c-danger)', background: 'var(--c-danger-bg)' }}><Icon name="wifi-off" size={30} /></span>
      <span className="state__title">تعذر عرض البيانات</span>
      <span>{message}</span>
      {onRetry && <Button variant="secondary" onClick={onRetry}><Icon name="refresh" size={18} />إعادة المحاولة</Button>}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      <span className="demo-banner__tag" aria-hidden="true">DEMO</span>
      <span>نسخة تجريبية — بيانات وهمية · لا تمثل أي جهة حكومية · لا يجري أي تحقق تشفيري</span>
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow, icon }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string; icon?: IconName }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="page-head__eyebrow">{icon && <Icon name={icon} size={16} />}{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

/** Native checkbox exposed as role=switch, with a visible label and styled track. */
export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void }) {
  const id = useId();
  return (
    <div className="switch-row">
      <span className="switch-row__text">
        <label htmlFor={id} style={{ fontWeight: 700, cursor: 'pointer' }}>{label}</label>
        {hint && <span className="switch-row__hint" id={`${id}-hint`}>{hint}</span>}
      </span>
      <span className="switch-wrap">
        <input id={id} type="checkbox" role="switch" className="switch__input" checked={checked} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch" aria-hidden="true" />
      </span>
    </div>
  );
}

/** Single-choice button group; each option exposes aria-pressed. */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: ReadonlyArray<{ value: T; label: string; icon?: IconName }>; onChange: (next: T) => void }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="btn btn--sm" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={18} />}{o.label}
        </button>
      ))}
    </div>
  );
}
