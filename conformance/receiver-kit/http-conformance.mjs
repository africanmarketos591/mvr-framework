#!/usr/bin/env node
// Receiver conformance over HTTP, against a receiver you run (for example your staging system).
//   node http-conformance.mjs --receiver https://staging.example/amos [--lab https://africanmarketos.com] [--faults]
// Your receiver exposes POST {receiver}/commits and GET {receiver}/effects (?commit_id= for one commit, none for the
// total), and optionally GET {receiver}/health and POST {receiver}/test/faults. Commits are real lab commits from an
// isolated AMOS lab session (lab keys, harmless draft effect). Pass: exactly one effect per valid current commit; zero
// for replayed, broadened, altered, invalidly signed, expired and revoked commits; one for two concurrent deliveries;
// and no duplicate after a lost acknowledgement.
import http from 'node:http';
import https from 'node:https';
import {pathToFileURL} from 'node:url';
import {createLabCommitSource} from './lab-commits.mjs';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function runHttpReceiverConformance({receiverUrl,source,faults=false,fetchImpl=fetch,log=()=>{}}){
  const base=receiverUrl.replace(/\/$/,''),scenarios=[];
  const post=async body=>{const r=await fetchImpl(base+'/commits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});return r.json();};
  const total=async()=>(await (await fetchImpl(base+'/effects',{signal:AbortSignal.timeout(15000)})).json()).total_effects;
  const scenario=async(name,expected,fn)=>{const before=await total();const outcome=await fn();const created=(await total())-before;const passed=created===expected&&(outcome?.passCheck??true);scenarios.push({name,expected_new_effects:expected,new_effects:created,passed,outcome:outcome?.summary??null});log(name,passed);return outcome;};
  const summary=o=>Array.isArray(o)?o.map(x=>x.code||(x.performed?'performed':x.already_performed?'already_performed':'refused')):o?.code||(o?.performed?'performed':o?.already_performed?'already_performed':o?.retryable?'retryable':'refused');
  const deliver=async body=>{const o=await post(body);return {...o,summary:summary(o)};};
  // A delivery whose response the deliverer never reads: the request is sent and the socket destroyed.
  const deliverAndDrop=body=>new Promise(resolve=>{const url=new URL(base+'/commits'),payload=JSON.stringify(body);const lib=url.protocol==='https:'?https:http;const req=lib.request(url,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}});req.on('error',()=>resolve());req.end(payload,()=>setTimeout(()=>{req.destroy();resolve();},50));});

  const first=await source.commitFresh();
  await scenario('valid current commit',1,async()=>{const o=await deliver(first);return {...o,passCheck:o.performed===true};});
  await scenario('replay of the same commit',0,async()=>{const o=await deliver(first);return {...o,passCheck:o.performed!==true};});
  await scenario('broadened amount',0,()=>deliver({receipt:first.receipt,requested_effect:{...first.requested_effect,amount_minor:(first.requested_effect.amount_minor||0)+1}}));
  await scenario('different resource',0,()=>deliver({receipt:first.receipt,requested_effect:{...first.requested_effect,resource:{...first.requested_effect.resource,resource_id:'LAB-OTHER'}}}));
  const fresh=await source.commitFresh();
  await scenario('altered receipt (window extended)',0,()=>deliver({receipt:{...fresh.receipt,commit_valid_until:new Date(Date.now()+864e5).toISOString()},requested_effect:fresh.requested_effect}));
  const sig=fresh.receipt.signature?.signature_b64||'';const flipped=sig?(sig[0]==='A'?'B':'A')+sig.slice(1):sig;
  await scenario('invalid signature',0,()=>deliver({receipt:{...fresh.receipt,signature:{...fresh.receipt.signature,signature_b64:flipped}},requested_effect:fresh.requested_effect}));
  const revoked=await source.commitAfterRevocation();
  await scenario('revoked between verification and commit',0,()=>deliver(revoked));
  const raced=await source.commitFresh();
  await scenario('two concurrent deliveries',1,async()=>{const both=await Promise.all([post(raced),post(raced)]);return {summary:summary(both),passCheck:both.filter(x=>x.performed).length===1};});
  const dropped=await source.commitFresh();
  await scenario('acknowledgement lost, then redelivered',1,async()=>{const before=await total();await deliverAndDrop(dropped);for(let i=0;i<40&&(await total())===before;i++)await wait(250);const o=await deliver(dropped);return {...o,passCheck:o.performed!==true&&(o.already_performed===true||o.reconciled===true)};});
  if(faults){
    const failing=await source.commitFresh();
    await fetchImpl(base+'/test/faults',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({next:'fail_before_effect'})});
    await scenario('transient failure before the effect',0,async()=>{const o=await deliver(failing);return {...o,passCheck:o.retryable===true};});
    await scenario('retry within the window',1,async()=>{const o=await deliver(failing);return {...o,passCheck:o.performed===true};});
    const crashing=await source.commitFresh();
    await fetchImpl(base+'/test/faults',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({next:'crash_after_effect'})});
    await scenario('crash after the effect',1,async()=>{const o=await deliver(crashing);return {...o,passCheck:o.performed!==true};});
    await scenario('redelivery reconciles, no duplicate',0,async()=>{const o=await deliver(crashing);return {...o,passCheck:o.reconciled===true||o.already_performed===true};});
  }
  const late=await source.commitFresh();
  await wait(Math.max(0,Date.parse(late.receipt.commit_valid_until)-Date.now())+2500);
  await scenario('delivered after the commit window',0,async()=>{const o=await deliver(late);return {...o,passCheck:o.performed!==true};});
  let health=null;try{const r=await fetchImpl(base+'/health',{signal:AbortSignal.timeout(15000)});if(r.ok)health=await r.json();}catch{health=null;}
  const passed=scenarios.every(s=>s.passed)&&(!health||health.in_doubt.length===0);
  return {passed,receiver_url_host:new URL(base).host,transport:'HTTP',scenarios,fault_scenarios:faults?'covered':'not_covered (start the receiver with test hooks and pass --faults)',health,
    classification:'AMOS lab verification; real lab commits signed with lab keys; the receiver under test is whatever runs at the URL'};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2),opt=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:undefined;};
  const receiverUrl=opt('--receiver'),lab=(opt('--lab')||'https://africanmarketos.com').replace(/\/$/,'');
  if(!receiverUrl){console.error('Usage: node http-conformance.mjs --receiver <url> [--lab <origin>] [--faults]');process.exit(2);}
  const transport=async body=>{const r=await fetch(lab+'/v1/authority-conformance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});return r.json();};
  const source=await createLabCommitSource(transport);
  try{const report=await runHttpReceiverConformance({receiverUrl,source,faults:args.includes('--faults'),log:(n,p)=>console.error((p?'PASS ':'FAIL ')+n)});console.log(JSON.stringify(report,null,1));process.exitCode=report.passed?0:1;}
  finally{await source.close();}
}
