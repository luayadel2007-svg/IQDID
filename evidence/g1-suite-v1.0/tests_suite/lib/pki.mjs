// TEST ONLY — Iraqi Digital ID prototype. Test PKI generation and chain validation.
import 'reflect-metadata';
// Chain validation = pkijs CertificateChainValidationEngine + explicit supplementary checks
// (pathLenConstraint, leaf keyUsage, leaf not CA, anchor not in x5c, leaf not self-signed).
import { webcrypto } from 'node:crypto';
import * as x509 from '@peculiar/x509';
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

x509.cryptoProvider.set(webcrypto);
pkijs.setEngine('node', new pkijs.CryptoEngine({ name: 'node', crypto: webcrypto }));

const ALG = { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' };
const DAY = 86400000;

export async function genKeys() {
  return webcrypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
}

let serial = 1;
export async function makeCert({ subject, issuerName, issuerKeys, keys, ca = false, pathLen,
  ku, sanDns, notBefore = new Date(Date.now() - DAY), notAfter = new Date(Date.now() + 365 * DAY),
  basicConstraints = true }) {
  const exts = [];
  if (basicConstraints) exts.push(new x509.BasicConstraintsExtension(ca, pathLen, true));
  if (ku !== undefined) exts.push(new x509.KeyUsagesExtension(ku, true));
  if (sanDns) exts.push(new x509.SubjectAlternativeNameExtension(sanDns.map(d => ({ type: 'dns', value: d }))));
  exts.push(await x509.SubjectKeyIdentifierExtension.create(keys.publicKey));
  const cert = await x509.X509CertificateGenerator.create({
    serialNumber: (serial++).toString(16).padStart(4, '0'),
    subject, issuer: issuerName ?? subject,
    notBefore, notAfter,
    signingAlgorithm: ALG,
    publicKey: keys.publicKey,
    signingKey: (issuerKeys ?? keys).privateKey,
    extensions: exts,
  });
  return cert;
}

export const b64 = (cert) => Buffer.from(cert.rawData).toString('base64');
const KU = x509.KeyUsageFlags;

/** Build the standard test PKI: root -> intermediate(pathLen 0) -> leaves */
export async function buildTestPki() {
  const rootKeys = await genKeys();
  const root = await makeCert({ subject: 'CN=TEST Root CA - Iraqi Digital ID Prototype', keys: rootKeys, ca: true, pathLen: 1,
    ku: KU.keyCertSign | KU.cRLSign });
  const intKeys = await genKeys();
  const inter = await makeCert({ subject: 'CN=TEST Issuing CA', issuerName: root.subject, issuerKeys: rootKeys, keys: intKeys,
    ca: true, pathLen: 0, ku: KU.keyCertSign | KU.cRLSign });
  const leaf = async (cn, dns) => {
    const k = await genKeys();
    const c = await makeCert({ subject: `CN=${cn}`, issuerName: inter.subject, issuerKeys: intKeys, keys: k, ku: KU.digitalSignature, sanDns: [dns] });
    return { keys: k, cert: c, x5c: [b64(c), b64(inter)] };
  };
  return {
    rootKeys, root, intKeys, inter,
    issuer: await leaf('TEST issuer', 'issuer.digital-id.test'),
    status: await leaf('TEST status', 'status.digital-id.test'),
    verifier: await leaf('TEST verifier', 'verifier.digital-id.test'),
    leaf,
  };
}

function toPkijs(derB64) {
  const der = Buffer.from(derB64, 'base64');
  const asn = asn1js.fromBER(new Uint8Array(der).buffer);
  return new pkijs.Certificate({ schema: asn.result });
}

/**
 * Validate an x5c chain (leaf first, anchor NOT included) against a pinned root.
 * Returns { ok, reason, leaf } — leaf is a @peculiar/x509 certificate.
 */
export async function validateX5c(x5c, rootCert, { now = new Date(), expectedSanDns } = {}) {
  if (!Array.isArray(x5c) || x5c.length < 1) return { ok: false, reason: 'x5c missing' };
  const rootB64 = b64(rootCert);
  if (x5c.includes(rootB64)) return { ok: false, reason: 'trust anchor included in x5c' };
  const certs = x5c.map(c => new x509.X509Certificate(Buffer.from(c, 'base64')));
  const leaf = certs[0];
  if (leaf.subject === leaf.issuer) return { ok: false, reason: 'leaf is self-signed' };
  // pkijs path validation
  const engine = new pkijs.CertificateChainValidationEngine({
    // NOTE: pkijs treats the LAST element of `certs` as the end-entity certificate, so x5c (leaf-first) is reversed.
    trustedCerts: [toPkijs(rootB64)], certs: [...x5c].reverse().map(toPkijs), checkDate: now,
  });
  const r = await engine.verify();
  if (!r.result) return { ok: false, reason: `pkijs: ${r.resultMessage}` };
  // supplementary checks (not performed by pkijs engine)
  const bc = (c) => c.getExtension(x509.BasicConstraintsExtension);
  const ku = (c) => c.getExtension(x509.KeyUsagesExtension);
  if (bc(leaf)?.ca) return { ok: false, reason: 'leaf is a CA certificate' };
  const lku = ku(leaf);
  if (!lku || !(lku.usages & KU.digitalSignature)) return { ok: false, reason: 'leaf keyUsage lacks digitalSignature' };
  // pathLenConstraint: for CA at position i (1..n-1) in x5c, number of CA certs below it (excluding leaf) must be <= pathLen
  const chainToRoot = [...certs, rootCert];
  for (let i = 1; i < chainToRoot.length; i++) {
    const b = bc(chainToRoot[i]);
    if (!b?.ca) return { ok: false, reason: `certificate at depth ${i} is not a CA` };
    const intermediatesBelow = i - 1;
    if (b.pathLength !== undefined && intermediatesBelow > b.pathLength)
      return { ok: false, reason: `pathLenConstraint exceeded at depth ${i}` };
  }
  if (expectedSanDns) {
    const san = leaf.getExtension(x509.SubjectAlternativeNameExtension);
    const names = san ? san.names.items.filter(n => n.type === 'dns').map(n => n.value) : [];
    if (!names.includes(expectedSanDns)) return { ok: false, reason: `SAN does not match (${expectedSanDns})` };
  }
  // defence in depth: pkijs must have built the path from OUR leaf
  return { ok: true, leaf, pathLength: r.certificatePath?.length };
}

export async function leafPublicJwk(leaf) {
  const key = await leaf.publicKey.export(ALG, ['verify'], webcrypto);
  return webcrypto.subtle.exportKey('jwk', key);
}

export async function sha256b64url(derB64) {
  const h = await webcrypto.subtle.digest('SHA-256', Buffer.from(derB64, 'base64'));
  return Buffer.from(h).toString('base64url');
}

export { x509, KU, DAY };
