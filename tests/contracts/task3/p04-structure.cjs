// P-04 PARTIAL: official draft -19 synthetic examples decoded using pinned 0.22.0.
// No signature, issuer trust, clock, key-binding signature or full conformance claim.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{createRequire}=require('node:module');
if(!process.env.TASK3_P04_ROOT){console.error('BLOCKED: TASK3_P04_ROOT is required');process.exit(2);}
const req=createRequire(path.resolve(process.env.TASK3_P04_ROOT,'package.json'));const {SDJwtVcInstance}=req('@sd-jwt/sd-jwt-vc');
const input=JSON.parse(fs.readFileSync(path.join(__dirname,'p04-vectors.json')));
const hasher=async(data,alg)=>new Uint8Array(createHash(alg.replace('-','')).update(data).digest());
const inst=new SDJwtVcInstance({hasher,hashAlg:'sha-256'});const rows=[];
async function test(id,f){try{await f();rows.push({id,pass:true});}catch{rows.push({id,pass:false,error_code:'ASSERTION_FAILED'});}}
function binding(value){const [jwt,...parts]=value.split('~'),payload=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url'));const digests=new Set();function walk(o){if(!o||typeof o!=='object')return;if(Array.isArray(o._sd))o._sd.forEach(x=>digests.add(x));if(o['...'])digests.add(o['...']);Object.values(o).forEach(walk);}walk(payload);const disclosures=parts.filter(x=>x&&!x.includes('.'));for(const d of disclosures)walk(JSON.parse(Buffer.from(d,'base64url')).at(-1));for(const d of disclosures)assert.ok(digests.has(createHash('sha256').update(d).digest('base64url')),'DISCLOSURE_DIGEST');return true;}
(async()=>{
 assert.equal(req('@sd-jwt/sd-jwt-vc/package.json').version,'0.22.0');
 for(const [id,s] of Object.entries(input.vectors)){
  await test('draft19-'+id+'-library-decode',async()=>{const d=await inst.decode(s);assert.ok(d.jwt);const claims=await inst.getClaims(s);assert.ok(typeof claims.vct==='string');});
  await test('draft19-'+id+'-typ',()=>assert.equal(JSON.parse(Buffer.from(s.split('.')[0],'base64url')).typ,'dc+sd-jwt'));
  await test('draft19-'+id+'-digest-binding',()=>binding(s));
 }
 const original=input.vectors['6'],parts=original.split('~');const d=JSON.parse(Buffer.from(parts[1],'base64url'));d[d.length-1]='TEST-mutated-value';parts[1]=Buffer.from(JSON.stringify(d)).toString('base64url');
 await test('draft19-mutated-disclosure-detected',()=>assert.throws(()=>binding(parts.join('~'))));
 await test('draft19-truncated-compact-rejected',async()=>{await assert.rejects(()=>inst.decode('TEST.invalid'));});
 const presentation=await inst.getClaims(input.vectors['7']);
 await test('draft19-selective-claims',()=>{assert.ok(presentation.address);assert.equal(presentation.is_over_65,true);assert.equal(presentation.given_name,undefined);});
 console.log(JSON.stringify({status:rows.every(r=>r.pass)?'PASS':'FAIL',p04_completion:'PARTIAL',scope:'Library decoding and independent disclosure-digest checks only. Signature verification and complete interoperability NOT RUN.',source:input.source,source_sha256:input.source_sha256,library:'@sd-jwt/sd-jwt-vc 0.22.0',passed:rows.filter(r=>r.pass).length,total:rows.length,tests:rows},null,2));process.exitCode=rows.every(r=>r.pass)?0:1;
})().catch(()=>{console.error('BLOCKED: P04 structural harness failed; diagnostics suppressed');process.exitCode=2;});
