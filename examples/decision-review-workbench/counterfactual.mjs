import {VERSION,boundary,need,text,instant,digest,seal,verify,keys} from './core.mjs';

export function captureProposal(input) {
  keys(input,['request_id','scope','action','model_ref','proposal','captured_at']);
  need(['request_id','scope','action','model_ref','proposal'].every(k=>text(input[k],k==='proposal'?8000:1000)),'PROPOSAL_FIELDS_REQUIRED');instant(input.captured_at);
  return seal('pre-amos-proposal',structuredClone(input));
}
export function compareDecision(proposalRecord,decision,{now=new Date().toISOString()}={}) {
  const before=verify(proposalRecord,'pre-amos-proposal');captureProposal(before);
  keys(decision,['request_id','scope','action','decided_at','disposition','final_proposal','receipt_ref','causes']);
  need(['request_id','scope','action'].every(k=>decision[k]===before[k]),'DECISION_SCOPE_MISMATCH');
  need(instant(before.captured_at)<=instant(decision.decided_at)&&instant(decision.decided_at)<=instant(now),'DECISION_CHRONOLOGY_INVALID');
  need(['allow','hold','deny','abstain'].includes(decision.disposition)&&text(decision.final_proposal,8000)&&text(decision.receipt_ref,1000),'DECISION_FIELDS_REQUIRED');
  need(Array.isArray(decision.causes)&&decision.causes.length>0&&decision.causes.length<=40,'EXPLICIT_CAUSES_REQUIRED');
  for(const cause of decision.causes){keys(cause,['rule_id','state_ref','explanation']);need(text(cause.rule_id,200)&&text(cause.state_ref,1000)&&text(cause.explanation,2000),'CAUSE_REFERENCE_REQUIRED');}
  return seal('decision-comparison',{contract_version:VERSION,request_id:before.request_id,scope:before.scope,action:before.action,proposal_sha256:proposalRecord.sha256,decision_sha256:digest(decision),before:structuredClone(before),after:structuredClone(decision),proposal_changed:before.proposal!==decision.final_proposal,external_effect_gated:['hold','deny','abstain'].includes(decision.disposition),exposure_moved:{status:'unestimated',amount:null},opportunity_cost:{status:'unestimated',amount:null},capture_chronology:'caller_declared; hash cannot prove capture occurred before the decision',causes:'supplied decision references; not independently verified by this tool',integrity_is_not_authentication:true,...boundary});
}
