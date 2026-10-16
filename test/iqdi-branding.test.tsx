/** IQDI rebrand: the legacy name IQDID must not be visible to users anywhere in the modern apps. */
import { readFileSync } from 'node:fs';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTransport, createVerifierGateway, createWalletGateway } from '@iqdid/api-client';
import { startDemoServer, type RunningDemoServer } from '@iqdid/mock-services';
import { WalletApp } from '../apps/wallet-web/src/App.tsx';
import { VerifierApp } from '../apps/verifier-web/src/App.tsx';
import { makeDemoQrPayload } from '../apps/wallet-web/src/pages/QrPage.tsx';

let srv: RunningDemoServer;
beforeAll(async () => { srv = await startDemoServer({ port: 0 }); });
afterAll(async () => { await srv.close(); });
const t = () => createTransport('demo', { baseUrl: srv.url, retries: 0, timeoutMs: 3000 });

describe('IQDI branding', () => {
  it.each(['/', '/credentials/cred-test-001', '/requests', '/qr', '/activity', '/notifications', '/settings', '/help', '/welcome'])('wallet %s shows IQDI and never IQDID', async (path) => {
    const w = render(<MemoryRouter initialEntries={[path]}><WalletApp gateway={createWalletGateway(t())} pollMs={500} /></MemoryRouter>);
    await within(w.container).findAllByRole('heading', { level: 1 });
    expect(w.container.textContent).toContain('IQDI Wallet');
    expect(w.container.textContent).not.toMatch(/IQDID/i);
    w.unmount();
  });
  it.each(['/', '/new', '/sessions', '/settings'])('verifier %s shows IQDI and never IQDID', async (path) => {
    const v = render(<MemoryRouter initialEntries={[path]}><VerifierApp gateway={createVerifierGateway(t())} pollMs={500} /></MemoryRouter>);
    await within(v.container).findAllByRole('heading', { level: 1 });
    expect(v.container.textContent).toContain('IQDI Verifier');
    expect(v.container.textContent).not.toMatch(/IQDID/i);
    v.unmount();
  });
  it('HTML titles, descriptions and app names use IQDI', () => {
    for (const app of ['wallet-web', 'verifier-web']) {
      const html = readFileSync(`apps/${app}/index.html`, 'utf8');
      expect(html).toMatch(/<title>IQDI (Wallet|Verifier) — /);
      expect(html).toContain('<meta name="application-name" content="IQDI" />');
      expect(html).not.toMatch(/IQDID/i);
    }
  });
  it('the demo QR payload carries the IQDI-DEMO marker and no legacy name', () => {
    const { text } = makeDemoQrPayload();
    expect(text.startsWith('IQDI-DEMO:')).toBe(true);
    expect(text).not.toMatch(/IQDID/i);
  });
});
