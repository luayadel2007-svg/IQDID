/** Design tokens (mirrored as CSS custom properties in styles.css). */
export const tokens = {
  color: {
    light: {
      bg: '#f4f6fb', surface: '#ffffff', surfaceAlt: '#eef2f9', text: '#0f1b2d', textMuted: '#4a5a72',
      border: '#d5dce8', primary: '#1446a0', primaryText: '#ffffff', navy: '#0b1f3a',
      success: '#0e6b38', warning: '#8a5300', danger: '#b42318', info: '#1446a0', focus: '#f2b705',
    },
    dark: {
      bg: '#08111f', surface: '#101c31', surfaceAlt: '#16253f', text: '#e8eef8', textMuted: '#a9b6cb',
      border: '#26375a', primary: '#8fb0ff', primaryText: '#08111f', navy: '#050c18',
      success: '#5fd394', warning: '#f4c26b', danger: '#ff8a80', info: '#8fb0ff', focus: '#f2b705',
    },
  },
  font: { family: '"Noto Sans Arabic", "Segoe UI", Tahoma, Arial, system-ui, sans-serif', size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28 } },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 },
  radius: { sm: 6, md: 10, lg: 16, pill: 999 },
  shadow: { sm: '0 1px 2px rgb(11 31 58 / 8%)', md: '0 6px 18px rgb(11 31 58 / 12%)' },
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
