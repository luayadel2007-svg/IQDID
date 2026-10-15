export type IconName = 'home' | 'card' | 'inbox' | 'clock' | 'settings' | 'chart' | 'plus' | 'folder' | 'check' | 'sun' | 'moon';
const paths: Record<IconName, string> = {
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z', card: 'M3 5h18v14H3ZM3 10h18M7 15h4',
  inbox: 'M3 4h18v16H3ZM3 13h5l2 3h4l2-3h5', clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  settings: 'M4 7h16M4 17h16M9 4v6M15 14v6', chart: 'M4 3v18h17M8 17v-5M13 17V7M18 17v-8',
  plus: 'M12 4v16M4 12h16', folder: 'M3 6h7l2 3h9v11H3Z', check: 'm5 12 5 5L20 7',
  sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11',
};
export function Icon({ name }: { name: IconName }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
