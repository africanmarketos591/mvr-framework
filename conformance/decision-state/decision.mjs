// Decision state: what the accountable reviews on one case currently support, for the internal
// recommendation and for each named effect. Pure and deterministic: the AMOS server and the public
// replay tool run this same file, so anyone holding the journal can recompute every transition.
import {need,object,text,instant,canonical,digest} from './core.mjs';
import {planReviews} from './review.mjs';
import {createHash} from 'node:crypto';
const sha256=value=>createHash('sha256').update(value,'utf8').digest('hex');

export const DECISION_VERSION='mvr.decision-state/1';
export const RECOMMENDATION='internal_recommendation';
export const INTERNAL_USES=Object.freeze(['internal_planning','pilot_design','board_reporting']);
export const TASK_LABELS=Object.freeze(['supports','qualifies','adverse','unrelated']);
export const TARGET_STATES=Object.freeze(['pending','positive','conditional','adverse','revoked']);
export const EVENT_TYPES=Object.freeze(['model_set','review_accepted','review_withdrawn','designation_lapsed','task_issued','interpretation_recorded']);
export const MAX_DECISION_EVENTS=64;
const HEX=/^[a-f0-9]{64}$/;
const GENESIS='0'.repeat(64);
const supporting=new Set(['positive','conditional']);

export function ruleFacts(rule,out=new Set()){
  if('fact'in rule)out.add(rule.fact);else if('not'in rule)ruleFacts(rule.not,out);else (rule.all||rule.any).forEach(r=>ruleFacts(r,out));
  return out;
}
export function decisionTargets(model){
  if(!object(model))return [];
  return [{target:RECOMMENDATION,kind:'internal_recommendation',effect_type:null,rule:model.rule},
    ...(Array.isArray(model.effects)?model.effects:[]).map(e=>({target:'effect:'+e.effect_type,kind:'effect',effect_type:e.effect_type,rule:e.rule}))]
    .map(t=>({...t,facts:[...ruleFacts(t.rule)].sort()}));
}

// Machine-checkable conditions a reviewer may attach when qualifying a passage. Free text never conditions an effect.
export function validateReviewConditions(list){
  need(Array.isArray(list)&&list.length>=1&&list.length<=4,'REVIEW_CONDITIONS_INVALID');
  const out=list.map(c=>{
    need(object(c),'REVIEW_CONDITIONS_INVALID');
    const k=Object.keys(c).sort().join(',');
    if(c.type==='amount_at_most')need(k==='amount_minor,currency,type'&&Number.isSafeInteger(c.amount_minor)&&c.amount_minor>=0&&typeof c.currency==='string'&&/^[A-Z]{3}$/.test(c.currency),'REVIEW_CONDITIONS_INVALID');
    else if(c.type==='within_time_window')need(k==='not_after,not_before,type'&&instant(c.not_before)<instant(c.not_after),'REVIEW_CONDITIONS_INVALID');
    else if(c.type==='geography_in')need(k==='countries,type'&&Array.isArray(c.countries)&&c.countries.length>=1&&c.countries.length<=20&&c.countries.every(x=>typeof x==='string'&&/^[A-Z]{2}$/.test(x)),'REVIEW_CONDITIONS_INVALID');
    else if(c.type==='resource_scope')need(['resource_type,system,type','resource_id_prefix,resource_type,system,type'].includes(k)&&text(c.system,80)&&text(c.resource_type,80)&&(c.resource_id_prefix===undefined||text(c.resource_id_prefix,120)),'REVIEW_CONDITIONS_INVALID');
    else if(c.type==='no_external_contact')need(k==='type','REVIEW_CONDITIONS_INVALID');
    else need(false,'REVIEW_CONDITIONS_INVALID');
    return JSON.parse(canonical(c));
  });
  need(new Set(out.map(canonical)).size===out.length,'REVIEW_CONDITIONS_INVALID');
  return out;
}
// The conditions an exact requested effect fails. country is the case or requested geography.
export function unmetConditions(conditions,requested,{now=Date.now(),country=null}={}){
  const out=[];
  for(const c of conditions||[]){
    const r=object(requested)?requested:{},res=object(r.resource)?r.resource:{};
    const ok=c.type==='amount_at_most'?r.currency===c.currency&&Number.isSafeInteger(r.amount_minor)&&r.amount_minor>=0&&r.amount_minor<=c.amount_minor
      :c.type==='within_time_window'?Date.parse(c.not_before)<=now&&now<Date.parse(c.not_after)
      :c.type==='geography_in'?c.countries.includes(String(country||'').toUpperCase().slice(0,2))
      :c.type==='resource_scope'?res.system===c.system&&res.resource_type===c.resource_type&&(c.resource_id_prefix===undefined||typeof res.resource_id==='string'&&res.resource_id.startsWith(c.resource_id_prefix))
      :c.type==='no_external_contact'?r.external_contact!==true:false;
    if(!ok)out.push(c.type);
  }
  return out;
}

