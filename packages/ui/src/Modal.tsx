import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface ModalProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Accessible modal: role=dialog, aria-modal, Escape closes, focus trapped and restored. */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  // Callers pass inline handlers; a ref keeps the effect from re-running (and re-focusing) on every parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent): void => {
      // Focus left the dialog (e.g. a button became disabled): bring it back inside.
      if (node && !node.contains(document.activeElement)) node.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId} className="modal__title">{title}</h2>
        <div>{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
