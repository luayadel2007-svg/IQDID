// Safe process boundary: an engine crash (even syntax failure) cannot print inspected data or source lines.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const engine=fileURLToPath(new URL('./lib/secret-scanner-engine.mjs',import.meta.url));
const args=process.argv.slice(2);
const RULES=['PRIVATE_KEY','PRIVATE_JWK','KNOWN_TOKEN','SECRET_ASSIGNMENT','SENSITIVE_FILE','PII_IDENTIFIER','PII_CONTACT'];
const ERRORS=['GIT_READ_FAILED','INDEX_INVALID','INDEX_UNMERGED','OBJECT_ID_INVALID','FILE_TOO_LARGE','BLOB_SIZE_MISMATCH','RULES_NOT_STAGED','RULES_INVALID','UNSUPPORTED_BINARY','ARCHIVE_DEPTH_LIMIT','ARCHIVE_INVALID','ARCHIVE_LIMIT','ARCHIVE_UNSUPPORTED','ARCHIVE_PATH_INVALID','ARCHIVE_EXPANSION_LIMIT','ARCHIVE_ENTRY_UNSUPPORTED','INDEX_ENTRY_UNSUPPORTED','INDEX_CHANGED_DURING_SCAN','CONTENT_READ_FAILED','PATH_NOT_SELECTED','SCANNER_FAILED'];
function safe(s){return s.replace(/\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{20,}|sk_live_[A-Za-z0-9]{16,})\b/g,'<redacted>').replace(/-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/g,'<redacted>').replace(/[0-9٠-٩۰-۹]{6,}/g,'<digits>').replace(/[\u0000-\u001f\u007f]/g,c=>`\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);}
function blocked(){return {schema:1,status:'BLOCKED',exit_code:2,mode:args.includes('--all-index')?'all-index':'staged',scanned_files:0,findings:[],errors:[{code:'SCANNER_PROCESS_FAILED'}]};}
let report=blocked();
try {
 const p=spawnSync(process.execPath,[engine,...args],{encoding:'utf8',maxBuffer:8*1024*1024,windowsHide:true});
 if(p.error||p.signal)throw Error('process');
 const r=JSON.parse(p.stdout);
 if(r.schema!==1||!['PASS','FAIL','BLOCKED'].includes(r.status)||r.exit_code!=={PASS:0,FAIL:1,BLOCKED:2}[r.status]||p.status!==r.exit_code||!['staged','all-index'].includes(r.mode)||!Number.isInteger(r.scanned_files)||r.scanned_files<0||!Array.isArray(r.findings)||!Array.isArray(r.errors))throw Error('schema');
 const findings=r.findings.map(x=>{if(!RULES.includes(x.rule)||typeof x.path!=='string'||x.path.length>4096||!Number.isInteger(x.line)||x.line<1)throw Error('finding');return {path:safe(x.path),rule:x.rule,line:x.line};});
 const errors=r.errors.map(x=>{if(!ERRORS.includes(x.code)||x.path!==undefined&&(typeof x.path!=='string'||x.path.length>4096))throw Error('error');return x.path===undefined?{code:x.code}:{path:safe(x.path),code:x.code};});
 if(r.status==='PASS'&&(findings.length||errors.length)||r.status==='FAIL'&&(!findings.length||errors.length)||r.status==='BLOCKED'&&!errors.length)throw Error('verdict');
 report={schema:1,status:r.status,exit_code:r.exit_code,mode:r.mode,scanned_files:r.scanned_files,findings,errors};
} catch { /* Never echo engine output or exception values. */ }
process.stdout.write(JSON.stringify(report,null,2)+'\n');process.exitCode=report.exit_code;
