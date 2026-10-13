// Normative protocol contract oracles only; no service, no owner-policy activation.
const assert=require('node:assert/strict');
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const nonempty=a=>Array.isArray(a)&&a.length>0&&a.every(x=>typeof x==='string'&&x.length>0);
function metadata(m){
 if(typeof m?.credential_issuer!=='string'||!m.credential_issuer.startsWith('https://')||!m.credential_configurations_supported)fail('METADATA');
 for(const c of Object.values(m.credential_configurations_supported)){
  if(c.credential_signing_alg_values_supported!==undefined&&!nonempty(c.credential_signing_alg_values_supported))fail('CREDENTIAL_ALGS');
  const bound=c.cryptographic_binding_methods_supported!==undefined;
  if(bound&&!nonempty(c.cryptographic_binding_methods_supported))fail('BINDING_METHODS');
  if(bound&&!c.proof_types_supported||!bound&&c.proof_types_supported!==undefined)fail('PROOF_BINDING_DEPENDENCY');
  for(const p of Object.values(c.proof_types_supported||{}))if(!nonempty(p.proof_signing_alg_values_supported))fail('PROOF_ALGS');
  if(c.credential_metadata?.display!==undefined&&(!Array.isArray(c.credential_metadata.display)||c.credential_metadata.display.length===0||c.credential_metadata.display.some(x=>typeof x.name!=='string')))fail('DISPLAY_METADATA');
 }
 return true;
}
function offerUri(s){const u=new URL(s),byValue=u.searchParams.has('credential_offer'),byRef=u.searchParams.has('credential_offer_uri');if(byValue===byRef)fail('OFFER_EXCLUSIVE');if(byRef&&!u.searchParams.get('credential_offer_uri').startsWith('https://'))fail('OFFER_HTTPS');return true;}
function offer(o){if(!nonempty(o?.credential_configuration_ids))fail('OFFER_IDS');return true;}
function discovery(expected,metadata){if(metadata.issuer!==expected)fail('AS_ISSUER_MISMATCH');return true;}
function token(t){if(typeof t.access_token!=='string'||typeof t.token_type!=='string')fail('TOKEN_FIELDS');if(t.expires_in!==undefined&&(!Number.isInteger(t.expires_in)||t.expires_in<0))fail('TOKEN_LIFETIME');return true;}
function proof(p){if(typeof p.iat!=='number'||!Number.isFinite(p.iat))fail('PROOF_IAT');if(typeof p.aud!=='string')fail('PROOF_AUD_STRING');return true;}
function credential(r){if(r.credentials!==undefined&&r.transaction_id!==undefined)fail('CREDENTIAL_DEFERRED_EXCLUSIVE');if(r.transaction_id!==undefined&&(typeof r.transaction_id!=='string'||typeof r.interval!=='number'||!Number.isFinite(r.interval)||r.interval<=0))fail('DEFERRED_INTERVAL');if(r.credentials!==undefined&&r.interval!==undefined)fail('IMMEDIATE_INTERVAL_FORBIDDEN');if(r.credentials!==undefined&&(!Array.isArray(r.credentials)||!r.credentials.length||r.credentials.some(x=>!x||x.credential===undefined)))fail('CREDENTIAL_ARRAY');return true;}
function bearer(status,code){if(code==='invalid_token'&&status!==401||code==='insufficient_scope'&&status!==403)fail('BEARER_RECOMMENDED_STATUS');return true;}
function notificationStatus(n){if(n<200||n>=300)fail('NOTIFICATION_SUCCESS_STATUS');return true;}
function notificationError(status,body){if(status!==400||typeof body.error!=='string')fail('NOTIFICATION_ERROR');return true;}
function suppliedWalletPost(body){const p=new URLSearchParams(body);if(!p.has('wallet_metadata')||!p.has('wallet_nonce'))fail('WALLET_POST_FIELDS');const m=JSON.parse(p.get('wallet_metadata'));if(!m||typeof m!=='object')fail('WALLET_METADATA_JSON');return true;}
function nonceEcho(expected,actual){if(expected!==actual)fail('WALLET_NONCE_MISMATCH');return true;}
function signedPrefix(clientId,signed){if(signed&&clientId.startsWith('redirect_uri:'))fail('SIGNED_REDIRECT_FORBIDDEN');return true;}
function tokenError(scenario){if(['wrong-code','expired-code','wrong-tx'].includes(scenario))return 'invalid_grant';if(['missing-tx','unexpected-tx'].includes(scenario))return 'invalid_request';fail('UNKNOWN_TOKEN_SCENARIO');}
function timingOverlay(iat,now){if(Math.abs(now-iat)>60)fail('PROPOSED_60S_WINDOW');return true;}
module.exports={metadata,offerUri,offer,discovery,token,proof,credential,bearer,notificationStatus,notificationError,suppliedWalletPost,nonceEcho,signedPrefix,tokenError,timingOverlay};
