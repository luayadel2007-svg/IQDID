// TEST ONLY — runs all G1 suites, enforces expected rejection REASONS (guards against passing for the wrong reason),
// and writes evidence files.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { results } from './lib/harness.mjs';

await import('./tests/core.test.mjs');
await import('./tests/vp.test.mjs');

// Expected reason for each rejection test. A rejection with a different reason is a FAIL.
const REASON = {
  'SIG-02': /DER len=7[0-2] rejected/, 'SIG-03': /alg "none"/, 'SIG-04': /Disallowed alg HS256/, 'SIG-05': /signature invalid/, 'SIG-06': /signature invalid/,
  'CRD-05': /protected field/,
  'VER-03': /Invalid Nonce/, 'VER-04': /Key Binding audience/, 'VER-05': /Key Binding JWT not exist/, 'VER-06': /Unreferenced disclosure/,
  'VER-07': /JWT_EXPIRED/, 'VER-08': /Invalid JWT Signature/, 'VER-09': /TOO_OLD/, 'VER-10': /INVALID_VCT/, 'VER-11': /Disallowed alg ES384/,
  'VER-12': /SAN does not match/, 'VER-13': /Invalid Nonce/,
  'X-03': /SAN does not match/, 'X-04': /No valid certificate paths/, 'X-05': /No valid certificate paths/, 'X-06': /not yet valid or expired/,
  'X-09': /leaf is a CA/, 'X-11': /pathLenConstraint/, 'X-12': /digitalSignature/, 'X-13': /not a CA/, 'X-14': /not yet valid or expired/,
  'X-15': /anchor included/, 'X-16': /self-signed/, 'X-17': /No valid certificate paths/, 'X-18': /No valid certificate paths/,
  'REV-02': /STATUS_INVALID/, 'REV-03': /STATUS_INVALID/, 'REV-05': /x5c rejected \(status\)/, 'REV-06': /subject claim/, 'REV-07': /expired/,
  'REV-08': /signature invalid/, 'REV-09': /typ header/, 'REV-10': /out of bounds/, 'REV-11': /timeout/,
  'W14-b': /sha-256 hash of the leaf/, 'W14-c': /No valid certificate paths/, 'W16-b': /not allowed for this verifier/,
  'W08-r': /san dns names/, 'W-RU': /signer method/,
};
for (const r of results) {
  if (r.expected === 'reject' && r.observed === 'reject') {
    const re = REASON[r.id];
    r.reasonCheck = re ? (re.test(r.detail) ? 'match' : 'MISMATCH') : 'not-defined';
    if (r.reasonCheck !== 'match') r.pass = false;
  } else r.reasonCheck = 'n/a';
}

const lock = readFileSync('./package-lock.json');
const pkgs = JSON.parse(readFileSync('./package.json')).dependencies;
const env = {
  run_at_utc: new Date().toISOString(), node: process.version, platform: `${process.platform}-${process.arch}`,
  packages: pkgs, package_lock_sha256: createHash('sha256').update(lock).digest('hex'),
  conditions: 'in-process; no HTTP/TLS; synthetic data; TEST keys generated per run; not a device or system test',
};
const total = results.length, passed = results.filter(r => r.pass).length;
mkdirSync('./evidence', { recursive: true });
writeFileSync('./evidence/results.json', JSON.stringify({ env, total, passed, results }, null, 2));
const md = [`# G1 test evidence — raw results`, '', '```json', JSON.stringify(env, null, 2), '```', '',
  `**${passed}/${total} passed**`, '', '| ID | Group | Expected | Observed | Reason check | Pass | Detail |', '|---|---|---|---|---|---|---|',
  ...results.map(r => `| ${r.id} | ${r.group} | ${r.expected} | ${r.observed} | ${r.reasonCheck} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail.replace(/\|/g, '/').replace(/\n/g, ' ')} |`)].join('\n');
writeFileSync('./evidence/results.md', md);
console.log(`\nTOTAL ${passed}/${total} passed`);
for (const r of results.filter(x => !x.pass)) console.log('FAILED:', r.id, r.reasonCheck, r.detail);
