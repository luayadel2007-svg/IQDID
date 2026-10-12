// TEST ONLY — OpenID4VP 1.0 signed request (JAR) with x509_hash / x509_san_dns, in-process.
import { webcrypto, createHash, randomBytes } from 'node:crypto';
import { createOpenid4vpAuthorizationRequest, resolveOpenid4vpAuthorizationRequest } from '@openid4vc/openid4vp';
import { t, reject } from '../lib/harness.mjs';
import { buildTestPki, validateX5c, leafPublicJwk, sha256b64url, x509, b64 } from '../lib/pki.mjs';

const subtle = webcrypto.subtle;
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const PKI = await buildTestPki();
const VCT = 'urn:test:iq-digital-id:national-id:1';
const RESPONSE_URI = 'https://verifier.digital-id.test/oid4vp/response';
// Trust list entry (DR-14 amended): the x509_hash is bound to the verifier AND to its allowed response_uri host (THM-48).
const verifierHash = await sha256b64url(PKI.verifier.x5c[0]);
const TRUST_LIST = { verifiers: [{ client_id: `x509_hash:${verifierHash}`, display_name: 'مؤسسة تجريبية للخدمات', allowed_response_hosts: ['verifier.digital-id.test'], allowed_claims: ['age_over_18', 'name'] }] };

const signJwtWith = (signer) => async (jwtSigner, { header, payload }) => {
  const h = { ...header, alg: 'ES256', x5c: signer.x5c };
  const data = `${enc(h)}.${enc(payload)}`;
  const sig = Buffer.from(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer.keys.privateKey, Buffer.from(data))).toString('base64url');
  return { jwt: `${data}.${sig}`, signerJwk: await leafPublicJwk(signer.cert) };
};
// Wallet-side verifyJwt: the library delegates signature + trust to this callback (EV-04).
const walletVerifyJwt = async (jwtSigner, { header, compact }) => {
  if (header.alg !== 'ES256') return { verified: false };
  const v = await validateX5c(header.x5c, PKI.root);
  if (!v.ok) throw new Error(`x5c rejected: ${v.reason}`);
  const jwk = await leafPublicJwk(v.leaf);
  const key = await subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const [h, p, s] = compact.split('.');
  const ok = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(s, 'base64url'), Buffer.from(`${h}.${p}`));
  return ok ? { verified: true, signerJwk: jwk } : { verified: false };
};
const getX509CertificateMetadata = (c) => {
  const cert = new x509.X509Certificate(Buffer.from(c, 'base64'));
  const san = cert.getExtension(x509.SubjectAlternativeNameExtension);
  const items = san ? san.names.items : [];
  return { sanDnsNames: items.filter(i => i.type === 'dns').map(i => i.value), sanUriNames: items.filter(i => i.type === 'url').map(i => i.value) };
};
const hash = (data) => new Uint8Array(createHash('sha256').update(Buffer.from(data)).digest());

async function roundTrip({ clientId, signer = PKI.verifier, responseUri = RESPONSE_URI, policyCheck = false }) {
  const requestUri = `https://verifier.digital-id.test/oid4vp/requests/${randomBytes(8).toString('hex')}`;
  const created = await createOpenid4vpAuthorizationRequest({
    authorizationRequestPayload: {
      response_type: 'vp_token', client_id: clientId, response_uri: responseUri, response_mode: 'direct_post',
      nonce: randomBytes(16).toString('base64url'), state: randomBytes(8).toString('hex'),
      dcql_query: { credentials: [{ id: 'id1', format: 'dc+sd-jwt', meta: { vct_values: [VCT] }, claims: [{ path: ['age_over_18'] }] }] },
    },
    jar: { requestUri, jwtSigner: { method: 'x5c', x5c: signer.x5c, alg: 'ES256' }, expiresInSeconds: 120 },
    callbacks: { signJwt: signJwtWith(signer) },
  });
  const jarJwt = created.jar.authorizationRequestJwt;
  const qr = new URL(created.authorizationRequest);
  const resolved = await resolveOpenid4vpAuthorizationRequest({
    authorizationRequestPayload: Object.fromEntries(qr.searchParams.entries()),
    responseMode: { type: 'direct_post' },
    callbacks: {
      verifyJwt: walletVerifyJwt, getX509CertificateMetadata, hash,
      fetch: async (url) => new Response(jarJwt, { status: 200, headers: { 'content-type': 'application/oauth-authz-req+jwt' } }),
    },
  });
  if (policyCheck) { // our trust-list policy (not the library)
    const entry = TRUST_LIST.verifiers.find(v => v.client_id === resolved.authorizationRequestPayload.client_id);
    if (!entry) return reject('verifier not in trust list');
    const host = new URL(resolved.authorizationRequestPayload.response_uri).hostname;
    if (!entry.allowed_response_hosts.includes(host)) return reject(`response_uri host ${host} not allowed for this verifier`);
    const asked = resolved.dcql.query.credentials.flatMap(c => c.claims.map(x => x.path.join('.')));
    if (asked.some(a => !entry.allowed_claims.includes(a))) return reject('claims outside policy');
  }
  return `prefix=${resolved.client.prefix} qrParams=${[...qr.searchParams.keys()].join(',')}`;
}

await t('W14-a', 'VP', 'Signed request with x509_hash (correct leaf hash) accepted', 'accept', () => roundTrip({ clientId: `x509_hash:${verifierHash}` }));
await t('W14-b', 'VP', 'x509_hash of a different certificate rejected', 'reject', () => roundTrip({ clientId: `x509_hash:${verifierHash}`, signer: PKI.issuer }));
await t('W14-c', 'VP', 'x509_hash correct but chain from untrusted root rejected', 'reject', async () => {
  const other = await buildTestPki();
  return roundTrip({ clientId: `x509_hash:${await sha256b64url(other.verifier.x5c[0])}`, signer: other.verifier });
});
await t('W16-a', 'VP', 'FINDING: library alone accepts x509_hash with an unregistered response_uri host', 'accept', () =>
  roundTrip({ clientId: `x509_hash:${verifierHash}`, responseUri: 'https://evil.example/collect' }));
await t('W16-b', 'VP', 'Trust-list policy rejects x509_hash with an unregistered response_uri host (THM-48)', 'reject', () =>
  roundTrip({ clientId: `x509_hash:${verifierHash}`, responseUri: 'https://evil.example/collect', policyCheck: true }));
await t('W16-c', 'VP', 'Trust-list policy accepts the registered verifier, host and claims', 'accept', () =>
  roundTrip({ clientId: `x509_hash:${verifierHash}`, policyCheck: true }));
await t('W08-r', 'VP', 'x509_san_dns with SAN != client_id rejected (regression of W08)', 'reject', () =>
  roundTrip({ clientId: 'x509_san_dns:other.digital-id.test' }));
await t('W02-r', 'VP', 'x509_san_dns with matching SAN and response_uri host accepted (regression of W02)', 'accept', () =>
  roundTrip({ clientId: 'x509_san_dns:verifier.digital-id.test' }));
await t('W-RU', 'VP', 'Signed request using redirect_uri: prefix rejected', 'reject', () =>
  roundTrip({ clientId: `redirect_uri:${RESPONSE_URI}` }));
