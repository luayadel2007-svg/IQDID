// Reproducible local/CI verification, separate from all historical evidence.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out = `evidence/${process.env.IQDID_VERIFY_DIR ?? 'modernization/final'}`;
mkdirSync(out, { recursive: true });
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run npm run modernization:verify');
const commands = [
  ['typecheck', process.execPath, [npm, 'run', 'typecheck']],
  ['lint', process.execPath, [npm, 'run', 'lint']],
  ['tests', process.execPath, [npm, 'exec', '--', 'vitest', 'run', '--reporter=default', '--reporter=json', `--outputFile.json=${out}/vitest-results.json`]],
  ['compatibility', process.execPath, ['scripts/compatibility-contract.mjs']],
  ['build', process.execPath, [npm, 'run', 'build']],
  ['browser-regression', process.execPath, [npm, 'run', 'e2e']],
  ['browser-ux', process.execPath, [npm, 'run', 'test:ux']],
  ['browser-wallet', process.execPath, [npm, 'run', 'test:wallet']],
  ['browser-verifier', process.execPath, [npm, 'run', 'test:verifier']],
  ['browser-pdf-ux', process.execPath, [npm, 'run', 'test:pdf-ux']],
  ['coverage-guard', process.execPath, ['scripts/ci-coverage-guard.mjs', `${out}/vitest-results.json`, String(Date.now() - 1000)]],
  ['secrets-diff', process.execPath, ['tools/secret-scanner.mjs', '--base', '1f51b519ee18434ab15042c9da9124cef5a7353b']],
  ['secrets-all-index', process.execPath, ['tools/secret-scanner.mjs', '--all-index'], false],
];
const results = [];
for (const [name, bin, args, required = true] of commands) {
  const at = new Date().toISOString(), start = Date.now();
  const result = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const stdout = result.stdout ?? '', stderr = result.stderr ?? '';
  writeFileSync(`${out}/${name}.stdout.log`, stdout);
  writeFileSync(`${out}/${name}.stderr.log`, stderr);
  const hash = (s) => createHash('sha256').update(s).digest('hex');
  const outcome = result.status === 0 ? 'PASS' : name.startsWith('secrets') && result.status === 2 ? 'BLOCKED' : 'FAIL';
  results.push({ name, at, required, command: [bin, ...args], exit: result.status, signal: result.signal, outcome, ms: Date.now() - start, stdoutSha256: hash(stdout), stderrSha256: hash(stderr) });
  console.log(`${name}: ${outcome} (exit ${result.status})`);
  if (result.status !== 0) console.log((stdout + stderr).split('\n').slice(-20).join('\n'));
}
const sourceHashes = {};
// Test input tree is recorded independently from report/evidence commits.
const files = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).stdout.split('\0').filter((f) => /^(apps|packages|scripts)\//.test(f) && /\.(tsx?|mjs|css)$/.test(f));
for (const f of files) sourceHashes[f] = createHash('sha256').update(readFileSync(f)).digest('hex');
writeFileSync(`${out}/commands.json`, JSON.stringify({ at: new Date().toISOString(), node: process.version, platform: process.platform, base: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), results, sourceHashes }, null, 2));
process.exitCode = results.every((r) => !r.required || r.exit === 0) ? 0 : 1;
