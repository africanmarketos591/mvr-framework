import assert from 'node:assert/strict';
import {createBoundedExecutor} from '../../sdks/javascript/bounded-executor.mjs';

// Harmless in-process draft ledger only. Never install a real effect handler in this harness.
export async function runExecutorRevocationHarness({capability_id,effect,verify,revoke,recordEffect,commitEffect}){
 let executions=0,verifications=0,outage=false,race=false,revoked=false;
 const answers=[];
 const executor=createBoundedExecutor({allowLabFixtures:true,
  verify:async request=>{
   verifications++;if(outage)throw Error('Injected lab verification transport outage');
   const result=await verify(request);answers.push(result.decision);
   if(race&&result.decision==='allow'){await revoke();revoked=true;}
   return result;
  },recordEffect,effects:{create_draft_record:async()=>{executions++;}}
 });
 const execute=suffix=>executor.execute({capability_id,requested_effect:{...effect,effect_id:'lab-race-'+suffix}});
 assert.equal((await execute('before')).executed,true);
 outage=true;assert.equal((await execute('outage')).executed,false);assert.equal(executions,1);outage=false;
 // Deliberately place a revocation after verify returns but before the local effect.
 // This observes the distributed race; it does not pretend notifications make it atomic.
 race=true;const raced=await execute('gap');assert(revoked);assert.equal(raced.executed,true);assert.equal(executions,2);race=false;
 const denied=await execute('after');assert.equal(denied.executed,false);assert.equal(executions,2);assert.equal(verifications,4);
 return {classification:'AMOS lab verification',effect:'in-process draft counter',fresh_verification_each_attempt:true,outage_executed:false,previous_allow_not_reused:true,next_verification_after_revocation:'deny',verification_answers:answers,post_verification_race_observed:true,post_verification_race_closed:false,customer_receiver_tested:false,boundary:'Without commit_effect the distributed verify-to-effect gap remains. Customer executors need a shared transaction, resource fencing or equivalent receiver enforcement; a notification and an unexpired allow are insufficient.'};
}
// With commit_effect: a revocation after verification but before the commit stops the effect.
// The remaining gap is between a successful commit and the local effect, bounded by commit_valid_until.
export async function runCommittedRevocationHarness({capability_id,effect,verify,commitEffect,revoke,recordEffect}){
  let executions=0,revokeAfterVerify=false,revoked=false;const commits=[];
  const executor=createBoundedExecutor({allowLabFixtures:true,verify:async request=>{const r=await verify(request);if(revokeAfterVerify&&r.decision==='allow'){await revoke();revoked=true;}return r;},
    commitEffect:async request=>{const r=await commitEffect(request);commits.push(r.decision);return r;},recordEffect,effects:{create_draft_record:async(_e,{commit_id})=>{assert.match(commit_id,/^CM-[a-f0-9]{48}$/);executions++;}}});
  const first=await executor.execute({capability_id,requested_effect:{...effect,effect_id:'lab-commit-ok'}});assert.equal(first.executed,true);assert.equal(first.commit_time_checked,true);assert.equal(executions,1);
  revokeAfterVerify=true;const raced=await executor.execute({capability_id,requested_effect:{...effect,effect_id:'lab-commit-raced'}});assert(revoked);assert.equal(raced.executed,false);assert.equal(raced.reason,'EXECUTOR_COMMIT_DENIED');assert.equal(executions,1);
  return {classification:'AMOS lab verification',effect:'in-process draft counter',commit_decisions:commits,revocation_between_verify_and_commit:'effect not performed',post_verification_race_closed_up_to_commit:true,
    remaining_gap:'After commit_effect returns, a revocation cannot recall the effect. The window is bounded by commit_valid_until (15 seconds at most) and the effect system should accept each commit_id once.',customer_receiver_tested:false};
}
