export type IconName =
  | 'home' | 'card' | 'inbox' | 'clock' | 'settings' | 'chart' | 'plus' | 'folder' | 'check' | 'sun' | 'moon'
  | 'shield' | 'qr' | 'bell' | 'help' | 'star' | 'search' | 'filter' | 'x' | 'alert' | 'info' | 'chevron'
  | 'eye' | 'eye-off' | 'lock' | 'wifi-off' | 'refresh' | 'monitor' | 'user' | 'building' | 'file' | 'send' | 'list' | 'sparkle';
const paths: Record<IconName, string> = {
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z', card: 'M3 5h18v14H3ZM3 10h18M7 15h4',
  inbox: 'M3 4h18v16H3ZM3 13h5l2 3h4l2-3h5', clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  settings: 'M4 7h16M4 17h16M9 4v6M15 14v6', chart: 'M4 3v18h17M8 17v-5M13 17V7M18 17v-8',
  plus: 'M12 4v16M4 12h16', folder: 'M3 6h7l2 3h9v11H3Z', check: 'm5 12 5 5L20 7',
  sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6Zm-3.5 9 2.5 2.5 4.5-5',
  qr: 'M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h2v2h-2ZM18 14h2M14 18h2v2M18 18h2v2h-2',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4ZM10 21h4',
  help: 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14ZM20 20l-4-4',
  filter: 'M4 5h16l-6 8v6l-4-2v-4Z', x: 'M6 6l12 12M18 6 6 18',
  alert: 'M12 4 2.5 20h19ZM12 10v4M12 17v.01', info: 'M12 11v6M12 7.5v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  chevron: 'm15 6-6 6 6 6',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off': 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  lock: 'M5 11h14v10H5ZM8 11V8a4 4 0 1 1 8 0v3', 'wifi-off': 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M19 13a10 10 0 0 0-2.4-1.7M2 9.5a15 15 0 0 1 4.5-2.8M22 9.5A15 15 0 0 0 11 5.1M12 20v.01',
  refresh: 'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
  monitor: 'M3 4h18v12H3ZM8 20h8M12 16v4', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  building: 'M4 21V5l8-3 8 3v16ZM9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4', file: 'M6 3h8l4 4v14H6ZM14 3v4h4M9 12h6M9 16h6',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4Z', list: 'M8 6h12M8 12h12M8 18h12M4 6v.01M4 12v.01M4 18v.01',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8ZM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8Z',
};
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