// Attributed model reading: who produced it, with which model, prompt and output. It never sets a value.
export function validateAttribution(a){
  need(object(a)&&Object.keys(a).sort().join(',')==='model,model_version,output_sha256,prompt_sha256,provider'&&text(a.provider,100)&&text(a.model,120)&&text(a.model_version,120)&&HEX.test(a.prompt_sha256||'')&&HEX.test(a.output_sha256||''),'INTERPRETATION_ATTRIBUTION_INVALID');
  return {provider:a.provider,model:a.model,model_version:a.model_version,prompt_sha256:a.prompt_sha256,output_sha256:a.output_sha256};
}
// A server-issued task: one exact passage, one target claim, a closed label set, and no authority.
export function interpretationTask({case_id,model_sha256,fact_id,claim,document_sha256,start,end,passage_text,kind,issued_at}){
  need(HEX.test(document_sha256||'')&&HEX.test(model_sha256||'')&&Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&end>start&&typeof passage_text==='string'&&text(fact_id,80),'INTERPRETATION_TASK_INVALID');
  const passage_sha256=sha256(passage_text);
  const task_id='IT-'+digest({contract:'mvr.interpretation-task/1',case_id,model_sha256,fact_id,document_sha256,start,end,passage_sha256}).slice(0,48);
  return {contract_version:'mvr.interpretation-task/1',task_id,kind,case_id,model_sha256,fact_id,claim,document_sha256,locator:'utf16:'+start+':'+end,start,end,passage_text,passage_sha256,
    allowed_labels:[...TASK_LABELS],issued_at,
    instructions:'Read only this exact passage against this one claim. Answer with one allowed label: supports, qualifies, adverse or unrelated. Do not infer facts from outside the passage.',
    non_authority:{decides_nothing:true,sets_no_fact_value:true,confers_no_permission:true,human_disposition_required:true}};
}
// The same task shape for a stateless preflight claim-source link.
export function preflightInterpretationTask({claim_id,claim,evidence_id,field,passage_text}){
  need(text(claim_id,200)&&text(evidence_id,200)&&typeof claim==='string'&&typeof passage_text==='string','INTERPRETATION_TASK_INVALID');
  const claim_sha256=sha256(claim),passage_sha256=sha256(passage_text);
  const task_id='PT-'+digest({contract:'mvr.interpretation-task/1',claim_id,claim_sha256,evidence_id,field,passage_sha256}).slice(0,48);
  return {contract_version:'mvr.interpretation-task/1',task_id,kind:'claim_source_link',claim_id,claim,claim_sha256,evidence_id,field,passage_text,passage_sha256,allowed_labels:[...TASK_LABELS],
    instructions:'Read only this passage against this one claim. Answer with one allowed label. Return the reading as passage_interpretations with task_id and attribution.',
    non_authority:{decides_nothing:true,sets_no_fact_value:true,confers_no_permission:true,human_disposition_required:true}};
}


// Wording that limits, conditions, withdraws or argues against a claim. Routing only: a match never sets a value.
// It holds a favourable value for the claim until a designated reviewer disposes of the passage.
export const ADVERSE_SIGNAL_SOURCE="\\b(?:must not|shall not|may not|cannot|can not|prohibit\\w*|not (?:authori[sz]ed|permitted|approved|allowed|licen[cs]ed|renewed)|revok\\w*|revocation|suspen\\w*|cancel\\w*|withdr[ae]w\\w*|terminat\\w*|banned|barred|denied|refus\\w*|reject\\w*|cease\\w*|stop(?:s|ped)?|halt\\w*|discontinu\\w*|recall\\w*|shut\\w*|expire[ds]?|expiry|lapse[ds]?|subject to|only if|unless|provided that|conditional (?:on|upon)|pending|in principle|default\\w*|arrears|overdue|unpaid|non-?payment|complain\\w*|disput\\w*|breach\\w*|fraud\\w*|insolven\\w*|liquidat\\w*|receivership|penalt\\w*|sanction\\w*|delist\\w*|blacklist\\w*|declin\\w*|no longer)\\b";
export function adverseSignals(text,{max=8}={}){
  if(typeof text!=='string')return [];
  const out=[],sentence=/[^.!?;\n]+[.!?;]?/g;let m;
  while((m=sentence.exec(text))&&out.length<max){
    const lead=m[0].length-m[0].trimStart().length,body=m[0].trim();if(!body)continue;
    const terms=[...new Set([...body.matchAll(new RegExp(ADVERSE_SIGNAL_SOURCE,'gi'))].map(x=>x[0].toLowerCase()))];
    if(terms.length)out.push({start:m.index+lead,end:m.index+lead+body.length,terms:terms.slice(0,6)});
  }
  return out;
}

