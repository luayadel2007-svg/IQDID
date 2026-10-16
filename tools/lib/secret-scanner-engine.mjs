// IQDID TEST ONLY. No dependencies; Git blobs are read without checking out or changing the index.
import { spawnSync } from 'node:child_process';
import { inflateRawSync, inflateSync } from 'node:zlib';
import { TextDecoder } from 'node:util';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const REQUIRED = ['PRIVATE_KEY','PRIVATE_JWK','KNOWN_TOKEN','SECRET_ASSIGNMENT','SENSITIVE_FILE','PII_IDENTIFIER','PII_CONTACT'];
const RULE_PATH = '.security/secret-scanner-rules.json';
const PRIVATE = /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/g;
const TOKENS = /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{20,}|sk_live_[A-Za-z0-9]{16,})\b/g;
const ID_FIELDS = '(?:national[_-]?id|nationalId|passport[_-]?(?:number|no)|document[_-]?(?:number|no)|civil[_-]?id|citizen[_-]?id|رقم_الهوية|رقم_الجواز)';
const ASSIGN = /\b(password|passwd|api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key|secret)\b["']?\s*[:=]\s*(?:["']([^"'\r\n]{8,})["']|([A-Za-z0-9_+\/.=-]{12,}))/gi;
const MASKS = /^(?:\*+|<[^>]*>|\$\{[^}]+\}|REPLACE_ME|CHANGE_ME|CHANGEME|YOUR_[A-Z_]+|process\.env\.[A-Z_]+)$/i;
function safePath(path) { return path.replace(TOKENS,'<redacted>').replace(PRIVATE,'<redacted>').replace(/[0-9٠-٩۰-۹]{6,}/g,'<digits>').replace(/[\u0000-\u001f\u007f]/g,c=>`\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`); }
class Blocked extends Error { constructor(code) { super(code); this.code=code; } }
function git(repo,args,limit=4*1024*1024) {
 const p=spawnSync('git',['-C',repo,...args],{encoding:null,maxBuffer:limit,windowsHide:true,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
 if(p.error || p.status!==0)throw new Blocked('GIT_READ_FAILED');
 return p.stdout;
}
function parseIndex(b) { return new TextDecoder('utf8',{fatal:true}).decode(b).split('\0').filter(Boolean).map(x=>{const i=x.indexOf('\t');if(i<0)throw new Blocked('INDEX_INVALID');const [mode,oid,stage]=x.slice(0,i).split(' ');return {mode,oid,stage,path:x.slice(i+1)};}); }
function blob(repo,oid,max) {
 if(!/^[a-f0-9]{40,64}$/.test(oid))throw new Blocked('OBJECT_ID_INVALID');
 const n=Number(git(repo,['cat-file','-s',oid]).toString('ascii').trim());
 if(!Number.isSafeInteger(n)||n<0||n>max)throw new Blocked('FILE_TOO_LARGE');
 const b=git(repo,['cat-file','blob',oid],max+1024);
 if(b.length!==n)throw new Blocked('BLOB_SIZE_MISMATCH');return b;
}
function rulesFromIndex(repo,index) {
 const item=index.find(x=>x.path===RULE_PATH&&x.stage==='0');if(!item)throw new Blocked('RULES_NOT_STAGED');
 let r;try{r=JSON.parse(blob(repo,item.oid,16384).toString('utf8'));}catch{throw new Blocked('RULES_INVALID');}
 const keys=['version','maxBlobBytes','maxArchiveBytes','maxArchiveEntries','maxArchiveDepth','approvedSyntheticNationalId','exceptions','ruleIds'];
 if(!r||Object.keys(r).sort().join()!==keys.sort().join()||r.version!==1||r.approvedSyntheticNationalId!=='^TEST-[0-9]{12}$'||!Array.isArray(r.exceptions)||r.exceptions.length||!Array.isArray(r.ruleIds)||r.ruleIds.slice().sort().join()!==REQUIRED.slice().sort().join())throw new Blocked('RULES_INVALID');
 for(const [k,max] of [['maxBlobBytes',2097152],['maxArchiveBytes',33554432],['maxArchiveEntries',2000],['maxArchiveDepth',2]])if(!Number.isInteger(r[k])||r[k]<1||r[k]>max)throw new Blocked('RULES_INVALID');
 return r;
}
function decode(b) {
 try {
  if(b.length>=2&&b[0]===255&&b[1]===254)return new TextDecoder('utf-16le',{fatal:true}).decode(b);
  if(b.length>=2&&b[0]===254&&b[1]===255)return new TextDecoder('utf-16be',{fatal:true}).decode(b);
  if(b.includes(0))throw new Blocked('UNSUPPORTED_BINARY');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(b);
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001a\u001c-\u001f]/.test(text))throw new Blocked('UNSUPPORTED_BINARY');
  return text;
 }catch{throw new Blocked('UNSUPPORTED_BINARY');}
}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(b) {let crc=0xffffffff;for(const x of b)crc=crcTable[(crc^x)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function unzip(b,policy,state,depth,path,inspect) {
 if(depth>=policy.maxArchiveDepth)throw new Blocked('ARCHIVE_DEPTH_LIMIT');
 let e=-1;for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(b.readUInt32LE(i)===0x06054b50&&i+22+b.readUInt16LE(i+20)===b.length){e=i;break;}
 if(e<0||b.readUInt16LE(e+4)||b.readUInt16LE(e+6))throw new Blocked('ARCHIVE_INVALID');
 const count=b.readUInt16LE(e+10),end=b.readUInt32LE(e+16)+b.readUInt32LE(e+12);let pos=b.readUInt32LE(e+16); const cdStart=pos; const ranges=[];
 state.entries+=count;
 if(count===65535||state.entries>policy.maxArchiveEntries||end!==e||(count===0&&cdStart!==0))throw new Blocked('ARCHIVE_LIMIT');
 const names=new Set();
 for(let n=0;n<count;n++) {
  if(pos+46>b.length||b.readUInt32LE(pos)!==0x02014b50)throw new Blocked('ARCHIVE_INVALID');
  const flags=b.readUInt16LE(pos+8),method=b.readUInt16LE(pos+10),crc=b.readUInt32LE(pos+16),cs=b.readUInt32LE(pos+20),us=b.readUInt32LE(pos+24),nl=b.readUInt16LE(pos+28),xl=b.readUInt16LE(pos+30),cl=b.readUInt16LE(pos+32),offset=b.readUInt32LE(pos+42);
  if(((b.readUInt32LE(pos+38)>>>16)&0xf000)===0xa000)throw new Blocked('ARCHIVE_ENTRY_UNSUPPORTED');
  if(pos+46+nl+xl+cl>end||flags&1||![0,8].includes(method)||us>policy.maxBlobBytes)throw new Blocked('ARCHIVE_UNSUPPORTED');
  const name=new TextDecoder('utf8',{fatal:true}).decode(b.subarray(pos+46,pos+46+nl)).replaceAll('\\','/');
  if(name.startsWith('/')||/^[A-Za-z]:/.test(name)||name.split('/').includes('..')||names.has(name))throw new Blocked('ARCHIVE_PATH_INVALID');names.add(name);
  pos+=46+nl+xl+cl;
  if(offset+30>b.length||b.readUInt32LE(offset)!==0x04034b50)throw new Blocked('ARCHIVE_INVALID');
  const start=offset+30+b.readUInt16LE(offset+26)+b.readUInt16LE(offset+28);
  if(start+cs>cdStart||b.readUInt16LE(offset+6)!==flags||b.readUInt16LE(offset+8)!==method)throw new Blocked('ARCHIVE_INVALID');
  if(!b.subarray(offset+30,offset+30+b.readUInt16LE(offset+26)).equals(Buffer.from(name)))throw new Blocked('ARCHIVE_INVALID');
  let recordEnd=start+cs;
  if(flags&8) { if(recordEnd+4>cdStart)throw new Blocked('ARCHIVE_INVALID'); if(b.readUInt32LE(recordEnd)===0x08074b50)recordEnd+=4; if(recordEnd+12>cdStart||b.readUInt32LE(recordEnd)!==crc||b.readUInt32LE(recordEnd+4)!==cs||b.readUInt32LE(recordEnd+8)!==us)throw new Blocked('ARCHIVE_INVALID');recordEnd+=12; }
  ranges.push([offset,recordEnd]);
  state.expanded+=us;if(state.expanded>policy.maxArchiveBytes)throw new Blocked('ARCHIVE_EXPANSION_LIMIT');
  const raw=method===0?b.subarray(start,start+cs):inflateRawSync(b.subarray(start,start+cs),{maxOutputLength:Math.min(policy.maxBlobBytes,us)+1});
  if(raw.length!==us||crc32(raw)!==crc)throw new Blocked('ARCHIVE_INVALID');
  if(!name.endsWith('/'))inspect(path+'!'+name,raw,depth+1);
 }
 if(pos!==end)throw new Blocked('ARCHIVE_INVALID');
 let cursor=0;for(const [start,finish] of ranges.sort((a,b)=>a[0]-b[0])){if(start!==cursor||finish>cdStart)throw new Blocked('ARCHIVE_INVALID');cursor=finish;}if(cursor!==cdStart)throw new Blocked('ARCHIVE_INVALID');
}
// PNG (TASK-12): validated chunk walk. Every place a PNG can carry text (tEXt, zTXt, iTXt) is decoded and scanned
// with the same rules; any unknown chunk, CRC mismatch, ordering error or trailing data stays BLOCKED.
// Not covered: text rendered as pixels (needs human review). IDAT pixel data is CRC-checked, not decoded.
const PNG_SIG=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
const PNG_CHUNKS=new Set(['IHDR','PLTE','IDAT','IEND','tRNS','gAMA','cHRM','sRGB','iCCP','sBIT','pHYs','bKGD','tIME','tEXt','zTXt','iTXt']);
export const isPng=b=>b.length>=8&&b.subarray(0,8).equals(PNG_SIG);
export function inspectPng(path,b,maxOutputLength,find) {
 let pos=8,n=0,ended=false;
 const z=d=>{try{return inflateSync(d,{maxOutputLength});}catch{throw new Blocked('UNSUPPORTED_BINARY');}};
 const nul=(d,from=0)=>{const i=d.indexOf(0,from);if(i<0)throw new Blocked('UNSUPPORTED_BINARY');return i;};
 while(pos<b.length) {
  if(ended||pos+12>b.length)throw new Blocked('UNSUPPORTED_BINARY');
  const len=b.readUInt32BE(pos),type=b.toString('latin1',pos+4,pos+8);
  if(len>0x7fffffff||pos+12+len>b.length||!/^[A-Za-z]{4}$/.test(type)||!PNG_CHUNKS.has(type))throw new Blocked('UNSUPPORTED_BINARY');
  const data=b.subarray(pos+8,pos+8+len);
  if(crc32(b.subarray(pos+4,pos+8+len))!==b.readUInt32BE(pos+8+len))throw new Blocked('UNSUPPORTED_BINARY');
  if((n===0)!==(type==='IHDR'))throw new Blocked('UNSUPPORTED_BINARY');
  if(type==='tEXt'){const k=nul(data);inspectText(path+'#tEXt',data.toString('latin1',0,k)+'\n'+data.toString('latin1',k+1),find);}
  else if(type==='zTXt'){const k=nul(data);if(data[k+1]!==0)throw new Blocked('UNSUPPORTED_BINARY');inspectText(path+'#zTXt',data.toString('latin1',0,k)+'\n'+z(data.subarray(k+2)).toString('latin1'),find);}
  else if(type==='iTXt'){const k=nul(data),flag=data[k+1],method=data[k+2];if(![0,1].includes(flag)||method!==0)throw new Blocked('UNSUPPORTED_BINARY');const l=nul(data,k+3),t=nul(data,l+1);const body=flag?z(data.subarray(t+1)):data.subarray(t+1);inspectText(path+'#iTXt',[data.toString('latin1',0,k),data.toString('utf8',k+3,l),data.toString('utf8',l+1,t),new TextDecoder('utf-8',{fatal:true}).decode(body)].join('\n'),find);}
  else if(type==='IEND')ended=true;
  pos+=12+len;n++;
 }
 if(!ended)throw new Blocked('UNSUPPORTED_BINARY');
}
function inspectText(path,text,find) {
 const line=i=>text.slice(0,i).split('\n').length;
 for(const m of text.matchAll(PRIVATE))find('PRIVATE_KEY',line(m.index));
 for(const m of text.matchAll(TOKENS))find('KNOWN_TOKEN',line(m.index));
 for(const m of text.matchAll(ASSIGN))if(!MASKS.test(m[2]||m[3]))find('SECRET_ASSIGNMENT',line(m.index));
 let obj;try{obj=JSON.parse(text);}catch{}
 function jwk(o) {
  if(!o||typeof o!=='object')return;
  if(['RSA','EC','OKP','oct'].includes(o.kty)&&['d','p','q','dp','dq','qi','oth',...(o.kty==='oct'?['k']:[])].some(k=>Object.hasOwn(o,k)))find('PRIVATE_JWK',1);
  for(const v of Object.values(o))if(v&&typeof v==='object')jwk(v);
 }
 if(obj)jwk(obj);
 // Also cover JS/YAML snippets and invalid JSON, without relying on filename.
 if(!obj)for(const m of text.matchAll(/["']?kty["']?\s*[:=]\s*["'](RSA|EC|OKP|oct)["']/g)) {
  const window=text.slice(Math.max(0,m.index-2000),m.index+2000);
  const privateField=m[1]==='oct'?'d|p|q|dp|dq|qi|oth|k':'d|p|q|dp|dq|qi|oth';
  const pattern=new RegExp('["\']?\\b(?:'+privateField+')["\']?\\s*[:=]\\s*["\'][A-Za-z0-9_+/=-]+["\']');
  if(pattern.test(window))find('PRIVATE_JWK',line(m.index));
 }
 const identities=new RegExp(String.raw`${ID_FIELDS}["']?\s*[:=]\s*(?:["']([^"'\r\n]{6,60})["']|([0-9٠-٩۰-۹][0-9٠-٩۰-۹ -]{5,30}))`,'gi');
 for(const m of text.matchAll(identities)) {
  const value=(m[1]||m[2]).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
  const allowed=/national[_-]?id|nationalId/i.test(m[0])&&/^TEST-[0-9]{12}$/.test(value);
  if(!allowed&&(value.match(/[0-9]/g)||[]).length>=6)find('PII_IDENTIFIER',line(m.index));
 }
 const contact=/(?:["']?(?:email|phone|mobile)["']?\s*[:=]\s*["'])([^"'\r\n]+)["']/gi;
 for(const m of text.matchAll(contact))if((/@/.test(m[1])&&!/@(?:[^@.]+\.)*(?:example\.com|example\.org|example\.net|invalid|test)$/i.test(m[1]))||/^\+?[0-9 ()-]{9,}$/.test(m[1]))find('PII_CONTACT',line(m.index));
 const leaf=basename(path.split('!').at(-1)).toLowerCase();
 if((leaf==='.env'||leaf.startsWith('.env.')&&leaf!=='.env.example')||(/^(?:id_rsa|id_ed25519|id_dsa|id_ecdsa)$/.test(leaf)&&text.trim()&&!/-----BEGIN (?:RSA )?PUBLIC KEY-----/.test(text)))find('SENSITIVE_FILE',1);
 if(leaf==='.env.example')for(const [i,s] of text.split(/\r?\n/).entries())if(s.trim()&&!s.trim().startsWith('#')){const m=/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.*)$/.exec(s.trim());if(!m||m[1]&&!MASKS.test(m[1].replace(/^['"]|['"]$/g,'')))find('SENSITIVE_FILE',i+1);}
}
export function scanRepository({repo,mode='staged',base,paths=[]}) {
 const result={schema:1,status:'BLOCKED',exit_code:2,mode,scanned_files:0,findings:[],errors:[]};
 try {
  const snapshot=git(repo,['ls-files','--stage','-z']);const index=parseIndex(snapshot);if(index.some(x=>x.stage!=='0'))throw new Blocked('INDEX_UNMERGED');
  const policy=rulesFromIndex(repo,index);
  let chosen=index;
  if(mode==='staged') {const args=['diff','--cached','--name-only','--diff-filter=ACMR','--no-ext-diff','--no-textconv','-z'];if(base)args.push(base);args.push('--');const set=new Set(new TextDecoder('utf8',{fatal:true}).decode(git(repo,args)).split('\0').filter(Boolean));chosen=index.filter(x=>set.has(x.path));}
  if(paths.length) { if(paths.some(p=>!chosen.some(x=>x.path===p)))throw new Blocked('PATH_NOT_SELECTED'); chosen=chosen.filter(x=>paths.includes(x.path)); }
  const unique=new Set();const state={expanded:0,entries:0};
  function inspect(path,b,depth=0) {
   const find=(rule,line)=>{const key=JSON.stringify([path,rule,line]);if(unique.has(key))return;unique.add(key);result.findings.push({path:safePath(path),rule,line});};
   if(new RegExp(TOKENS.source).test(path))find('KNOWN_TOKEN',1);
   const leaf=basename(path.split('!').at(-1)).toLowerCase();
   if(/\.(?:p12|pfx|jks|keystore)$/.test(leaf)&&b.length){find('SENSITIVE_FILE',1);return;}
   if(b.length>=4&&[0x04034b50,0x06054b50].includes(b.readUInt32LE(0))){inspectText(path,b.toString('latin1'),find);unzip(b,policy,state,depth,path,inspect);return;}
   // Detect ASCII secret signatures even in an otherwise unsupported binary.
   const ascii=b.toString('latin1');const suspect=PRIVATE.test(ascii)||TOKENS.test(ascii);PRIVATE.lastIndex=0;TOKENS.lastIndex=0;
   if(suspect)inspectText(path,ascii,find);
   if(isPng(b)){inspectPng(path,b,policy.maxBlobBytes,find);return;}
   if(/\.(?:zip|7z|rar|gz|tar)$/.test(leaf))throw new Blocked('ARCHIVE_UNSUPPORTED');
   try{inspectText(path,decode(b),find);}catch(e){if(!suspect)throw e;}
  }
  for(const item of chosen) {
   try{if(!['100644','100755'].includes(item.mode))throw new Blocked('INDEX_ENTRY_UNSUPPORTED');inspect(item.path,blob(repo,item.oid,policy.maxBlobBytes));result.scanned_files++;}
   catch(e){result.errors.push({path:safePath(item.path),code:e instanceof Blocked?e.code:'CONTENT_READ_FAILED'});}
  }
  if(!snapshot.equals(git(repo,['ls-files','--stage','-z'])))throw new Blocked('INDEX_CHANGED_DURING_SCAN');
  result.status=result.errors.length?'BLOCKED':result.findings.length?'FAIL':'PASS';result.exit_code=result.status==='BLOCKED'?2:result.status==='FAIL'?1:0;
 }catch(e){result.errors.push({code:e instanceof Blocked?e.code:'SCANNER_FAILED'});}
 return result;
}
if(resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)) {
 let options={repo:process.cwd(),paths:[]};
 try {
  for(let i=2;i<process.argv.length;i++){const arg=process.argv[i];if(arg==='--repo')options.repo=resolve(process.argv[++i]);else if(arg==='--staged')options.mode='staged';else if(arg==='--all-index')options.mode='all-index';else if(arg==='--base'){options.base=process.argv[++i];if(!/^[a-f0-9]{40,64}$/.test(options.base))throw new Blocked('BASE_INVALID');}else if(arg==='--path')options.paths.push(process.argv[++i]);else throw new Blocked('ARGUMENT_INVALID');}
  const r=scanRepository(options);const output=JSON.stringify(r,null,2)+'\n';process.stdout.write(output);process.exitCode=r.exit_code;
 }catch{process.stderr.write('BLOCKED: scanner could not complete; sensitive diagnostics suppressed.\n');process.exitCode=2;}
}
