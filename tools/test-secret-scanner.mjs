// TEST ONLY: fixtures are generated in temporary repositories and never emitted or committed to IQDID.
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, existsSync, renameSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
const root=resolve(process.argv[2]||'.');
const scanner=join(root,'tools/secret-scanner.mjs');
const evidence=join(root,'evidence/runs/task2-secret-scanner');mkdirSync(evidence,{recursive:true});
const results=[];const temp=mkdtempSync(join(tmpdir(),'iqdid-task2-'));
const token=['ghp','_'].join('')+'A'.repeat(36);
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const pem=privateKey.export({type:'pkcs8',format:'pem'});
const publicPem=publicKey.export({type:'spki',format:'pem'});
const privateJwk=privateKey.export({format:'jwk'});
const pii=['123456','789012'].join('');
const canaries=[token,privateJwk.d,pem.trim(),pii];
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
function check(ok,code){if(!ok)throw Error(code);}
function cmd(repo,args,input) {const p=spawnSync('git',['-C',repo,...args],{input,encoding:'utf8'});if(p.status!==0)throw Error('TEST_GIT_OPERATION_FAILED');return p.stdout.trim();}
function fixture(name) {
 const repo=join(temp,name);mkdirSync(repo);cmd(repo,['init']);
 for(const file of ['tools/secret-scanner.mjs','tools/lib/secret-scanner-engine.mjs','tools/install-secret-hook.mjs','.security/secret-scanner-rules.json','.githooks/pre-commit']){mkdirSync(dirname(join(repo,file)),{recursive:true});cpSync(join(root,file),join(repo,file));}
 cmd(repo,['config','user.name','IQDID TEST']);cmd(repo,['config','user.email','test@prototype.test']);cmd(repo,['add','.']);cmd(repo,['commit','-qm','TEST clean scanner baseline']);return repo;
}
function stage(repo,path,data) {const p=join(repo,path);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,data);cmd(repo,['add','--',path]);return p;}
function scan(repo,extra=[],environment) {
 const before=sha(join(repo,'.git/index'));
 const p=spawnSync(process.execPath,[join(repo,'tools/secret-scanner.mjs'),'--repo',repo,'--staged',...extra],{encoding:'utf8',env:environment||process.env});
 const noLeak=canaries.every(v=>!(p.stdout||'').includes(v)&&!(p.stderr||'').includes(v));
 const after=sha(join(repo,'.git/index'));
 let report;try{report=JSON.parse(p.stdout);}catch{}
 return {exit:p.status,report,noLeak,index_unchanged:before===after,stdout:noLeak?p.stdout:'<suppressed: leak detected>',stderr:noLeak?p.stderr:'<suppressed: leak detected>'};
}
function test(id,fn) {try{const info=fn();results.push({id,pass:true,...info});}catch(e){results.push({id,pass:false,error_code:/^[A-Z0-9_]{1,80}$/.test(e.message)?e.message:'ASSERTION_FAILED'});} console.log(JSON.stringify(results.at(-1)));}
function expect(repo,status,extra=[],env) {const r=scan(repo,extra,env);check(r.noLeak&&r.index_unchanged,'SAFE_LOGS_AND_INDEX');check(r.exit==={PASS:0,FAIL:1,BLOCKED:2}[status]&&r.report?.status===status,'EXPECTED_VERDICT');return r;}
function reject(id,name,data,rule){test(id,()=>{const repo=fixture(id);stage(repo,name,data);const r=expect(repo,'FAIL');check(r.report.findings.some(x=>x.rule===rule),'EXPECTED_RULE');return r;});}
reject('N01_private_pem','key material.txt',pem,'PRIVATE_KEY');
reject('N02_private_jwk','credential.data',JSON.stringify({keys:[privateJwk]}),'PRIVATE_JWK');
reject('N03_api_token','config.txt',token,'KNOWN_TOKEN');
reject('N04_env','config/.env','MODE=TEST\n','SENSITIVE_FILE');
reject('N05_identity','citizen.json',JSON.stringify({national_id:pii,note:'TEST ONLY'}),'PII_IDENTIFIER');
test('N06_index_differs_worktree',()=>{const repo=fixture('N06');const p=stage(repo,'staged.txt',token);writeFileSync(p,'let safe = true;\n');const r=expect(repo,'FAIL');check(r.report.findings.some(x=>x.rule==='KNOWN_TOKEN'),'STAGED_BLOB_READ');return r;});
reject('N07_special_filename','dir with spaces/اسم ; $x [a].txt',token,'KNOWN_TOKEN');
test('N08_read_failure',()=>{const repo=fixture('N08');const oid=cmd(repo,['hash-object','-w','--stdin'],'non sensitive missing blob\n');cmd(repo,['update-index','--add','--cacheinfo','100644',oid,'unreadable.txt']);const p=join(repo,'.git/objects',oid.slice(0,2),oid.slice(2));renameSync(p,p+'.preserved');return expect(repo,'BLOCKED');});
test('N09_private_key_exception',()=>{const repo=fixture('N09');const p=join(repo,'.security/secret-scanner-rules.json');const r=JSON.parse(readFileSync(p));r.exceptions=[{rule:'PRIVATE_KEY',path:'*',reason:'TEST'}];stage(repo,'.security/secret-scanner-rules.json',JSON.stringify(r));stage(repo,'test key.txt',pem);return expect(repo,'BLOCKED');});
reject('N10_ssh_private','ssh.txt',['-----BEGIN','OPENSSH PRIVATE KEY-----'].join(' ')+'\nAAAA\n','PRIVATE_KEY');
reject('N11_pgp_private','pgp.txt',['-----BEGIN','PGP PRIVATE KEY BLOCK-----'].join(' ')+'\nAAAA\n','PRIVATE_KEY');
test('N12_binary',()=>{const repo=fixture('N12');stage(repo,'opaque.bin',Buffer.from([0,1,2,3]));return expect(repo,'BLOCKED');});
test('N13_large',()=>{const repo=fixture('N13');stage(repo,'large.txt',Buffer.alloc(2097153,65));return expect(repo,'BLOCKED');});
reject('N14_utf16','unicode.txt',Buffer.concat([Buffer.from([255,254]),Buffer.from(token,'utf16le')]),'KNOWN_TOKEN');
test('N15_rules_from_index',()=>{const repo=fixture('N15');stage(repo,'secret.txt',token);const p=join(repo,'.security/secret-scanner-rules.json');const r=JSON.parse(readFileSync(p));r.exceptions=[{rule:'KNOWN_TOKEN',path:'*'}];writeFileSync(p,JSON.stringify(r));return expect(repo,'FAIL');});
test('N16_rename',()=>{const repo=fixture('N16');stage(repo,'old.txt',pem);cmd(repo,['commit','-qm','TEST prior private fixture without hook']);cmd(repo,['mv','old.txt','renamed file.txt']);return expect(repo,'FAIL');});
test('N17_tool_failure',()=>{const repo=fixture('N17');stage(repo,'safe.txt','const x=1;');return expect(repo,'BLOCKED',[],{...process.env,PATH:'',Path:''});});
test('N18_token_in_filename',()=>{const repo=fixture('N18');stage(repo,token+'.txt','safe content');return expect(repo,'FAIL');});
test('P01_source',()=>{const repo=fixture('P01');stage(repo,'app.mjs','export const sum=(a,b)=>a+b;\n');return expect(repo,'PASS');});
test('P02_public_key',()=>{const repo=fixture('P02');stage(repo,'public.pem',publicPem);stage(repo,'public.json',JSON.stringify(publicKey.export({format:'jwk'})));return expect(repo,'PASS');});
test('P03_synthetic_id',()=>{const repo=fixture('P03');stage(repo,'fixture.json',JSON.stringify({national_id:'TEST-'+'0'.repeat(11)+'1',name:'مواطن تجريبي أول'}));return expect(repo,'PASS');});
test('P04_deleted',()=>{const repo=fixture('P04');stage(repo,'old.txt','safe');cmd(repo,['commit','-qm','TEST file']);cmd(repo,['rm','old.txt']);return expect(repo,'PASS');});
test('P05_clean_worktree_bad_staged',()=>{const repo=fixture('P05');const p=stage(repo,'safe-staged.txt','safe');writeFileSync(p,token);return expect(repo,'PASS');});
test('P06_env_example',()=>{const repo=fixture('P06');stage(repo,'.env.example','API_KEY=REPLACE_ME\nPASSWORD=<set-locally>\n');return expect(repo,'PASS');});
test('H01_before_hook',()=>{const repo=fixture('H01');stage(repo,'private.txt',pem);const p=spawnSync('git',['-C',repo,'commit','-qm','TEST before protection'],{encoding:'utf8'});check(p.status===0,'PREVIOUS_GAP');return {exit:p.status,note:'Before hook, commit was allowed; fixture stays only in temporary TEST repo.'};});
test('H02_hook_reject_accept',()=>{const repo=fixture('H02');const i=spawnSync(process.execPath,[join(repo,'tools/install-secret-hook.mjs'),repo],{encoding:'utf8'});check(i.status===0,'INSTALL_HOOK');stage(repo,'private.txt',pem);const before=cmd(repo,['ls-files','--stage','-z']);const p=spawnSync('git',['-C',repo,'commit','-qm','TEST rejected fixture'],{encoding:'utf8'});const noLeak=canaries.every(x=>!(p.stdout+p.stderr).includes(x));check(p.status!==0&&noLeak&&before===cmd(repo,['ls-files','--stage','-z']),'HOOK_REJECT');cmd(repo,['reset','-q','HEAD','--','private.txt']);stage(repo,'app.txt','safe');const accepted=spawnSync('git',['-C',repo,'commit','-qm','TEST accepted clean file'],{encoding:'utf8'});check(accepted.status===0,'HOOK_ACCEPT');return {reject_exit:p.status,accept_exit:accepted.status,logs_redacted:noLeak,index_entries_unchanged:true,note:'Git commit may refresh index metadata; direct scanner tests compare exact index bytes.',stderr:p.stderr};});
test('H03_existing_hook_preserved',()=>{const repo=fixture('H03');mkdirSync(join(repo,'.git/hooks'),{recursive:true});writeFileSync(join(repo,'.git/hooks/pre-commit'),'existing local hook');const before=sha(join(repo,'.git/hooks/pre-commit'));const p=spawnSync(process.execPath,[join(repo,'tools/install-secret-hook.mjs'),repo],{encoding:'utf8'});check(p.status===2&&before===sha(join(repo,'.git/hooks/pre-commit')),'EXISTING_HOOK');return {exit:p.status};});

