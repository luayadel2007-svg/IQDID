// IQDI «People First» brand assets — rasterise the vector masters and build QA sheets in a real browser engine.
// The SVGs in assets/branding/people-first/ are the source of truth; every PNG here is derived from them.
// Usage: node scripts/brand-assets.mjs [--png] [--qa <dir>]
//   --png       (re)write assets/branding/people-first/png/*, the wallet PWA icons and both apps' favicons
//   --qa <dir>  write QA sheets (variants on their backgrounds, the size ladder, small sizes ×8) to <dir>
import * as pw from 'playwright-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.');
const brand = path.join(root, 'assets', 'branding', 'people-first');
const args = process.argv.slice(2);
const wantPng = args.includes('--png');
const qaDir = args.includes('--qa') ? path.resolve(args[args.indexOf('--qa') + 1]) : null;

const svg = async (name) => readFile(path.join(brand, name), 'utf8');
const dataUrl = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`;
const ratioOf = (s) => { const [, , w, h] = /viewBox="([^"]+)"/.exec(s)[1].split(/\s+/).map(Number); return h / w; };
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

const browser = await pw.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ deviceScaleFactor: 1 });

/** Renders an SVG into an exact pixel box (transparent unless bg is given) and returns PNG bytes. */
async function render(svgText, width, height, bg = 'transparent', pad = 0) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:${bg}">
    <img src="${dataUrl(svgText)}" style="display:block;width:${width - 2 * pad}px;height:${height - 2 * pad}px;object-fit:contain;margin:${pad}px"></body></html>`);
  await page.waitForFunction(() => document.images[0]?.complete && document.images[0].naturalWidth > 0);
  return page.screenshot({ omitBackground: bg === 'transparent', clip: { x: 0, y: 0, width, height } });
}

if (wantPng) {
  const out = path.join(brand, 'png');
  await mkdir(out, { recursive: true });
  const jobs = [
    ['iqdi-primary-light.svg', [512, 1024]], ['iqdi-primary-dark.svg', [512, 1024]], ['iqdi-primary-monochrome.svg', [1024]],
    ['iqdi-horizontal-light.svg', [480, 960]], ['iqdi-horizontal-dark.svg', [480, 960]], ['iqdi-horizontal-monochrome.svg', [960]],
    ['iqdi-symbol-light.svg', [128, 256, 512, 1024]], ['iqdi-symbol-dark.svg', [128, 256, 512, 1024]], ['iqdi-symbol-monochrome.svg', [512]],
    ['iqdi-symbol-compact.svg', [16, 24, 32]], ['iqdi-symbol-compact-dark.svg', [16, 24, 32]],
    ['iqdi-app-icon-light.svg', SIZES], ['iqdi-app-icon-dark.svg', SIZES],
  ];
  for (const [name, widths] of jobs) {
    const s = await svg(name);
    const ratio = ratioOf(s);
    for (const w of widths) await writeFile(path.join(out, `${name.replace('.svg', '')}-${w}.png`), await render(s, w, Math.round(w * ratio)));
  }
  // Wallet PWA icons. Maskable: full-bleed off-white, symbol inside the central 80 % safe zone.
  const icon = await svg('iqdi-app-icon-light.svg');
  const sym = await svg('iqdi-symbol-light.svg');
  const icons = path.join(root, 'apps', 'wallet-web', 'public', 'icons');
  await writeFile(path.join(icons, 'icon-192.png'), await render(icon, 192, 192));
  await writeFile(path.join(icons, 'icon-512.png'), await render(icon, 512, 512));
  await writeFile(path.join(icons, 'icon-maskable-512.png'), await render(sym, 512, 512, '#F8F7F4', 92));
  await writeFile(path.join(icons, 'apple-touch-icon.png'), await render(sym, 180, 180, '#F8F7F4', 26));
  // Favicons for both apps: the vector favicon plus a 32 px PNG built from the compact mark on its tile.
  const fav = await svg('iqdi-favicon.svg');
  for (const dir of ['wallet-web', 'verifier-web']) {
    const pub = path.join(root, 'apps', dir, 'public');
    await mkdir(pub, { recursive: true });
    await writeFile(path.join(pub, 'favicon.svg'), fav);
    await writeFile(path.join(pub, 'favicon-32.png'), await render(fav, 32, 32));
  }
  console.log('PNG derivatives written');
}

