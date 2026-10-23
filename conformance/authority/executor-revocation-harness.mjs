import assert from 'node:assert/strict';
import {createBoundedExecutor} from '../../sdks/javascript/bounded-executor.mjs';

// Harmless in-process draft ledger only. Never install a real effect handler in this harness.
export async function runExecutorRevocationHarness({capability_id,effect,verify,revoke,recordEffect}){
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
 return {classification:'AMOS lab verification',effect:'in-process draft counter',fresh_verification_each_attempt:true,outage_executed:false,previous_allow_not_reused:true,next_verification_after_revocation:'deny',verification_answers:answers,post_verification_race_observed:true,post_verification_race_closed:false,customer_receiver_tested:false,boundary:'The distributed verify-to-effect gap remains. Customer executors need a shared transaction, resource fencing or equivalent receiver enforcement; a notification and an unexpired allow are insufficient.'};
}