function zipStored(name,data) {
 const b=Buffer.from(data),n=Buffer.from(name);let crc=0xffffffff;
 for(const x of b){crc^=x;for(let k=0;k<8;k++)crc=(crc&1)?0xedb88320^(crc>>>1):crc>>>1;}crc=(crc^0xffffffff)>>>0;
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt32LE(crc,14);local.writeUInt32LE(b.length,18);local.writeUInt32LE(b.length,22);local.writeUInt16LE(n.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(b.length,20);central.writeUInt32LE(b.length,24);central.writeUInt16LE(n.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+n.length,12);end.writeUInt32LE(local.length+n.length+b.length,16);
 return Buffer.concat([local,n,b,central,n,end]);
}
reject('N19_zip_token','archive.zip',zipStored('config.txt',token),'KNOWN_TOKEN');
test('N20_invalid_zip',()=>{const repo=fixture('N20');stage(repo,'broken.zip',Buffer.from([80,75,3,4]));return expect(repo,'BLOCKED');});
reject('N21_password_test_marker','password.txt','TEST ONLY\n'+'password='+['artificial','-credential-value'].join(''),'SECRET_ASSIGNMENT');
test('P07_safe_zip',()=>{const repo=fixture('P07');stage(repo,'public.zip',zipStored('public.pem',publicPem));return expect(repo,'PASS');});

reject('N22_jwk_before_kty_invalid_json','jwk snippet.txt',JSON.stringify({d:privateJwk.d,...privateJwk})+' // TEST','PRIVATE_JWK');
reject('N23_spaced_identity','document.json',JSON.stringify({passport_number:['1234','5678','9012'].join(' ')}),'PII_IDENTIFIER');

test('N24_orphan_zip',()=>{const repo=fixture('N24');const z=zipStored('unlisted.txt','safe');const localEnd=30+Buffer.byteLength('unlisted.txt')+4;const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt32LE(localEnd,16);stage(repo,'orphan.zip',Buffer.concat([z.subarray(0,localEnd),end]));return expect(repo,'BLOCKED');});
test('N25_zip_comment_token',()=>{const repo=fixture('N25');const z=zipStored('safe.txt','safe');z.writeUInt16LE(Buffer.byteLength(token),z.length-2);stage(repo,'comment.zip',Buffer.concat([z,Buffer.from(token)]));const r=expect(repo,'FAIL');check(r.report.findings.some(x=>x.rule==='KNOWN_TOKEN'),'ZIP_METADATA_INSPECTED');return r;});


test('H04_global_hook_preserved',()=>{const repo=fixture('H04');const config=join(temp,'isolated-global-config');writeFileSync(config,'[core]\n hooksPath = existing-hooks\n');const before=readFileSync(join(repo,'.git/config'),'utf8');const p=spawnSync(process.execPath,[join(repo,'tools/install-secret-hook.mjs'),repo],{encoding:'utf8',env:{...process.env,GIT_CONFIG_GLOBAL:config}});check(p.status===2&&before===readFileSync(join(repo,'.git/config'),'utf8'),'GLOBAL_HOOK_PRESERVED');return {exit:p.status,existing_configuration_unchanged:true};});

test('N26_tool_syntax_no_leak',()=>{const repo=fixture('N26');stage(repo,'safe.txt','safe');const p=join(repo,'tools/lib/secret-scanner-engine.mjs');writeFileSync(p,readFileSync(p,'utf8')+"\nconst = '"+token+"';\n");return expect(repo,'BLOCKED');});
const summary={status:results.every(x=>x.pass)?'PASS':'FAIL',platform:process.platform,node:process.version,run_at_utc:new Date().toISOString(),commands:['node tools/test-secret-scanner.mjs <repo>','node tools/secret-scanner.mjs --repo <temporary-test-repo> --staged','git commit (real pre-commit acceptance/rejection)'],tests:results.length,passed:results.filter(x=>x.pass).length,results};
writeFileSync(join(evidence,`tests-${process.platform}.json`),JSON.stringify(summary,null,2));
console.log(`TASK2 TESTS ${summary.passed}/${summary.tests} ${summary.status}`);process.exitCode=summary.status==='PASS'?0:1;
