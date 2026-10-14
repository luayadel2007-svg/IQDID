import { useCallback, useEffect, useRef, useState } from 'react';

export type ThemeName = 'light' | 'dark';
const THEME_KEY = 'iqdid-demo-theme';

const readStoredTheme = (): ThemeName | null => {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
};

const systemTheme = (): ThemeName =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/** Light/dark theme applied to <html data-theme>; remembered per browser (convenience only). */
export function useTheme(): { theme: ThemeName; setTheme: (t: ThemeName) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<ThemeName>(() => readStoredTheme() ?? systemTheme());
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage unavailable — theme still applies for this page */
    }
  }, [theme]);
  const setTheme = useCallback((t: ThemeName) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, setTheme, toggle };
}

export interface AsyncState<T> {
  readonly data: T | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  readonly reload: () => void;
}

/**
 * Runs an abortable async loader; re-runs when `deps` change, optionally polls.
 * Previous in-flight requests are cancelled on re-run and unmount.
 */
export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[], options: { pollMs?: number } = {}): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let first = true;
    const run = async (): Promise<void> => {
      if (first) setLoading(true);
      try {
        const value = await loaderRef.current(controller.signal);
        if (!controller.signal.aborted) {
          setData(value);
          setError(null);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e);
      } finally {
        if (!controller.signal.aborted && first) setLoading(false);
        first = false;
      }
    };
    void run();
    const timer = options.pollMs ? setInterval(() => void run(), options.pollMs) : undefined;
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, options.pollMs]);

  return { data, error, loading, reload };
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
