// TEST ONLY — Iraqi Digital ID prototype — G1 evidence suite (in-process, synthetic data, test keys).
import { webcrypto, createHash, randomBytes, sign as nodeSign, createPrivateKey } from 'node:crypto';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { StatusList, createHeaderAndPayload, createStatusListIndexAllocator } from '@owf/token-status-list';
import * as jose from 'jose';
import { t, reject, results } from '../lib/harness.mjs';
import { buildTestPki, makeCert, genKeys, b64, validateX5c, leafPublicJwk, KU, DAY } from '../lib/pki.mjs';

const subtle = webcrypto.subtle;
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const dec = (s) => JSON.parse(Buffer.from(s, 'base64url').toString());
const now = () => Math.floor(Date.now() / 1000);

const ISS = 'https://issuer.digital-id.test';
const VCT = 'urn:test:iq-digital-id:national-id:1';
const STATUS_URI = 'https://status.digital-id.test/lists/1';
const VERIFIER_CLIENT_ID = 'x509_hash:PLACEHOLDER'; // replaced below
const PKI = await buildTestPki();

// ---------- crypto callbacks ----------
const signWith = (privateKey) => async (data) => {
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, Buffer.from(data));
  return Buffer.from(sig).toString('base64url'); // IEEE P1363 R||S (64 bytes)
};
const verifyRaw = async (jwk, data, sigB64u) => {
  const key = await subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(sigB64u, 'base64url'), Buffer.from(data));
};
const hasher = (data, alg) => {
  if (alg !== 'sha-256') throw new Error('hash alg not allowed');
  return new Uint8Array(createHash('sha256').update(typeof data === 'string' ? data : Buffer.from(data)).digest());
};
const saltGenerator = () => randomBytes(16).toString('base64url'); // 128-bit

// Issuer-signature verifier: x5c chain -> pinned TEST root; SAN must equal host of iss; alg ES256 only.
function makeX5cVerifier({ root = PKI.root, role, expectedHostFrom }) {
  return async (data, sig) => {
    const [h, p] = data.split('.');
    const header = dec(h), payload = dec(p);
    if (header.alg !== 'ES256') throw new Error(`alg not allowed: ${header.alg}`);
    const host = expectedHostFrom(payload);
    // MUTATION hooks (negative controls only): prove the suite detects a broken verifier
    if (process.env.MUTATE === 'skip-chain') return verifyRaw(await leafPublicJwk(new (await import('../lib/pki.mjs')).x509.X509Certificate(Buffer.from(header.x5c[0], 'base64'))), data, sig);
    const v = await validateX5c(header.x5c, root, { expectedSanDns: process.env.MUTATE === 'skip-role' ? undefined : host });
    if (!v.ok) throw new Error(`x5c rejected (${role}): ${v.reason}`);
    const ok = await verifyRaw(await leafPublicJwk(v.leaf), data, sig);
    if (!ok) throw new Error('signature invalid');
    return true;
  };
}
const issuerVerifier = makeX5cVerifier({ role: 'issuer', expectedHostFrom: (p) => new URL(p.iss).hostname });
// SEC-03: status list token must be signed by the STATUS key (SAN status.*), never by the issuer key.
const statusVerifier = makeX5cVerifier({ role: 'status', expectedHostFrom: () => 'status.digital-id.test' });

// ---------- holder (wallet) key: software TEST key ----------
const holder = await genKeys();
const holderJwkFull = await subtle.exportKey('jwk', holder.publicKey);
const holderJwk = { kty: holderJwkFull.kty, crv: holderJwkFull.crv, x: holderJwkFull.x, y: holderJwkFull.y };
const kbVerifier = async (data, sig, payload) => {
  const jwk = payload?.cnf?.jwk;
  if (!jwk) throw new Error('cnf.jwk missing');
  return verifyRaw(jwk, data, sig);
};

