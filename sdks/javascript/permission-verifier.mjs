// Verifies an AMOS permission statement (mvr.permission-statement/1) for one exact effect, offline, before a
// customer system acts. A statement says what AMOS checked at issued_at; it is never authority and never consumable.
// Pass requireCommit with the effect_commit receipt to also require the single-use commit made just before acting.
import {canonicalJson,verifyAuthorityReceipt} from './authority-receipts.mjs';

export const PERMISSION_VERIFIER_VERSION='amos.permission-verifier/1';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sha256=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');

// The same machine-checkable conditions the AMOS decision state attaches to a qualified claim.
export function unmetStatementConditions(conditions,effect,{now=Date.now(),country=null}={}){
  const out=[],resource=object(effect?.resource)?effect.resource:{};
  for(const c of Array.isArray(conditions)?conditions:[]){
    const ok=c?.type==='amount_at_most'?effect.currency===c.currency&&Number.isSafeInteger(effect.amount_minor)&&effect.amount_minor>=0&&effect.amount_minor<=c.amount_minor
      :c?.type==='within_time_window'?Date.parse(c.not_before)<=now&&now<Date.parse(c.not_after)
      :c?.type==='geography_in'?Array.isArray(c.countries)&&c.countries.includes(String(country||'').toUpperCase().slice(0,2))
      :c?.type==='resource_scope'?resource.system===c.system&&resource.resource_type===c.resource_type&&(c.resource_id_prefix===undefined||typeof resource.resource_id==='string'&&resource.resource_id.startsWith(c.resource_id_prefix))
      :c?.type==='no_external_contact'?effect.external_contact!==true:false;
    if(!ok)out.push(c?.type||'unknown_condition');
  }
  return out;
}

export async function verifyPermissionStatement(receipt,{registry,expectedEffect,now=Date.now(),clockSkewMs=1000,allowLabKeys=false,country=null,expectedExecutorPrincipalSha256=null,requireCommit=null,previousHead=null}={}){
  const reasons=[],out={version:PERMISSION_VERIFIER_VERSION,valid:false,reasons,statement_id:null,coverage:null,effect_state:null,commit_checked:false,execution_authorized:false};
  const signed=await verifyAuthorityReceipt(receipt,{registry,allowLabKeys,previousHead});
  if(!signed.valid)reasons.push('RECEIPT_'+String(signed.reason||'invalid').toUpperCase());
  const s=receipt?.statement;
  if(receipt?.kind!=='permission_statement'||!object(s)||s.type!=='mvr.permission-statement/1')reasons.push('NOT_A_PERMISSION_STATEMENT');
  if(!object(s))return out;
  out.statement_id=s.statement_id;out.coverage=s.coverage;out.effect_state=s.effect_state?.state||null;
  if(receipt.statement_id!==s.statement_id||receipt.case_id!==s.case_id||receipt.capability_id!==s.capability_id||receipt.coverage!==s.coverage||receipt.valid_until!==s.valid_until)reasons.push('RECEIPT_STATEMENT_FIELDS_MISMATCH');
  if(s.coverage!=='covered')reasons.push('NOT_COVERED'+(Array.isArray(s.deny_reasons)&&s.deny_reasons.length?':'+s.deny_reasons.slice(0,5).join(','):''));
  // Exact effect: the effect the receiver is about to perform, byte for byte in canonical JSON.
  if(!object(expectedEffect))reasons.push('EXPECTED_EFFECT_REQUIRED');
  else{
    if(canonicalJson(s.requested_effect)!==canonicalJson(expectedEffect))reasons.push('EFFECT_MISMATCH');
    if(await sha256(canonicalJson(expectedEffect))!==s.requested_effect_sha256)reasons.push('EFFECT_HASH_MISMATCH');
  }
  // Time.
  const issued=Date.parse(s.issued_at),until=Date.parse(s.valid_until);
  if(!Number.isFinite(issued)||issued>now+clockSkewMs)reasons.push('STATEMENT_NOT_YET_ISSUED');
  if(!Number.isFinite(until)||until<=now)reasons.push('STATEMENT_EXPIRED');
  // Scope: executor and review conditions.
  if(expectedExecutorPrincipalSha256&&s.executor_principal_sha256!==expectedExecutorPrincipalSha256)reasons.push('EXECUTOR_MISMATCH');
  if(s.effect_state){
    if(!['positive','conditional'].includes(s.effect_state.state))reasons.push('EFFECT_STATE_'+String(s.effect_state.state).toUpperCase());
    if(object(expectedEffect))for(const c of unmetStatementConditions(s.effect_state.conditions,expectedEffect,{now,country}))reasons.push('CONDITION_UNMET:'+c);
    if(s.effect_state.valid_until&&Date.parse(s.effect_state.valid_until)<=now)reasons.push('EFFECT_STATE_EXPIRED');
  }
  // Dependencies: every dependency the statement names must still have been current at its own end time.
  if(!Array.isArray(s.dependencies)||!s.dependencies.some(d=>d?.kind==='capability'))reasons.push('DEPENDENCIES_MISSING');
  else for(const d of s.dependencies)if(d?.valid_until&&Date.parse(d.valid_until)<=now)reasons.push('DEPENDENCY_EXPIRED:'+d.kind+':'+d.id);
  if(s.execution_authorized!==false||s.amos_issued_authority!==false)reasons.push('BOUNDARY_FIELDS_INVALID');
  // Revocation: a statement reflects revocations up to issued_at only. A commit made after it re-reads every dependency.
  if(requireCommit){
    out.commit_checked=true;
    const commit=await verifyAuthorityReceipt(requireCommit,{registry,allowLabKeys});
    if(!commit.valid)reasons.push('COMMIT_RECEIPT_'+String(commit.reason||'invalid').toUpperCase());
    if(requireCommit.kind!=='effect_commit'||requireCommit.decision!=='commit')reasons.push('COMMIT_NOT_COMMITTED');
    if(requireCommit.capability_id!==s.capability_id||requireCommit.requested_effect_sha256!==s.requested_effect_sha256)reasons.push('COMMIT_DOES_NOT_MATCH_STATEMENT');
    if(!requireCommit.commit_valid_until||Date.parse(requireCommit.commit_valid_until)<=now)reasons.push('COMMIT_EXPIRED');
    if(Date.parse(requireCommit.recorded_at)<issued)reasons.push('COMMIT_BEFORE_STATEMENT');
  }
  out.valid=reasons.length===0;
  out.boundary='Checks signature, exact effect, time, executor, review conditions and declared dependencies. A statement reflects revocation only up to issued_at; require the commit receipt for the commit-time re-read. Not authority.';
  return out;
}
