import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {planReviews,recordObservation} from './review.mjs';
import {appendHoldEvent,summarizeHolds} from './holds.mjs';
import {captureProposal,compareDecision} from './counterfactual.mjs';
import {digest,verify} from './core.mjs';
import {fixtureModel,now,proposal,decision} from './fixtures.mjs';

// No provider calls, credentials, scoring internals or real authority in this test corpus.
globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN');};
let checks=0;function check(name,fn){fn();checks++;}
const observe=(m,id,value)=>recordObservation(m,{fact_id:id,value,reviewer_ref:'synthetic:reviewer',observed_at:now});
const model=fixtureModel();
check('24 items reduce to three load-bearing facts in the declared rule',()=>{
  const p=planReviews(model,[],{now});assert.equal(p.minimum_worst_case_review_cost,3);assert.equal(p.irrelevant_within_current_model.length,21);assert.equal(p.enumerated_completions,8);assert.equal(p.execution_authorized,false);
  const stop=planReviews(model,[observe(model,'prohibition',true)],{now});assert.equal(stop.model_outcome,false);assert.equal(stop.stop_reviewing_within_model,true);assert.deepEqual(stop.minimum_observation_certificate.fact_ids,['prohibition']);assert.equal(stop.minimum_worst_case_review_cost,0);
  const yes=planReviews(model,[observe(model,'permission',true),observe(model,'condition',true),observe(model,'prohibition',false)],{now});assert.equal(yes.model_outcome,true);assert.equal(yes.execution_authorized,false);
});
check('Every source binding dimension invalidates an old observation',()=>{
  const receipt=observe(model,'permission',true);
  for(const key of Object.keys(model.facts[0].binding)) {const changed=structuredClone(model),b=changed.facts[0].binding;b[key]=key==='document_sha256'?'b'.repeat(64):key==='valid_from'?'2026-02-01T00:00:00Z':key==='valid_until'?'2027-02-01T00:00:00Z':b[key]+' changed';const p=planReviews(changed,[receipt],{now});assert.deepEqual(p.stale_observations,['permission'],key);}
  const changed=structuredClone(model);changed.scope+=' changed';assert.equal(planReviews(changed,[receipt],{now}).stale_observations.length,1);
  const expired=planReviews(model,[receipt],{now:'2027-01-02T00:00:00Z'});assert.deepEqual(expired.stale_observations,['permission']);
  assert.equal(expired.status,'source_refresh_required');assert.equal(expired.stop_reviewing_within_model,false);
});
check('Tamper, duplicate, future, malformed and complexity inputs reject',()=>{
  const o=observe(model,'permission',true),tampered=structuredClone(o);tampered.payload.value=false;assert.throws(()=>planReviews(model,[tampered],{now}),/INTEGRITY/);
  assert.throws(()=>planReviews(model,[o,o],{now}),/DUPLICATE/);assert.throws(()=>planReviews(model,[o],{now:'2026-10-23T09:00:00Z'}),/FUTURE/);
  const m=structuredClone(model);m.rule={all:m.facts.slice(0,9).map(f=>({fact:f.id}))};assert.throws(()=>planReviews(m,[],{now}),/LIMIT_8/);
  assert.throws(()=>recordObservation(model,{fact_id:'unknown',value:true,reviewer_ref:'x',observed_at:now}));
  assert.throws(()=>planReviews({...model,rule:{fact:'permission',not:{fact:'permission'}}},[],{now}));
  assert.throws(()=>planReviews({...model,facts:[...model.facts,model.facts[0]]},[],{now}));
});

