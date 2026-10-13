// TASK3C future integration prototype. Not installed in any IQDID service.
// Dependencies are injected; SDK source and versions remain unchanged.
export class CompatibilityError extends Error {
  constructor(code) { super(code); this.name = 'CompatibilityError'; this.code = code; }
}
const reject = code => { throw new CompatibilityError(code); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const present = (o, k) => Object.hasOwn(o, k);

export function guardMetadata(metadata) {
  if (!object(metadata) || !object(metadata.credential_configurations_supported)) reject('METADATA_SHAPE');
  for (const config of Object.values(metadata.credential_configurations_supported)) {
    if (!object(config)) reject('CONFIGURATION_SHAPE');
    const binding = present(config, 'cryptographic_binding_methods_supported');
    const proofs = present(config, 'proof_types_supported');
    if (binding !== proofs) reject('F02_PROOF_BINDING_DEPENDENCY');
    if (binding && (!Array.isArray(config.cryptographic_binding_methods_supported) || !config.cryptographic_binding_methods_supported.length)) reject('BINDING_ARRAY');
    if (proofs) {
      if (!object(config.proof_types_supported)) reject('PROOF_OBJECT');
      for (const proof of Object.values(config.proof_types_supported)) {
        if (!object(proof) || !Array.isArray(proof.proof_signing_alg_values_supported) || proof.proof_signing_alg_values_supported.length === 0) reject('F01_PROOF_ALGORITHMS');
      }
    }
    if (present(config, 'credential_metadata')) {
      if (!object(config.credential_metadata)) reject('CREDENTIAL_METADATA_OBJECT');
      if (present(config.credential_metadata, 'display')) {
        const display = config.credential_metadata.display;
        if (!Array.isArray(display) || display.length === 0) reject('F03_DISPLAY_ARRAY');
        if (display.some(d => !object(d) || typeof d.name !== 'string')) reject('DISPLAY_NAME');
      }
    }
  }
  return metadata;
}
export function parseIssuerMetadata(sdk, metadata) {
  guardMetadata(metadata); // Before schema normalization can discard fields.
  return sdk.zCredentialIssuerMetadataSchema.parse(metadata);
}
export async function resolveCredentialOffer(client, uri) {
  let url;
  try { url = new URL(uri); } catch { reject('OFFER_URI'); }
  const value = url.searchParams.getAll('credential_offer');
  const reference = url.searchParams.getAll('credential_offer_uri');
  if (value.length && reference.length) reject('F04_OFFER_EXCLUSIVE');
  if (value.length + reference.length !== 1) reject('OFFER_PARAMETER_COUNT');
  if (!(value[0] ?? reference[0])) reject('OFFER_EMPTY');
  if (reference.length) {
    let ref; try { ref = new URL(reference[0]); } catch { reject('OFFER_REFERENCE'); }
    if (ref.protocol !== 'https:') reject('OFFER_HTTPS');
  }
  return client.resolveCredentialOffer(uri);
}
export function guardCredentialResponse(response) {
  if (!object(response)) reject('RESPONSE_OBJECT');
  if (response.credentials !== undefined) {
    if (!Array.isArray(response.credentials) || response.credentials.length === 0) reject('F05_EMPTY_CREDENTIALS');
    if (response.credentials.some(c => !object(c) || !(typeof c.credential === 'string' || object(c.credential)))) reject('CREDENTIAL_ELEMENT');
  }
  return response;
}
export async function createCredentialResponse(issuer, options) {
  // Input guard prevents calling issuer with an empty immediate response.
  guardCredentialResponse({credentials: options.credentials, ...options.additionalPayload});
  const result = await issuer.createCredentialResponse(options);
  guardCredentialResponse(result.credentialResponse); // Also guard returned boundary.
  return result;
}
export function buildWalletPost(wallet = {}, clientId = '') {
  const form = new URLSearchParams();
  if (wallet.metadata !== undefined) {
    if (!object(wallet.metadata)) reject('WALLET_METADATA_OBJECT');
    if (clientId.startsWith('redirect_uri:') && present(wallet.metadata, 'request_object_signing_alg_values_supported')) reject('REDIRECT_SIGNING_METADATA_FORBIDDEN');
    let serialized;
    try { serialized = JSON.stringify(wallet.metadata); } catch { reject('WALLET_METADATA_JSON'); }
    form.set('wallet_metadata', serialized);
  }
  if (wallet.nonce !== undefined) {
    if (typeof wallet.nonce !== 'string') reject('WALLET_NONCE_STRING');
    form.set('wallet_nonce', wallet.nonce);
  }
  return form.toString();
}
export async function resolveWalletRequest(sdk, options) {
  // Narrow override only for the selected request_uri POST. All response handling
  // remains in SDK; this module does not implement verifier trust or services.
  const request = options.authorizationRequestPayload;
  if (request?.request_uri_method !== 'post' || typeof request.request_uri !== 'string' || request.request !== undefined) reject('POST_REFERENCE_REQUIRED');
  let url; try { url = new URL(request.request_uri); } catch { reject('REQUEST_URI'); }
  if (url.protocol !== 'https:') reject('REQUEST_URI_HTTPS');
  const fetch = options.callbacks?.fetch;
  if (typeof fetch !== 'function') reject('EXPLICIT_TRANSPORT_REQUIRED');
  const body = buildWalletPost(options.wallet, request.client_id);
  const wrappedFetch = async (input, init) => {
    if (String(input) !== request.request_uri || init?.method?.toUpperCase() !== 'POST') return fetch(input, init);
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    headers.set('Accept', 'application/oauth-authz-req+jwt');
    headers.delete('Content-Length');
    return fetch(input, {...init, headers, body});
  };
  return sdk.resolveOpenid4vpAuthorizationRequest({...options, callbacks: {...options.callbacks, fetch: wrappedFetch}});
}
