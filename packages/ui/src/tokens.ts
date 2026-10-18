/** Design tokens (mirrored as CSS custom properties in styles.css). */
export const tokens = {
  color: {
    light: {
      bg: '#f2f5fb', surface: '#ffffff', surfaceAlt: '#edf2fa', text: '#0a1630', textMuted: '#475672',
      border: '#d9e1ee', primary: '#1a46b8', primaryText: '#ffffff', navy: '#081a36', accent: '#0b6e8f',
      success: '#0b6b3a', warning: '#8a5300', danger: '#b42318', info: '#1a46b8', focus: '#f2b705',
    },
    dark: {
      bg: '#050c1a', surface: '#0d182d', surfaceAlt: '#13223f', text: '#eaf0fb', textMuted: '#a8b5cc',
      border: '#22355a', primary: '#8eb2ff', primaryText: '#06112a', navy: '#030812', accent: '#67d4f0',
      success: '#5fd394', warning: '#f4c26b', danger: '#ff8f86', info: '#8eb2ff', focus: '#f2b705',
    },
  },
  /** IQDI «People First» brand palette (assets/branding/people-first). Gold is for artwork and large display text only: it fails WCAG AA as small text on light backgrounds. */
  brand: { navy: '#0B2A4A', blue: '#1565C0', gold: '#D4A853', goldOnDark: '#E0B867', offWhite: '#F8F7F4', night: '#0B1F38' },
  gradient: { brand: 'linear-gradient(135deg, #0a2350 0%, #1a46b8 55%, #2d6ae0 100%)' },
  font: { family: '"Noto Sans Arabic", "Segoe UI", Tahoma, Arial, system-ui, sans-serif', size: { xs: 13, sm: 14, md: 16, lg: 18, xl: 22, xxl: 30 } },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 },
  radius: { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 },
  shadow: { sm: '0 1px 2px rgb(8 26 54 / 6%), 0 1px 1px rgb(8 26 54 / 4%)', md: '0 10px 30px -12px rgb(8 26 54 / 22%)', lg: '0 24px 60px -24px rgb(8 26 54 / 35%)' },
  motion: { fast: 160, base: 220, slow: 320, easing: 'cubic-bezier(.2,.7,.2,1)' },
  breakpoint: { sm: 480, md: 768, lg: 1024, xl: 1280 },
} as const;

export type ThemeName = keyof typeof tokens.color;

/** WCAG relative-luminance contrast ratio for two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string): number => {
    const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = n.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Design System V3 credential-card palette (light / dark). Text colours are checked against both gradient stops in ui.test.tsx. */
export const cardPalette = {
  light: {
    text: '#0a1630', muted: '#33415c',
    id: ['#dbe7ff', '#bcd2ff'], licence: ['#d4f1ec', '#b3e4dc'], residence: ['#f6ead2', '#ebd6ac'], health: ['#fbe0e3', '#f4c3ca'], education: ['#e8defa', '#d4c2f4'],
  },
  dark: {
    text: '#eaf0fb', muted: '#c3cde0',
    id: ['#10264f', '#173a7a'], licence: ['#0c3532', '#12514b'], residence: ['#3a2c12', '#574119'], health: ['#3d1720', '#5a2230'], education: ['#2a1a4d', '#3d2870'],
  },
} as const;

