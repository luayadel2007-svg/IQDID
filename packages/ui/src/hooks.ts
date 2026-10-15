import { useCallback, useEffect, useRef, useState } from 'react';

export type ThemeName = 'light' | 'dark' | 'system';
const THEME_KEY = 'iqdid-demo-theme';
const THEME_EVENT = 'iqdid-theme-change';
const readStoredTheme = (): ThemeName => {
  try { const v = window.localStorage.getItem(THEME_KEY); return v === 'light' || v === 'dark' ? v : 'system'; }
  catch { return 'system'; }
};
const systemTheme = (): 'light' | 'dark' =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
/** All mounted consumers share preference; system changes apply while in system mode. */
export function useTheme(): { theme: ThemeName; resolvedTheme: 'light' | 'dark'; setTheme: (t: ThemeName) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<ThemeName>(readStoredTheme);
  const [system, setSystem] = useState(systemTheme);
  useEffect(() => {
    const sync = (event: Event) => {
      const preference: unknown = event instanceof CustomEvent ? event.detail : undefined;
      setThemeState(preference === 'light' || preference === 'dark' || preference === 'system' ? preference : readStoredTheme());
    };
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const changed = () => setSystem(systemTheme());
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener('storage', sync);
    media?.addEventListener('change', changed);
    return () => { window.removeEventListener(THEME_EVENT, sync); window.removeEventListener('storage', sync); media?.removeEventListener('change', changed); };
  }, []);
  const resolvedTheme = theme === 'system' ? system : theme;
  useEffect(() => { document.documentElement.dataset.theme = resolvedTheme; }, [resolvedTheme]);
  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    try { window.localStorage.setItem(THEME_KEY, t); } catch { /* session only */ }
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: t }));
  }, []);
  const toggle = useCallback(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), [resolvedTheme, setTheme]);
  return { theme, resolvedTheme, setTheme, toggle };
}

export interface AsyncState<T> {
  readonly data: T | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  readonly reload: () => void;
}

interface Snapshot<T> {
  readonly key: readonly unknown[];
  readonly data: T | undefined;
  readonly error: unknown;
  readonly settled: boolean;
}

const sameKey = (a: readonly unknown[], b: readonly unknown[]): boolean => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

/**
 * Runs an abortable async loader; re-runs when `deps` change, optionally polls.
 * Results are tied to the deps that produced them, so a deps change never
 * renders the previous deps' data (no stale flash). In-flight requests are
 * cancelled on re-run and unmount; polling refreshes keep the current data.
 */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[], options: { pollMs?: number } = {}): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const key = [...deps, tick];
  const [snap, setSnap] = useState<Snapshot<T>>({ key, data: undefined, error: null, settled: false });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const runKey = key;
    const run = async (): Promise<void> => {
      try {
        const value = await loaderRef.current(controller.signal);
        if (!controller.signal.aborted) setSnap({ key: runKey, data: value, error: null, settled: true });
      } catch (e) {
        if (!controller.signal.aborted) setSnap((prev) => ({ key: runKey, data: sameKey(prev.key, runKey) ? prev.data : undefined, error: e, settled: true }));
      }
    };
    void run();
    const timer = options.pollMs ? setInterval(() => void run(), options.pollMs) : undefined;
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...key, options.pollMs]);

  const current = sameKey(snap.key, key) && snap.settled;
  return { data: current ? snap.data : undefined, error: current ? snap.error : null, loading: !current, reload };
}

/** Seconds remaining until an ISO timestamp, updated every second. */
export function useCountdown(untilIso: string | null | undefined): number | null {
  const compute = useCallback(() => (untilIso ? Math.max(0, Math.ceil((Date.parse(untilIso) - Date.now()) / 1000)) : null), [untilIso]);
  const [left, setLeft] = useState(compute);
  useEffect(() => {
    setLeft(compute());
    if (!untilIso) return undefined;
    const t = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(t);
  }, [untilIso, compute]);
  return left;
}
