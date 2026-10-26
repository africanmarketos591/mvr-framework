#!/usr/bin/env node
// Live issuer-state/2 conformance in the isolated AMOS lab, using the lab's exact harmless fixture: the case intends
// create_draft_record and the capability names create_draft_record. Every step goes through POST /v1/authority-conformance.
//   node run-live.mjs [--lab https://africanmarketos.com]
// Proprietary lab fixtures; lab keys; no production issuer, institution or authority.
import assert from 'node:assert/strict';
import {webcrypto,createHash,randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {canonicalJson,digest,assertionDigest,conditionDigest,conditionScopeDigest} from './constructors.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const ACTION='create_draft_record',ALIAS='amos.document.draft.create@1',ENGINE='v6.32.0';
export async function runIssuerStateLive(transport,{now=()=>Date.now(),continueOnFailure=false}={}){
  const steps=[],report={classification:'AMOS lab verification; proprietary lab fixtures; lab keys; exact create_draft_record fixture',action:ACTION,steps,requests:0};
  let n=0;const op=l=>l+'-'+(++n)+'-'+randomBytes(3).toString('hex');
  const send=async b=>{report.requests++;return transport(b);};
  const record=(name,expected,observed,ok)=>{steps.push({step:steps.length+1,name,expected,observed,passed:!!ok});if(!continueOnFailure)assert(ok,name+': expected '+JSON.stringify(expected)+' observed '+JSON.stringify(observed));};
  const keys={};for(const role of ['institution','standing','source','reviewer']){const pair=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);keys[role]={spki:Buffer.from(await webcrypto.subtle.exportKey('spki',pair.publicKey)).toString('base64'),sign:async(type,doc)=>Buffer.from(await webcrypto.subtle.sign('Ed25519',pair.privateKey,new TextEncoder().encode(`MVR-AUTHORITY-V1\n${type}\n${canonicalJson(doc)}`))).toString('base64')};}
  const session=await send({action:'issue',synthetic_only:true,acknowledge_no_identity_verification:true});
  assert.ok(session.session_id&&session.credentials,'lab session: '+(session.code||session.status));
  const call=(role,target,request)=>send({action:'call',session_id:session.session_id,session_token:session.credentials[role].session_token,target,request});
  const chain=(role,request)=>call(role,'authority',{...request,operation_id:op(request.action)});
  const good=(r,label)=>{assert((r.http_status||200)<400,label+': '+(r.code||r.status)+' '+JSON.stringify(r.detail||'').slice(0,300));return r;};
  const t0=now(),from=new Date(t0-1000).toISOString(),until=new Date(Date.parse(session.expires_at)-20000).toISOString(),scope={tenant_id:session.tenant_id,workspace_id:session.workspace_id};
  try{
    const subject='AMOS Lab Issuer State Venture',region='Kampala';
    const context={subject:{entity_name:subject},market_scope:{country:'UG',region},intended_action:ACTION,decision_question:'Create one internal lab draft record.',evidence_pack:[{id:'LAB-E1',source_doc_id:'LAB-DOC-1',source_hash:sha('proprietary lab record'),claim:'Proprietary lab fixture only',evidence_type:'public_filing',source_class:'regulator_published',stakeholder_class:'regulator',verification_status:'unverified'}]};
    const caseId=good(await call('institution','case',{action:'create',operation_id:op('case'),preflight_context:context,reference_secret:randomBytes(32).toString('hex'),share_redacted_with_reference_holders:true,redacted_no_personal_data:true}),'case').case_id;
    for(const [id,role,org,key,principal] of [['lab-institution','institution_authority','lab-institution',keys.institution,'institution'],['lab-standing','standing_issuer','lab-professional-body',keys.standing,'institution'],['lab-source','source_issuer','lab-source-custodian',keys.source,'source_issuer']]){
      const operation_id=op('anchor'),anchor={type:'mvr.authority-anchor/1',anchor_id:id,anchor_role:role,organization_ref:org,organization_name_declared:'AMOS Lab '+org,public_key_spki_b64:key.spki,jurisdictions:['UG'],provenance:'lab_fixture',not_before:from,not_after:until};
      good(await call(principal,'authority',{action:'register_anchor',operation_id,anchor,possession_signature_b64:await key.sign('mvr.anchor-possession/1',{type:'mvr.anchor-possession/1',anchor_id:id,...scope,public_key_spki_b64:key.spki,operation_id})}),'anchor '+role);
    }
    const standing={type:'mvr.reviewer-standing/1',credential_id:'lab-review-standing',issuer_anchor_id:'lab-standing',subject_principal_sha256:session.credentials.reviewer.principal_sha256,reviewer_public_key_spki_b64:keys.reviewer.spki,reviewer_display_name:'AMOS Lab reviewer',organization_ref:'lab-independent-reviewer',role_title:'Lab permission reviewer',competence:{residual_codes:['PERMISSION_STATUS_UNASSESSED','SOURCE_AUTHENTICITY_UNVERIFIED'],jurisdictions:['UG']},independence:{relationship_to_subject:'none',conflicts_declared:[],declared_at:from},delegation:{mode:'issuer_direct',max_further_delegation:0},not_before:from,not_after:until};
    good(await chain('institution',{action:'register_credential',document:standing,signature_b64:await keys.standing.sign(standing.type,standing)}),'review standing');
    const src={type:'mvr.source-authentication/1',record_id:'lab-src-1',issuer_anchor_id:'lab-source',record_kind:'source_authenticity',source_doc_id:'LAB-DOC-1',source_sha256:sha('proprietary lab record'),jurisdiction:'UG',statement:'Proprietary lab source hash only',valid_from:from,valid_until:until};
    good(await chain('source_issuer',{action:'register_source_record',document:src,signature_b64:await keys.source.sign(src.type,src)}),'source');
    const closureId=good(await chain('reviewer',{action:'close_residual',case_id:caseId,residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED',scope_ref:'source:LAB-DOC-1',credential_id:'lab-review-standing',source_record_ids:['lab-src-1'],statement:'Lab hash match only',expires_at:until}),'closure').closure.closure_id;
    const progress=good(await call('institution','case',{action:'get',case_id:caseId}),'residuals').review_progress;
    const effect={effect_id:'lab-issuer-effect',effect_type:ACTION,resource:{system:'amos-lab',resource_type:'draft',resource_id:'LAB-ISSUER-1'},amount_minor:0,currency:'UGX',external_contact:false,counterparty_ref:'lab-only'};
    const cap={type:'mvr.action-capability/1',capability_id:'lab-issuer-capability',issuer_anchor_id:'lab-institution',...scope,case_id:caseId,basis:{required_closures:[{residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED',closure_id:closureId}],accepted_open_residuals:[...new Set([...progress.residual_risks.map(r=>r.code).filter(c=>c!=='SOURCE_AUTHENTICITY_UNVERIFIED'),'PERMISSION_STATUS_UNASSESSED'])],minimum_closure_assurance:'lab_fixture'},actor:{executor_principal_sha256:session.credentials.executor.principal_sha256},action:{effect_type:ACTION,resource_scope:effect.resource,amount_minor:0,max_amount_minor:0,currency:'UGX',max_uses:40,external_contact_allowed:false,counterparty_ref:'lab-only'},human_authorization:{approver_ref_sha256:session.credentials.institution.principal_sha256,approved_at:from,method:'institution_signature'},not_before:from,not_after:until};
    good(await chain('institution',{action:'register_capability',document:cap,signature_b64:await keys.institution.sign(cap.type,cap)}),'capability');
    const verify=async(e=effect)=>good(await chain('executor',{action:'verify_capability',capability_id:cap.capability_id,requested_effect:{...e,effect_id:op('e')}}),'verify');
    const position=async(effectType=ACTION)=>good(await call('executor','authority',{action:'check_permission',case_id:caseId,requested_effect:{...effect,effect_type:effectType}}),'position').permission_position;
    record('baseline: the exact fixture verifies before any issuer state',{decision:'allow'},(await verify()).decision,(await verify()).decision==='allow');
    // Build and sign one issuer-state/2 document with its reviewer-signed source review (SPEC section 2 order).
    const ORIGINAL={prohibit:'The lab must not create the draft record.',permit:'The lab may create one internal draft record.'};
    let head=null;
    const build=async(record_id,state,{conditions=[],action=ACTION}={})=>{
      const clause=state==='prohibited'||state==='revoked'?ORIGINAL.prohibit:ORIGINAL.permit;
      const doc={type:'mvr.issuer-state/2',record_id,issuer_anchor_id:'lab-source',case_id:caseId,subject,action,geography:{country:'UG',region},state,valid_from:from,valid_until:until,conditions,supersedes:head,statement:'Proprietary lab issuer state for the live conformance run.',original_document_sha256:sha(clause),ceiling:{amount_minor:0,currency:'UGX'},source_review:null,condition_receipts:[]};
      const review={type:'mvr.issuer-state-review/1',assertion_sha256:await assertionDigest(doc),original_document_sha256:doc.original_document_sha256,clause_text:clause,clause_locator:'clause 1',target_claim:'The lab may create one internal draft record.',relationship:['prohibited','revoked'].includes(state)?'contradicts':'direct_support',reviewer_credential_id:'lab-review-standing',standing_sha256:await digest(standing),reviewed_at:from,valid_until:until,extractor_name:'lab-original-text',extractor_version:'1',model_version:'human-reading/1',runtime_model_version:ENGINE};
      return {...doc,source_review:{document:review,signature_b64:await keys.reviewer.sign(review.type,review)}};
    };
    const registerState=async doc=>{const r=await chain('source_issuer',{action:'register_issuer_state',document:doc,signature_b64:await keys.source.sign(doc.type,doc)});if((r.http_status||200)<400)head=doc.record_id;return r;};
    // 1. Prohibited blocks the exact effect.
    let r=await registerState(await build('lab-state-1-prohibited','prohibited'));
    record('register a signed issuer-state/2 prohibition for create_draft_record',{status:'registered'},r.status,r.status==='registered');
    let p=await position();record('the exact effect is prohibited',{tier:'prohibited'},p.tier,p.tier==='prohibited');
    let v=await verify();record('verification denies the exact effect',{decision:'deny'},{decision:v.decision,deny_reasons:v.deny_reasons},v.decision==='deny');
    // 2. The prohibition also binds the same action under its canonical identifier.
    p=await position(ALIAS);record('the prohibition binds the canonical alias of the same action',{tier:'prohibited'},p.tier,p.tier==='prohibited');
    // 3. A state naming a different identifier than the case intends is refused, with the alias named.
    const aliasDoc=await build('lab-state-alias','prohibited',{action:ALIAS});
    r=await chain('source_issuer',{action:'register_issuer_state',document:aliasDoc,signature_b64:await keys.source.sign(aliasDoc.type,aliasDoc)});
    record('an issuer state naming the alias instead of the intended identifier is refused and says why',{code:'ISSUER_STATE_CASE_ACTION_MISMATCH',same_action_by_alias:true},{code:r.code,detail:r.detail},r.code==='ISSUER_STATE_CASE_ACTION_MISMATCH'&&r.detail?.same_action_by_alias===true);
    // 4. Superseded by a permitted state: the exact effect verifies again.
    r=await registerState(await build('lab-state-2-permitted','permitted'));
    record('the issuer supersedes the prohibition with a permitted state',{status:'registered'},r.status,r.status==='registered');
    v=await verify();record('the exact effect verifies under the permitted state',{decision:'allow'},{decision:v.decision,deny_reasons:v.deny_reasons},v.decision==='allow');
    // 5. Conditional: held until its signed condition receipt arrives.
    const condition={condition_id:'lab-condition-1',predicate:{type:'all_references_current'},required_references:[{kind:'source_record',id:'lab-src-1',sha256:await digest(src)}],resolver_credential_id:'lab-review-standing',waiver_allowed:false};
    const pending=await build('lab-state-3-conditional','conditional',{conditions:[condition]});
    r=await registerState(pending);
    record('register a conditional state without its receipt',{status:'registered'},r.status,r.status==='registered');
    v=await verify();record('an unresolved condition denies the exact effect',{decision:'deny'},{decision:v.decision,deny_reasons:v.deny_reasons},v.decision==='deny');
    const withReceipt=await build('lab-state-4-conditional-resolved','conditional',{conditions:[condition]});
    const receiptDoc={type:'mvr.condition-resolution/1',receipt_id:'lab-receipt-1',condition_sha256:await conditionDigest(condition),scope_sha256:await conditionScopeDigest(withReceipt),resolver_credential_id:'lab-review-standing',disposition:'satisfied',reason:'Lab resolver checked the source record is current.',issued_at:from,expires_at:until};
    withReceipt.condition_receipts=[{document:receiptDoc,signature_b64:await keys.reviewer.sign(receiptDoc.type,receiptDoc)}];
    r=await registerState(withReceipt);
    record('register the conditional state with its signed receipt',{status:'registered'},r.status,r.status==='registered');
    v=await verify();record('a satisfied condition lets the exact effect verify',{decision:'allow'},{decision:v.decision,deny_reasons:v.deny_reasons},v.decision==='allow');
    // 6. Revoked: denied again.
    r=await registerState(await build('lab-state-5-revoked','revoked'));
    record('the issuer revokes',{status:'registered'},r.status,r.status==='registered');
    v=await verify();p=await position();
    record('a revoked state denies and prohibits the exact effect',{decision:'deny',tier:'prohibited'},{decision:v.decision,tier:p.tier},v.decision==='deny'&&p.tier==='prohibited');
    report.passed=steps.every(s=>s.passed);report.case_id=caseId;
  }finally{await send({action:'close',session_id:session.session_id,session_token:session.credentials.institution.session_token}).catch(()=>{});}
  return report;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2),i=args.indexOf('--lab'),lab=(i>=0?args[i+1]:'https://africanmarketos.com').replace(/\/$/,'');
  const transport=async body=>(await fetch(lab+'/v1/authority-conformance',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'amos-issuer-state-live'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)})).json();
  const report=await runIssuerStateLive(transport,{continueOnFailure:args.includes('--record-failures')});console.log(JSON.stringify(report,null,1));process.exitCode=report.passed?0:1;
}