// ---------------------------------------------------------------- fold
function freshState(){return {model_sha256:null,reviews:[],withdrawn:new Set(),lapsed:new Map(),tasks:new Map(),targets:new Map()};}
function activeReviews(st,at){
  return st.reviews.filter(r=>r.model_sha256===st.model_sha256&&!st.withdrawn.has(r.review_sha256)&&!st.lapsed.has(r.designation.credential_id)&&Date.parse(r.designation.not_after)>at);
}
const covers=(r,t)=>t.kind!=='effect'||!Array.isArray(r.designation.effect_types)||r.designation.effect_types.includes(t.effect_type);
function factView(st,t,at){
  const latest=new Map();
  for(const r of activeReviews(st,at))if(r.value!==null&&covers(r,t))latest.set(r.fact_id+'|'+r.reviewer_principal_sha256,r);
  const byFact=new Map();
  for(const r of latest.values()){if(!byFact.has(r.fact_id))byFact.set(r.fact_id,[]);byFact.get(r.fact_id).push(r);}
  const values={},contested=[],facts={};
  for(const [fact,rows] of [...byFact.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0)){
    const distinct=[...new Set(rows.map(r=>r.value))];
    const reviews=rows.map(r=>r.review_sha256).sort(),reviewers=[...new Set(rows.map(r=>r.reviewer_principal_sha256))].sort();
    if(distinct.length>1){contested.push(fact);facts[fact]={value:null,contested:true,reviews,reviewers,values:distinct.map(v=>({value:v,reviewers:[...new Set(rows.filter(r=>r.value===v).map(r=>r.reviewer_principal_sha256))].sort()}))};continue;}
    const conditions=distinct[0]===true?[...new Map(rows.flatMap(r=>r.conditions||[]).map(c=>[canonical(c),c])).values()].sort((a,b)=>canonical(a)<canonical(b)?-1:1):[];
    values[fact]=distinct[0];
    facts[fact]={value:distinct[0],contested:false,reviews,reviewers,conditions,credential_ids:[...new Set(rows.map(r=>r.designation.credential_id))].sort(),valid_until:new Date(Math.min(...rows.map(r=>Date.parse(r.designation.not_after)))).toISOString()};
  }
  return {values,contested,facts};
}
function computeState(st,models,at){
  const model=st.model_sha256?models[st.model_sha256]:null;
  if(!model)return {contract_version:DECISION_VERSION,model_sha256:null,targets:[],facts:{},tasks:[],disagreements:[],coverage:{pending:[],not_needed:[]},state_sha256:digest({contract:DECISION_VERSION,empty:true}),targetStates:new Map()};
  const now=new Date(at).toISOString(),targets=[],targetStates=new Map(),allFacts={},disagreements=[];
  const bindings=Object.fromEntries(model.facts.map(f=>[f.id,f.binding]));
  // A task is open when it carries an adverse signal (lexical flag, or an adverse or qualifying reading) and no current
  // designated disposition. While open, it holds a favourable value of its claim.
  const activeShas=new Set(activeReviews(st,at).map(r=>r.review_sha256));
  const openTask=task=>(!!task.signal||task.readings.some(r=>r.stance==='adverse'||r.stance==='qualifies'))&&!(task.disposition&&activeShas.has(task.disposition.review_sha256));
  const heldFacts=new Set([...st.tasks.values()].filter(openTask).map(task=>task.fact_id));
  for(const t of decisionTargets(model)){
    const view=factView(st,t,at);
    const held=t.facts.filter(f=>heldFacts.has(f)&&view.values[f]===true);
    const plan=planReviews({model_id:model.model_id,version:model.version,scope:model.scope,facts:model.facts,rule:t.rule},[],{now,derived_values:view.values,withhold:[...view.contested,...held]});
    let state,reason=null,conditions=[],pending=[],basis=[],validUntil=null;
    if(plan.status==='source_refresh_required'){state='pending';reason='source_refresh_required';pending=(plan.refresh_required||[]).map(fact_id=>({fact_id,refresh_required:true}));}
    else if(plan.model_outcome===null){
      state='pending';reason=view.contested.some(f=>t.facts.includes(f))?'accountable_reviewers_disagree':held.length?'adverse_signal_requires_disposition':'reviews_pending';
      const contested=new Set([...view.contested,...held]);
      pending=(plan.ranking||[]).filter(r=>r.decisive_pairs>0).map((r,i)=>({fact_id:r.fact_id,worst_case_remaining_cost:r.worst_case_remaining_cost,decisive_pairs:r.decisive_pairs,contested:contested.has(r.fact_id),order:i}))
        .sort((a,b)=>Number(b.contested)-Number(a.contested)||a.order-b.order).map(({order,...x})=>x);
    }else{
      const certificate=plan.minimum_observation_certificate?.fact_ids||t.facts.filter(f=>typeof view.values[f]==='boolean');
      basis=[...certificate].sort().map(f=>({fact_id:f,value:view.values[f],reviews:view.facts[f]?.reviews||[],reviewers:view.facts[f]?.reviewers||[],credential_ids:view.facts[f]?.credential_ids||[]}));
      if(plan.model_outcome===true){
        // Conservative: every true referenced fact carrying conditions conditions the target.
        conditions=[...new Map(t.facts.filter(f=>view.values[f]===true).flatMap(f=>view.facts[f].conditions).map(c=>[canonical(c),c])).values()].sort((a,b)=>canonical(a)<canonical(b)?-1:1);
        state=conditions.length?'conditional':'positive';
        const limits=[...t.facts.filter(f=>view.values[f]===true).map(f=>Date.parse(view.facts[f].valid_until)),...t.facts.map(f=>Date.parse(bindings[f].valid_until)),...conditions.filter(c=>c.type==='within_time_window').map(c=>Date.parse(c.not_after))];
        validUntil=new Date(Math.min(...limits)).toISOString();
      }else state='adverse';
    }
    const prior=st.targets.get(t.target);
    if(state==='pending'&&(supporting.has(prior)||prior==='revoked')){state='revoked';reason=reason==='source_refresh_required'?'binding_expired':['accountable_reviewers_disagree','adverse_signal_requires_disposition'].includes(reason)?reason:'supporting_review_withdrawn_or_lapsed';}
    targetStates.set(t.target,state);
    const openSignals=[...st.tasks.values()].filter(task=>openTask(task)&&t.facts.includes(task.fact_id)).map(task=>task.task_id).sort();
    targets.push({target:t.target,kind:t.kind,effect_type:t.effect_type,state,reason,facts:t.facts,conditions,pending_reviews:pending,next_review:pending[0]?.fact_id||null,open_signals:openSignals,basis,valid_until:validUntil});
    for(const [f,v] of Object.entries(view.facts))allFacts[f]??=v;
    for(const f of view.contested)if(t.facts.includes(f)&&!disagreements.some(d=>d.fact_id===f))disagreements.push({kind:'accountable_reviewers',fact_id:f,values:view.facts[f].values});
  }
  const needed=new Set(targets.filter(t=>t.state==='pending'||t.state==='revoked').flatMap(t=>t.pending_reviews.map(p=>p.fact_id)));
  const tasks=[...st.tasks.values()].map(task=>{
    const labels=[...new Set(task.readings.map(r=>r.stance))].sort();
    if(labels.length>1&&!disagreements.some(d=>d.task_id===task.task_id))disagreements.push({kind:'readings',task_id:task.task_id,fact_id:task.fact_id,labels});
    const disposed=!!task.disposition&&activeShas.has(task.disposition.review_sha256);
    return {task_id:task.task_id,kind:task.kind,fact_id:task.fact_id,document_sha256:task.document_sha256,locator:task.locator,signal:task.signal,terms:task.terms,status:disposed?'disposed':needed.has(task.fact_id)?'open':'not_needed',adverse_signal_open:openTask(task),
      readings:task.readings.map(r=>({source:r.source,stance:r.stance,...(r.attribution?{attribution:r.attribution}:{}),reader_ref:r.reader_ref,at:r.at,accountable:false})),
      disagreement:labels.length>1,labels,disposition:disposed?task.disposition:null};
  }).sort((a,b)=>a.task_id<b.task_id?-1:1);
  const coverage={pending:[...needed].sort(),not_needed:model.facts.map(f=>f.id).filter(id=>!needed.has(id)).sort()};
  const summary={contract:DECISION_VERSION,model_sha256:st.model_sha256,facts:allFacts,targets:targets.map(t=>({target:t.target,state:t.state,conditions:t.conditions,basis:t.basis.map(b=>[b.fact_id,b.value,b.reviews]),pending:t.pending_reviews.map(p=>p.fact_id)})),
    lapsed:[...st.lapsed.keys()].sort(),withdrawn:[...st.withdrawn].sort(),tasks:tasks.map(t=>[t.task_id,t.status,t.labels,t.disposition?.review_sha256||null])};
  return {contract_version:DECISION_VERSION,model_sha256:st.model_sha256,targets,facts:allFacts,tasks,disagreements,coverage,state_sha256:digest(summary),targetStates};
}
function eventFacts(e,st,models){
  if(e.type==='model_set'){const m=models[e.payload.model_sha256];return m?m.facts.map(f=>f.id):[];}
  if(e.type==='review_accepted'||e.type==='interpretation_recorded'||e.type==='task_issued')return [e.payload.fact_id];
  if(e.type==='review_withdrawn')return st.reviews.filter(r=>r.review_sha256===e.payload.review_sha256).map(r=>r.fact_id);
  if(e.type==='designation_lapsed')return [...new Set(st.reviews.filter(r=>r.designation.credential_id===e.payload.credential_id).map(r=>r.fact_id))];
  return [];
}
function applyEvent(st,e){
  const p=e.payload;
  if(e.type==='model_set'){st.model_sha256=p.model_sha256;st.tasks=new Map();}
  else if(e.type==='review_accepted'){st.reviews.push({...p,seq:e.seq,at:e.at});
    for(const id of [p.task_id,...(p.covers_tasks||[])].filter(Boolean))if(st.tasks.has(id))st.tasks.get(id).disposition={review_sha256:p.review_sha256,label:id===p.task_id?p.label||null:'read_in_clause_review',disposition:id===p.task_id?p.disposition||'accept':'covered',value:p.value,reviewer_principal_sha256:p.reviewer_principal_sha256,at:e.at};}
  else if(e.type==='review_withdrawn'){st.withdrawn.add(p.review_sha256);for(const task of st.tasks.values())if(task.disposition?.review_sha256===p.review_sha256)task.disposition=null;}
  else if(e.type==='designation_lapsed')st.lapsed.set(p.credential_id,{reasons:p.reasons,at:e.at});
  else if(e.type==='task_issued'){if(!st.tasks.has(p.task_id))st.tasks.set(p.task_id,{task_id:p.task_id,kind:p.kind,fact_id:p.fact_id,document_sha256:p.document_sha256,locator:p.locator,signal:p.signal||null,terms:p.terms||[],readings:[],disposition:null});}
  else if(e.type==='interpretation_recorded'){const task=p.task_id&&st.tasks.get(p.task_id);if(task)task.readings.push({source:p.source,stance:p.stance,attribution:p.attribution||null,reader_ref:p.reader_ref,at:e.at});}
}
function transitionOf(before,after,facts){
  const touched=new Set(facts);
  const changed=[],unchanged=[],independent=[];
  for(const t of after.targets){
    const b=before.targets.find(x=>x.target===t.target);
    const differs=!b||b.state!==t.state||canonical(b.conditions)!==canonical(t.conditions);
    if(differs)changed.push({target:t.target,before:b?b.state:null,after:t.state});
    else if(t.facts.some(f=>touched.has(f)))unchanged.push(t.target);
    else independent.push(t.target);
  }
  for(const b of before.targets)if(!after.targets.some(t=>t.target===b.target))changed.push({target:b.target,before:b.state,after:null});
  const claims=[...touched].sort().map(f=>({fact_id:f,before:before.facts[f]?(before.facts[f].contested?'contested':before.facts[f].value):null,after:after.facts[f]?(after.facts[f].contested?'contested':after.facts[f].value):null}));
  return {claims,targets_changed:changed,targets_unchanged:unchanged,targets_independent:independent};
}
function entryHash(e){return digest({contract:DECISION_VERSION,seq:e.seq,at:e.at,type:e.type,payload:e.payload,prev_sha256:e.prev_sha256,transition:e.transition,state_sha256:e.state_sha256});}
function strip(state){const {targetStates,...rest}=state;return rest;}

