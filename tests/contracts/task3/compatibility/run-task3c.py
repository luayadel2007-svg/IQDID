"""Fresh evidence only. Expected SDK_RAW failures never become PASS."""
import datetime, hashlib, json, os, pathlib, platform, subprocess, sys, uuid
root = pathlib.Path(__file__).resolve().parents[4]
out = root / 'evidence/task3' / ('task3c-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8])
out.mkdir()
rows = []
for label, script in [('SDK_RAW', 'tests/contracts/task3/dr13-tests.mjs'), ('ADAPTER_GUARD', 'tests/contracts/task3/compatibility/test-adapter.mjs')]:
    argv = ['node', script, str(out / label.lower())]
    try:
        proc = subprocess.run(argv, cwd=root, capture_output=True, text=True, timeout=120)
        (out / (label + '.stdout.log')).write_text(proc.stdout)
        (out / (label + '.stderr.log')).write_text(proc.stderr)
        result_path = out / label.lower() / 'summary.json'
        result = json.loads(result_path.read_text()) if result_path.exists() else {}
        status = result.get('status', 'BLOCKED') if proc.returncode in [0, 1] else 'BLOCKED'
        rows.append({'layer': label, 'argv': argv, 'exit_code': proc.returncode, 'status': status})
    except Exception:
        rows.append({'layer': label, 'argv': argv, 'exit_code': None, 'status': 'BLOCKED'})
files = [root / 'tests/contracts/task3/dr13-tests.mjs', root / 'tests/contracts/task3/dr13-contracts.cjs', root / 'tests/contracts/task3/dr13-sdk/package-lock.json', *pathlib.Path(__file__).parent.glob('*.*')]
summary = {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'platform': platform.platform(), 'python': sys.version, 'environment': {k: os.environ.get(k) for k in ['DR13_SDK_ROOT']}, 'commands': rows, 'HTTP_SERVICE': 'NOT RUN', 'sha256': {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}}
(out / 'execution.json').write_text(json.dumps(summary, indent=2) + '\n')
print(str(out)); print(json.dumps(rows, indent=2))
# Overall is still FAIL when raw SDK is FAIL. Examine layers, not only this exit.
sys.exit(2 if any(r['status']=='BLOCKED' for r in rows) else 1 if any(r['status']=='FAIL' for r in rows) else 0)
