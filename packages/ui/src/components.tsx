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

export function Card({ title, actions, children, className, headingLevel = 2 }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className={cx('card', className)}>
      {(title || actions) && (
        <div className="card__head">
          {title && <Heading className="card__title">{title}</Heading>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Alert({ tone = 'info', title, children }: { tone?: Exclude<Tone, 'neutral'>; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {title && <strong className="alert__title">{title}</strong>}
      {children && <div>{children}</div>}
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
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action, icon = '🗂️' }: { title: string; description?: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="state">
      <span className="state__icon" aria-hidden="true">{icon}</span>
      <span className="state__title">{title}</span>
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <span className="state__icon" aria-hidden="true">⚠️</span>
      <span className="state__title">تعذر عرض البيانات</span>
      <span>{message}</span>
      {onRetry && <Button variant="secondary" onClick={onRetry}>إعادة المحاولة</Button>}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      نسخة تجريبية — بيانات وهمية · لا تمثل أي جهة حكومية · لا يجري أي تحقق تشفيري
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
