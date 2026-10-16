import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, ErrorState, Icon, LoadingState, PageHeader, SegmentedControl, useAsync } from '@iqdid/ui';
import { describeError } from '@iqdid/api-client';
import { useWallet } from '../gateway.tsx';
import { CredentialFace, cardClass } from '../components/CredentialCard.tsx';
import { CREDENTIAL_STATE_TEXT, credentialState } from '../components/bits.tsx';
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
  const cards = data ?? [];
  const selected = cards.find((c) => c.id === selectedId);
  const ordered = selected ? [selected, ...cards.filter((c) => c !== selected)] : cards;
  useFlip(listRef, [selected?.id, cards.length, view]);

  useEffect(() => {
    if (!selected) return;
    selectedRef.current?.focus({ preventScroll: true });
    const reduce = document.documentElement.dataset.motion === 'reduced' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    selectedRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [selected]);

  const select = (id: string) => setParams({ card: id }, { replace: true });
  const deselect = () => setParams({}, { replace: true });
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
          <ul ref={listRef} className="stack" aria-label="مجموعة البطاقات" data-selected={selected ? '' : undefined}>
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
                    onKeyDown={onKey}
                    aria-label={`${c.title}، ${state}، البطاقة ${i + 1} من ${ordered.length}${isSel ? '. اضغط لفتح التفاصيل' : ''}`}
                    onClick={() => (isSel ? void navigate(`/credentials/${c.id}?from=cards`) : select(c.id))}
                  >
                    <CredentialFace credential={c} privacy={privacy} />
                  </button>
                  {isSel && (
                    <div className="stack__panel row">
                      <Link className="btn btn--primary" to={`/credentials/${c.id}?from=cards`}><Icon name="file" size={18} />عرض التفاصيل</Link>
                      <Button variant="secondary" onClick={deselect}><Icon name="stack" size={18} />رجوع إلى المجموعة</Button>
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
