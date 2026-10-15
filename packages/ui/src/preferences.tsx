import { useEffect, useState } from 'react';
import { Card, Select } from './components.tsx';
import { useTheme } from './hooks.ts';
const KEY = 'iqdid-appearance-v1';
const EVENT = 'iqdid-appearance-change';
interface Appearance { text: 'normal' | 'large' | 'larger'; glass: boolean }
const read = (): Appearance => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Partial<Appearance>;
    return { text: v.text === 'large' || v.text === 'larger' ? v.text : 'normal', glass: v.glass !== false };
  } catch { return { text: 'normal', glass: true }; }
};
export function useAppearance() {
  const [value, setValue] = useState(read);
  useEffect(() => {
    const sync = (event: Event) => setValue(event instanceof CustomEvent ? event.detail as Appearance : read());
    window.addEventListener(EVENT, sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.text = value.text;
    document.documentElement.dataset.glass = value.glass ? 'on' : 'off';
  }, [value]);
  const update = (next: Appearance) => {
    setValue(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* session only */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  };
  return { value, update };
}
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { value, update } = useAppearance();
  return <Card title="المظهر وإمكانية الوصول">
    <div className="row" role="group" aria-label="اختيار المظهر">
      {(['light', 'dark', 'system'] as const).map((t, i) => <button key={t} className="btn btn--secondary" aria-pressed={theme === t} onClick={() => setTheme(t)}>{['فاتح', 'داكن', 'تلقائي'][i]}</button>)}
    </div>
    <Select label="حجم النص" value={value.text} onChange={(e) => update({ ...value, text: e.target.value === 'larger' ? 'larger' : e.target.value === 'large' ? 'large' : 'normal' })} options={[{ value: 'normal', label: 'عادي' }, { value: 'large', label: 'كبير' }, { value: 'larger', label: 'كبير جداً' }]} />
    <label className="row"><input type="checkbox" checked={!value.glass} onChange={(e) => update({ ...value, glass: !e.target.checked })} /> تقليل الشفافية والتمويه</label>
    <p className="small muted">تُحفظ تفضيلات العرض فقط على هذا المتصفح. تتبع الحركة إعداد تقليل الحركة في جهازك.</p>
  </Card>;
}
