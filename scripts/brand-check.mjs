// IQDI brand integration checks in a real browser against the production builds (TEST ONLY, synthetic data).
// Verifies what users and browsers actually load: favicons, PWA icons, the header symbol, Original/Dark
// artwork switching, logo placement on welcome/about screens, accessible naming and broken images.
// Usage: npm run build && node scripts/brand-check.mjs   Evidence → evidence/<IQDID_BRAND_DIR | branding/check>/brand.json
import * as pw from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startStack } from './stack.mjs';

const out = path.resolve('evidence', process.env.IQDID_BRAND_DIR ?? 'branding/check');
await mkdir(out, { recursive: true });
const results = [];
const step = (name, ok, detail = '') => { results.push({ name, outcome: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };
const pngSize = (buf) => (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47 ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : null);

const stack = startStack({ preview: true, env: { DEMO_LATENCY_MS: '0', DEMO_SESSION_TTL_MS: '600000' }, onLine: () => {} });
let browser;
try {
  await stack.ready();
  const api = `${stack.urls.api}/demo-api/v1`;
  const post = (p, b) => fetch(api + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b ?? {}) }).then((r) => r.json());
  await post('/demo/reset');
  const pending = await post('/verifier/sessions', { organizationId: 'org-test-a', templateId: 'IDENTITY_BASIC', purpose: 'فحص الهوية البصرية' });
  const URL_OF = { wallet: stack.urls.wallet, verifier: stack.urls.verifier };

  // 1. Static assets served by the built apps.
  for (const app of ['wallet', 'verifier']) {
    const html = await (await fetch(URL_OF[app] + '/')).text();
    step(`${app}: index.html links the SVG favicon and a 32px PNG fallback`, html.includes('href="/favicon.svg"') && html.includes('href="/favicon-32.png"'));
    step(`${app}: no inline data-URI favicon left`, !/rel="icon" href="data:/.test(html));
    const svg = await fetch(URL_OF[app] + '/favicon.svg');
    const svgText = await svg.text();
    step(`${app}: /favicon.svg served as SVG`, svg.ok && /image\/svg\+xml/.test(svg.headers.get('content-type') ?? '') && svgText.includes('<svg'), `${svg.status} ${svg.headers.get('content-type')}`);
    const png = Buffer.from(await (await fetch(URL_OF[app] + '/favicon-32.png')).arrayBuffer());
    const s = pngSize(png);
    step(`${app}: /favicon-32.png is a 32×32 PNG`, s?.w === 32 && s?.h === 32, JSON.stringify(s));
  }
  const manifest = await (await fetch(stack.urls.wallet + '/manifest.webmanifest')).json();
  for (const icon of manifest.icons) {
    const buf = Buffer.from(await (await fetch(stack.urls.wallet + icon.src)).arrayBuffer());
    const s = pngSize(buf);
    step(`wallet manifest icon ${icon.src} (${icon.purpose}) matches ${icon.sizes}`, s !== null && `${s.w}x${s.h}` === icon.sizes, JSON.stringify(s));
  }
  step('wallet manifest has a maskable icon and the IQDI theme colour', manifest.icons.some((i) => i.purpose === 'maskable') && manifest.theme_color === '#0B2A4A');
  const apple = pngSize(Buffer.from(await (await fetch(stack.urls.wallet + '/icons/apple-touch-icon.png')).arrayBuffer()));
  step('wallet apple-touch-icon is 180×180', apple?.w === 180 && apple?.h === 180, JSON.stringify(apple));

  browser = await pw.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  // 2. Header symbol at phone, tablet and desktop widths, light and dark.
  for (const app of ['wallet', 'verifier']) {
    for (const width of [320, 768, 1440]) {
      for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ar' });
        await ctx.addInitScript((t) => { try { localStorage.setItem('iqdid-demo-theme', t); } catch { /* ignore */ } }, theme);
        const page = await ctx.newPage();
        await page.goto(URL_OF[app] + '/');
        await page.locator('main h1').first().waitFor();
        const r = await page.evaluate(() => {
          const header = document.querySelector('header.shell__header');
          const imgs = [...(header?.querySelectorAll('img.iqdi-brand') ?? [])];
          const img = imgs[0];
          if (!header || !img) return { count: imgs.length };
          const h = header.getBoundingClientRect(), b = img.getBoundingClientRect();
          const name = header.querySelector('.shell__brand > span')?.getBoundingClientRect();
          const overlapsName = name ? !(b.right <= name.left || b.left >= name.right || b.bottom <= name.top || b.top >= name.bottom) : true;
          return { count: imgs.length, loaded: img.complete && img.naturalWidth > 0, w: Math.round(b.width), h: Math.round(b.height),
            inside: b.left >= h.left - 0.5 && b.right <= h.right + 0.5 && b.top >= h.top - 0.5 && b.bottom <= h.bottom + 0.5,
            overlapsName, alt: img.getAttribute('alt'), hidden: img.getAttribute('aria-hidden') };
        });
        const ok = r.count === 1 && r.loaded && r.inside && !r.overlapsName && r.w >= 32 && r.w <= 44 && Math.abs(r.h - Math.round(r.w * 660 / 640)) <= 1 && r.alt === '' && r.hidden === 'true';
        step(`${app} ${width}px ${theme}: header symbol loaded, ${r.w}px, inside header, not over the app name, decorative`, ok, JSON.stringify(r));
        // The app name is announced once: the header's accessible text holds it exactly once.
        // Text plus every exposed alt/aria-label in the header: the product name must occur exactly once.
        const named = await page.evaluate((n) => {
          const h = document.querySelector('header.shell__header');
          const exposed = [...h.querySelectorAll('[alt], [aria-label]')].filter((e) => e.getAttribute('aria-hidden') !== 'true').map((e) => e.getAttribute('alt') ?? e.getAttribute('aria-label'));
          return [h.textContent ?? '', ...exposed].join(' ').split(n).length - 1;
        }, app === 'wallet' ? 'IQDI Wallet' : 'IQDI Verifier');
        step(`${app} ${width}px ${theme}: app name announced once in the header`, named === 1, `count=${named}`);
        await ctx.close();
      }
    }
  }

  // 3. Original / Dark artwork follows the theme, including a live toggle.
  for (const [app, route, variant] of [['wallet', '/welcome', 'logo'], ['wallet', '/settings', 'horizontal'], ['verifier', '/settings', 'horizontal']]) {
    for (const width of [320, 390, 820, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ar' });
      await ctx.addInitScript(() => { try { localStorage.setItem('iqdid-demo-theme', 'light'); } catch { /* ignore */ } });
      const page = await ctx.newPage();
      await page.goto(URL_OF[app] + route);
      await page.locator('main h1').first().waitFor();
      const img = page.locator(`main img.iqdi-brand--${variant}`);
      await img.waitFor();
      const read = () => img.evaluate((e) => ({ loaded: e.complete && e.naturalWidth > 0, src: e.getAttribute('src') ?? '', tone: e.dataset.tone, alt: e.getAttribute('alt'), w: e.getBoundingClientRect().width, right: e.getBoundingClientRect().right, left: e.getBoundingClientRect().left, vw: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }));
      await page.waitForFunction((v) => { const e = document.querySelector(`main img.iqdi-brand--${v}`); return e && e.complete && e.naturalWidth > 0; }, variant);
      const light = await read();
      step(`${app} ${route} ${width}px: ${variant} loads (People First, Light), named for screen readers, inside the viewport, no overflow`,
        light.loaded && light.tone === 'light' && /people-first|iqdi-(primary|horizontal)-light-/.test(light.src) && /-light-[^/]*\.svg$/.test(light.src) && /IQDI/.test(light.alt ?? '') && light.left >= 0 && light.right <= light.vw && !light.overflow, JSON.stringify({ ...light, src: light.src.slice(-40) }));
      if (width === 390) {
        await page.locator('header').getByRole('button', { name: /الوضع|داكن|فاتح/ }).first().click();
        await page.waitForFunction((v) => document.querySelector(`main img.iqdi-brand--${v}`)?.getAttribute('data-tone') === 'dark', variant);
        await page.waitForFunction((v) => { const e = document.querySelector(`main img.iqdi-brand--${v}`); return e && e.complete && e.naturalWidth > 0; }, variant);
        const dark = await read();
        step(`${app} ${route}: live theme toggle swaps to the Dark artwork`, dark.loaded && /-dark-[^/]*\.svg$/.test(dark.src) && dark.alt === light.alt, JSON.stringify({ tone: dark.tone, src: dark.src.slice(-40) }));
      }
      await ctx.close();
    }
  }

  // 3b. Verifier sidebar lockup: decorative, inside the sidebar on desktop; hidden when the sidebar turns into a tab bar.
  for (const [width, height] of [[1440, 900], [1920, 1200], [1280, 720], [1024, 640], [820, 1180]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'ar' });
    const page = await ctx.newPage();
    await page.goto(stack.urls.verifier + '/');
    await page.locator('main h1').first().waitFor();
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const r = await page.evaluate(() => {
      const img = document.querySelector('nav .vf-nav__brand img.iqdi-brand--horizontal');
      if (!img) return { present: false };
      const shown = getComputedStyle(img.parentElement).display !== 'none';
      const b = img.getBoundingClientRect(), n = img.closest('nav').getBoundingClientRect();
      return { present: true, shown, loaded: img.complete && img.naturalWidth > 0, alt: img.getAttribute('alt'), hidden: img.getAttribute('aria-hidden'),
        inside: b.left >= n.left - 0.5 && b.right <= n.right + 0.5 && b.bottom <= Math.min(n.bottom, innerHeight) + 0.5, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    const expectShown = width > 860 && height > 760;
    const ok = r.present && r.alt === '' && r.hidden === 'true' && !r.overflow && (expectShown ? r.shown && r.loaded && r.inside : !r.shown);
    step(`verifier ${width}x${height}: sidebar lockup ${expectShown ? 'fully visible inside the sidebar' : 'hidden (tab bar or short window)'}, decorative, no overflow`, ok, JSON.stringify(r));
    await ctx.close();
  }

  // 4. No broken image or failed same-origin asset on any main route.
  const ROUTES = {
    wallet: ['/', '/welcome', '/cards', '/credentials/cred-test-001?from=cards', '/requests', `/requests/${pending.id}`, '/settings', '/help'],
    verifier: ['/', '/new', '/sessions', `/sessions/${pending.id}`, '/results', '/settings'],
  };
  for (const app of ['wallet', 'verifier']) {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 }, locale: 'ar' });
    const page = await ctx.newPage();
    const failed = [];
    page.on('response', (res) => { if (res.url().startsWith(URL_OF[app]) && res.status() >= 400) failed.push(`${res.status()} ${res.url()}`); });
    for (const route of ROUTES[app]) {
      await page.goto(URL_OF[app] + route);
      await page.locator('main h1').first().waitFor();
      await page.waitForFunction(() => [...document.images].every((i) => i.complete));
      const broken = await page.evaluate(() => [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src')));
      step(`${app} ${route.replace(pending.id, ':pending')}: no broken images`, broken.length === 0, broken.join(', '));
    }
    step(`${app}: no failed same-origin requests across routes`, failed.length === 0, failed.slice(0, 3).join(' | '));
    await ctx.close();
  }
} catch (e) {
  step('harness', false, String(e?.message ?? e).split('\n')[0]);
} finally {
  await browser?.close();
  await stack.stopped();
}
const pass = results.filter((r) => r.outcome === 'PASS').length;
await writeFile(path.join(out, 'brand.json'), JSON.stringify({ generatedAt: new Date().toISOString(), os: `${os.platform()} ${os.release()}`, results }, null, 2));
console.log(`\nBRAND CHECKS: ${pass} PASS / ${results.length - pass} FAIL`);
process.exit(results.length && pass === results.length ? 0 : 1);
