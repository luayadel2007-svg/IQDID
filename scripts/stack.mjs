// Starts the demo API + both apps (dev or preview). Cross-platform: spawns
// node directly (no shell), so it works the same on Windows and Linux.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

export async function waitForHttp(url, timeoutMs = 30_000) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() > until) throw new Error(`timed out waiting for ${url}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

export function startStack({ preview = false, env = {}, onLine = (l) => console.log(l) } = {}) {
  const procs = [];
  const run = (name, args, cwd) => {
    const p = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const s of [p.stdout, p.stderr]) s.on('data', (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((l) => onLine(`[${name}] ${l}`)));
    procs.push(p);
    return p;
  };
  run('demo-api', [path.join(root, 'packages', 'mock-services', 'src', 'server-main.ts')], root);
  const mode = preview ? ['preview'] : [];
  run('wallet', [viteBin, ...mode], path.join(root, 'apps', 'wallet-web'));
  run('verifier', [viteBin, ...mode], path.join(root, 'apps', 'verifier-web'));
  const urls = preview
    ? { api: 'http://127.0.0.1:4010', wallet: 'http://127.0.0.1:4173', verifier: 'http://127.0.0.1:4174' }
    : { api: 'http://127.0.0.1:4010', wallet: 'http://127.0.0.1:5173', verifier: 'http://127.0.0.1:5174' };
  return {
    urls,
    async ready() {
      await Promise.all([waitForHttp(`${urls.api}/demo-api/v1/health`), waitForHttp(urls.wallet), waitForHttp(urls.verifier)]);
    },
    stop() {
      for (const p of procs) if (p.exitCode === null) p.kill('SIGTERM');
    },
  };
}