// ---------- status list (2-bit, 8192 entries) ----------
const statusStore = new Map();
const statusList = new StatusList(new Array(8192).fill(0), 2);
async function publishStatusList({ list = statusList, uri = STATUS_URI, sub = uri, signer = PKI.status, typ = 'statuslist+jwt',
  iat = now(), exp = now() + 900, tamperLst = false } = {}) {
  const { header, payload } = createHeaderAndPayload(list, { sub, iat, exp, ttl: 900 }, { alg: 'ES256', typ: 'statuslist+jwt', x5c: signer.x5c });
  header.typ = typ; // createHeaderAndPayload forces statuslist+jwt; override AFTER creation to test wrong typ
  const data = `${enc(header)}.${enc(payload)}`;
  let jwt = `${data}.${await signWith(signer.keys.privateKey)(data)}`;
  if (tamperLst) { // alter the list AFTER signing, keeping the original signature
    const [h, p, s] = jwt.split('.'); const pl = dec(p);
    const raw = Buffer.from(pl.status_list.lst, 'base64url'); raw[raw.length - 1] ^= 0x01; pl.status_list.lst = raw.toString('base64url');
    jwt = `${h}.${enc(pl)}.${s}`;
  }
  statusStore.set(uri, jwt);
  return jwt;
}
const allocator = await createStatusListIndexAllocator({ length: 8192, seed: randomBytes(32) }, { hasher: (d) => hasher(d, 'sha-256') });

// ---------- SD-JWT VC instances ----------
function issuerInstance(signerKeys = PKI.issuer.keys) {
  return new SDJwtVcInstance({ signer: signWith(signerKeys.privateKey), signAlg: 'ES256', hasher, hashAlg: 'sha-256', saltGenerator });
}
const holderInstance = new SDJwtVcInstance({ hasher, hashAlg: 'sha-256', kbSigner: signWith(holder.privateKey), kbSignAlg: 'ES256' });
function verifierInstance({ statusFetcher } = {}) {
  return new SDJwtVcInstance({
    hasher, hashAlg: 'sha-256', verifier: issuerVerifier, statusVerifier, kbVerifier,
    statusListFetcher: statusFetcher ?? (async (uri) => { if (!statusStore.has(uri)) throw new Error('status list unavailable'); return statusStore.get(uri); }),
  });
}

const DISCLOSURE_FRAME = { _sd: ['name', 'national_id', 'birthdate', 'sex', 'age_over_18'] };
async function issue({ x5c = PKI.issuer.x5c, signerKeys = PKI.issuer.keys, iss = ISS, vct = VCT, idx, exp = now() + 30 * 86400,
  iat = now(), frame = DISCLOSURE_FRAME, header = {} } = {}) {
  const payload = {
    iss, iat, exp, vct, cnf: { jwk: holderJwk },
    status: { status_list: { idx: idx ?? allocator.next(), uri: STATUS_URI } },
    name: 'مواطن تجريبي أول', national_id: 'TEST-000000000001', birthdate: '1990-01-15', sex: 1, age_over_18: true,
  };
  return issuerInstance(signerKeys).issue(payload, frame, { header: { x5c, ...header } });
}
const NONCE = randomBytes(16).toString('base64url');
const AUD = 'x509_hash:test-verifier';
async function present(cred, { fields = { name: true, age_over_18: true }, nonce = NONCE, aud = AUD, iat = now(), kbSignerKeys } = {}) {
  const inst = kbSignerKeys ? new SDJwtVcInstance({ hasher, hashAlg: 'sha-256', kbSigner: signWith(kbSignerKeys.privateKey), kbSignAlg: 'ES256' }) : holderInstance;
  return inst.present(cred, fields, { kb: { payload: { iat, aud, nonce } } });
}
const VOPTS = { keyBindingNonce: NONCE, expectedKeyBindingAudience: AUD, allowedIssuerAlgorithms: ['ES256'], allowedKeyBindingAlgorithms: ['ES256'],
  expectedVct: VCT, keyBindingMaxAgeSeconds: 60, skewSeconds: 60 };
const verify = (vp, extra = {}, inst = verifierInstance()) => inst.verify(vp, { ...VOPTS, ...extra });

await publishStatusList();

