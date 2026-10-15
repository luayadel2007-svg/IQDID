import { describe, it, expect, vi } from 'vitest';
import { ESLint } from 'eslint';
import { createTransport, createVerifierGateway, createWalletGateway } from '../packages/api-client/src/index.ts';
import { UnconfiguredCredentialVerificationProvider } from '../packages/api-client/src/crypto-ports.ts';
import type { DemoOutcome, VerifiedByProtocol } from '@iqdid/shared-types';
import { isDemoVerificationSession, previewDemoDisclosure } from '@iqdid/shared-types';
import { startDemoServer } from '@iqdid/mock-services';

// Type-level regression: consent cannot satisfy protocol proof. Executed by tsc.
function typeBoundary(demo: DemoOutcome) {
  // @ts-expect-error demo has neither protocol mode nor server-owned proof
  const invalid: VerifiedByProtocol = demo;
  return invalid;
}
void typeBoundary;

describe('crypto-ready contracts', () => {
  it('unconfigured protocol provider rejects, with no network or mock fallback', async () => {
    const network = vi.spyOn(globalThis, 'fetch');
    await expect(new UnconfiguredCredentialVerificationProvider().verify({ presentation: 'synthetic', audience: 'test', nonce: 'test', policyVersion: 'PENDING' })).rejects.toThrow('REAL_CRYPTO_NOT_CONFIGURED');
    expect(network).not.toHaveBeenCalled(); network.mockRestore();
  });
  it('real and unknown transport configurations fail closed through unchanged gateways', async () => {
    for (const mode of ['real', 'invalid'] as const) {
      // unknown config is tested as hostile runtime input, not a supported TS API
      const transport = createTransport(mode as 'real');
      expect(transport.mode).toBe('real');
      await expect(createWalletGateway(transport).credentials()).rejects.toMatchObject({ kind: 'not_implemented' });
      await expect(createVerifierGateway(transport).organizations()).rejects.toMatchObject({ kind: 'not_implemented' });
    }
  });
  it('shared preview equals actual disclosure; flags/casts cannot promote a demo response', async () => {
    const srv = await startDemoServer({ port: 0 });
    try {
      const transport = createTransport('demo', { baseUrl: srv.url });
      const wallet = createWalletGateway(transport), verifier = createVerifierGateway(transport);
      const session = await verifier.createSession({ organizationId: 'org-test-a', templateId: 'AGE_OVER_18', purpose: 'اختبار تكامل' });
      const credential = (await wallet.credentials())[0];
      if (!credential) throw new Error('missing credential');
      const preview = previewDemoDisclosure(session, credential);
      const decided = await wallet.decide(session.id, 'ACCEPT');
      expect(decided.disclosed).toEqual(preview);
      expect(decided.status).toBe('DEMO_ACCEPTED');
      expect(isDemoVerificationSession({ ...decided, status: 'VERIFIED_BY_PROTOCOL' })).toBe(false);
      for (const extra of [{ mode: 'protocol' }, { outcome: 'VERIFIED_BY_PROTOCOL' }, { verified: true }, { evidence: {} }]) {
        expect(isDemoVerificationSession({ ...decided, ...extra })).toBe(false);
        const forged = createTransport('demo', { retries: 0, fetchImpl: async () => new Response(JSON.stringify({ ...decided, ...extra })) });
        await expect(createWalletGateway(forged).request(decided.id)).rejects.toMatchObject({ kind: 'decode' });
      }
    } finally { await srv.close(); }
  });
  it('lint rejects direct SDK imports, re-exports, require and computed imports outside adapter', async () => {
    const eslint = new ESLint();
    for (const code of [
      "import { x } from '@openid4vc/openid4vp'; void x;",
      "export { x } from '@sd-jwt/core';",
      "void import('@sd-jwt/sd-jwt-vc');",
      "void require('@owf/token-status-list');",
      "const name = '@sd-jwt/core'; void import(name);",
      "import { createRequire } from 'node:module'; void createRequire;",
    ]) {
      for (const filePath of ['packages/api-client/src/bypass.ts', 'apps/wallet-web/src/bypass.ts']) {
        const results = await eslint.lintText(code, { filePath });
        expect(results[0]?.messages.some((m) => m.ruleId === 'no-restricted-imports' || m.ruleId === 'no-restricted-syntax')).toBe(true);
      }
    }
  });
});