if (qaDir) {
  await mkdir(qaDir, { recursive: true });
  const names = ['iqdi-primary-light.svg', 'iqdi-primary-dark.svg', 'iqdi-primary-monochrome.svg', 'iqdi-horizontal-light.svg', 'iqdi-horizontal-dark.svg', 'iqdi-horizontal-monochrome.svg',
    'iqdi-symbol-light.svg', 'iqdi-symbol-dark.svg', 'iqdi-symbol-monochrome.svg', 'iqdi-symbol-compact.svg', 'iqdi-symbol-compact-dark.svg', 'iqdi-app-icon-light.svg', 'iqdi-app-icon-dark.svg'];
  const s = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await svg(n)])));
  const white = (t) => t.replace('color="#000"', 'color="#fff"');
  const img = (t, w) => `<img src="${dataUrl(t)}" style="width:${w}px;display:block">`;
  const cell = (bg, inner, label, fg) => `<figure style="margin:0;background:${bg};padding:22px;border-radius:12px;display:grid;place-items:center;gap:10px"><div>${inner}</div><figcaption style="font:600 13px system-ui;color:${fg}">${label}</figcaption></figure>`;
  const shot = async (file, html, width = 1600) => {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(html);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    await page.screenshot({ path: path.join(qaDir, file), fullPage: true });
  };
  await shot('primary-variants.png', `<body style="margin:0;padding:20px;background:#e6e4df;display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
    ${cell('#F8F7F4', img(s['iqdi-primary-light.svg'], 320), 'Primary — Light on off-white #F8F7F4', '#0B2A4A')}
    ${cell('#0B1F38', img(s['iqdi-primary-dark.svg'], 320), 'Primary — Dark on night navy #0B1F38', '#E0B867')}
    ${cell('#ffffff', img(s['iqdi-primary-monochrome.svg'], 320), 'Primary — monochrome, black on white', '#000')}
    ${cell('#000000', img(white(s['iqdi-primary-monochrome.svg']), 320), 'Primary — monochrome, white on black', '#fff')}</body>`);
  await shot('horizontal-and-symbols.png', `<body style="margin:0;padding:20px;background:#e6e4df;display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
    ${cell('#F8F7F4', img(s['iqdi-horizontal-light.svg'], 420), 'Horizontal — Light', '#0B2A4A')}
    ${cell('#0B1F38', img(s['iqdi-horizontal-dark.svg'], 420), 'Horizontal — Dark', '#E0B867')}
    ${cell('#ffffff', img(s['iqdi-horizontal-monochrome.svg'], 420), 'Horizontal — monochrome', '#000')}
    ${cell('#F8F7F4', img(s['iqdi-symbol-light.svg'], 300), 'Symbol — Light', '#0B2A4A')}
    ${cell('#0B1F38', img(s['iqdi-symbol-dark.svg'], 300), 'Symbol — Dark', '#E0B867')}
    ${cell('#000000', img(white(s['iqdi-symbol-monochrome.svg']), 300), 'Symbol — monochrome, white on black', '#fff')}
    ${cell('#F8F7F4', img(s['iqdi-symbol-compact.svg'], 300), 'Compact mark — Light (≤ 24 px)', '#0B2A4A')}
    ${cell('#0B1F38', img(s['iqdi-symbol-compact-dark.svg'], 300), 'Compact mark — Dark (≤ 24 px)', '#E0B867')}
    ${cell('#dcdcdc', `<div style="display:flex;gap:20px">${img(s['iqdi-app-icon-light.svg'], 180)}${img(s['iqdi-app-icon-dark.svg'], 180)}</div>`, 'App icons — Light and Dark', '#222')}</body>`);
  // Size ladder at true pixel sizes (deviceScaleFactor 1) on light and dark UI backgrounds.
  const ladder = [16, 24, 32, 48, 64, 128, 256, 512];
  const row = (pick, bg, fg) => `<div style="display:flex;align-items:flex-end;gap:16px;padding:14px;background:${bg};border-radius:10px">${ladder.map((n) => `<div style="display:grid;justify-items:center;gap:6px">${img(pick(n), n)}<span style="font:12px system-ui;color:${fg}">${n}</span></div>`).join('')}</div>`;
  const symLight = (n) => (n <= 24 ? s['iqdi-symbol-compact.svg'] : s['iqdi-symbol-light.svg']);
  const symDark = (n) => (n <= 24 ? s['iqdi-symbol-compact-dark.svg'] : s['iqdi-symbol-dark.svg']);
  await shot('size-ladder.png', `<body style="margin:0;padding:14px;display:grid;gap:10px;background:#d6d6d6">
    ${row(() => s['iqdi-app-icon-light.svg'], '#ffffff', '#333')}${row(() => s['iqdi-app-icon-dark.svg'], '#1f2430', '#ddd')}
    ${row(symLight, '#F8F7F4', '#333')}${row(symDark, '#0B1F38', '#ddd')}</body>`, 1360);
  console.log('QA sheets written to', qaDir);
}
await browser.close();
