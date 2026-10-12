// TEST ONLY. Runs the real PowerShell runner; negative cases inject controlled faults in copies.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const repo = resolve(process.argv[2] || '.');
const id = `${new Date().toISOString().replace(/[:.]/g,'-')}-windows-ci`;
const out = join(repo,'evidence','runs',id);
const casesRoot = join(repo,'.work','windows-ci',id);
mkdirSync(out,{recursive:true}); mkdirSync(casesRoot,{recursive:true});
const windows = process.platform === 'win32';
const ps = windows ? join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe') : process.env.IQDID_TEST_PWSH;
if (!ps || !existsSync(ps)) throw Error('Windows PowerShell 5.1 is required (local pwsh override is smoke-test only).');
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
function files(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(join(dir,x.name)):[join(dir,x.name)]); }
function manifest(root) { const dir=join(root,'evidence','g1-suite-v1.0'); return Object.fromEntries(files(dir).sort().map(p=>[relative(dir,p).replaceAll('\\','/'),hash(p)])); }
const anchor = manifest(repo);
const originalManifestHash = hash(join(repo,'evidence','g1-suite-v1.0.SHA256SUMS'));
writeFileSync(join(out,'hashes_original_before.json'),JSON.stringify(anchor,null,2));
const prior = Object.fromEntries(files(join(repo,'evidence','runs')).filter(p=>!p.startsWith(out)).map(p=>[p,hash(p)]));
const runnerName = 'run-g1-suite.ps1';
const runnerText = readFileSync(join(repo,'tools',runnerName),'utf8');
const sourceVersion = spawnSync(ps,['-NoProfile','-Command','$PSVersionTable | ConvertTo-Json -Depth 3'],{encoding:'utf8'});
writeFileSync(join(out,'powershell.stdout.log'),sourceVersion.stdout || '');
writeFileSync(join(out,'powershell.stderr.log'),sourceVersion.stderr || '');
const records=[];
function quote(s) { return `'${s.replaceAll("'","''")}'`; }
function makeCase(name) {
 const root=join(casesRoot,name); mkdirSync(root,{recursive:true}); for (const entry of readdirSync(repo)) { if (['.work','.git','node_modules'].includes(entry)) continue; cpSync(join(repo,entry),join(root,entry),{recursive:true,filter:p=>!['.work','.git','node_modules'].includes(relative(repo,p).split(/[\\/]/)[0]) && !relative(repo,p).replaceAll('\\','/').startsWith('evidence/runs')}); }
 mkdirSync(join(root,'evidence','runs'),{recursive:true});
 for(const args of [['init'],['add','evidence/g1-suite-v1.0','evidence/g1-suite-v1.0.SHA256SUMS'],['-c','user.name=IQDID TEST','-c','user.email=test@prototype.test','commit','-m','TEST frozen baseline']]) {
  const p=spawnSync('git',args,{cwd:root,encoding:'utf8'}); if(p.status!==0)throw Error(`case git failed: ${p.stderr}`);
 }
 return root;
}
function inject(root,name) {
 let script=runnerText;
 const slot='    $dest = Join-Path $OutDir ("results_{0}.json" -f $r.name)';
 const corruption={
  counter:`if ($r.name -eq 'mutation_skip-chain') { $j = Get-Content -LiteralPath $resultFile -Raw | ConvertFrom-Json; $j.passed = 62; [System.IO.File]::WriteAllText($resultFile, ($j | ConvertTo-Json -Depth 20), (New-Object System.Text.UTF8Encoding($false))) }`,
  'forged-reason':`if ($r.name -eq 'main') { $j = Get-Content -LiteralPath $resultFile -Raw | ConvertFrom-Json; ($j.results | Where-Object { $_.id -eq 'SIG-03' }).detail = 'unrelated exception'; [System.IO.File]::WriteAllText($resultFile, ($j | ConvertTo-Json -Depth 20), (New-Object System.Text.UTF8Encoding($false))) }`,
  duplicate:`if ($r.name -eq 'main') { $j = Get-Content -LiteralPath $resultFile -Raw | ConvertFrom-Json; $j.results[-1].id = $j.results[0].id; [System.IO.File]::WriteAllText($resultFile, ($j | ConvertTo-Json -Depth 20), (New-Object System.Text.UTF8Encoding($false))) }`,
  malformed:`if ($r.name -eq 'main') { Set-Content -LiteralPath $resultFile -Value '{ invalid JSON' -Encoding UTF8 }`,
  'node-error':`$code = 19`,
 };
 if(corruption[name]) { if(!script.includes(slot))throw Error('Injection slot changed'); script=script.replace(slot,`    # TEST fault injection in this isolated copy only.\n    ${corruption[name]}\n${slot}`); }
 if(name==='npm-error') {
  const slot='  $ciCode = Invoke-Logged';
  script=script.replace(slot,`  # TEST: make npm ci reject this disposable package.json against its lock.\n  $p = Join-Path $Work 'package.json'\n  $j = Get-Content -LiteralPath $p -Raw | ConvertFrom-Json\n  $j.dependencies.jose = '0.0.0-iqdid-test-invalid'\n  $j | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $p -Encoding UTF8\n${slot}`);
 }
 if(name==='hash-observation-mismatch') {
  const hashSlot="  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()";
  if(!script.includes(hashSlot))throw Error('Hash observation injection slot changed');
  script=script.replace(hashSlot,"  if ($Path -like '*g1-suite-v1.0*README.md') { return ('0' * 64) }\n"+hashSlot);
 }
 if(name==='manifest-mismatch') { const p=join(root,'evidence','g1-suite-v1.0.SHA256SUMS'); const t=readFileSync(p,'utf8'); writeFileSync(p,(t[0]==='0'?'1':'0')+t.slice(1)); }
 if(script!==runnerText)writeFileSync(join(root,'tools',runnerName),script,'utf8');
}
function run(name,root,expected,seed) {
 const ev=join(root,'evidence','runs'); const before=new Set(readdirSync(ev));
 let command='';

 if(seed)command+=`$env:MUTATE = ${quote(seed)}; `;
 command+=`& ${quote(join(root,'tools',runnerName))}; $code=$LASTEXITCODE; if (Test-Path Env:MUTATE) { Write-Error 'MUTATE leaked'; exit 99 }; Write-Host 'MUTATE_AFTER=ABSENT'; exit $code`;
 const env={...process.env}; delete env.MUTATE;
 if(name==='missing-node') {env.PATH='';env.Path='';}
 const p=spawnSync(ps,['-NoProfile','-ExecutionPolicy','Bypass','-Command',command],{cwd:root,env,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
 const caseOut=join(out,'cases',name);mkdirSync(caseOut,{recursive:true});
 writeFileSync(join(caseOut,'runner.stdout.log'),p.stdout || '');writeFileSync(join(caseOut,'runner.stderr.log'),p.stderr || '');
 const fresh=readdirSync(ev).filter(n=>!before.has(n)&&existsSync(join(ev,n,'verification.json')));
 if(fresh.length!==1)throw Error(`${name}: missing unique runner evidence; status=${p.status}, error=${p.error?.message}`);
 const runDir=join(ev,fresh[0]);cpSync(runDir,join(caseOut,fresh[0]),{recursive:true});
 const summary=JSON.parse(readFileSync(join(runDir,'verification.json'),'utf8').replace(/^\uFEFF/,''));
 const after=manifest(root);const unchanged=JSON.stringify(after)===JSON.stringify(anchor);
 const r={case:name,status:summary.status,exit:p.status,expected_status:expected[0],expected_exit:expected[1],frozen_unchanged:unchanged,mutate_after_absent:(p.stdout||'').includes('MUTATE_AFTER=ABSENT'),run_dir:relative(repo,runDir).replaceAll('\\','/'),fault_injection:!name.startsWith('normal')};
 r.pass=r.status===expected[0]&&r.exit===expected[1]&&unchanged&&r.mutate_after_absent;
 if(name.startsWith('normal')) {
  const env=JSON.parse(readFileSync(join(runDir,'env.json'),'utf8').replace(/^\uFEFF/,''));
  r.windows_powershell_5_1=env.platform==='win32'&&env.powershell_edition==='Desktop'&&env.powershell.startsWith('5.1');
  r.env=env;
  r.counts=['main','mutation_skip-chain','mutation_skip-role'].map(mode=>{const j=JSON.parse(readFileSync(join(runDir,`results_${mode}.json`),'utf8').replace(/^\uFEFF/,''));return [j.passed,j.total];});
  r.pass &&= JSON.stringify(r.counts)===JSON.stringify([[62,62],[56,62],[60,62]]) && (windows?r.windows_powershell_5_1:true);
 }
 records.push(r);writeFileSync(join(out,'test-summary.json'),JSON.stringify({status:records.every(x=>x.pass)?'PASS':'FAIL',windows_validation:windows?'EXECUTED':'NOT RUN - local Linux smoke test',records},null,2));
 console.log(JSON.stringify(r));
}
try {
 run('normal-1',repo,['PASS',0],'skip-chain');
 run('normal-2',repo,['PASS',0],'skip-role');
 for(const name of ['counter','forged-reason','duplicate','malformed','missing-node','npm-error','manifest-mismatch','node-error','hash-observation-mismatch']) {
  const root=makeCase(name);inject(root,name);run(name,root,name==='missing-node'?['BLOCKED',2]:['FAIL',1]);
 }
 const after=manifest(repo);writeFileSync(join(out,'hashes_original_after.json'),JSON.stringify(after,null,2));
 const integrity=JSON.stringify(after)===JSON.stringify(anchor)&&hash(join(repo,'evidence','g1-suite-v1.0.SHA256SUMS'))===originalManifestHash&&Object.entries(prior).every(([p,h])=>existsSync(p)&&hash(p)===h);
 const verdict={status:records.every(r=>r.pass)&&integrity?'PASS':'FAIL',windows_validation:windows?'EXECUTED':'NOT RUN - local Linux smoke test',source_commit:process.env.GITHUB_SHA||null,source_branch:process.env.GITHUB_REF_NAME||null,node:process.version,npm:spawnSync(windows?'cmd.exe':'npm',windows?['/d','/s','/c','npm -v']:['-v'],{encoding:'utf8'}).stdout?.trim(),frozen_and_prior_evidence_unchanged:integrity,records};
 writeFileSync(join(out,'test-summary.json'),JSON.stringify(verdict,null,2));
 console.log(`TASK1 ${verdict.status}; Windows ${verdict.windows_validation}; evidence ${relative(repo,out)}`);
 if(verdict.status!=='PASS')process.exitCode=1;
} catch(err) {writeFileSync(join(out,'harness-error.txt'),err.stack);console.error(err);process.exitCode=1;}
