import {VERSION,boundary,need,text,instant,digest,seal,verify,keys} from './core.mjs';

function validate(model) {
  keys(model,['model_id','version','scope','facts','rule']);
  need(text(model.model_id,100)&&text(model.version,100)&&text(model.scope,2000), 'MODEL_SCOPE_REQUIRED');
  need(Array.isArray(model.facts)&&model.facts.length>0&&model.facts.length<=64, 'FACT_LIMIT');
  const facts=new Map();
  for(const f of model.facts) {
    keys(f,['id','label','cost','binding']);
    need(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(f.id||'')&&!facts.has(f.id)&&text(f.label)&&Number.isSafeInteger(f.cost)&&f.cost>0&&f.cost<=1000, 'INVALID_FACT');
    need(f.binding&&text(f.binding.document_sha256,64)&&/^[a-f0-9]{64}$/.test(f.binding.document_sha256), 'DOCUMENT_HASH_REQUIRED');
    const dimensions=['locator','claim','relationship','subject','action','geography','valid_from','valid_until','reviewer_standing_ref','model_version','extractor_version'];
    keys(f.binding,['document_sha256',...dimensions]);
    need(dimensions.every(k=>text(f.binding[k],2000)), 'EXACT_BINDING_REQUIRED');
    need(instant(f.binding.valid_until)>instant(f.binding.valid_from),'INVALID_VALIDITY'); facts.set(f.id,f);
  }
  const refs=new Set();let nodes=0;
  function visit(rule,depth=0) {
    need(++nodes<=128&&depth<=16,'RULE_COMPLEXITY_LIMIT');
    keys(rule,['fact','all','any','not']);need(Object.keys(rule).length===1,'INVALID_RULE');
    if('fact'in rule){need(facts.has(rule.fact),'UNKNOWN_FACT');refs.add(rule.fact);return;}
    if('not'in rule){visit(rule.not,depth+1);return;}
    const children=rule.all||rule.any;need(Array.isArray(children)&&children.length>0&&children.length<=16,'INVALID_RULE');children.forEach(r=>visit(r,depth+1));
  }
  visit(model.rule);need(refs.size<=8,'EXACT_SOLVER_LIMIT_8_REFERENCED_FACTS');
  return {facts,ids:[...refs].sort()};
}
function evaluate(rule, values) {
  if('fact'in rule)return values[rule.fact];
  if('not'in rule)return !evaluate(rule.not,values);
  return rule.all?rule.all.every(r=>evaluate(r,values)):rule.any.some(r=>evaluate(r,values));
}
// These observations are declarations. The caller must authenticate their reviewer and examine originals.
export function recordObservation(model,{fact_id,value,reviewer_ref,observed_at}) {
  const {facts}=validate(model),f=facts.get(fact_id);need(f&&typeof value==='boolean'&&text(reviewer_ref),'INVALID_OBSERVATION');
  const t=instant(observed_at);need(t>=instant(f.binding.valid_from)&&t<instant(f.binding.valid_until),'OBSERVATION_OUTSIDE_VALIDITY');
  return seal('declared-review-observation',{model_sha256:digest(model),fact_id,value,reviewer_ref,observed_at,binding_sha256:digest(f.binding),classification:'caller_declared_not_authenticated'});
}
export function planReviews(model,observations=[],{now=new Date().toISOString()}={}) {
  const {facts,ids}=validate(model),time=instant(now),modelHash=digest(model),known={},stale=[];
  need(Array.isArray(observations)&&observations.length<=64,'OBSERVATION_LIMIT');const seen=new Set();
  for(const signed of observations) {
    const o=verify(signed,'declared-review-observation');need(!seen.has(o.fact_id),'DUPLICATE_OBSERVATION');seen.add(o.fact_id);
    const f=facts.get(o.fact_id);need(typeof o.value==='boolean'&&text(o.reviewer_ref)&&o.classification==='caller_declared_not_authenticated','INVALID_OBSERVATION');
    const observed=instant(o.observed_at);need(observed<=time,'FUTURE_OBSERVATION');
    if(!f||o.model_sha256!==modelHash||o.binding_sha256!==digest(f.binding)||time>=instant(f.binding.valid_until)||time<instant(f.binding.valid_from)||observed<instant(f.binding.valid_from)||observed>=instant(f.binding.valid_until)){stale.push(o.fact_id);continue;}
    known[o.fact_id]=o.value;
  }
  const refresh=ids.filter(id=>time<instant(facts.get(id).binding.valid_from)||time>=instant(facts.get(id).binding.valid_until));
  if(refresh.length)return {contract_version:VERSION,model_sha256:modelHash,checked_at:now,status:'source_refresh_required',model_outcome:null,next_review:null,minimum_worst_case_review_cost:null,stop_reviewing_within_model:false,stale_observations:stale,refresh_required:refresh,unknown_omitted_risks_remain:true,...boundary};
  // All Boolean completions are enumerated, including adverse and contradictory outcomes.
  const memo=new Map();
  const stateKey=values=>ids.map(id=>values[id]===undefined?'?':Number(values[id])).join('');
  function outcomes(values){const unknown=ids.filter(id=>values[id]===undefined),rows=[];for(let n=0;n<2**unknown.length;n++){const row={...values};unknown.forEach((id,i)=>row[id]=!!(n&(1<<i)));rows.push({values:row,outcome:evaluate(model.rule,row)});}return rows;}
  function solve(values){const key=stateKey(values);if(memo.has(key))return memo.get(key);const rows=outcomes(values),possible=[...new Set(rows.map(r=>r.outcome))];
    if(possible.length===1){const r={cost:0,count:0,next:null,outcome:possible[0]};memo.set(key,r);return r;}
    let best=null;
    for(const id of ids.filter(id=>values[id]===undefined)){const a=solve({...values,[id]:false}),b=solve({...values,[id]:true});const r={cost:facts.get(id).cost+Math.max(a.cost,b.cost),count:1+Math.max(a.count,b.count),next:id,outcome:null};if(!best||r.cost<best.cost||r.cost===best.cost&&r.count<best.count)best=r;}
    memo.set(key,best);return best;
  }
  const solution=solve(known),rows=outcomes(known),unknown=ids.filter(id=>known[id]===undefined);
  const ranked=unknown.map(id=>{let pairs=0,changes=0;const other=unknown.filter(x=>x!==id);for(let n=0;n<2**other.length;n++){const v={...known};other.forEach((x,i)=>v[x]=!!(n&(1<<i)));pairs++;if(evaluate(model.rule,{...v,[id]:false})!==evaluate(model.rule,{...v,[id]:true}))changes++;}
    const a=solve({...known,[id]:false}),b=solve({...known,[id]:true});return {fact_id:id,cost:facts.get(id).cost,decisive_pairs:changes,completion_pairs:pairs,worst_case_remaining_cost:facts.get(id).cost+Math.max(a.cost,b.cost)};
  }).sort((a,b)=>a.worst_case_remaining_cost-b.worst_case_remaining_cost||b.decisive_pairs-a.decisive_pairs||a.fact_id.localeCompare(b.fact_id));
  let certificate=null;
  if(solution.outcome!==null){const observed=ids.filter(id=>known[id]!==undefined);for(let mask=0;mask<2**observed.length;mask++){const subset=observed.filter((_,i)=>mask&(1<<i)),cost=subset.reduce((s,id)=>s+facts.get(id).cost,0);if(certificate&&cost>=certificate.cost)continue;const v=Object.fromEntries(subset.map(id=>[id,known[id]]));if(outcomes(v).every(r=>r.outcome===solution.outcome))certificate={fact_ids:subset,cost};}}
  return {contract_version:VERSION,model_sha256:modelHash,checked_at:now,status:solution.outcome===null?'review_required':'stable_within_declared_model',model_outcome:solution.outcome,next_review:solution.next,minimum_worst_case_review_cost:solution.cost,worst_case_review_count:solution.count,enumerated_completions:rows.length,ranking:ranked,ranking_is_probability:false,stale_observations:stale,minimum_observation_certificate:certificate,irrelevant_within_current_model:model.facts.filter(f=>!ids.includes(f.id)||ranked.some(r=>r.fact_id===f.id&&r.decisive_pairs===0)).map(f=>f.id),stop_reviewing_within_model:solution.outcome!==null,unknown_omitted_risks_remain:true,human_time_savings_measured:false,...boundary};
}