// Independent truth-table oracle: exhaust all 256 three-input Boolean functions and
// all 27 partial observations. Includes XOR, negation, constants and contradictions.
let oracleCases=0;
for(let table=0;table<256;table++) {
  const names=['permission','condition','prohibition'],truth=Array.from({length:8},(_,i)=>!!(table&(1<<i)));
  const clauses=truth.flatMap((v,i)=>v?[{all:names.map((id,b)=>(i&(1<<b))?{fact:id}:{not:{fact:id}})}]:[]);
  const m={...fixtureModel(),facts:fixtureModel().facts.slice(0,3).map((f,i)=>({...f,cost:i+1})),rule:clauses.length?{any:clauses}:{all:[{fact:names[0]},{not:{fact:names[0]}}]}};
  const memo=new Map();
  function oracle(state){const key=state.join(',');if(memo.has(key))return memo.get(key);const compatible=truth.flatMap((v,i)=>state.every((x,b)=>x===-1||x===Number(!!(i&(1<<b))))?[v]:[]);if(compatible.every(v=>v===compatible[0]))return {cost:0,outcome:compatible[0]};let cost=Infinity;state.forEach((x,b)=>{if(x!==-1)return;const a=[...state],z=[...state];a[b]=0;z[b]=1;cost=Math.min(cost,b+1+Math.max(oracle(a).cost,oracle(z).cost));});const result={cost,outcome:null};memo.set(key,result);return result;}
  for(let code=0;code<27;code++){let n=code;const state=names.map(()=>{const v=n%3;n=Math.floor(n/3);return v-1;});const observations=names.flatMap((id,i)=>state[i]===-1?[]:[observe(m,id,!!state[i])]);const expected=oracle(state),actual=planReviews(m,observations,{now});assert.equal(actual.minimum_worst_case_review_cost,expected.cost,`table ${table} state ${code}`);assert.equal(actual.model_outcome,expected.outcome);assert.equal(actual.execution_authorized,false);
    if(actual.next_review!==null){const b=names.indexOf(actual.next_review),a=[...state],z=[...state];a[b]=0;z[b]=1;assert.equal(b+1+Math.max(oracle(a).cost,oracle(z).cost),expected.cost);}
    if(expected.outcome!==null){let minimum=Infinity;for(let mask=0;mask<8;mask++){const sub=state.map((v,i)=>mask&(1<<i)?v:-1),cost=sub.reduce((sum,v,i)=>sum+(v===-1?0:i+1),0);if(oracle(sub).outcome===expected.outcome)minimum=Math.min(minimum,cost);}assert.equal(actual.minimum_observation_certificate.cost,minimum);}
    oracleCases++;}
}
checks++;
check('Maximum supported review model stays bounded and keeps all eight load-bearing facts',()=>{
  const m=fixtureModel();m.facts=m.facts.slice(0,8);m.rule={all:m.facts.map(f=>({fact:f.id}))};const p=planReviews(m,[],{now});assert.equal(p.minimum_worst_case_review_cost,8);assert.equal(p.enumerated_completions,256);assert.equal(p.next_review!==null,true);
});
check('Hold ageing, assignment, closure, reopening and abandonment preserve history',()=>{
  let j=[];const add=e=>j=appendHoldEvent(j,{id:'h1',actor_ref:'synthetic:owner',...e});
  add({type:'opened',at:'2026-10-20T00:00:00Z',blocker:'Permission missing',closure_artifact:'Exact scoped permission reference'});
  let p=summarizeHolds(j,{now});assert.equal(p.metrics.unassigned,1);assert.equal(p.holds[0].deadline,null);
  add({type:'assigned',at:'2026-10-21T00:00:00Z',owner_ref:'synthetic:resolver',deadline:'2026-10-22T00:00:00Z',deadline_commitment_ref:'synthetic:commitment'});
  assert.equal(summarizeHolds(j,{now}).metrics.overdue,1);
  add({type:'closed',at:'2026-10-22T00:00:00Z',evidence_ref:'synthetic:closure',reason:'Owner declared closure'});
  add({type:'reopened',at:'2026-10-23T00:00:00Z',reason:'Supporting evidence revoked'});
  p=summarizeHolds(j,{now});assert.equal(p.metrics.current_closure_fraction,0);assert.equal(p.metrics.reopen_events,1);assert.equal(p.holds[0].deadline,null);assert.equal(p.holds[0].total_hold_ms,3*86400000+9*3600000);
  add({type:'abandoned',at:now,reason:'Owner stopped this opportunity'});p=summarizeHolds(j,{now});assert.equal(p.metrics.abandoned,1);assert.equal(p.metrics.closure_events,1);assert.equal(p.opportunity_cost.amount,null);assert.equal(p.execution_authorized,false);
  const bad=structuredClone(j);bad[0].payload.event.blocker='changed';assert.throws(()=>summarizeHolds(bad,{now}),/INTEGRITY/);assert.throws(()=>summarizeHolds(j.slice(1),{now}),/CHAIN/);
  assert.throws(()=>summarizeHolds(j.slice(0,-1),{now,expected_head:j.at(-1).sha256}),/HEAD/);assert.equal(summarizeHolds(j,{now,expected_head:j.at(-1).sha256}).expected_head_checked,true);
});
check('Hold invalid transitions and unsupported deadlines fail',()=>{
  const opened={id:'h',type:'opened',at:now,actor_ref:'synthetic:owner',blocker:'Missing',closure_artifact:'Original scoped evidence'};
  assert.throws(()=>appendHoldEvent([],{...opened,deadline:'2026-11-01T00:00:00Z'}),/COMMITMENT/);
  const j=appendHoldEvent([],opened);assert.throws(()=>appendHoldEvent(j,opened));assert.throws(()=>appendHoldEvent(j,{id:'h',type:'closed',at:now,actor_ref:'x',reason:'done'}),/EVIDENCE/);
  assert.throws(()=>summarizeHolds(j,{now:'2026-10-23T00:00:00Z'}),/TIME/);
});
check('Counterfactual uses a captured proposal and exact request, scope, action and cause references',()=>{
  const capture=captureProposal(proposal),r=compareDecision(capture,decision,{now}),p=verify(r,'decision-comparison');assert.equal(p.proposal_changed,true);assert.equal(p.external_effect_gated,true);assert.equal(p.exposure_moved.amount,null);assert.equal(p.execution_authorized,false);
  assert.equal(p.before.proposal,proposal.proposal);for(const key of ['request_id','scope','action'])assert.throws(()=>compareDecision(capture,{...decision,[key]:'changed'},{now}),/SCOPE/);
  assert.throws(()=>compareDecision(capture,{...decision,decided_at:'2026-10-23T00:00:00Z'},{now}),/CHRONOLOGY/);
  assert.throws(()=>compareDecision(capture,{...decision,causes:[]},{now}),/CAUSES/);
  const bad=structuredClone(capture);bad.payload.proposal='tampered';assert.throws(()=>compareDecision(bad,decision,{now}),/INTEGRITY/);
});
check('CLI runs end to end and fails malformed input without a successful result',()=>{
  const dir=mkdtempSync(join(tmpdir(),'amos-review-tools-'));try{const path=join(dir,'input.json');writeFileSync(path,JSON.stringify({model,observations:[],options:{now}}));const run=spawnSync(process.execPath,[fileURLToPath(new URL('./cli.mjs',import.meta.url)),'plan',path],{encoding:'utf8',timeout:10000});assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).minimum_worst_case_review_cost,3);writeFileSync(path,'{');const bad=spawnSync(process.execPath,[fileURLToPath(new URL('./cli.mjs',import.meta.url)),'plan',path],{encoding:'utf8',timeout:10000});assert.equal(bad.status,1);assert.equal(bad.stdout,'');
    const call=(command,input)=>{writeFileSync(path,JSON.stringify(input));const r=spawnSync(process.execPath,[fileURLToPath(new URL('./cli.mjs',import.meta.url)),command,path],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
    const observed=call('observe',{model,observation:{fact_id:'prohibition',value:true,reviewer_ref:'synthetic:reviewer',observed_at:now}});assert.equal(call('plan',{model,observations:[observed],options:{now}}).stop_reviewing_within_model,true);
    const journal=call('hold-append',{journal:[],event:{id:'cli-hold',type:'opened',at:now,actor_ref:'synthetic:owner',blocker:'Missing permission',closure_artifact:'Scoped permission'}});assert.equal(call('holds',{journal,options:{now,expected_head:journal.at(-1).sha256}}).metrics.open,1);
    const captured=call('capture',proposal);assert.equal(call('compare',{proposal:captured,decision,options:{now}}).payload.execution_authorized,false);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
console.log(JSON.stringify({passed:true,test_groups:checks,exhaustive_oracle_cases:oracleCases,classification:'synthetic implementation tests; no external authority or effects',fixture_sha256:digest(model)}));