function run(models,journal,{verify}){
  need(object(models)&&Array.isArray(journal)&&journal.length<=MAX_DECISION_EVENTS,'DECISION_JOURNAL_INVALID');
  const st=freshState(),mismatches=[];let prev=GENESIS,last=null;
  journal.forEach((e,i)=>{
    need(object(e)&&EVENT_TYPES.includes(e.type)&&object(e.payload),'DECISION_JOURNAL_INVALID');
    const at=instant(e.at);
    if(verify){
      if(e.seq!==i+1)mismatches.push({seq:i+1,check:'sequence'});
      if(e.prev_sha256!==prev)mismatches.push({seq:i+1,check:'prev_sha256'});
      if(e.sha256!==entryHash(e))mismatches.push({seq:i+1,check:'entry_sha256'});
      if(e.type==='model_set'&&(!models[e.payload.model_sha256]||digest(models[e.payload.model_sha256])!==e.payload.model_sha256))mismatches.push({seq:i+1,check:'model_sha256'});
    }
    const before=computeState(st,models,at);st.targets=before.targetStates;
    const facts=eventFacts(e,st,models);
    applyEvent(st,e);
    const after=computeState(st,models,at);st.targets=after.targetStates;
    if(verify){
      if(canonical(transitionOf(before,after,facts))!==canonical(e.transition))mismatches.push({seq:i+1,check:'transition'});
      if(after.state_sha256!==e.state_sha256)mismatches.push({seq:i+1,check:'state_sha256'});
    }
    prev=e.sha256;last=after;
  });
  return {st,prev,mismatches,last};
}
// Append one event. The server computes the transition and state hash; the replay recomputes them.
export function appendDecisionEvent({models,journal,type,payload,at}){
  need(EVENT_TYPES.includes(type)&&object(payload),'DECISION_EVENT_INVALID');
  need(journal.length<MAX_DECISION_EVENTS,'DECISION_JOURNAL_LIMIT');
  const t=instant(at);
  need(!journal.length||t>=Date.parse(journal.at(-1).at),'DECISION_EVENT_OUT_OF_ORDER');
  const {st,prev}=run(models,journal,{verify:false});
  const before=computeState(st,models,t);st.targets=before.targetStates;
  const e={seq:journal.length+1,at,type,payload:JSON.parse(canonical(payload)),prev_sha256:prev};
  const facts=eventFacts(e,st,models);
  applyEvent(st,e);
  const after=computeState(st,models,t);
  e.transition=transitionOf(before,after,facts);e.state_sha256=after.state_sha256;e.sha256=entryHash(e);
  return {entry:e,journal:[...journal,e],state:strip(after)};
}
// Replay a journal: verify the chain and every recorded transition, then compute the state at as_of.
// live_lapses lists designation credentials the server found unusable but has not yet journaled.
export function replayDecisionJournal({models,journal,as_of,live_lapses=[]}){
  const at=typeof as_of==='number'?as_of:instant(as_of);
  const {st,prev,mismatches}=run(models,journal,{verify:true});
  need(!journal.length||at>=Date.parse(journal.at(-1).at),'DECISION_REPLAY_BEFORE_HEAD');
  const unjournaled=[...new Set(live_lapses)].filter(id=>!st.lapsed.has(id)).sort();
  for(const id of unjournaled)st.lapsed.set(id,{reasons:['observed_unusable_not_journaled'],at:new Date(at).toISOString()});
  const state=strip(computeState(st,models,at));
  return {valid_chain:mismatches.length===0,mismatches,journal_head_sha256:prev,event_count:journal.length,as_of:new Date(at).toISOString(),unjournaled_lapses:unjournaled,state};
}
export function internalRecommendation(state){
  const t=(state.targets||[]).find(x=>x.target===RECOMMENDATION);
  const ok=t&&supporting.has(t.state);
  return {state:t?t.state:'pending',permitted_uses:ok?[...INTERNAL_USES]:[],conditions:ok?t.conditions:[],valid_until:ok?t.valid_until:null,basis:ok?t.basis:[],
    execution_permission:false,external_effect_permission:false,
    meaning:ok?'Accountable reviews currently support this internal recommendation for the listed internal uses only. It is not permission for any external effect; each effect has its own state and needs an institution capability.':'No current accountable basis supports the internal recommendation.'};
}
