import { useEffect, useState } from 'react';
import { Card, SegmentedControl, Select, Switch } from './components.tsx';
import { useTheme, type ThemeName } from './hooks.ts';
const KEY = 'iqdid-appearance-v1';
const EVENT = 'iqdid-appearance-change';
/** v1 storage stays readable: `motion` is optional and defaults to following the OS. */
export interface Appearance { text: 'normal' | 'large' | 'larger'; glass: boolean; motion: 'system' | 'reduced' }
const read = (): Appearance => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Partial<Appearance>;
    return { text: v.text === 'large' || v.text === 'larger' ? v.text : 'normal', glass: v.glass !== false, motion: v.motion === 'reduced' ? 'reduced' : 'system' };
  } catch { return { text: 'normal', glass: true, motion: 'system' }; }
};
export function useAppearance() {
  const [value, setValue] = useState(read);
  useEffect(() => {
    const sync = (event: Event) => setValue(event instanceof CustomEvent ? event.detail as Appearance : read());
    window.addEventListener(EVENT, sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.text = value.text;
    root.dataset.glass = value.glass ? 'on' : 'off';
    root.dataset.motion = value.motion;
  }, [value]);
  const update = (next: Appearance) => {
    setValue(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* session only */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  };
  return { value, update };
}
const THEMES: ReadonlyArray<{ value: ThemeName; label: string; icon: 'sun' | 'moon' | 'monitor' }> = [
  { value: 'light', label: 'فاتح', icon: 'sun' }, { value: 'dark', label: 'داكن', icon: 'moon' }, { value: 'system', label: 'تلقائي', icon: 'monitor' },
];
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const { value, update } = useAppearance();
  return <Card title="المظهر وإمكانية الوصول" icon="eye">
    <div className="field">
      <span className="field__label">المظهر</span>
      <SegmentedControl label="اختيار المظهر" value={theme} options={THEMES} onChange={setTheme} />
    </div>
    <Select label="حجم النص" value={value.text} onChange={(e) => update({ ...value, text: e.target.value === 'larger' ? 'larger' : e.target.value === 'large' ? 'large' : 'normal' })} options={[{ value: 'normal', label: 'عادي' }, { value: 'large', label: 'كبير' }, { value: 'larger', label: 'كبير جداً' }]} />
    <Switch label="تقليل الشفافية والتمويه" hint="أسطح صلبة بدل الزجاج المموّه في الشريط والتنقل." checked={!value.glass} onChange={(on) => update({ ...value, glass: !on })} />
    <Switch label="تقليل الحركة" hint="يوقف الحركات الانتقالية. يُحترم إعداد الجهاز دائماً." checked={value.motion === 'reduced'} onChange={(on) => update({ ...value, motion: on ? 'reduced' : 'system' })} />
    <p className="small muted" style={{ marginTop: 'var(--sp-3)' }}>تُحفظ تفضيلات العرض فقط على هذا المتصفح، ولا تُرسل إلى أي خادم.</p>
  </Card>;
}
