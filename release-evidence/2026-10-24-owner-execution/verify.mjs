import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const serviceAccount='execution-receipt@amos-owner-lab-20261024.iam.gserviceaccount.com';
const provider='https://www.googleapis.com/service_accounts/v1/metadata/jwk/'+serviceAccount;
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const hash=x=>createHash('sha256').update(x).digest('hex');
const read=async name=>JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'));
export async function verifyReceipt(receipt,jwk){
 try{
  if(receipt?.algorithm!=='RS256'||receipt.document?.type!=='amos.owner-drive-execution-receipt/1'||!receipt.key_id.startsWith('projects/-/serviceAccounts/'+serviceAccount+'/keys/')||!/^[-A-Za-z0-9_]+$/.test(receipt.key_id.split('/').at(-1))||jwk.kty!=='RSA'||jwk.d||jwk.p||jwk.q)return false;
  const sig=Buffer.from(receipt.signature_b64,'base64');if(sig.toString('base64')!==receipt.signature_b64||![256,384,512].includes(sig.length))return false;
  const payload=Buffer.from('AMOS-MANAGED-RECEIPT-V1\n'+canonical(receipt.document));if(payload.length>8192)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return key.algorithm.modulusLength>=2048&&await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,sig,payload);
 }catch{return false;}
}
const [manifest,receipt,summary,snapshot]=await Promise.all(['manifest.json','execution-receipt.json','evidence-summary.json','public-key-snapshot.json'].map(read));
const expected=['engineering-acceptance.json','evidence-summary.json','execution-receipt.json','prior-deployed-boundary-acceptance.json','public-key-snapshot.json','real-expiry-denial.json'];assert.deepEqual(Object.keys(manifest.files).sort(),expected);
for(const name of expected){const bytes=await readFile(new URL(name,import.meta.url));assert.equal(hash(bytes),manifest.files[name],name+' digest');assert(!/(ya29\.|Bearer |-----BEGIN|"(?:access_token|refresh_token|client_secret|id_token|owner_subject|credential_id|assertion|private_key)"\s*:)/.test(bytes.toString()),'Credential-shaped data');}
assert.equal(snapshot.service_account,serviceAccount);assert.equal(snapshot.provider_discovery_url,provider);assert.equal(snapshot.key_id,receipt.key_id);
assert(await verifyReceipt(receipt,snapshot.public_key_jwk),'Archived public-key signature check failed');
assert.equal(hash(summary.artifact_content),receipt.document.artifact_sha256);
assert.equal(summary.request_id,receipt.document.request_id);
assert.equal(summary.private_approval_sha256,receipt.document.approval_sha256);
const expiry=await read('real-expiry-denial.json');assert.equal(expiry.approval_sha256,receipt.document.approval_sha256);assert.equal(expiry.passed,true);assert.equal(expiry.approval_bytes_modified,false);assert.equal(expiry.external_effect_attempted,false);assert(Date.parse(expiry.tested_at)>Date.parse(expiry.approval_expires_at));
for(const field of ['production_authority_enabled','independent_institutional_standing_verified','two_person_authorization','adversarial_process_isolation','remote_atomic_commit_protocol','live_expiry_test'])assert.equal(summary.boundaries[field],false,field+' unsupported claim');
let negative=0;
for(const change of [r=>r.document.artifact_sha256='0'.repeat(64),r=>r.document.denials.replay=false,r=>r.document.request_id+='altered',r=>r.algorithm='none',r=>r.key_id=r.key_id.replace(serviceAccount,'attacker@example.com'),r=>r.signature_b64='AAAA']){const bad=structuredClone(receipt);change(bad);assert.equal(await verifyReceipt(bad,snapshot.public_key_jwk),false);negative++;}
let providerAuthenticated=false;
if(!process.argv.includes('--offline')){
 const response=await fetch(provider,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});assert(response.ok,'Provider keys unavailable; --offline verifies only archived material');
 const reader=response.body.getReader();let size=0,parts=[];try{for(;;){const value=await reader.read();if(value.done)break;size+=value.value.length;assert(size<=65536,'Provider response too large');parts.push(value.value);}}finally{await reader.cancel();}
 const keys=JSON.parse(Buffer.concat(parts).toString()).keys;const matches=keys.filter(k=>k.kid===receipt.key_id.split('/').at(-1));assert.equal(matches.length,1,'Signing key no longer published: use historical archive explicitly; do not infer current trust');
 assert(await verifyReceipt(receipt,matches[0]),'Current provider key check failed');providerAuthenticated=true;
}
console.log(JSON.stringify({passed:true,archived_signature_valid:true,current_provider_key_authenticated:providerAuthenticated,negative_mutation_controls:negative,artifact_hash_valid:true,public_receipt_only:true,private_owner_approval_independently_reverified:false,independent_institutional_validation:false,execution_authorized:false}));
