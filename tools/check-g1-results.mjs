#!/usr/bin/env node
// Standalone verifier. Never modifies the frozen G1 suite.
import { readFileSync } from 'node:fs';

// Copied mechanically from the frozen run.mjs REASON table; no frozen file is modified.
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

const expectedFailures = {
  main: [],
  'skip-chain': ['SIG-05','SIG-06','VER-12','X-17','REV-05','REV-08'],
  'skip-role': ['VER-12','REV-05'],
};
const [mode, file] = process.argv.slice(2);
if (!Object.hasOwn(expectedFailures, mode) || !file) {
  console.error('Usage: node tools/check-g1-results.mjs <main|skip-chain|skip-role> <results.json>');
  process.exit(2);
}
try {
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const errors = [];
  if (!Array.isArray(report.results) || report.total !== 62 || report.results.length !== 62) errors.push('Expected exactly 62 test results');
  const ids = (report.results ?? []).map(r=>r.id);
  if (new Set(ids).size !== ids.length) errors.push('Duplicate test IDs');
  const baseline = JSON.parse(readFileSync(new URL('../evidence/g1-suite-v1.0/tests_suite/evidence/results.json', import.meta.url), 'utf8'));
  const reference = new Map(baseline.results.map(r=>[r.id,r]));
  const knownIds = new Set(baseline.results.map(r=>r.id));
  if (ids.length !== knownIds.size || ids.some(id=>!knownIds.has(id))) errors.push('Unexpected/missing test IDs versus frozen baseline');
  const failed = (report.results ?? []).filter(r=>r.pass !== true);
  const actualFailures = failed.map(r=>r.id).sort();
  const required = [...expectedFailures[mode]].sort();
  if (JSON.stringify(actualFailures) !== JSON.stringify(required)) errors.push(`Failure IDs: expected [${required}], got [${actualFailures}]`);
  const count = (report.results ?? []).filter(r=>r.pass === true).length;
  if (report.passed !== count) errors.push(`Inconsistent passed count: ${report.passed} vs ${count}`);
  for (const r of report.results ?? []) {
    if (typeof r.pass !== 'boolean') errors.push(`${r.id}: pass must be boolean`);
    if (!['accept','reject'].includes(r.observed)) errors.push(`${r.id}: invalid observed type`);
    if (r.expected !== reference.get(r.id)?.expected) errors.push(`${r.id}: expected differs from frozen baseline`);
    const computedReason = r.expected === 'reject' && r.observed === 'reject'
      ? (typeof r.detail === 'string' && REASON[r.id]?.test(r.detail) ? 'match' : 'MISMATCH')
      : 'n/a';
    if (r.reasonCheck !== computedReason) errors.push(`${r.id}: claimed reasonCheck differs from independently checked detail`);
    const justified = r.expected === r.observed && (r.expected !== 'reject' || computedReason === 'match');
    if (r.pass !== justified) errors.push(`${r.id}: pass inconsistent with observed outcome/reason`);
    if (!['accept','reject'].includes(r.expected)) errors.push(`${r.id}: invalid expected type`);
    if (r.expected === 'reject' && r.observed === 'reject' && r.pass === true && r.reasonCheck !== 'match') errors.push(`${r.id}: rejection passed without matching reason`);
  }
  if (report.env?.package_lock_sha256 !== baseline.env.package_lock_sha256) errors.push('Different package-lock SHA-256 from frozen baseline');
  if (errors.length) { for (const e of errors) console.error('FAIL:',e); process.exit(1); }
  console.log(`PASS ${mode}: ${count}/62 passing; expected failing IDs: ${required.join(',')||'(none)'}; rejection reasons consistent`);
} catch (err) {
  console.error('FAIL:', err.message);
  process.exit(1);
}
