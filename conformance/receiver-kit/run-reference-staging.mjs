#!/usr/bin/env node
// Starts the reference staging receiver (receiver SDK: SQLite commit store, harmless draft ledger, test hooks) on
// localhost and runs the HTTP receiver conformance against it with real commits from the live AMOS lab, then restarts
// the receiver to show a consumed commit stays consumed.
//   node run-reference-staging.mjs [--lab https://africanmarketos.com] [--output receiver.json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createLabCommitSource} from './lab-commits.mjs';
import {runHttpReceiverConformance} from './http-conformance.mjs';
import {startReferenceReceiver,monitorReceiver} from '../../sdks/javascript/receiver-sdk.mjs';
const args=process.argv.slice(2),opt=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:undefined;};
const lab=(opt('--lab')||'https://africanmarketos.com').replace(/\/$/,'');
const served=new Set();
const transport=async body=>{const r=await fetch(lab+'/v1/authority-conformance',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'amos-reference-receiver'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const v=r.headers.get('X-MVR-Deployment-Revision');if(v)served.add(v);return r.json();};
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'amos-receiver-')),databaseFile=path.join(dir,'staging-receiver.sqlite');
const source=await createLabCommitSource(transport);
let receiver,report;
try{
  receiver=await startReferenceReceiver({databaseFile,registry:source.registry,allowLabKeys:true,acknowledge:source.acknowledge,testHooks:true});
  report=await runHttpReceiverConformance({receiverUrl:receiver.url,source,faults:true});
  const replay=await source.commitFresh();
  const post=async()=>(await fetch(receiver.url+'/commits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(replay)})).json();
  const first=await post();await receiver.close();
  receiver=await startReferenceReceiver({databaseFile,registry:source.registry,allowLabKeys:true,acknowledge:source.acknowledge});
  const again=await post();
  report.restart={first_performed:first.performed===true,after_restart_performed:again.performed===true,after_restart_already_performed:again.already_performed===true};
  report.health=await monitorReceiver(receiver.store);
  report.passed=report.passed&&report.restart.first_performed&&!report.restart.after_restart_performed&&report.restart.after_restart_already_performed&&report.health.in_doubt.length===0;
}catch(error){report={passed:false,error:error.message.slice(0,2000)};}
finally{await receiver?.close().catch(()=>{});await source.close().catch(()=>{});fs.rmSync(dir,{recursive:true,force:true});}
Object.assign(report,{lab,served_revisions:[...served],revision:served.size===1?[...served][0]:null});
if(opt('--output'))fs.writeFileSync(opt('--output'),JSON.stringify(report,null,1));
console.log(JSON.stringify({passed:report.passed,scenarios:report.scenarios?.map(s=>[s.name,s.new_effects,s.passed]),restart:report.restart,error:report.error}));
process.exitCode=report.passed?0:1;
