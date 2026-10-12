"""Run isolated tooling; preserve stdout/stderr and exit codes. Run from repo root."""
import os,sys,subprocess,json,pathlib,datetime,platform,uuid
root=pathlib.Path(__file__).resolve().parents[3]
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]
out=pathlib.Path(os.environ.get('TASK3_EVIDENCE_DIR',str(root/'evidence/task3'/stamp))).resolve()
if not out.is_relative_to(root/'evidence/task3'):raise SystemExit('Evidence must stay under evidence/task3')
out.mkdir(parents=True,exist_ok=False) # Refuse to overwrite historical evidence.
toolroot=pathlib.Path(os.environ.get('TASK3_TOOL_ROOT',str(pathlib.Path(__file__).resolve().parent)))
spectralroot=pathlib.Path(os.environ.get('TASK3_SPECTRAL_ROOT',str(pathlib.Path(__file__).resolve().parent/'spectral-tool')))
files=sorted(str(p.relative_to(root)) for p in (root/'openapi/v1.1').glob('*.yaml'))
cmds=[('node-version',['node','--version']),('npm-version',['npm','--version']),('tool-versions',['npm','list','--prefix',str(toolroot),'--depth=0','--json']),('spectral-version',[str(spectralroot/'node_modules/.bin/spectral'),'--version']),('contracts',['node','tests/contracts/task3/validate.cjs']),('spectral',[str(spectralroot/'node_modules/.bin/spectral'),'lint','--ruleset','tests/contracts/task3/spectral.yaml','--fail-severity','error',*files]),('redocly',[str(toolroot/'node_modules/.bin/redocly'),'lint','--config','tests/contracts/task3/redocly.yaml',*files]),('policy-model',['node','tests/contracts/task3/policy-model.cjs'])]
cmds.append(('engineering',['node','tests/contracts/task3/engineering-tests.cjs']))
cmds.append(('p04-structure',['node','tests/contracts/task3/p04-structure.cjs']))
rows=[]
for name,cmd in cmds:
 try:
  p=subprocess.run(cmd,cwd=root,text=True,capture_output=True,timeout=120,env=os.environ)
  (out/(name+'.stdout.log')).write_text(p.stdout);(out/(name+'.stderr.log')).write_text(p.stderr)
  rows.append({'name':name,'argv':cmd,'exit_code':p.returncode});print(name,p.returncode)
 except Exception as e:rows.append({'name':name,'argv':cmd,'exit_code':None,'status':'NOT RUN OR INTERRUPTED','error':str(e)})
(out/'commands.json').write_text(json.dumps({'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'platform':platform.platform(),'python':sys.version,'commands':rows},indent=2)+'\n')
sys.exit(1 if any(r.get('exit_code')!=0 for r in rows) else 0)
