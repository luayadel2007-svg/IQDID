import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTransport, createWalletGateway, createVerifierGateway } from '@iqdid/api-client';
import type { RequestSpec, Transport } from '@iqdid/api-client';
import { startDemoServer } from '@iqdid/mock-services';
import { WalletApp } from '../apps/wallet-web/src/App.tsx';
import { VerifierApp } from '../apps/verifier-web/src/App.tsx';

/** Alternate instrumentation adapter proves the existing public Transport seam. */
class RecordingTransport implements Transport {
  readonly mode = 'demo';
  readonly paths: string[] = [];
  private readonly inner: Transport;
  constructor(inner: Transport) { this.inner = inner; }
  request<T>(spec: RequestSpec<T>) { this.paths.push(spec.path); return this.inner.request(spec); }
}
describe('same pages with replacement providers', () => {
  it('uses an alternate transport against a real server without page or UI API changes', async () => {
    const srv = await startDemoServer({ port: 0 });
    try {
      const transport = new RecordingTransport(createTransport('demo', { baseUrl: srv.url }));
      const wallet = render(<MemoryRouter><WalletApp gateway={createWalletGateway(transport)} /></MemoryRouter>);
      expect(await within(wallet.container).findByRole('link', { name: 'بطاقة الهوية الرقمية (تجريبية)' })).toBeInTheDocument();
      wallet.unmount();
      const verifier = render(<MemoryRouter><VerifierApp gateway={createVerifierGateway(transport)} /></MemoryRouter>);
      expect(await within(verifier.container).findByRole('heading', { name: 'لوحة المتابعة' })).toBeInTheDocument();
      expect(transport.paths).toContain('/wallet/credentials');
      expect(transport.paths).toContain('/organizations');
      verifier.unmount();
    } finally { await srv.close(); }
  });
  it('same Wallet and Verifier display real-provider failure rather than demo success', async () => {
    const transport = createTransport('real');
    const wallet = render(<MemoryRouter><WalletApp gateway={createWalletGateway(transport)} /></MemoryRouter>);
    expect(await within(wallet.container).findAllByRole('alert')).toHaveLength(2); wallet.unmount();
    const verifier = render(<MemoryRouter><VerifierApp gateway={createVerifierGateway(transport)} /></MemoryRouter>);
    expect((await within(verifier.container).findAllByRole('alert')).length).toBeGreaterThan(0);
  });
});
