// Static project contract guard. Does not authenticate or authorize an HTTP caller.
const assert=require('node:assert/strict');
const SCHEMA=new Set('$id $schema $ref $anchor $dynamicRef $dynamicAnchor $defs $vocabulary type title description default examples enum const format pattern minLength maxLength minimum maximum exclusiveMinimum exclusiveMaximum multipleOf properties patternProperties additionalProperties required dependentRequired dependentSchemas propertyNames minProperties maxProperties items prefixItems additionalItems contains minContains maxContains minItems maxItems uniqueItems allOf anyOf oneOf not if then else unevaluatedProperties unevaluatedItems readOnly writeOnly deprecated contentEncoding contentMediaType contentSchema discriminator xml externalDocs'.split(' '));
const ROOT=new Set('openapi info jsonSchemaDialect servers paths webhooks components security tags externalDocs'.split(' '));
const OP=new Set('tags summary description externalDocs operationId parameters requestBody responses callbacks deprecated security servers'.split(' '));
const expectedRoles={createOffer:['issuer-operator'],getOffer:['issuer-operator','auditor'],cancelOffer:['issuer-operator'],getCredentialRecord:['issuer-operator','issuer-authority','auditor'],suspendCredential:['issuer-authority'],reinstateCredential:['issuer-authority'],revokeCredential:['issuer-authority'],allocateStatusIndex:['status-allocator'],setStatusValue:['status-allocator'],listServices:['verifier-staff'],createSession:['verifier-staff'],getSessionResult:['verifier-staff']};
function keys(o,set){for(const k of Object.keys(o))assert.ok(set.has(k)||k.startsWith('x-'),'UNEXPECTED_KEY:'+k);}
function schema(s){if(typeof s==='boolean')return;assert.ok(s&&typeof s==='object'&&!Array.isArray(s),'SCHEMA_OBJECT');keys(s,SCHEMA);for(const k of ['properties','patternProperties','$defs','dependentSchemas'])for(const v of Object.values(s[k]||{}))schema(v);for(const k of ['items','contains','not','if','then','else','additionalProperties','unevaluatedProperties'])if(s[k]!==undefined)schema(s[k]);for(const k of ['allOf','anyOf','oneOf','prefixItems'])for(const v of s[k]||[])schema(v);}
function schemas(o){if(!o||typeof o!=='object')return;if(o.schema)schema(o.schema);for(const v of Object.values(o))if(v&&typeof v==='object')schemas(v);}
function guard(docs){
 const operations=[];
 for(const [name,d] of Object.entries(docs)){
  keys(d,ROOT);assert.equal(d.openapi,'3.1.0');assert.equal(d.info.version,'1.1.0-draft');assert.equal(d['x-review-status'],'proposed-not-approved');
  for(const s of Object.values(d.components.schemas||{}))schema(s);schemas(d.paths);
  for(const [p,item] of Object.entries(d.paths))for(const [m,o] of Object.entries(item)){
   if(!['get','post','put','delete','patch'].includes(m))continue;keys(o,OP);operations.push(o.operationId);
   const auth=o.security??d.security??[];assert.ok(o.responses['400'],'MISSING_400');
   if(expectedRoles[o.operationId]){assert.ok(auth.length,'PROTECTED_OPERATION_PUBLIC');assert.ok(auth.every(a=>Object.keys(a).length>0),'ANONYMOUS_SECURITY_ALTERNATIVE');}
   else {assert.ok(['getTrustList','getStatusListToken'].includes(o.operationId),'UNKNOWN_OPERATION');assert.equal(auth.length,0,'PUBLIC_OPERATION_PROTECTED');}
   if(auth.length){assert.ok(o.responses['401'],'MISSING_401');assert.ok(o.responses['403'],'MISSING_403');assert.deepEqual(o['x-roles'],expectedRoles[o.operationId],'ROLE_MISMATCH');for(const alternative of auth)for(const scheme of Object.keys(alternative))assert.ok(d.components.securitySchemes[scheme],'MISSING_SECURITY_SCHEME');}
   else assert.ok(!o.responses['401']&&!o.responses['403'],'PUBLIC_AUTH_CONTRADICTION');
   if(/\{[^}]+\}/.test(p))assert.ok(o.responses['404'],'MISSING_RESOURCE_404');
   if(['post','put'].includes(m)){
    assert.ok(o.parameters.some(x=>x.name==='Idempotency-Key'&&x.required),'MISSING_IDEMPOTENCY');
    assert.deepEqual(o['x-idempotency'].scope,['verified organisation','verified subject','operationId','canonical resource path','Idempotency-Key'],'IDEMPOTENCY_SCOPE');assert.ok(o.responses['409'],'MISSING_CONFLICT');
   }
   const state={suspendCredential:'SUSPENDED',reinstateCredential:'ACTIVE',revokeCredential:'REVOKED'}[o.operationId];
   if(state)assert.equal(o.responses['200'].content['application/json'].schema.properties.state.const,state,'RESPONSE_STATE');
  }
 }
 assert.equal(operations.length,14);assert.equal(new Set(operations).size,14,'DUPLICATE_OPERATION_ID');
 const I=docs['issuer-internal'],S=docs['status-internal'],T=docs.trust,V=docs.verifier;
 for(const d of [S,T,V])assert.deepEqual(d.components.schemas.ErrorResponse,I.components.schemas.ErrorResponse,'CROSS_SERVICE_ERROR_SCHEMA');
 assert.ok(!Object.hasOwn(I.components.schemas.CredentialRecord.properties.status_ref.properties,'idx'),'IDX_LEAK');
 const ip=I.components.requestBodies.StatusChange.content['application/json'].schema.properties.reason_code.enum;
 const sp=S.paths['/internal/v1/status/entries/{list_id}/{idx}'].put.requestBody.content['application/json'].schema.properties.reason_code.enum;
 assert.equal(new Set(sp).size,sp.length,'DUPLICATE_REASON');assert.ok(ip.every(x=>sp.includes(x)),'REASON_DRIFT');assert.ok(sp.includes('reinstated'));
 const approval=S.paths['/internal/v1/status/entries/{list_id}/{idx}'].put.requestBody.content['application/json'].schema;
 assert.ok(!approval.required.includes('approval_ref'),'UNAPPROVED_APPROVAL_REQUIREMENT');assert.ok(!T.components.schemas.TrustEntry.required.includes('allowed_response_hosts'),'UNAPPROVED_HOST_REQUIREMENT');
 return {operations:operations.length};
}
module.exports={guard,schema};
