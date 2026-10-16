import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, ErrorState, Icon, LoadingState, PageHeader, SegmentedControl, formatDate, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { CredentialFace, cardClass } from '../components/CredentialCard.tsx';
import { CREDENTIAL_STATE_TEXT, credentialState, isDisplayOnly } from '../components/bits.tsx';
import { useFlip } from '../components/useFlip.ts';
import { useLocal } from '../components/useLocal.ts';
import { isPrivacyMode, readCardsView, writeCardsView, type CardsView } from '../local.ts';
import { CredentialsBrowser } from './CredentialsPage.tsx';

/**
 * «بطاقاتي»: a vertical wallet-style card stack (every title stays visible) with an accessible list view.
 * Selecting a card brings it to the front and expands it; a second press (or «عرض التفاصيل») opens it.
 * The selection lives in the URL (?card=…) so Back from the details returns to the same card.
 */
export function CardsPage() {
  const wallet = useWallet();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const storedView = useLocal(readCardsView);
  const privacy = useLocal(isPrivacyMode);
  const view: CardsView = params.get('view') === 'list' ? 'list' : params.get('view') === 'stack' ? 'stack' : storedView;
  const selectedId = params.get('card');
  const { data, error, loading, reload } = useAsync((s) => wallet.credentials({ signal: s }), [wallet]);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const lastSelected = useRef<string | null>(null);
  const cards = data ?? [];
  const selected = cards.find((c) => c.id === selectedId);
  const ordered = selected ? [selected, ...cards.filter((c) => c !== selected)] : cards;
  useFlip(listRef, [selected?.id, cards.length, view]);

  useEffect(() => {
    if (!selected) {
      // Returning to the stack: focus goes back to the card that was open, never to <body>.
      if (lastSelected.current) listRef.current?.querySelector<HTMLButtonElement>(`button[data-card-id="${lastSelected.current}"]`)?.focus();
      lastSelected.current = null;
      return;
    }
    lastSelected.current = selected.id;
    selectedRef.current?.focus({ preventScroll: true });
    const reduce = document.documentElement.dataset.motion === 'reduced' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    selectedRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [selected]);

  // Only the card param changes; any ?view= stays, so selecting never flips the view.
  const select = (id: string) => setParams((p) => { p.set('card', id); return p; }, { replace: true });
  const deselect = () => setParams((p) => { p.delete('card'); return p; }, { replace: true });
  const escToStack = (e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Escape') { e.preventDefault(); deselect(); } };
  const setView = (v: CardsView) => { writeCardsView(v); setParams({}, { replace: true }); };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape' && selected) { e.preventDefault(); deselect(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button.cred-card') ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    buttons[Math.min(buttons.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
  };

  return (
    <>
      <PageHeader eyebrow="المحفظة" icon="wallet" title="بطاقاتي" description="وثائقك الرقمية التجريبية. اختر بطاقة لعرضها في المقدمة، ثم افتح تفاصيلها." />
      <div className="view-switch">
        <SegmentedControl label="طريقة العرض" value={view} onChange={setView} options={[{ value: 'stack', label: 'عرض البطاقات', icon: 'wallet' }, { value: 'list', label: 'عرض القائمة', icon: 'list' }]} />
        {data && <span className="small muted">{`${cards.length} بطاقات`}</span>}
      </div>
      {view === 'list' ? <CredentialsBrowser /> : loading ? <LoadingState /> : error && !data ? <ErrorState message={describeError(error)} onRetry={reload} /> : cards.length === 0 ? (
        <EmptyState icon="wallet" title="لا توجد بطاقات" description="أعد ضبط العرض التجريبي من الإعدادات." />
      ) : (
        <>
          <p className="visually-hidden" aria-live="polite">{selected ? `تم اختيار ${selected.title}. اضغط مرة أخرى لفتح التفاصيل، أو Escape للرجوع.` : ''}</p>
          <ul ref={listRef} className="card-stack" aria-label="مجموعة البطاقات" data-selected={selected ? '' : undefined}>
            {ordered.map((c, i) => {
              const isSel = c.id === selected?.id;
              const state = CREDENTIAL_STATE_TEXT[credentialState(c)].label;
              return (
                <li key={c.id} data-flip={c.id} className={`stack__item${isSel ? ' stack__item--selected' : ''}`}>
                  <button
                    ref={isSel ? selectedRef : undefined}
                    type="button"
                    className={cardClass(c)}
                    aria-expanded={isSel}
                    aria-controls={isSel ? 'card-actions' : undefined}
                    aria-describedby={`card-desc-${c.id}`}
                    data-card-id={c.id}
                    onKeyDown={onKey}
                    aria-label={`${c.title}، ${state}، البطاقة ${i + 1} من ${ordered.length}${isSel ? '. اضغط لفتح التفاصيل' : ''}`}
                    onClick={() => (isSel ? void navigate(`/credentials/${c.id}?from=cards`) : select(c.id))}
                  >
                    <CredentialFace credential={c} privacy={privacy} />
                  </button>
                  <span id={`card-desc-${c.id}`} className="visually-hidden">{`${CREDENTIAL_STATE_TEXT[credentialState(c)].detail} تنتهي ${formatDate(c.expiresAt)}. ${isDisplayOnly(c) ? 'للعرض فقط. ' : ''}بيانات تجريبية DEMO.`}</span>
                  {isSel && (
                    <div className="stack__panel row" id="card-actions">
                      <Link className="btn btn--primary" to={`/credentials/${c.id}?from=cards`} onKeyDown={escToStack}><Icon name="file" size={18} />عرض التفاصيل</Link>
                      <Button variant="secondary" onClick={deselect} onKeyDown={escToStack}><Icon name="stack" size={18} />رجوع إلى المجموعة</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
