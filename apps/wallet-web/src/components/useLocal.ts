import { useEffect, useState } from 'react';
import { LOCAL_EVENT } from '../local.ts';

/** Re-reads an allow-listed local preference when it changes in this tab or another. */
export function useLocal<T>(read: () => T): T {
  const [v, setV] = useState(read);
  useEffect(() => {
    const sync = () => setV(read());
    window.addEventListener(LOCAL_EVENT, sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener(LOCAL_EVENT, sync); window.removeEventListener('storage', sync); };
  }, [read]);
  return v;
}
