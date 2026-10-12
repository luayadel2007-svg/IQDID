// Executable proposal oracles only. NOT C4/C5 implementations.
const {generateKeyPairSync,createHash,X509Certificate}=require('node:crypto');
const {execFileSync}=require('node:child_process');const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const rows=[];function test(id,f){try{f();rows.push({id,pass:true})}catch(e){rows.push({id,pass:false,error:e.message})}}
function thumb(jwk){const {crv,kty,x,y}=jwk;return createHash('sha256').update(JSON.stringify({crv,kty,x,y})).digest('base64url')}
function allow(entries){const roles=new Map();for(const e of entries){if(!e.key_id)throw Error('KEY_ID_MISSING');const old=roles.get(e.key_id);if(old&&old!==e.role)throw Error('CROSS_ROLE_KEY_REUSE');roles.set(e.key_id,e.role)}return true}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iqdid-rp01-'));
try{
 const key=generateKeyPairSync('ec',{namedCurve:'prime256v1'});fs.writeFileSync(path.join(dir,'key.pem'),key.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
 for(const name of ['issuer','status'])execFileSync('openssl',['req','-new','-x509','-key',path.join(dir,'key.pem'),'-out',path.join(dir,name+'.pem'),'-days','1','-subj','/CN=TEST-'+name],{stdio:'pipe'});
 const a=new X509Certificate(fs.readFileSync(path.join(dir,'issuer.pem'))),b=new X509Certificate(fs.readFileSync(path.join(dir,'status.pem')));
 const ka=thumb(a.publicKey.export({format:'jwk'})),kb=thumb(b.publicKey.export({format:'jwk'}));
 test('RP01-different-certificates-same-key',()=>{assert.notEqual(a.fingerprint256,b.fingerprint256);assert.equal(ka,kb)});
 test('RP01-reject-same-key-cross-role',()=>assert.throws(()=>allow([{role:'issuer',key_id:ka},{role:'status',key_id:kb}]),/CROSS_ROLE_KEY_REUSE/));
 const other=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).publicKey.export({format:'jwk'});
 test('RP01-accept-distinct-role-keys',()=>assert.equal(allow([{role:'issuer',key_id:ka},{role:'status',key_id:thumb(other)}]),true));
 test('RP01-renewal-same-role',()=>assert.equal(allow([{role:'issuer',key_id:ka},{role:'issuer',key_id:kb}]),true));
 test('RP01-thumbprint-ignores-jwk-metadata',()=>assert.equal(thumb({...other,kid:'different',use:'sig'}),thumb(other)));
 test('RP01-missing-key-id',()=>assert.throws(()=>allow([{role:'status'}]),/KEY_ID_MISSING/));
}finally{fs.rmSync(dir,{recursive:true,force:true})}
// Golden proposed transition table. Database transactions/publication and concurrency are NOT exercised.
function transition(current,target){if(current===1&&target!==1)return {http:409,code:'STA-4091',value:1};return {http:200,value:target}}
for(const [a,b,code] of [[0,0,200],[0,1,200],[0,2,200],[1,0,409],[1,1,200],[1,2,409],[2,0,200],[2,1,200],[2,2,200]])test(`RP03-model-${a}-to-${b}`,()=>{const r=transition(a,b);assert.equal(r.http,code);if(code===409){assert.equal(r.code,'STA-4091');assert.equal(r.value,1)}});
// Show that the oracle catches a permissive transition mutation.
test('RP03-permissive-mutation-detected',()=>assert.throws(()=>assert.deepEqual({http:200,value:0},transition(1,0))));
console.log(JSON.stringify({scope:'Proposal model only. Certificates here are self-signed fixtures for key-identity comparison, NOT PKI-chain trust evidence. No private material retained.',openssl:execFileSync('openssl',['version'],{encoding:'utf8'}).trim(),passed:rows.filter(x=>x.pass).length,total:rows.length,tests:rows},null,2));
if(rows.some(x=>!x.pass))process.exitCode=1;
