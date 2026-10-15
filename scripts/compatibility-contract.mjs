// Existing F01-F06 guard reuse; this is NOT the historical 42 SDK tests.
import assert from 'node:assert/strict';
import { guardMetadata, resolveCredentialOffer, createCredentialResponse, buildWalletPost } from '../packages/api-client/src/server/compatibility/task3c-adapter.mjs';
let calls = 0;
assert.throws(() => guardMetadata({ credential_configurations_supported: { test: { cryptographic_binding_methods_supported: ['jwk'] } } }), /F02_PROOF_BINDING_DEPENDENCY/);
await assert.rejects(() => resolveCredentialOffer({ resolveCredentialOffer: () => { calls++; } }, 'openid-credential-offer://?credential_offer=a&credential_offer_uri=https://example.test'), /F04_OFFER_EXCLUSIVE/);
await assert.rejects(() => createCredentialResponse({ createCredentialResponse: () => { calls++; } }, { credentials: [] }), /F05_EMPTY_CREDENTIALS/);
assert.equal(calls, 0, 'SDK must not be called before rejected inputs');
const form = new URLSearchParams(buildWalletPost({ metadata: { name: 'اختبار' }, nonce: 'synthetic' }));
assert.equal(JSON.parse(form.get('wallet_metadata')).name, 'اختبار');
assert.equal(form.get('wallet_nonce'), 'synthetic');
console.log('PASS: 4 compatibility boundary contracts; historical SDK_RAW and ADAPTER evidence unchanged');