// ======================= SIG — signatures =======================
await t('SIG-01', 'SIG', 'ES256 signature is raw R||S, 64 bytes', 'accept', async () => {
  const s = await signWith(PKI.issuer.keys.privateKey)('test');
  const n = Buffer.from(s, 'base64url').length;
  if (n !== 64) return reject(`length ${n}`);
  return `len=${n}`;
});
await t('SIG-02', 'SIG', 'DER-encoded ECDSA signature is rejected', 'reject', async () => {
  const pkcs8 = await subtle.exportKey('pkcs8', PKI.issuer.keys.privateKey);
  const der = nodeSign('sha256', Buffer.from('test'), { key: createPrivateKey({ key: Buffer.from(pkcs8), format: 'der', type: 'pkcs8' }), dsaEncoding: 'der' });
  const ok = await verifyRaw(await leafPublicJwk(PKI.issuer.cert), 'test', der.toString('base64url'));
  return ok ? `accepted DER len=${der.length}` : reject(`DER len=${der.length} rejected`);
});
const validCred = await issue();
await t('SIG-03', 'SIG', 'alg=none header is rejected', 'reject', async () => {
  const [jwt, ...rest] = validCred.split('~');
  const [h, p] = jwt.split('.');
  const forged = `${enc({ ...dec(h), alg: 'none' })}.${p}.`;
  return verify(await present([forged, ...rest].join('~')));
});
await t('SIG-04', 'SIG', 'HS256-signed credential is rejected', 'reject', async () => {
  const [jwt, ...rest] = validCred.split('~');
  const [h, p] = jwt.split('.');
  const nh = enc({ ...dec(h), alg: 'HS256' });
  const mac = await new jose.SignJWT(dec(p)).setProtectedHeader({ alg: 'HS256' }).sign(new TextEncoder().encode('k'.repeat(32)));
  return verify(await present([`${nh}.${p}.${mac.split('.')[2]}`, ...rest].join('~')));
});
await t('SIG-05', 'SIG', 'Payload altered under a valid signature is rejected', 'reject', async () => {
  const [jwt, ...rest] = validCred.split('~');
  const [h, p, s] = jwt.split('.');
  const np = enc({ ...dec(p), exp: dec(p).exp + 365 * 86400 });
  return verify(await present([`${h}.${np}.${s}`, ...rest].join('~')));
});
await t('SIG-06', 'SIG', 'Signed with a key that does not match the x5c leaf is rejected', 'reject', async () => {
  const other = await genKeys();
  return verify(await present(await issue({ signerKeys: other })));
});

// ======================= CRD — credential structure =======================
const decodeCred = (c) => { const [jwt, ...d] = c.split('~'); const [h, p] = jwt.split('.'); return { header: dec(h), payload: dec(p), disclosures: d.filter(Boolean) }; };
await t('CRD-01', 'CRD', 'Header: alg=ES256, typ=dc+sd-jwt, x5c of 2 certs (anchor excluded)', 'accept', async () => {
  const { header } = decodeCred(validCred);
  if (header.alg !== 'ES256' || header.typ !== 'dc+sd-jwt' || header.x5c?.length !== 2) return reject(JSON.stringify(header).slice(0, 120));
  if (header.x5c.includes(b64(PKI.root))) return reject('anchor in x5c');
  return `typ=${header.typ} x5c=${header.x5c.length}`;
});
await t('CRD-02', 'CRD', 'Always-visible claims present; personal claims only as digests', 'accept', async () => {
  const { payload } = decodeCred(validCred);
  for (const k of ['iss', 'iat', 'exp', 'vct', 'cnf', 'status']) if (!(k in payload)) return reject(`missing ${k}`);
  for (const k of ['name', 'national_id', 'birthdate', 'sex', 'age_over_18']) if (k in payload) return reject(`${k} in clear`);
  if (payload._sd_alg !== 'sha-256') return reject('_sd_alg');
  return `_sd=${payload._sd.length}`;
});
await t('CRD-03', 'CRD', 'Every salt is >= 128 bits (SEC-07)', 'accept', async () => {
  const { disclosures } = decodeCred(validCred);
  const lens = disclosures.map(d => Buffer.from(dec(d)[0], 'base64url').length);
  if (lens.some(l => l < 16)) return reject(`salt bytes ${lens}`);
  return `salt bytes=${[...new Set(lens)]}`;
});
await t('CRD-04', 'CRD', 'cnf.jwk has exactly kty,crv,x,y (SEC-07)', 'accept', async () => {
  const keys = Object.keys(decodeCred(validCred).payload.cnf.jwk).sort().join(',');
  return keys === 'crv,kty,x,y' ? keys : reject(keys);
});
await t('CRD-05', 'CRD', 'Making iss selectively disclosable is refused by the library', 'reject', async () => {
  await issue({ frame: { _sd: ['iss', 'name'] } });
  return 'issued';
});
await t('CRD-06', 'CRD', 'Decoy digests hide the real claim count (DM-14)', 'accept', async () => {
  const c = await issue({ frame: { ...DISCLOSURE_FRAME, _sd_decoy: 5 } });
  const { payload, disclosures } = decodeCred(c);
  if (payload._sd.length !== disclosures.length + 5) return reject(`_sd=${payload._sd.length} disc=${disclosures.length}`);
  await verify(await present(c));
  return `_sd=${payload._sd.length} real=${disclosures.length}; verifies`;
});
await t('CRD-07', 'CRD', 'Credential validity = 30 days (DR-18)', 'accept', async () => {
  const { payload } = decodeCred(validCred);
  const d = Math.round((payload.exp - payload.iat) / 86400);
  return d === 30 ? `days=${d}` : reject(`days=${d}`);
});

