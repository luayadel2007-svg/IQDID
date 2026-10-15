import { useState } from 'react';
import { Card, Select } from './components.tsx';
interface Shortcut { readonly href: string; readonly label: string }
/** Only an allow-listed route is persisted. No session or personal data. */
export function FavoriteShortcut({ app, options }: { app: 'wallet' | 'verifier'; options: readonly Shortcut[] }) {
  const key = `iqdid-favorite-${app}`;
  const [saved, setSaved] = useState(() => {
    try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
  });
  const selected = options.find((o) => o.href === saved) ?? options[0];
  if (!selected) return null;
  return <Card title="الوصول السريع">
    <Select label="خدمتي المفضلة" value={selected.href} options={options.map((o) => ({ value: o.href, label: o.label }))} onChange={(event) => {
      const href = event.target.value;
      if (!options.some((o) => o.href === href)) return;
      setSaved(href); try { localStorage.setItem(key, href); } catch { /* current view only */ }
    }} />
    <a className="btn btn--secondary" href={selected.href}>{`فتح ${selected.label}`}</a>
  </Card>;
}
