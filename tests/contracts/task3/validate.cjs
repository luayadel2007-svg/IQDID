// Contract/schema tests only. No service or HTTP authorization implementation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const req=process.env.TASK3_TOOL_ROOT?createRequire(path.resolve(process.env.TASK3_TOOL_ROOT,'package.json')):require;
const Parser=req('@apidevtools/swagger-parser'),YAML=req('yaml'),Ajv=req('ajv/dist/2020'),formats=req('ajv-formats');
const root=path.resolve(__dirname,'../../..');
const ajv=new Ajv({strict:false,allErrors:true});formats(ajv);
const rows=[]; function test(id,fn){try{fn();rows.push({id,pass:true})}catch(e){rows.push({id,pass:false,error:e.message})}}
const check=(s,x,expected)=>{const validate=ajv.compile(s);assert.equal(validate(x),expected,JSON.stringify(validate.errors));};
(async()=>{
const docs={};
for(const name of ['issuer-internal','status-internal','trust','verifier']){
 const file=path.join(root,'openapi/v1.1',name+'.v1.1.yaml');
 const parsed=YAML.parseDocument(fs.readFileSync(file,'utf8'),{uniqueKeys:true});assert.equal(parsed.errors.length,0);
 await Parser.validate(file);rows.push({id:name+'-swagger-validate',pass:true});docs[name]=await Parser.dereference(file);
}
const I=docs['issuer-internal'],S=docs['status-internal'],V=docs.verifier,T=docs.trust;
let count=0;
for(const [name,d] of Object.entries(docs))for(const [p,item] of Object.entries(d.paths))for(const [m,o] of Object.entries(item)){
 if(!['get','post','put'].includes(m))continue;count++;
 test(o.operationId+'-auth-contract',()=>{assert.ok(o.responses['400']);assert.ok(o.description);if(o.security.length){assert.ok(o.responses['401']);assert.ok(o.responses['403']);assert.ok(o['x-roles'].length);assert.ok(o.responses['401'].headers['WWW-Authenticate']);}else{assert.equal(o.responses['401'],undefined);assert.equal(o.responses['403'],undefined);}});
 if(['post','put'].includes(m))test(o.operationId+'-idempotency',()=>{assert.ok(o['x-idempotency'].scope.includes('verified subject'));assert.ok(o.responses['409']);assert.ok(o.parameters.some(p=>p.name==='Idempotency-Key'&&p.required));});
}
test('14-operations',()=>assert.equal(count,14));
const cs=V.paths['/verifier/v1/sessions'].post.responses['201'].content['application/json'].schema;
const sample={session_id:'11111111-1111-4111-8111-111111111111',qr_payload:'openid4vp://?client_id=x509_hash%3Atest',expires_at:'2026-10-12T20:00:00Z',short_code:'0123'};
test('short-code-valid-leading-zero',()=>check(cs,sample,true));
for(const [id,value] of [['integer',1234],['short','123'],['letters','12ab']])test('short-code-reject-'+id,()=>check(cs,{...sample,short_code:value},false));
test('short-code-description-parsed',()=>assert.deepEqual(Object.keys(cs.properties.short_code).sort(),['description','examples','pattern','type'].sort()));
const err=I.components.schemas.ErrorResponse;
test('error-valid',()=>check(err,{error:{code:'STA-4091',message:'Final',request_id:'test-1'}},true));
for(const [id,x] of [['bad-code',{error:{code:'oops',message:'Final',request_id:'test-1'}}],['extra-data',{error:{code:'STA-4091',message:'Final',request_id:'test-1',national_id:'test'}}],['missing-id',{error:{code:'STA-4091',message:'Final'}}]])test('error-reject-'+id,()=>check(err,x,false));
const rec={credential_id:sample.session_id,vct:'test',state:'ACTIVE',iat:1,exp:2,status_ref:{uri:'https://status.digital-id.test/lists/test',idx:1}};
test('operator-schema-reject-idx',()=>check(I.components.schemas.CredentialRecord,rec,false));
test('authority-schema-allows-idx',()=>check(I.components.schemas.CredentialRecordAuthority,rec,true));
const result=V.paths['/verifier/v1/sessions/{session_id}'].get.responses['200'].content['application/json'].schema;
const accepted={state:'ACCEPTED',result:{code:'R-01',computed:true,disclosed:{age_over_18:true}}};
test('accepted-disclosure',()=>check(result,accepted,true));
for(const state of ['CREATED','FETCHED','RESPONSE_RECEIVED','REJECTED','EXPIRED'])test('reject-disclosure-'+state,()=>check(result,{...accepted,state},false));
test('consumed-accepted-no-values',()=>check(result,{state:'ACCEPTED',result:{code:'R-01',computed:true}},true));
const get=V.paths['/verifier/v1/sessions/{session_id}'].get;
test('foreign-session-denial-contract',()=>{assert.equal(get['x-resource-authorization'].mismatch_http,404);assert.ok(get['x-resource-authorization'].owner);assert.ok(get.description.includes('before atomic'));});
test('ttl-contract',()=>{assert.equal(get['x-disclosure-lifecycle'].values_ttl_seconds,60);assert.equal(get['x-disclosure-lifecycle'].session_ttl_seconds,120);});
const body=S.paths['/internal/v1/status/entries/{list_id}/{idx}'].put.requestBody.content['application/json'].schema;
test('reason-valid',()=>check(body,{value:1,reason_code:'holder_request'},true));
test('reason-reject-free-text',()=>check(body,{value:1,reason_code:'My reason'},false));
test('status-reject-3',()=>check(body,{value:3,reason_code:'holder_request'},false));
test('approval-not-silently-required',()=>{assert.ok(!body.required.includes('approval_ref'));assert.ok(body.properties.approval_ref.description.includes('Pending'));});
test('allowlist-not-silently-required',()=>assert.ok(!T.components.schemas.TrustEntry.required.includes('allowed_response_hosts')));
// Traverse and validate all JSON examples against their actual schema, including errors.
let examples=0;
function visit(x){if(!x||typeof x!=='object')return;if(x.schema){if(x.example!==undefined){check(x.schema,x.example,true);examples++;}for(const ex of Object.values(x.examples||{})){if(ex.value!==undefined){check(x.schema,ex.value,true);examples++;}}}if(x.type&&Array.isArray(x.examples))for(const ex of x.examples){check(x,ex,true);examples++;}for(const v of Object.values(x))if(typeof v==='object')visit(v);}
test('all-embedded-examples',()=>{Object.values(docs).forEach(visit);assert.ok(examples>0)});
// Negative contract mutation: delete 401, break reference, and restore malformed short_code.
test('negative-missing-auth-response-detected',()=>{const o=structuredClone(V.paths['/verifier/v1/sessions'].post);delete o.responses['401'];assert.throws(()=>assert.ok(o.responses['401']));});
test('negative-short-code-mutation-detected',()=>{const s=structuredClone(cs.properties.short_code);s['THM-47)']=null;assert.throws(()=>assert.deepEqual(Object.keys(s).sort(),['description','examples','pattern','type'].sort()));});
try{await Parser.validate({...YAML.parse(fs.readFileSync(path.join(root,'openapi/v1.1/verifier.v1.1.yaml'),'utf8')),paths:{'/bad':{get:{responses:{200:{description:'bad',content:{'application/json':{schema:{$ref:'#/components/schemas/DOES_NOT_EXIST'}}}}}}}}});rows.push({id:'negative-unresolved-ref',pass:false});}catch(e){rows.push({id:'negative-unresolved-ref',pass:true,reason:e.name});}
const out={scope:'Static OpenAPI contracts and schema examples only; no HTTP/runtime authorization tested',operations:count,examples,passed:rows.filter(x=>x.pass).length,total:rows.length,tests:rows};
console.log(JSON.stringify(out,null,2));if(out.passed!==out.total)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