// ======================= VER — presentation verification =======================
await t('VER-01', 'VER', 'Valid presentation (name+age_over_18) is accepted', 'accept', async () => {
  const r = await verify(await present(validCred));
  return `claims: ${Object.keys(r.payload).filter(k => ['name', 'age_over_18', 'birthdate', 'national_id'].includes(k)).join(',')}`;
});
await t('VER-02', 'VER', 'Undisclosed claims (birthdate, national_id, sex) are absent', 'accept', async () => {
  const r = await verify(await present(validCred));
  for (const k of ['birthdate', 'national_id', 'sex']) if (k in r.payload) return reject(`${k} present`);
  return 'only name, age_over_18';
});
await t('VER-03', 'VER', 'Wrong nonce is rejected', 'reject', async () => verify(await present(validCred, { nonce: 'wrong' })));
await t('VER-04', 'VER', 'Wrong KB audience is rejected', 'reject', async () => verify(await present(validCred, { aud: 'x509_hash:other' })));
await t('VER-05', 'VER', 'Presentation without KB-JWT is rejected', 'reject', async () => {
  const noKb = await holderInstance.present(validCred, { name: true });
  return verify(noKb);
});
await t('VER-06', 'VER', 'Tampered disclosure value is rejected', 'reject', async () => {
  const [jwt, ...d] = validCred.split('~');
  const idx = d.findIndex(x => x && dec(x)[1] === 'age_over_18');
  const arr = dec(d[idx]); arr[2] = false; d[idx] = enc(arr);
  return verify(await present([jwt, ...d].join('~')));
});
await t('VER-07', 'VER', 'Expired credential is rejected (verifier clock past exp)', 'reject', async () =>
  verify(await present(validCred), { currentDate: now() + 31 * 86400 }));
await t('VER-08', 'VER', 'KB-JWT signed by a key other than cnf is rejected', 'reject', async () =>
  verify(await present(validCred, { kbSignerKeys: await genKeys() })));
await t('VER-09', 'VER', 'KB-JWT older than 60 s is rejected', 'reject', async () => verify(await present(validCred, { iat: now() - 600 })));
await t('VER-10', 'VER', 'Unexpected vct is rejected', 'reject', async () => verify(await present(await issue({ vct: 'urn:test:other:1' }))));
await t('VER-11', 'VER', 'ES384 issuer algorithm is rejected by allow-list', 'reject', async () => {
  const k = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-384' }, true, ['sign', 'verify']);
  const inst = new SDJwtVcInstance({ signer: async (d) => Buffer.from(await subtle.sign({ name: 'ECDSA', hash: 'SHA-384' }, k.privateKey, Buffer.from(d))).toString('base64url'),
    signAlg: 'ES384', hasher, hashAlg: 'sha-256', saltGenerator });
  const c = await inst.issue({ iss: ISS, iat: now(), exp: now() + 1000, vct: VCT, cnf: { jwk: holderJwk }, name: 'x' }, { _sd: ['name'] }, { header: { x5c: PKI.issuer.x5c } });
  return verify(await present(c, { fields: { name: true } }), { disableStatusVerification: true });
});
await t('VER-12', 'VER', 'iss host not matching leaf SAN is rejected', 'reject', async () =>
  verify(await present(await issue({ iss: 'https://evil.digital-id.test' }))));
await t('VER-13', 'VER', 'Same presentation replayed to a new session (new nonce) is rejected', 'reject', async () => {
  const vp = await present(validCred);
  await verify(vp);
  return verify(vp, { keyBindingNonce: randomBytes(16).toString('base64url') });
});

