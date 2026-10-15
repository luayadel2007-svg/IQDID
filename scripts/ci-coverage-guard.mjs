// Fails (exit 1) when required test coverage silently disappears: a deleted test file or E2E
// script, a dropped npm script or verify step, fewer tests than the reviewed floor, a soft-fail
// in CI, or browser results not produced by THIS run. Usage: node scripts/ci-coverage-guard.mjs <vitest-json> <since-epoch-ms>
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const floors = JSON.parse(readFileSync('scripts/ci-coverage-floors.json', 'utf8'));
const [vitestJson, sinceArg] = process.argv.slice(2);
const since = Number(sinceArg ?? 0);
const problems = [];
const need = (ok, why) => { if (!ok) problems.push(why); };

for (const f of floors.requiredFiles) need(existsSync(f), `missing required file ${f}`);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
for (const [name, file] of Object.entries(floors.requiredNpmScripts)) need(pkg.scripts?.[name]?.includes(file), `npm script "${name}" must run ${file}`);

// Parse the commands array itself (comments stripped) instead of matching text:
// a step is required only when its entry has exactly 3 top-level elements.
const verifySrc = readFileSync('scripts/modernization-checks.mjs', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const block = verifySrc.slice(verifySrc.indexOf('const commands = ['), verifySrc.indexOf('];', verifySrc.indexOf('const commands = [')));
const entries = [];
for (let i = block.indexOf('[') + 1, depth = 0, start = -1; i < block.length; i++) {
  const c = block[i];
  if (c === '[') { if (depth === 0) start = i; depth++; } else if (c === ']') { depth--; if (depth === 0) entries.push(block.slice(start, i + 1)); }
}
const topLevel = (entry) => { const parts = []; let depth = 0, cur = ''; for (const c of entry.slice(1, -1)) { if ('[({'.includes(c)) depth++; if ('])}'.includes(c)) depth--; if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += c; } if (cur.trim()) parts.push(cur.trim()); return parts; };
const steps = new Map(entries.map((e) => { const p = topLevel(e); return [p[0]?.replace(/^'|'$/g, ''), p.length]; }));
for (const step of floors.requiredVerifySteps) {
  need(steps.has(step), `verify step "${step}" missing`);
  need(!steps.has(step) || steps.get(step) === 3, `verify step "${step}" must stay required (no 4th element)`);
}
need(/process\.exitCode = results\.every\(\(r\) => !r\.required \|\| r\.exit === 0\) \? 0 : 1;/.test(verifySrc), 'verify must exit non-zero when a required step fails');

const wf = readFileSync(floors.workflow.file, 'utf8');
need(!/continue-on-error/.test(wf), 'workflow must not use continue-on-error');
const runLines = wf.split('\n').filter((l) => l.includes(floors.workflow.mustRun));
need(runLines.length === 1 && new RegExp(`^\\s*run: ${floors.workflow.mustRun}\\s*$`).test(runLines[0] ?? ''), `workflow must run exactly "run: ${floors.workflow.mustRun}" (no || true, no chaining)`);
const verifyStep = wf.slice(Math.max(0, wf.lastIndexOf('- name:', wf.indexOf(floors.workflow.mustRun))), wf.indexOf(floors.workflow.mustRun));
need(!/\n\s*if:/.test(verifyStep), 'the verify step must not be conditional');
for (const os of floors.workflow.oses) need(wf.includes(os), `workflow matrix must include ${os}`);
need(Number.isFinite(since) && since > 0 && Date.now() - since < 6 * 3600_000, 'guard must be given this run\'s start time');

if (!vitestJson || !existsSync(vitestJson)) problems.push('vitest JSON report missing');
else {
  const v = JSON.parse(readFileSync(vitestJson, 'utf8'));
  need(statSync(vitestJson).mtimeMs >= since, 'vitest report is stale (not from this run)');
  need(v.numPassedTests >= floors.minVitestTests, `vitest passed ${v.numPassedTests} tests, floor is ${floors.minVitestTests}`);
  need(v.numPendingTests === 0 && v.numTodoTests === 0, `skipped/todo tests are not allowed (pending ${v.numPendingTests}, todo ${v.numTodoTests})`);
  need(v.numFailedTests === 0 && v.success === true, 'vitest reported failures');
  const files = (v.testResults ?? []).map((t) => path.relative(process.cwd(), t.name).split(path.sep).join('/'));
  for (const f of floors.requiredVitestFiles) need(files.includes(f), `vitest did not run ${f}`);
}

const ev = (envName, fallback, file) => path.join('evidence', process.env[envName] ?? fallback, file);
const browser = [
  ['e2e', ev('IQDID_EVIDENCE_DIR', 'modernization/e2e', 'e2e-results.json'), (j) => j.results],
  ['ux', ev('IQDID_UX_EVIDENCE_DIR', 'modernization/ux-final', 'results.json'), (j) => j],
  ['wallet', ev('IQDID_WALLET_EVIDENCE_DIR', 'task9/wallet-e2e', 'wallet-e2e-results.json'), (j) => j.results],
  ['pdf', ev('IQDID_PDF_AUDIT_DIR', 'modernization/pdf-audit', 'audit.json'), (j) => j.checks],
];
for (const [name, file, pick] of browser) {
  if (!existsSync(file)) { problems.push(`${name}: results missing (${file})`); continue; }
  need(statSync(file).mtimeMs >= since, `${name}: results are stale (not produced by this run)`);
  const steps = pick(JSON.parse(readFileSync(file, 'utf8'))) ?? [];
  need(steps.length >= floors.minBrowserSteps[name], `${name}: ${steps.length} steps, floor is ${floors.minBrowserSteps[name]}`);
  need(steps.every((s) => s.outcome === 'PASS'), `${name}: not every step passed`);
}

if (problems.length) { console.log(`COVERAGE GUARD: FAIL\n- ${problems.join('\n- ')}`); process.exitCode = 1; }
else console.log(`COVERAGE GUARD: PASS (${floors.requiredFiles.length} files, ${floors.requiredVerifySteps.length} required steps, floors met)`);
