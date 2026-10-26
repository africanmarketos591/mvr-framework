// Real AMOS commits for receiver testing: an isolated authority-conformance lab session with lab keys, one harmless
// create_draft_record capability, and helpers that verify and commit fresh effects. Proprietary lab fixtures only.
import assert from 'node:assert/strict';
import {webcrypto,createHash,randomBytes} from 'node:crypto';
import {canonicalJson} from '../../sdks/javascript/authority-receipts.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const signBytes=(type,doc)=>new TextEncoder().encode(`MVR-AUTHORITY-V1\n${type}\n${canonicalJson(doc)}`);

export async function createLabCommitSource(transport,{now=()=>Date.now()}={}){
  let n=0;const op=l=>l+'-'+(++n)+'-'+randomBytes(3).toString('hex');
  const ok=(r,label)=>{assert((r.http_status||200)<400,label+': '+(r.code||r.status));return r;};
  const keys={};for(const role of ['institution','standing','source']){const pair=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);keys[role]={spki:Buffer.from(await webcrypto.subtle.exportKey('spki',pair.publicKey)).toString('base64'),sign:async(type,doc)=>Buffer.from(await webcrypto.subtle.sign('Ed25519',pair.privateKey,signBytes(type,doc))).toString('base64')};}
  const session=ok(await transport({action:'issue',synthetic_only:true,acknowledge_no_identity_verification:true}),'issue lab session');
  const call=(role,target,request)=>transport({action:'call',session_id:session.session_id,session_token:session.credentials[role].session_token,target,request});
  const chain=(role,request)=>call(role,'authority',{...request,operation_id:op(request.action)});
  const from=new Date(now()-1000).toISOString(),until=new Date(Date.parse(session.expires_at)-10000).toISOString(),scope={tenant_id:session.tenant_id,workspace_id:session.workspace_id};
  const context={subject:{entity_name:'AMOS Lab Receiver Venture'},market_scope:{country:'UG'},decision_question:'Create one harmless lab draft per committed effect.',evidence_pack:[{id:'LAB-E1',source_doc_id:'LAB-DOC-1',source_hash:sha('proprietary lab record'),claim:'Proprietary lab fixture only',evidence_type:'public_filing',source_class:'regulator_published',stakeholder_class:'guardian',verification_status:'unverified'}]};
  const caseId=ok(await call('institution','case',{action:'create',operation_id:op('case'),preflight_context:context,reference_secret:randomBytes(32).toString('hex'),share_redacted_with_reference_holders:true,redacted_no_personal_data:true}),'create case').case_id;
  for(const [id,role,org,key,principal] of [['lab-institution','institution_authority','lab-institution',keys.institution,'institution'],['lab-standing','standing_issuer','lab-professional-body',keys.standing,'institution'],['lab-source','source_issuer','lab-source-custodian',keys.source,'source_issuer']]){
    const operation_id=op('anchor'),anchor={type:'mvr.authority-anchor/1',anchor_id:id,anchor_role:role,organization_ref:org,organization_name_declared:'AMOS Lab '+org,public_key_spki_b64:key.spki,jurisdictions:['UG'],provenance:'lab_fixture',not_before:from,not_after:until};
    ok(await call(principal,'authority',{action:'register_anchor',operation_id,anchor,possession_signature_b64:await key.sign('mvr.anchor-possession/1',{type:'mvr.anchor-possession/1',anchor_id:id,...scope,public_key_spki_b64:key.spki,operation_id})}),'register '+role);
  }
  const cred={type:'mvr.reviewer-standing/1',credential_id:'lab-receiver-credential',issuer_anchor_id:'lab-standing',subject_principal_sha256:session.credentials.reviewer.principal_sha256,reviewer_display_name:'AMOS Lab reviewer',organization_ref:'lab-independent-reviewer',role_title:'Lab reviewer',competence:{residual_codes:['SOURCE_AUTHENTICITY_UNVERIFIED'],jurisdictions:['UG']},independence:{relationship_to_subject:'none',conflicts_declared:[],declared_at:from},delegation:{mode:'issuer_direct',max_further_delegation:0},not_before:from,not_after:until};
  ok(await chain('institution',{action:'register_credential',document:cred,signature_b64:await keys.standing.sign(cred.type,cred)}),'credential');
  const src={type:'mvr.source-authentication/1',record_id:'lab-receiver-record',issuer_anchor_id:'lab-source',record_kind:'source_authenticity',source_doc_id:'LAB-DOC-1',source_sha256:sha('proprietary lab record'),jurisdiction:'UG',statement:'Proprietary lab source hash only',valid_from:from,valid_until:until};
  ok(await chain('source_issuer',{action:'register_source_record',document:src,signature_b64:await keys.source.sign(src.type,src)}),'source');
  const closureId=ok(await chain('reviewer',{action:'close_residual',case_id:caseId,residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED',scope_ref:'source:LAB-DOC-1',credential_id:cred.credential_id,source_record_ids:[src.record_id],statement:'Lab hash match only',expires_at:until}),'close').closure.closure_id;
  const effect={effect_id:'lab-receiver',effect_type:'create_draft_record',resource:{system:'amos-lab',resource_type:'draft',resource_id:'LAB-RECEIVER'},amount_minor:0,currency:'UGX',external_contact:false,counterparty_ref:'lab-only'};
  let capabilityId,capN=0;
  const register=async()=>{capabilityId='lab-receiver-capability-'+(++capN);const current=ok(await call('institution','case',{action:'get',case_id:caseId}),'residuals');
    const residuals=[...new Set([...current.review_progress.residual_risks.map(r=>r.code).filter(c=>c!=='SOURCE_AUTHENTICITY_UNVERIFIED'),'PERMISSION_STATUS_UNASSESSED'])];
    const doc={type:'mvr.action-capability/1',capability_id:capabilityId,issuer_anchor_id:'lab-institution',...scope,case_id:caseId,basis:{required_closures:[{residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED',closure_id:closureId}],accepted_open_residuals:residuals,minimum_closure_assurance:'lab_fixture'},actor:{executor_principal_sha256:session.credentials.executor.principal_sha256},action:{effect_type:effect.effect_type,resource_scope:effect.resource,amount_minor:0,max_amount_minor:0,currency:'UGX',max_uses:40,external_contact_allowed:false,counterparty_ref:'lab-only'},human_authorization:{approver_ref_sha256:session.credentials.institution.principal_sha256,approved_at:from,method:'institution_signature'},not_before:from,not_after:until};
    ok(await chain('institution',{action:'register_capability',document:doc,signature_b64:await keys.institution.sign(doc.type,doc)}),'capability');};
  await register();
  const commitFresh=async()=>{const requested_effect={...effect,effect_id:op('receiver')};const v=ok(await chain('executor',{action:'verify_capability',capability_id:capabilityId,requested_effect}),'verify');assert.equal(v.decision,'allow',JSON.stringify(v.deny_reasons));const c=ok(await chain('executor',{action:'commit_effect',verification_id:v.verification_id,effect_id:requested_effect.effect_id,requested_effect}),'commit');assert.equal(c.decision,'commit');return {receipt:c.receipt,requested_effect};};
  // Revokes the current capability between verification and commit, then registers a fresh one for later commits.
  const commitAfterRevocation=async()=>{const requested_effect={...effect,effect_id:op('receiver-revoked')};const v=ok(await chain('executor',{action:'verify_capability',capability_id:capabilityId,requested_effect}),'verify before revocation');ok(await chain('institution',{action:'revoke_capability',capability_id:capabilityId,reason:'Lab: revoke between verification and commit'}),'revoke');const c=ok(await chain('executor',{action:'commit_effect',verification_id:v.verification_id,effect_id:requested_effect.effect_id,requested_effect}),'commit after revocation');await register();return {receipt:c.receipt,requested_effect};};
  const acknowledge=async({verification_id,effect_id,outcome})=>{const r=await chain('executor',{action:'record_effect',verification_id,effect_id,outcome});if((r.http_status||200)>=400&&r.code!=='AUTHORITY_EFFECT_ALREADY_RECORDED')throw new Error(r.code||'acknowledgement_failed');return r;};
  const close=()=>transport({action:'close',session_id:session.session_id,session_token:session.credentials.institution.session_token});
  return {registry:session.receipt_registry,commitFresh,commitAfterRevocation,acknowledge,close,session_id:session.session_id};
}