// ======================= X — X.509 chain (pkijs + supplementary checks) =======================
const P = PKI;
const vx = (x5c, opts) => validateX5c(x5c, P.root, opts).then(r => (r.ok ? 'chain ok' : reject(r.reason)));
await t('X-01', 'X509', 'Valid chain leaf->intermediate->pinned root accepted', 'accept', () => vx(P.issuer.x5c, { expectedSanDns: 'issuer.digital-id.test' }));
await t('X-03', 'X509', 'Valid chain but SAN != iss host rejected', 'reject', () => vx(P.issuer.x5c, { expectedSanDns: 'other.digital-id.test' }));
await t('X-04', 'X509', 'Chain missing intermediate rejected', 'reject', () => vx([P.issuer.x5c[0]]));
await t('X-05', 'X509', 'Chain anchored in a different root rejected', 'reject', async () => {
  const other = await buildTestPki();
  return validateX5c(P.issuer.x5c, other.root).then(r => (r.ok ? 'chain ok' : reject(r.reason)));
});
await t('X-06', 'X509', 'Expired leaf rejected', 'reject', async () => {
  const k = await genKeys();
  const c = await makeCert({ subject: 'CN=expired', issuerName: P.inter.subject, issuerKeys: P.intKeys, keys: k, ku: KU.digitalSignature,
    sanDns: ['issuer.digital-id.test'], notBefore: new Date(Date.now() - 200 * DAY), notAfter: new Date(Date.now() - 80 * DAY) });
  return vx([b64(c), b64(P.inter)]);
});
await t('X-09', 'X509', 'Intermediate CA used as signing leaf rejected', 'reject', () => vx([b64(P.inter)], { expectedSanDns: 'issuer.digital-id.test' }));
await t('X-11', 'X509', 'Extra CA below a pathLen=0 intermediate rejected', 'reject', async () => {
  const k2 = await genKeys();
  const sub = await makeCert({ subject: 'CN=TEST Sub CA', issuerName: P.inter.subject, issuerKeys: P.intKeys, keys: k2, ca: true, ku: KU.keyCertSign | KU.cRLSign });
  const k3 = await genKeys();
  const leaf = await makeCert({ subject: 'CN=deep leaf', issuerName: sub.subject, issuerKeys: k2, keys: k3, ku: KU.digitalSignature, sanDns: ['issuer.digital-id.test'] });
  return vx([b64(leaf), b64(sub), b64(P.inter)]);
});
await t('X-12', 'X509', 'Leaf without digitalSignature keyUsage rejected', 'reject', async () => {
  const k = await genKeys();
  const c = await makeCert({ subject: 'CN=no-ds', issuerName: P.inter.subject, issuerKeys: P.intKeys, keys: k, ku: KU.keyEncipherment, sanDns: ['issuer.digital-id.test'] });
  return vx([b64(c), b64(P.inter)]);
});
await t('X-13', 'X509', 'Intermediate without basicConstraints cA=true rejected', 'reject', async () => {
  const k = await genKeys();
  const fakeCa = await makeCert({ subject: 'CN=not-a-ca', issuerName: P.root.subject, issuerKeys: P.rootKeys, keys: k, ca: false, ku: KU.digitalSignature });
  const k2 = await genKeys();
  const leaf = await makeCert({ subject: 'CN=leaf', issuerName: fakeCa.subject, issuerKeys: k, keys: k2, ku: KU.digitalSignature, sanDns: ['issuer.digital-id.test'] });
  return vx([b64(leaf), b64(fakeCa)]);
});
await t('X-14', 'X509', 'Leaf before notBefore rejected', 'reject', async () => {
  const k = await genKeys();
  const c = await makeCert({ subject: 'CN=future', issuerName: P.inter.subject, issuerKeys: P.intKeys, keys: k, ku: KU.digitalSignature,
    sanDns: ['issuer.digital-id.test'], notBefore: new Date(Date.now() + 10 * DAY) });
  return vx([b64(c), b64(P.inter)]);
});
await t('X-15', 'X509', 'Trust anchor included in x5c rejected (HAIP 6.1.1)', 'reject', () => vx([...P.issuer.x5c, b64(P.root)]));
await t('X-16', 'X509', 'Self-signed leaf rejected', 'reject', async () => {
  const k = await genKeys();
  const c = await makeCert({ subject: 'CN=self', keys: k, ku: KU.digitalSignature, sanDns: ['issuer.digital-id.test'] });
  return vx([b64(c)]);
});
await t('X-18', 'X509', 'Leaf signed by an unrelated CA but presented with the legitimate intermediate rejected', 'reject', async () => {
  const rogue = await genKeys(); const k = await genKeys();
  const c = await makeCert({ subject: 'CN=rogue leaf', issuerName: P.inter.subject, issuerKeys: rogue, keys: k, ku: KU.digitalSignature, sanDns: ['issuer.digital-id.test'] });
  return vx([b64(c), b64(P.inter)], { expectedSanDns: 'issuer.digital-id.test' });
});
await t('X-17', 'X509', 'Credential with x5c from untrusted root rejected end-to-end', 'reject', async () => {
  const other = await buildTestPki();
  return verify(await present(await issue({ x5c: other.issuer.x5c, signerKeys: other.issuer.keys })));
});

