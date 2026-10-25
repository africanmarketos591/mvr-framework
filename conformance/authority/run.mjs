// Node.js 24+. No operator credentials or dependencies. Uses ordinary HTTPS/DNS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runAuthorityConformance} from './conformance-runner.mjs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const args=process.argv.slice(2),base=args.includes('--base')?args[args.indexOf('--base')+1]:'https://africanmarketos.com';
const origin=new URL(base);assert.equal(origin.protocol,'https:');assert.equal(origin.pathname,'/');assert(!origin.username&&!origin.password&&!origin.search&&!origin.hash);
const output=args.includes('--output')?args[args.indexOf('--output')+1]:null;
// --receiver ./my-receiver.mjs tests your own customer receiver (export createCommitReceiver or default) with real lab commits.
const receiverPath=args.includes('--receiver')?args[args.indexOf('--receiver')+1]:null;
const receiverModule=receiverPath?await import(pathToFileURL(path.resolve(receiverPath)).href):null;
const createReceiver=receiverModule?(receiverModule.createCommitReceiver||receiverModule.default):undefined;
if(receiverPath)assert.equal(typeof createReceiver,'function','--receiver must export createCommitReceiver or a default factory');
let revision=null,session,publicVerifications=0;
const verifiedKinds=new Set();
async function post(path,body){
 const response=await fetch(new URL(path,origin),{method:'POST',headers:{'Content-Type':'application/json',...(revision?{'X-MVR-Expected-Deployment-Revision':revision}:{})},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(25000)});
 const result=await response.json();if(result.deployment_revision){if(revision)assert.equal(result.deployment_revision,revision,'Serving revision changed');else revision=result.deployment_revision;}
 return {...result,http_status:response.status};
}
try{
 const result=await runAuthorityConformance(async body=>{
   const result=await post('/v1/authority-conformance',body);if(result.status==='issued')session=result;
   const kind=result.receipt?.decision||result.receipt?.kind;
   if(kind&&!verifiedKinds.has(kind)){
     const proof=await post('/v1/authority-receipts/verify',{receipt:result.receipt,lab_session_id:session.session_id,allow_lab_keys:true});publicVerifications++;assert.equal(proof.valid,true,'Public receipt verifier failed');assert.equal(proof.lab_fixture,true);verifiedKinds.add(kind);
     const tampered=structuredClone(result.receipt);tampered.sequence++;
     const denied=await post('/v1/authority-receipts/verify',{receipt:tampered,lab_session_id:session.session_id,allow_lab_keys:true});publicVerifications++;assert.equal(denied.valid,false,'Tampered receipt accepted');
   }
   return result;
 },{createReceiver});
 const report={...result,revision,public_receipt_verification_requests:publicVerifications,completed_at:new Date().toISOString(),base:origin.origin,credential_cleanup:'Session closed and next use rejected. Tokens are never written to the report.'};
 if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(report,null,2));
}catch(error){
 // The core runner closes any issued session in finally. Never print request bodies or tokens.
 console.error(JSON.stringify({passed:false,revision,message:error.message,classification:'AMOS lab verification'}));process.exitCode=1;
}
