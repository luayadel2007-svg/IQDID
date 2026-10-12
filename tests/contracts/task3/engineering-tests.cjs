// Fresh static checks and in-memory proposal oracles only; never C2/C3/C4/C5 or HTTP evidence.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');const req=process.env.TASK3_TOOL_ROOT?createRequire(path.resolve(process.env.TASK3_TOOL_ROOT,'package.json')):require;
const Y=req('yaml'),Parser=req('@apidevtools/swagger-parser'),Ajv=req('ajv/dist/2020'),formats=req('ajv-formats');
const {guard}=require('./contract-guard.cjs');const root=path.resolve(__dirname,'../../..');const ajv=new Ajv({strict:false,allErrors:true});formats(ajv);
const rows=[];function test(id,f){try{f();rows.push({id,pass:true});}catch(e){rows.push({id,pass:false,error:e.message});}}
const validate=(s,x,expected)=>assert.equal(ajv.compile(s)(x),expected);
function strictYaml(s){const d=Y.parseDocument(s,{uniqueKeys:true});assert.equal(d.errors.length,0,'YAML_PARSE');return d.toJS();}
(async()=>{
 const docs={};for(const n of ['issuer-internal','status-internal','trust','verifier']){
  const f=path.join(root,'openapi/v1.1',n+'.v1.1.yaml');strictYaml(fs.readFileSync(f,'utf8'));await Parser.validate(f);docs[n]=await Parser.dereference(f);
 }
 guard(docs); // A broken baseline blocks all mutations; unrelated baseline errors cannot count as detection.
 test('guard-actual-four-documents',()=>guard(docs));
 const reason={M01:'UNEXPECTED_KEY',M04:'MISSING_401',M05:'UNEXPECTED_KEY',M06:'IDX_LEAK',M09:'ROLE_MISMATCH',M10:'MISSING_RESOURCE_404',M11:'REASON_DRIFT',M12:'DUPLICATE_REASON',M13:'IDEMPOTENCY_SCOPE',M14:'RESPONSE_STATE',M15:'CROSS_SERVICE_ERROR_SCHEMA',M16:'UNAPPROVED_APPROVAL_REQUIREMENT',M17:'UNAPPROVED_HOST_REQUIREMENT',M19:'PROTECTED_OPERATION_PUBLIC',M20:'ANONYMOUS_SECURITY_ALTERNATIVE'};
 function mutation(id,fn){test(id,()=>{const d=structuredClone(docs);fn(d);assert.throws(()=>guard(d),new RegExp(reason[id.slice(0,3)]));});}
 mutation('M01-unexpected-root-key',d=>d.verifier.unexpected=null);
 test('M02-duplicate-yaml-key',()=>assert.throws(()=>strictYaml('openapi: 3.1.0\nopenapi: 3.0.0\n')));
 const I=docs['issuer-internal'],S=docs['status-internal'],T=docs.trust,V=docs.verifier;
 const create=V.paths['/verifier/v1/sessions'].post;
 test('N03-response-wrong-type',()=>validate(create.responses['201'].content['application/json'].schema,{session_id:1,short_code:1},false));
 mutation('M04-missing-401',d=>delete d.verifier.paths['/verifier/v1/sessions'].post.responses['401']);
 mutation('M19-protected-made-public',d=>{const o=d.verifier.paths['/verifier/v1/sessions'].post;o.security=[];delete o.responses['401'];delete o.responses['403'];});
 mutation('M20-anonymous-security-alternative',d=>d.verifier.paths['/verifier/v1/sessions'].post.security.push({}));
 mutation('M05-schema-unknown-key',d=>d.verifier.paths['/verifier/v1/sessions'].post.responses['201'].content['application/json'].schema.properties.short_code['THM-47)']=null);
 mutation('M06-sensitive-idx',d=>d['issuer-internal'].components.schemas.CredentialRecord.properties.status_ref.properties.idx={type:'integer'});
 test('N07-missing-request-field',()=>validate(create.requestBody.content['application/json'].schema,{},false));
 test('N08-wrong-request-type',()=>validate(create.requestBody.content['application/json'].schema,{service_id:4},false));
 mutation('M09-wrong-role',d=>d.verifier.paths['/verifier/v1/sessions'].post['x-roles']=['issuer-authority']);
 mutation('M10-missing-404',d=>delete d['issuer-internal'].paths['/internal/v1/credentials/{credential_id}/revoke'].post.responses['404']);
 mutation('M11-reason-drift',d=>d['status-internal'].paths['/internal/v1/status/entries/{list_id}/{idx}'].put.requestBody.content['application/json'].schema.properties.reason_code.enum=['new_reason']);
 mutation('M12-reason-duplicate',d=>{const a=d['status-internal'].paths['/internal/v1/status/entries/{list_id}/{idx}'].put.requestBody.content['application/json'].schema.properties.reason_code.enum;a.push(a[0]);});
 mutation('M13-idempotency-scope-drift',d=>d.verifier.paths['/verifier/v1/sessions'].post['x-idempotency'].scope=['Idempotency-Key']);
 mutation('M14-state-permissive',d=>delete d['issuer-internal'].paths['/internal/v1/credentials/{credential_id}/revoke'].post.responses['200'].content['application/json'].schema.properties.state.const);
 mutation('M15-error-cross-service-drift',d=>d.trust.components.schemas.ErrorResponse.properties.error.additionalProperties=true);
 mutation('M16-approval-implicitly-approved',d=>d['status-internal'].paths['/internal/v1/status/entries/{list_id}/{idx}'].put.requestBody.content['application/json'].schema.required.push('approval_ref'));
 mutation('M17-host-policy-implicitly-approved',d=>d.trust.components.schemas.TrustEntry.required.push('allowed_response_hosts'));
 for(const [action,state] of [['suspend','SUSPENDED'],['reinstate','ACTIVE'],['revoke','REVOKED']]){
  const s=I.paths['/internal/v1/credentials/{credential_id}/'+action].post.responses['200'].content['application/json'].schema;
  const body={credential_id:'11111111-1111-4111-8111-111111111111',state,status_published_at:'2026-10-13T00:00:00Z'};
  test('state-'+action+'-positive',()=>validate(s,body,true));for(const wrong of ['ACTIVE','SUSPENDED','REVOKED'].filter(x=>x!==state))test('state-'+action+'-reject-'+wrong,()=>validate(s,{...body,state:wrong},false));
 }
 // OD-01 oracle. A false outcome is model evidence only; no network or storage.
 function access(principal,session){if(!principal)return 401;if(!principal.roles.includes('verifier-staff'))return 403;if(!session||session.org!==principal.org||session.owner!==principal.sub)return 404;return 200;}
 const principal={org:'TEST-org-A',sub:'TEST-staff-A',roles:['verifier-staff']},session={org:'TEST-org-A',owner:'TEST-staff-A'};
 for(const [id,p,s,http] of [['same-owner',principal,session,200],['missing-auth',null,session,401],['wrong-role',{...principal,roles:['issuer-authority']},session,403],['foreign-org',principal,{...session,org:'TEST-org-B'},404],['foreign-owner',principal,{...session,owner:'TEST-staff-B'},404],['missing',principal,null,404]])test('OD01-model-'+id,()=>assert.equal(access(p,s),http));
 // Proposed approvals and allowlist: overlay clones only; active contracts remain optional.
 const activeApproval=S.paths['/internal/v1/status/entries/{list_id}/{idx}'].put.requestBody.content['application/json'].schema;
 const approvalOverlay=structuredClone(activeApproval);approvalOverlay.required.push('approval_ref');
 test('OD06-active-optional',()=>validate(activeApproval,{value:1,reason_code:'holder_request'},true));
 test('OD06-proposed-required-negative',()=>validate(approvalOverlay,{value:1,reason_code:'holder_request'},false));
 test('OD06-proposed-positive',()=>validate(approvalOverlay,{value:1,reason_code:'holder_request',approval_ref:'TEST-approval'},true));
 const hostOverlay=structuredClone(T.components.schemas.TrustEntry);hostOverlay.allOf=[{if:{properties:{role:{const:'verifier'}},required:['role']},then:{required:['allowed_response_hosts'],properties:{allowed_response_hosts:{minItems:1}}}}];
 const entry={entry_id:'TEST-entry',role:'verifier',display_name:{ar:'جهة اختبار',en:'TEST verifier'},identifier:'x509_hash:TEST',state:'active',valid_from:1,valid_to:2};
 test('OD07-active-optional',()=>validate(T.components.schemas.TrustEntry,entry,true));test('OD07-overlay-missing',()=>validate(hostOverlay,entry,false));test('OD07-overlay-empty',()=>validate(hostOverlay,{...entry,allowed_response_hosts:[]},false));test('OD07-overlay-positive',()=>validate(hostOverlay,{...entry,allowed_response_hosts:['verifier.digital-id.test']},true));
 function hostMatch(uri,allow){const u=new URL(uri);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!u.hostname.endsWith('.')&&allow.every(x=>/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(x))&&allow.includes(u.hostname);}
 for(const [id,uri,allow,want] of [['exact','https://verifier.digital-id.test/res',['verifier.digital-id.test'],true],['case','https://VERIFIER.digital-id.test/res',['verifier.digital-id.test'],true],['suffix','https://verifier.digital-id.test.attacker.test/res',['verifier.digital-id.test'],false],['userinfo','https://a@verifier.digital-id.test/res',['verifier.digital-id.test'],false],['wildcard','https://verifier.digital-id.test/res',['*.digital-id.test'],false],['port','https://verifier.digital-id.test:8443/res',['verifier.digital-id.test'],false],['trailing-dot','https://verifier.digital-id.test./res',['verifier.digital-id.test'],false]])test('OD07-proposed-host-'+id,()=>assert.equal(hostMatch(uri,allow),want));
 function idem(a,b){return JSON.stringify(a.scope)!==JSON.stringify(b.scope)?'independent':a.digest!==b.digest||b.inflight?'409 API-4090':'metadata-only replay';}
 const id={scope:['TEST-org','TEST-sub','op','resource','TEST-key'],digest:'TEST-body-A'};
 test('OD03-collision-model',()=>assert.equal(idem(id,{...id,digest:'TEST-body-B'}),'409 API-4090'));test('OD03-inflight-model',()=>assert.equal(idem(id,{...id,inflight:true}),'409 API-4090'));test('OD03-other-org-model',()=>assert.equal(idem(id,{...id,scope:['TEST-other',...id.scope.slice(1)]}),'independent'));test('OD03-replay-model-no-values',()=>assert.equal(idem(id,id),'metadata-only replay'));
 const err=I.components.schemas.ErrorResponse;test('error-reject-secret-field',()=>validate(err,{error:{code:'API-4001',message:'Bad request',request_id:'TEST-id',token:'TEST-only-placeholder'}},false));
 // Check examples actually present; use context-based PII rules and no real secret fixtures.
 const suspicious=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bghp_[A-Za-z0-9]{36,}|"(?:national_id|passport_number)"\s*:\s*"?[0-9]{6,}/;
 function examplePolicy(x){assert.ok(!suspicious.test(JSON.stringify(x)),'UNSAFE_EXAMPLE');}
 test('all-contract-examples-no-secret-patterns',()=>{function walk(x){if(!x||typeof x!=='object')return;if(x.example!==undefined)examplePolicy(x.example);if(Array.isArray(x.examples))x.examples.forEach(examplePolicy);else for(const v of Object.values(x.examples||{}))if(v.value!==undefined)examplePolicy(v.value);Object.values(x).forEach(walk);}Object.values(docs).forEach(walk);});
 test('M18-secret-like-example-detected',()=>assert.throws(()=>examplePolicy({token:['ghp','_'].join('')+'A'.repeat(36)})));
 console.log(JSON.stringify({scope:'Static guards, schemas and explicitly proposed models only. HTTP, storage, TTL, races NOT RUN.',passed:rows.filter(x=>x.pass).length,total:rows.length,tests:rows},null,2));if(rows.some(x=>!x.pass))process.exitCode=1;
})().catch(()=>{console.error('BLOCKED: engineering test harness could not complete');process.exitCode=2;});