// ======================= REV — status / revocation =======================
const freshCred = async () => { const idx = allocator.next(); return { idx, cred: await issue({ idx }) }; };
await t('REV-01', 'REV', 'Status VALID (0) accepted', 'accept', async () => { const { cred } = await freshCred(); await publishStatusList(); await verify(await present(cred)); return 'status=0'; });
await t('REV-02', 'REV', 'Status INVALID/revoked (1) rejected', 'reject', async () => {
  const { idx, cred } = await freshCred(); statusList.setStatus(idx, 1); await publishStatusList(); return verify(await present(cred));
});
await t('REV-03', 'REV', 'Status SUSPENDED (2) rejected (requires 2-bit list)', 'reject', async () => {
  const { idx, cred } = await freshCred(); statusList.setStatus(idx, 2); await publishStatusList(); return verify(await present(cred));
});
await t('REV-04', 'REV', 'Reinstate: suspended (2) -> valid (0) accepted again', 'accept', async () => {
  const { idx, cred } = await freshCred(); statusList.setStatus(idx, 2); await publishStatusList();
  try { await verify(await present(cred)); return reject('suspended was accepted'); } catch {}
  statusList.setStatus(idx, 0); await publishStatusList(); await verify(await present(cred)); return 'rejected while 2, accepted after 0';
});
await t('REV-05', 'REV', 'Status list token signed by ISSUER key (not status key) rejected (SEC-03)', 'reject', async () => {
  const { cred } = await freshCred(); await publishStatusList({ signer: PKI.issuer }); const vp = await present(cred);
  try { return await verify(vp); } finally { await publishStatusList(); }
});
await t('REV-06', 'REV', 'Status list token whose sub != uri rejected', 'reject', async () => {
  const { cred } = await freshCred(); await publishStatusList({ sub: 'https://status.digital-id.test/lists/2' }); const vp = await present(cred);
  try { return await verify(vp); } finally { await publishStatusList(); }
});
await t('REV-07', 'REV', 'Expired status list token rejected', 'reject', async () => {
  const { cred } = await freshCred(); await publishStatusList({ iat: now() - 7200, exp: now() - 3600 }); const vp = await present(cred);
  try { return await verify(vp); } finally { await publishStatusList(); }
});
await t('REV-08', 'REV', 'Tampered lst under the original signature rejected', 'reject', async () => {
  const { cred } = await freshCred(); await publishStatusList({ tamperLst: true }); const vp = await present(cred);
  try { return await verify(vp); } finally { await publishStatusList(); }
});
await t('REV-09', 'REV', 'Wrong typ on status list token rejected', 'reject', async () => {
  const { cred } = await freshCred(); await publishStatusList({ typ: 'JWT' }); const vp = await present(cred);
  try { return await verify(vp); } finally { await publishStatusList(); }
});
await t('REV-10', 'REV', 'Index outside the list rejected', 'reject', async () => verify(await present(await issue({ idx: 9000 }))));
await t('REV-11', 'REV', 'Status list unavailable -> verification fails closed (R-12)', 'reject', async () =>
  verify(await present(validCred), {}, verifierInstance({ statusFetcher: async () => { throw new Error('timeout'); } })));
await t('REV-12', 'REV', 'Allocator: 8192 unique, non-sequential indices; exhaustion detected', 'accept', async () => {
  const a = await createStatusListIndexAllocator({ length: 8192, seed: randomBytes(32) }, { hasher: (d) => hasher(d, 'sha-256') });
  const seen = new Set(); let sequential = 0, prev = -1;
  for (let i = 0; i < 8192; i++) { const x = a.next(); seen.add(x); if (x === prev + 1) sequential++; prev = x; }
  let exhausted = false; try { a.next(); } catch { exhausted = true; }
  if (seen.size !== 8192 || !exhausted) return reject(`unique=${seen.size} exhausted=${exhausted}`);
  return `unique=${seen.size} sequentialSteps=${sequential} exhaustedThrows=${exhausted}`;
});
await t('REV-13', 'REV', 'Status list token carries x5c without the trust anchor (HAIP 6.1)', 'accept', async () => {
  const h = dec((await publishStatusList()).split('.')[0]);
  if (!h.x5c || h.x5c.includes(b64(PKI.root))) return reject('x5c missing or anchor included');
  return `typ=${h.typ} x5c=${h.x5c.length}`;
});

export { results };
