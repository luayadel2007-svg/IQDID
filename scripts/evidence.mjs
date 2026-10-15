// Runs the full TASK-8 verification and records commands, exit codes, logs,
// durations and SHA-256 of each log. Usage: npm run evidence [-- --ci]
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = 'modernization/ci';
const out = path.join(root, 'evidence', evidenceDir);
await mkdir(out, { recursive: true });
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('run via `npm run evidence` so npm_execpath is set');

const steps = [
  ...(process.argv.includes('--ci') ? [['npm-ci', ['ci', '--no-audit', '--no-fund']]] : []),
  ['typecheck', ['run', 'typecheck']],
  ['lint', ['run', 'lint']],
  ['test', ['exec', '--', 'vitest', 'run', '--reporter=default', '--reporter=json', '--outputFile.json=evidence/modernization/ci/vitest-results.json']],
  ['build', ['run', 'build']],
  ['e2e', ['run', 'e2e']],
];
const rows = [];
for (const [id, args] of steps) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [npmCli, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const log = `$ npm ${args.join(' ')}\n--- stdout ---\n${r.stdout}\n--- stderr ---\n${r.stderr}`;
  await writeFile(path.join(out, `${id}.log`), log);
  rows.push({ id, command: `npm ${args.join(' ')}`, exit: r.status, ms: Date.now() - started, log: `evidence/${evidenceDir}/${id}.log`, logSha256: createHash('sha256').update(log).digest('hex') });
  console.log(`${id.padEnd(10)} exit=${r.status} (${Date.now() - started} ms)`);
  if (r.status !== 0) console.log(`--- ${id} output (tail) ---\n${`${r.stdout}\n${r.stderr}`.trim().split('\n').slice(-40).join('\n')}\n---`);
}
const versions = {
  node: process.version,
  npm: spawnSync(process.execPath, [npmCli, '--version'], { encoding: 'utf8' }).stdout.trim(),
  platform: `${process.platform} ${process.arch}`,
};
await writeFile(path.join(out, 'commands.json'), JSON.stringify({ at: new Date().toISOString(), versions, steps: rows }, null, 1));
process.exitCode = rows.every((r) => r.exit === 0) ? 0 : 1;
