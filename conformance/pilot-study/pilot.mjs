// Three-arm operator pilot (PROTOCOL.md). Node.js 24+, no dependencies.
//   node pilot.mjs schedule --decisions 30 --method randomized_block --seed <hex> > schedule.json
//   node pilot.mjs freeze <pilot.json> <out-dir>           (pilot.json: workflow, revision, weights, schedule, end_date)
//   node pilot.mjs score <out-dir> <decisions.csv> <adjudications.csv> [commercial.json]
//   node pilot.mjs power --sd <minor> --difference <minor>
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const PILOT_FORMAT='amos.three-arm-pilot/1';
export const ARMS=['P','C','A'];
const here=path.dirname(fileURLToPath(import.meta.url));
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const canonicalJson=v=>JSON.stringify(v,(_,x)=>object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export const sha256=t=>createHash('sha256').update(t).digest('hex');
const fail=m=>{throw Object.assign(new Error(m),{code:'PILOT_REFUSED'});};
const protocolSha=(file=path.join(here,'PROTOCOL.md'))=>sha256(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'));
const instant=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
export const WEIGHT_KEYS=['currency','false_permit_minor','false_hold_minor','reviewer_cost_per_hour_minor','integration_cost_per_hour_minor','latency_cost_per_hour_minor','scope_error_minor','missed_contradiction_minor','missed_stale_or_geography_minor','bypass_attempt_minor','accountability_incident_minor','reopen_minor'];
// Small deterministic PRNG (mulberry32) seeded from a hex string.
function rng(seedHex){let a=parseInt(sha256(seedHex).slice(0,8),16)>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export function createSchedule({decisions,method='randomized_block',seed}){
  if(!Number.isInteger(decisions)||decisions<3||decisions>5000)fail('decisions must be an integer from 3 to 5000');
  if(!['randomized_block','alternation'].includes(method))fail('method must be randomized_block or alternation');
  if(method==='randomized_block'&&!/^[a-f0-9]{16,128}$/.test(seed||''))fail('randomized_block needs a hex seed of 16 to 128 characters');
  const next=method==='randomized_block'?rng(seed):null,slots=[];
  while(slots.length<decisions){const block=[...ARMS];if(next)for(let i=block.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[block[i],block[j]]=[block[j],block[i]];}slots.push(...block);}
  const schedule=slots.slice(0,decisions).map((arm,i)=>({decision_ref:'D'+String(i+1).padStart(4,'0'),arm}));
  return {method,seed:method==='randomized_block'?seed:null,decisions,schedule,schedule_sha256:sha256(canonicalJson(schedule)),causal_reading_supported:method==='randomized_block'};
}
export function validateWeights(w){
  if(!object(w)||Object.keys(w).sort().join()!==[...WEIGHT_KEYS].sort().join())fail('weights must have exactly: '+WEIGHT_KEYS.join(', '));
  if(!/^[A-Z]{3}$/.test(w.currency))fail('weights.currency must be an ISO 4217 code');
  for(const k of WEIGHT_KEYS.slice(1))if(!Number.isSafeInteger(w[k])||w[k]<0)fail('weights.'+k+' must be a non-negative integer in minor units');
  return w;
}
export function freezePilot(pilot,{frozenAt=new Date().toISOString(),protocolFile}={}){
  if(!object(pilot)||typeof pilot.workflow!=='string'||!pilot.workflow.trim()||pilot.workflow.length>300)fail('pilot.workflow names the one recurring workflow');
  if(typeof pilot.revision!=='string'||!/^\d{4}-\d{2}-\d{2}\.[a-z0-9-]+\.\d{1,6}$/.test(pilot.revision))fail('pilot.revision is the AMOS deployment revision for arm A');
  validateWeights(pilot.weights);
  const s=pilot.schedule;if(!object(s)||!Array.isArray(s.schedule)||sha256(canonicalJson(s.schedule))!==s.schedule_sha256)fail('pilot.schedule must be an unmodified createSchedule result');
  if(s.decisions<30&&pilot.powered_minimum!==true)fail('fewer than 30 decisions needs powered_minimum: true and a power calculation');
  if(!instant(pilot.end_date))fail('pilot.end_date is the frozen end of the interval');
  const manifest={format:PILOT_FORMAT,frozen_at:frozenAt,workflow:pilot.workflow,revision:pilot.revision,end_date:pilot.end_date,weights:pilot.weights,weights_sha256:sha256(canonicalJson(pilot.weights)),
    assignment:{method:s.method,seed:s.seed,decisions:s.decisions,schedule_sha256:s.schedule_sha256,causal_reading_supported:s.causal_reading_supported},schedule:s.schedule,protocol_sha256:protocolSha(protocolFile)};
  manifest.manifest_sha256=sha256(canonicalJson(manifest));
  return manifest;
}
function verifyManifest(m,{protocolFile}={}){
  if(m?.format!==PILOT_FORMAT)fail('not a pilot manifest');
  const {manifest_sha256,...rest}=m;if(sha256(canonicalJson(rest))!==manifest_sha256)fail('the frozen manifest was edited');
  if(m.protocol_sha256!==protocolSha(protocolFile))fail('PROTOCOL.md changed after freezing');
  if(sha256(canonicalJson(m.schedule))!==m.assignment.schedule_sha256)fail('the assignment schedule changed after freezing');
  if(sha256(canonicalJson(m.weights))!==m.weights_sha256)fail('the loss weights changed after freezing');
}
export function parseCsv(text,columns){
  const lines=text.replace(/\r\n/g,'\n').split('\n').filter(l=>l.trim()&&!l.startsWith('#'));
  if(lines[0]!==columns.join(','))fail('CSV header must be exactly: '+columns.join(','));
  return lines.slice(1).map((line,i)=>{if(line.includes('"'))fail('row '+(i+2)+': quotes are not supported');const c=line.split(',');if(c.length!==columns.length)fail('row '+(i+2)+': expected '+columns.length+' values');return Object.fromEntries(columns.map((k,j)=>[k,c[j].trim()]));});
}
export const DECISION_COLUMNS=['decision_ref','arm','decision','decided_at','decider_ref','reviewer_minutes','integration_minutes','elapsed_closure_minutes','reopened','bypass_attempts','accountability_incidents'];
export const ADJUDICATION_COLUMNS=['decision_ref','correct_decision','adjudicated_at','adjudicator_ref','blinded','scope_error','missed_contradiction','missed_stale_or_geography','downstream_incident_cost_minor','opportunity_lost_minor','basis'];
const bool=v=>v==='true'?true:v==='false'?false:fail('booleans are true or false: '+v);
const count=v=>{const n=Number(v);if(!Number.isInteger(n)||n<0)fail('counts are non-negative integers: '+v);return n;};
const minutes=v=>{const n=Number(v);if(!Number.isFinite(n)||n<0)fail('minutes are non-negative numbers: '+v);return n;};
export function decisionLoss(d,a,w){
  const permitted=d.decision==='permit',falsePermit=permitted&&a.correct_decision==='hold',falseHold=!permitted&&a.correct_decision==='permit';
  const parts={false_permit:falsePermit?w.false_permit_minor+a.downstream_incident_cost_minor:0,
    false_hold:falseHold?w.false_hold_minor+a.opportunity_lost_minor:0,
    review_labour:Math.round(d.reviewer_minutes*w.reviewer_cost_per_hour_minor/60),
    integration_latency:Math.round(d.integration_minutes*w.integration_cost_per_hour_minor/60+d.elapsed_closure_minutes*w.latency_cost_per_hour_minor/60),
    accountability_incident:(a.scope_error?w.scope_error_minor:0)+(a.missed_contradiction?w.missed_contradiction_minor:0)+(a.missed_stale_or_geography?w.missed_stale_or_geography_minor:0)+d.bypass_attempts*w.bypass_attempt_minor+d.accountability_incidents*w.accountability_incident_minor+(d.reopened?w.reopen_minor:0)};
  return {...parts,total:Object.values(parts).reduce((s,x)=>s+x,0),is_false_permit:falsePermit,is_false_hold:falseHold};
}
function bootstrapDifference(a,b,seedHex,resamples=10000){
  const next=rng(seedHex),mean=x=>x.reduce((s,v)=>s+v,0)/x.length,diffs=[];
  for(let r=0;r<resamples;r++){let sa=0,sb=0;for(let i=0;i<a.length;i++)sa+=a[Math.floor(next()*a.length)];for(let i=0;i<b.length;i++)sb+=b[Math.floor(next()*b.length)];diffs.push(sa/a.length-sb/b.length);}
  diffs.sort((x,y)=>x-y);
  return {difference:mean(a)-mean(b),ci95:[diffs[Math.floor(0.025*resamples)],diffs[Math.ceil(0.975*resamples)-1]],resamples};
}
export function scorePilot(manifest,decisionRows,adjudicationRows,{commercial=null,protocolFile,resamples=10000}={}){
  verifyManifest(manifest,{protocolFile});
  const assigned=new Map(manifest.schedule.map(s=>[s.decision_ref,s.arm])),frozen=Date.parse(manifest.frozen_at),w=manifest.weights;
  const decisions=new Map(),adjudications=new Map();
  for(const r of decisionRows){
    if(!assigned.has(r.decision_ref))fail('decision outside the schedule: '+r.decision_ref);
    if(decisions.has(r.decision_ref))fail('two decisions for '+r.decision_ref);
    if(r.arm!==assigned.get(r.decision_ref))fail(r.decision_ref+': decided under arm '+r.arm+' but assigned '+assigned.get(r.decision_ref));
    if(!['permit','hold','reject'].includes(r.decision)||!instant(r.decided_at)||!r.decider_ref)fail(r.decision_ref+': invalid decision row');
    if(Date.parse(r.decided_at)<frozen)fail(r.decision_ref+': decided before the pilot was frozen');
    if(Date.parse(r.decided_at)>Date.parse(manifest.end_date))fail(r.decision_ref+': decided after the frozen end date');
    decisions.set(r.decision_ref,{...r,decision:r.decision==='reject'?'hold':r.decision,reviewer_minutes:minutes(r.reviewer_minutes),integration_minutes:minutes(r.integration_minutes),elapsed_closure_minutes:minutes(r.elapsed_closure_minutes),reopened:bool(r.reopened),bypass_attempts:count(r.bypass_attempts),accountability_incidents:count(r.accountability_incidents)});
  }
  for(const r of adjudicationRows){
    const d=decisions.get(r.decision_ref);if(!d)fail('adjudication without a decision: '+r.decision_ref);
    if(adjudications.has(r.decision_ref))fail('two adjudications for '+r.decision_ref);
    if(!['permit','hold'].includes(r.correct_decision)||!instant(r.adjudicated_at)||!r.adjudicator_ref||!r.basis)fail(r.decision_ref+': invalid adjudication row');
    if(r.blinded!=='true')fail(r.decision_ref+': adjudication must be blinded to arm and decision');
    if(r.adjudicator_ref===d.decider_ref)fail(r.decision_ref+': the decider cannot adjudicate their own decision');
    if(Date.parse(r.adjudicated_at)<=Date.parse(d.decided_at))fail(r.decision_ref+': adjudicated before the decision');
    adjudications.set(r.decision_ref,{...r,scope_error:bool(r.scope_error),missed_contradiction:bool(r.missed_contradiction),missed_stale_or_geography:bool(r.missed_stale_or_geography),downstream_incident_cost_minor:count(r.downstream_incident_cost_minor),opportunity_lost_minor:count(r.opportunity_lost_minor)});
  }
  const complete=[...assigned.keys()].every(ref=>decisions.has(ref)&&adjudications.has(ref));
  const perArm=Object.fromEntries(ARMS.map(a=>[a,[]]));
  for(const [ref,arm] of assigned)if(decisions.has(ref)&&adjudications.has(ref))perArm[arm].push({ref,...decisionLoss(decisions.get(ref),adjudications.get(ref),w)});
  const summary=arm=>{const rows=perArm[arm],sum=k=>rows.reduce((s,r)=>s+(typeof r[k]==='boolean'?Number(r[k]):r[k]),0);return {decisions:rows.length,total_loss_minor:sum('total'),mean_loss_minor:rows.length?sum('total')/rows.length:null,false_permits:sum('is_false_permit'),false_holds:sum('is_false_hold'),
    components_minor:Object.fromEntries(['false_permit','false_hold','review_labour','integration_latency','accountability_incident'].map(k=>[k,rows.reduce((s,r)=>s+(typeof r[k]==='number'?r[k]:0),0)]))};};
  const arms=Object.fromEntries(ARMS.map(a=>[a,summary(a)]));
  const adjudicated=adjudications.size,seed=manifest.assignment.seed||manifest.manifest_sha256;
  const compare=control=>perArm.A.length&&perArm[control].length?bootstrapDifference(perArm.A.map(r=>r.total),perArm[control].map(r=>r.total),seed+':'+control,resamples):null;
  const vsP=compare('P'),vsC=compare('C');
  const lower=c=>!!c&&c.difference<0&&c.ci95[1]<0;
  const lossVerdict=adjudicated<30?'insufficient_decisions':!complete?'interval_incomplete':lower(vsP)&&lower(vsC)?'amos_lower_total_loss':'no_demonstrated_advantage';
  const paid=commercial?.paid===true||commercial?.renewed===true;
  return {format:PILOT_FORMAT,workflow:manifest.workflow,revision:manifest.revision,currency:w.currency,scheduled:assigned.size,decided:decisions.size,adjudicated,interval_complete:complete,arms,
    amos_minus_policy_only:vsP,amos_minus_conventional:vsC,loss_verdict:lossVerdict,
    commercial:commercial?{fee_minor:commercial.fee_minor??null,paid:commercial.paid===true,renewed:commercial.renewed??null,procurement_decision:commercial.procurement_decision??null}:null,
    commercial_superiority:lossVerdict==='amos_lower_total_loss'&&paid,
    reading:manifest.assignment.causal_reading_supported?'causal (randomized_block assignment frozen before the first decision)':'associational only; not causal',
    boundary:'One workflow, one buyer, one reviewer team. Adjudication is external to AMOS. Declared minutes and costs are the operator’s.'};
}
// Decisions per arm for a two-sided comparison of mean loss (normal approximation, alpha 0.05, power 0.8).
export function decisionsPerArm({sd,difference}){if(!(sd>0)||!(difference>0))fail('sd and difference must be positive');return Math.ceil(2*Math.pow((1.959964+0.841621)*sd/difference,2));}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const args=process.argv.slice(2),opt=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:undefined;},read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
  try{
    if(args[0]==='schedule')console.log(JSON.stringify(createSchedule({decisions:Number(opt('--decisions')),method:opt('--method')||'randomized_block',seed:opt('--seed')}),null,1));
    else if(args[0]==='freeze'){const m=freezePilot(read(args[1]));fs.mkdirSync(args[2],{recursive:true});fs.writeFileSync(path.join(args[2],'pilot-manifest.json'),JSON.stringify(m,null,1)+'\n',{flag:'wx'});console.log(JSON.stringify({frozen:true,decisions:m.assignment.decisions,manifest_sha256:m.manifest_sha256}));}
    else if(args[0]==='score'){const m=read(path.join(args[1],'pilot-manifest.json'));console.log(JSON.stringify(scorePilot(m,parseCsv(fs.readFileSync(args[2],'utf8'),DECISION_COLUMNS),parseCsv(fs.readFileSync(args[3],'utf8'),ADJUDICATION_COLUMNS),{commercial:args[4]?read(args[4]):null}),null,1));}
    else if(args[0]==='power')console.log(JSON.stringify({decisions_per_arm:decisionsPerArm({sd:Number(opt('--sd')),difference:Number(opt('--difference'))}),total:3*decisionsPerArm({sd:Number(opt('--sd')),difference:Number(opt('--difference'))})}));
    else{console.error('Usage: schedule | freeze <pilot.json> <out-dir> | score <out-dir> <decisions.csv> <adjudications.csv> [commercial.json] | power --sd S --difference D');process.exitCode=2;}
  }catch(e){console.error(JSON.stringify({refused:true,reason:e.message}));process.exitCode=1;}
}
