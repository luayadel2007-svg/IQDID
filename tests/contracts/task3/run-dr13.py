"""Run DR13 in a fresh directory. Record actual output and failure/blocked exit codes."""
import os,sys,pathlib,subprocess,datetime,uuid,json,hashlib,platform
root=pathlib.Path(__file__).resolve().parents[3]
out=root/'evidence/task3'/('dr13-final-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]);out.mkdir()
child=out/'tests'
cmd=['node','tests/contracts/task3/dr13-tests.mjs',str(child)]
record={'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'platform':platform.platform(),'python':sys.version,'argv':cmd,'layers':'contract, library (including explicitly mocked transport), proposed-policy-model, HTTP-service NOT RUN'}
record['test_hashes']={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'tests/contracts/task3').glob('dr13-*') if p.is_file()}
try:
 p=subprocess.run(cmd,cwd=root,env=os.environ,capture_output=True,text=True,timeout=120)
 (out/'stdout.log').write_text(p.stdout);(out/'stderr.log').write_text(p.stderr)
 summary=json.loads((child/'summary.json').read_text()) if (child/'summary.json').exists() else None
 record['exit_code']=p.returncode;record['summary_present']=summary is not None
 record['status']=summary['status'] if summary and p.returncode==summary.get('exit_code') else 'BLOCKED'
 if record['status']=='BLOCKED':record['reason']='NO_VALID_COMPLETION_REPORT'
except Exception:
 record.update(status='BLOCKED',exit_code=2,reason='PROCESS_OR_REPORT_READ_FAILED')
(out/'commands.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'evidence':str(out.relative_to(root)),'status':record['status'],'exit_code':record['exit_code']}))
sys.exit({'PASS':0,'FAIL':1,'BLOCKED':2}[record['status']])
