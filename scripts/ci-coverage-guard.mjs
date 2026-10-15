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

const verify = readFileSync('scripts/modernization-checks.mjs', 'utf8');
for (const step of floors.requiredVerifySteps) {
  const line = verify.split('\n').find((l) => l.includes(`['${step}',`));
  need(Boolean(line), `verify step "${step}" missing`);
  need(!line || !/,\s*false\]\s*,?\s*$/.test(line), `verify step "${step}" must stay required`);
}

const wf = readFileSync(floors.workflow.file, 'utf8');
need(!/continue-on-error/.test(wf), 'workflow must not use continue-on-error');
need(wf.includes(floors.workflow.mustRun), `workflow must run "${floors.workflow.mustRun}"`);
for (const os of floors.workflow.oses) need(wf.includes(os), `workflow matrix must include ${os}`);

if (!vitestJson || !existsSync(vitestJson)) problems.push('vitest JSON report missing');
else {
  const v = JSON.parse(readFileSync(vitestJson, 'utf8'));
  need(statSync(vitestJson).mtimeMs >= since, 'vitest report is stale (not from this run)');
  need(v.numTotalTests >= floors.minVitestTests, `vitest ran ${v.numTotalTests} tests, floor is ${floors.minVitestTests}`);
  need(v.numFailedTests === 0 && v.success === true, 'vitest reported failures');
  const files = (v.testResults ?? []).map((t) => path.relative(process.cwd(), t.name).split(path.sep).join('/'));
  for (const f of floors.requiredVitestFiles) need(files.includes(f), `vitest did not run ${f}`);
}

const ev = (envName, fallback, file) => path.join('evidence', process.env[envName] ?? fallback, file);
const browser = [
  ['e2e', ev('IQDID_EVIDENCE_DIR', 'modernization/e2e', 'e2e-results.json'), (j) => j.results],
  ['ux', ev('IQDID_UX_EVIDENCE_DIR', 'modernization/ux-final', 'results.json'), (j) => j],
  ['wallet', ev('IQDID_WALLET_EVIDENCE_DIR', 'task9/wallet-e2e', 'wallet-e2e-results.json'), (j) => j.results],
  ['pdf', ev('IQDID_PDF_AUDIT_DIR', 'task8-9-recovery/pdf-audit', 'audit.json'), (j) => j.checks],
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
