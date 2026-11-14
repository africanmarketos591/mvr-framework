import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {createLabCommitSource} from '../lab-commits.mjs';
import {runHttpReceiverConformance} from '../http-conformance.mjs';
const cwd=path.dirname(fileURLToPath(import.meta.url)),base='https://africanmarketos.com';
const output=process.argv[2];
if(!output)throw Error('Usage: node run.mjs output.json');
const manifest=await (await fetch(base+'/.well-known/mvr-release-manifest.json')).json();
const transport=async body=>(await fetch(base+'/v1/authority-conformance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)})).json();
const source=await createLabCommitSource(transport);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'amos-independent-staging-'));
let child;
async function start(){
 child=spawn(process.platform==='win32'?'python':'python3',[path.join(cwd,'receiver.py'),path.join(dir,'registry.json'),path.join(dir,'drafts.sqlite')],{windowsHide:true,stdio:['ignore','pipe','inherit']});
 const reader=createInterface({input:child.stdout});
 const port=await Promise.race([once(reader,'line').then(([line])=>Number(line)),once(child,'exit').then(()=>{throw Error('Receiver exited during start');})]);
 if(!Number.isInteger(port)||port<=0)throw Error('No staging port');
 return 'http://127.0.0.1:'+port;
}
async function stop(){if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}child=null;}
try{
 fs.writeFileSync(path.join(dir,'registry.json'),JSON.stringify(source.trust_chain.registry_statement));
 let receiver=await start();
 const report=await runHttpReceiverConformance({receiverUrl:receiver,source,faults:true});
 const commit=await source.commitFresh();
 const deliver=async()=>(await fetch(receiver+'/commits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(commit)})).json();
 const first=await deliver(); await stop(); receiver=await start(); const replay=await deliver();
 report.restart={first_performed:first.performed===true,replay_prevented:replay.performed===false&&replay.already_performed===true};
 report.passed=report.passed&&report.restart.first_performed&&report.restart.replay_prevented;
 const pending=await source.commitFresh();
 const before=await (await fetch(receiver+'/effects')).json();
 await source.revoke_current('Revoke a committed but undelivered harmless draft');
 assert.ok(Date.parse(pending.receipt.commit_valid_until)>Date.now(),'revocation consumed the commit window');
 const refused=await (await fetch(receiver+'/commits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)})).json();
 const after=await (await fetch(receiver+'/effects')).json();
 report.post_commit_revocation={refused_by_current_feed:refused.code==='current_feed_refused',additional_effects:after.total_effects-before.total_effects,still_within_window:Date.parse(pending.receipt.commit_valid_until)>Date.now()};
 report.passed=report.passed&&report.post_commit_revocation.refused_by_current_feed&&report.post_commit_revocation.additional_effects===0&&report.post_commit_revocation.still_within_window;
 Object.assign(report,{revision:manifest.deployment_revision,manifest:manifest.manifest_id,runner:process.env.GITHUB_ACTIONS?'GitHub-hosted runner':'local',run_id:process.env.GITHUB_RUN_ID??null,source_commit:process.env.GITHUB_SHA??null,buyer_operated:false});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,scenarios:report.scenarios.length,restart:report.restart}));
 process.exitCode=report.passed?0:1;
}finally{await stop();await source.close();}
