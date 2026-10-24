import {VERSION,boundary,need,text,instant,seal,verify,keys} from './core.mjs';

// A local append-only declaration ledger, not signed institutional authority.
export function appendHoldEvent(journal,event) {
  need(Array.isArray(journal)&&journal.length<1000,'JOURNAL_LIMIT');
  const next=[...journal,seal('hold-event',{sequence:journal.length+1,previous_sha256:journal.at(-1)?.sha256||null,event})];
  summarizeHolds(next,{now:event.at});return next;
}
export function summarizeHolds(journal,{now=new Date().toISOString(),expected_head}={}) {
  need(Array.isArray(journal)&&journal.length<=1000,'JOURNAL_LIMIT');const time=instant(now),states=new Map();let previous=null,last=-Infinity,closures=0,reopens=0;
  if(expected_head!==undefined)need(expected_head===(journal.at(-1)?.sha256||null),'JOURNAL_HEAD_MISMATCH');
  for(const [i,record] of journal.entries()) {
    const p=verify(record,'hold-event');keys(p,['sequence','previous_sha256','event']);need(p.sequence===i+1&&p.previous_sha256===previous,'JOURNAL_CHAIN_INVALID');previous=record.sha256;
    const e=p.event;keys(e,['id','type','at','actor_ref','blocker','closure_artifact','owner_ref','deadline','deadline_commitment_ref','evidence_ref','reason']);
    need(text(e.id,100)&&text(e.actor_ref,200),'EVENT_IDENTITY_REQUIRED');const at=instant(e.at);need(at>=last&&at<=time,'EVENT_TIME_INVALID');last=at;
    const s=states.get(e.id);
    if(e.type==='opened') {
      need(!s&&text(e.blocker,1000)&&text(e.closure_artifact,1000),'INVALID_HOLD_OPEN');
      need(e.owner_ref===undefined||text(e.owner_ref,200),'INVALID_OWNER');
      if(e.deadline!==undefined)need(instant(e.deadline)>at&&text(e.owner_ref,200)&&text(e.deadline_commitment_ref),'DEADLINE_REQUIRES_ACCOUNTABLE_COMMITMENT');
      states.set(e.id,{id:e.id,status:'open',opened_at:e.at,episode_started_at:e.at,blocker:e.blocker,minimum_closure_artifact:e.closure_artifact,owner_ref:e.owner_ref||null,deadline:e.deadline||null,deadline_commitment_ref:e.deadline_commitment_ref||null,total_hold_ms:0,closure_refs:[]});
    } else {
      need(s,'HOLD_NOT_FOUND');
      if(e.type==='assigned') {
        need(s.status==='open'&&text(e.owner_ref,200),'INVALID_ASSIGNMENT');
        if(e.deadline!==undefined)need(instant(e.deadline)>at&&text(e.deadline_commitment_ref),'DEADLINE_REQUIRES_ACCOUNTABLE_COMMITMENT');
        s.owner_ref=e.owner_ref;s.deadline=e.deadline||null;s.deadline_commitment_ref=e.deadline_commitment_ref||null;
      } else if(e.type==='closed'||e.type==='abandoned') {
        need(s.status==='open'&&text(e.reason,1000),'INVALID_HOLD_TRANSITION');
        if(e.type==='closed'){need(text(e.evidence_ref,1000),'CLOSURE_EVIDENCE_REFERENCE_REQUIRED');s.closure_refs.push({evidence_ref:e.evidence_ref,resolver_ref:e.actor_ref,at:e.at});closures++;}
        s.total_hold_ms+=at-instant(s.episode_started_at);s.status=e.type;s.ended_at=e.at;s.reason=e.reason;
      } else if(e.type==='reopened') {
        need(s.status==='closed'&&text(e.reason,1000),'INVALID_REOPEN');s.status='open';s.episode_started_at=e.at;s.deadline=null;s.deadline_commitment_ref=null;delete s.ended_at;s.reason=e.reason;reopens++;
      } else throw Error('UNKNOWN_HOLD_EVENT');
    }
  }
  const holds=[...states.values()].map(s=>({...s,current_hold_age_ms:s.status==='open'?time-instant(s.episode_started_at):0,total_hold_ms:s.total_hold_ms+(s.status==='open'?time-instant(s.episode_started_at):0),overdue:s.status==='open'&&s.deadline!==null&&time>instant(s.deadline),closure_is_declared_not_verified:true,narrowest_available_work:{action:'prepare_local_closure_checklist',effect:'local_draft_only',external_action_authorized:false}}));
  return {contract_version:VERSION,checked_at:now,journal_head:previous,expected_head_checked:expected_head!==undefined,holds,metrics:{total:holds.length,open:holds.filter(x=>x.status==='open').length,closed:holds.filter(x=>x.status==='closed').length,abandoned:holds.filter(x=>x.status==='abandoned').length,closure_events:closures,reopen_events:reopens,current_closure_fraction:holds.length?holds.filter(x=>x.status==='closed').length/holds.length:null,unassigned:holds.filter(x=>x.status==='open'&&!x.owner_ref).length,overdue:holds.filter(x=>x.status==='open'&&x.overdue).length},opportunity_cost:{status:'unestimated',amount:null},integrity_is_not_authentication:true,...boundary};
}
