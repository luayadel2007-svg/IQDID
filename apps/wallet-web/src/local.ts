/** Per-browser wallet conveniences. Only allow-listed ids/flags are stored — never claims or personal data. */
const read = (key: string): string | null => { try { return window.localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string): void => { try { window.localStorage.setItem(key, value); } catch { /* current view only */ } };
const EVENT = 'iqdid-wallet-local';
const emit = () => window.dispatchEvent(new Event(EVENT));
export const LOCAL_EVENT = EVENT;

const ONBOARDED = 'iqdid-wallet-onboarded';
export const isOnboarded = (): boolean => read(ONBOARDED) === 'yes';
export const setOnboarded = (on: boolean): void => { write(ONBOARDED, on ? 'yes' : 'no'); emit(); };

export const SERVICES = [
  { id: 'card', href: '/card', label: 'بطاقتي', icon: 'card' },
  { id: 'credentials', href: '/credentials', label: 'الاعتمادات', icon: 'folder' },
  { id: 'requests', href: '/requests', label: 'الطلبات', icon: 'inbox' },
  { id: 'qr', href: '/qr', label: 'رمز QR', icon: 'qr' },
  { id: 'activity', href: '/activity', label: 'السجل', icon: 'clock' },
  { id: 'notifications', href: '/notifications', label: 'الإشعارات', icon: 'bell' },
  { id: 'help', href: '/help', label: 'المساعدة', icon: 'help' },
  { id: 'settings', href: '/settings', label: 'الإعدادات', icon: 'settings' },
] as const;
export type ServiceId = (typeof SERVICES)[number]['id'];
const FAVORITES = 'iqdid-wallet-favorites';
const DEFAULT_FAVORITES: readonly ServiceId[] = ['card', 'credentials', 'requests', 'qr', 'activity', 'help'];
export const MAX_FAVORITES = 6;
export function readFavorites(): ServiceId[] {
  try {
    const raw: unknown = JSON.parse(read(FAVORITES) ?? 'null');
    if (!Array.isArray(raw)) return [...DEFAULT_FAVORITES];
    const ids = SERVICES.map((s) => s.id as string);
    return [...new Set(raw.filter((v): v is ServiceId => typeof v === 'string' && ids.includes(v)))].slice(0, MAX_FAVORITES);
  } catch { return [...DEFAULT_FAVORITES]; }
}
export const writeFavorites = (ids: readonly ServiceId[]): void => { write(FAVORITES, JSON.stringify(ids.slice(0, MAX_FAVORITES))); emit(); };

const READ = 'iqdid-wallet-notifications-read';
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;
export function readNotificationIds(): Set<string> {
  try {
    const raw: unknown = JSON.parse(read(READ) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string' && ID_RE.test(v)).slice(-200) : []);
  } catch { return new Set(); }
}
export const writeNotificationIds = (ids: Iterable<string>): void => { write(READ, JSON.stringify([...ids].filter((v) => ID_RE.test(v)).slice(-200))); emit(); };
