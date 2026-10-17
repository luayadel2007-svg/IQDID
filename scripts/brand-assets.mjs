// IQDI brand assets — rasterise the vector masters and build QA sheets with a real browser engine.
// The SVGs in assets/branding/ are the source of truth; every PNG here is derived from them.
// Usage: node scripts/brand-assets.mjs [--png] [--qa <dir>]
//   --png       (re)write assets/branding/png/* and the app icon/favicon files of both apps
//   --qa <dir>  write QA sheets (logo variants on their backgrounds, icon size ladder) to <dir>
import * as pw from 'playwright-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('.');
const brand = path.join(root, 'assets', 'branding');
const args = process.argv.slice(2);
const wantPng = args.includes('--png');
const qaDir = args.includes('--qa') ? path.resolve(args[args.indexOf('--qa') + 1]) : null;

const svg = async (name) => readFile(path.join(brand, name), 'utf8');
const dataUrl = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`;

const browser = await pw.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ deviceScaleFactor: 1 });

/** Renders an SVG at an exact pixel box (transparent unless bg is given) and returns PNG bytes. */
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
    ['iqdi-logo-original.svg', [512, 1024], 1372 / 1040],
    ['iqdi-logo-dark.svg', [512, 1024], 1372 / 1040],
    ['iqdi-logo-monochrome.svg', [1024], 1372 / 1040],
    ['iqdi-mark-original.svg', [256, 512, 1024], 810 / 1040],
    ['iqdi-mark-dark.svg', [256, 512, 1024], 810 / 1040],
    ['iqdi-mark-monochrome.svg', [512], 810 / 1040],
    ['iqdi-icon-small.svg', [16, 24, 32, 48, 64, 128, 256, 512, 1024], 1],
    ['iqdi-app-icon.svg', [16, 24, 32, 48, 64, 128, 256, 512, 1024], 1],
  ];
  for (const [name, widths, ratio] of jobs) {
    const s = await svg(name);
    for (const w of widths) {
      const file = path.join(out, `${name.replace('.svg', '')}-${w}.png`);
      await writeFile(file, await render(s, w, Math.round(w * ratio)));
    }
  }
  // App icons. Maskable: the symbol sits inside the 80 % safe zone on a full-bleed navy square.
  const app = await svg('iqdi-app-icon.svg');
  const small = await svg('iqdi-icon-small.svg');
  const icons = path.join(root, 'apps', 'wallet-web', 'public', 'icons');
  await writeFile(path.join(icons, 'icon-192.png'), await render(app, 192, 192));
  await writeFile(path.join(icons, 'icon-512.png'), await render(app, 512, 512));
  await writeFile(path.join(icons, 'icon-maskable-512.png'), await render(small, 512, 512, '#0B2450', 82));
  await writeFile(path.join(icons, 'apple-touch-icon.png'), await render(small, 180, 180, '#0B2450', 22));
  // Favicons for both apps: the vector app icon (modern browsers) plus a 32 px PNG fallback.
  for (const dir of ['wallet-web', 'verifier-web']) {
    const pub = path.join(root, 'apps', dir, 'public');
    await mkdir(pub, { recursive: true });
    await writeFile(path.join(pub, 'favicon.svg'), app);
    await writeFile(path.join(pub, 'favicon-32.png'), await render(app, 32, 32));
  }
  console.log('PNG derivatives written');
}

if (qaDir) {
  await mkdir(qaDir, { recursive: true });
  const [lo, ld, lm, mo, md, mm, ic, ai] = await Promise.all(['iqdi-logo-original.svg', 'iqdi-logo-dark.svg', 'iqdi-logo-monochrome.svg', 'iqdi-mark-original.svg', 'iqdi-mark-dark.svg', 'iqdi-mark-monochrome.svg', 'iqdi-icon-small.svg', 'iqdi-app-icon.svg'].map(svg));
  const img = (s, w, extra = '') => `<img src="${dataUrl(s)}" style="width:${w}px;display:block;${extra}">`;
  const cell = (bg, inner, label, fg) => `<figure style="margin:0;background:${bg};padding:24px;border-radius:12px;display:grid;place-items:center;gap:10px"><div>${inner}</div><figcaption style="font:600 13px system-ui;color:${fg}">${label}</figcaption></figure>`;
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.setContent(`<body style="margin:0;padding:24px;background:#e9e6df;display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
    ${cell('#F8F6F1', img(lo, 330), 'Logo — Original on ivory #F8F6F1', '#0B2450')}
    ${cell('#0D1B33', img(ld, 330), 'Logo — Dark on night navy #0D1B33', '#EBD9A0')}
    ${cell('#ffffff', img(lm, 330, 'color:#000'), 'Logo — monochrome, black on white', '#000')}
    ${cell('#000000', img(lm.replace('color="#000"', 'color="#fff"'), 330), 'Logo — monochrome, white on black', '#fff')}
  </body>`);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path: path.join(qaDir, 'logo-variants.png'), fullPage: true });

  await page.setContent(`<body style="margin:0;padding:24px;background:#e9e6df;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
    ${cell('#F8F6F1', img(mo, 420), 'Mark — Original', '#0B2450')}
    ${cell('#0D1B33', img(md, 420), 'Mark — Dark', '#EBD9A0')}
    ${cell('#ffffff', img(mm, 420), 'Mark — monochrome', '#000')}
  </body>`);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path: path.join(qaDir, 'mark-variants.png'), fullPage: true });

  // Icon ladder at true pixel sizes (deviceScaleFactor 1) on light and dark UI backgrounds.
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
  const row = (s, bg, fg) => `<div style="display:flex;align-items:flex-end;gap:18px;padding:16px;background:${bg};border-radius:10px">${sizes.map((n) => `<div style="display:grid;justify-items:center;gap:6px">${img(s, n)}<span style="font:12px system-ui;color:${fg}">${n}</span></div>`).join('')}</div>`;
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.setContent(`<body style="margin:0;padding:16px;display:grid;gap:12px;background:#ddd">${row(ai, '#ffffff', '#333')}${row(ai, '#1f2430', '#ddd')}${row(ic, '#ffffff', '#333')}${row(ic, '#0D1B33', '#ddd')}</body>`);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path: path.join(qaDir, 'icon-ladder.png'), fullPage: true });
  console.log('QA sheets written to', qaDir);
}
await browser.close();
