// AMOS favourable-path conformance: a clean, geographically matched, current three-source case reaches a bounded
// internal recommendation after designated reviews, and each named effect moves only with the claims its rule uses.
// Runs against the isolated lab (POST /v1/authority-conformance); every request goes through the public API.
// Proprietary lab fixtures; lab keys; no real institution, reviewer or production authority.
import assert from 'node:assert/strict';
import {webcrypto,createHash,randomBytes} from 'node:crypto';
import {canonicalJson,verifyAuthorityReceipt} from '../../sdks/javascript/authority-receipts.mjs';
import {verifyPermissionStatement} from '../../sdks/javascript/permission-verifier.mjs';
import {createCommitReceiver,memoryCommitStore} from '../receiver-kit/receiver.mjs';
import {replayExport} from '../decision-state/replay.mjs';
import {replayDecisionJournal} from '../decision-state/decision.mjs';

const sha=v=>createHash('sha256').update(v,'utf8').digest('hex');
const signBytes=(type,doc)=>new TextEncoder().encode(`MVR-AUTHORITY-V1\n${type}\n${canonicalJson(doc)}`);
export const FAVOURABLE_DOCUMENTS=Object.freeze({
  licence:{name:'lab-licence-register.txt',text:'Lab Licensing Register extract. Licence LAB-UG-001 is held by AMOS Lab Distributor Ltd for wholesale distribution in Uganda. The licence is valid from 1 January 2026 to 31 December 2027. Distribution outside Uganda is prohibited under this licence.'},
  partner:{name:'lab-district-partner-letter.txt',text:'Mbarara District Partner letter, 15 October 2026. We confirm that AMOS Lab Distributor Ltd has an active distribution agreement with our network in Mbarara.'},
  field:{name:'lab-field-visit-note.txt',text:'Field visit note, 20 October 2026. The visit observed 14 active retail points in Mbarara stocking the product. Only two of the fourteen retail points had restocked since the first delivery. The office canteen menu changed last week.'}
});
const PASSAGES={licence_current:['licence','Licence LAB-UG-001 is held by AMOS Lab Distributor Ltd for wholesale distribution in Uganda. The licence is valid from 1 January 2026 to 31 December 2027.'],
  local_partner_active:['partner','We confirm that AMOS Lab Distributor Ltd has an active distribution agreement with our network in Mbarara.'],
  retail_presence:['field','The visit observed 14 active retail points in Mbarara stocking the product.'],
  canteen_note:['field','The office canteen menu changed last week.']};
const ORDINARY_ADVERSE='Only two of the fourteen retail points had restocked since the first delivery.';
const EXPLICIT_PROHIBITION='Distribution outside Uganda is prohibited under this licence.';

export async function runFavourablePath(transport,{now=()=>Date.now()}={}){
  const checks=[],report={classification:'AMOS lab verification; proprietary lab fixtures; lab keys; no real institution, reviewer or production authority',checks,requests:0};
  let session,n=0,head=null;
  const op=label=>label+'-'+(++n)+'-'+randomBytes(4).toString('hex');
  const send=async body=>{report.requests++;const value=await transport(body);if(session)for(const c of Object.values(session.credentials))assert(!JSON.stringify(value).includes(c.session_token),'A lab credential leaked');return value;};
  const ok=(r,label)=>{assert((r.http_status||200)<400,label+': '+(r.code||r.status)+' '+JSON.stringify(r.detail||r.deny_reasons||'').slice(0,400));checks.push(label);return r;};
  const check=(cond,label,detail)=>{assert(cond,label+(detail===undefined?'':': '+JSON.stringify(detail).slice(0,600)));checks.push(label);};
  const keys={};for(const role of ['institution','standing','source']){const pair=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);keys[role]={spki:Buffer.from(await webcrypto.subtle.exportKey('spki',pair.publicKey)).toString('base64'),sign:async(type,doc)=>Buffer.from(await webcrypto.subtle.sign('Ed25519',pair.privateKey,signBytes(type,doc))).toString('base64')};}
  session=ok(await send({action:'issue',synthetic_only:true,acknowledge_no_identity_verification:true}),'issue isolated lab session');
  const call=(role,target,request)=>send({action:'call',session_id:session.session_id,session_token:session.credentials[role].session_token,target,request});
  const chain=(role,request)=>call(role,'authority',{...request,operation_id:op(request.action)});
  const P=role=>session.credentials[role].principal_sha256;
  const from=new Date(now()-1000).toISOString(),until=new Date(Date.parse(session.expires_at)-10000).toISOString();
  const scope={tenant_id:session.tenant_id,workspace_id:session.workspace_id};
  const docs=Object.fromEntries(Object.entries(FAVOURABLE_DOCUMENTS).map(([k,d])=>[k,{...d,sha256:sha(d.text)}]));
  const context={subject:{entity_name:'AMOS Lab Distributor Ltd'},market_scope:{country:'UG',decision_scope_level:'district',region:'Mbarara'},intended_action:'create_draft_record',decision_question:'Prepare one internal draft distribution record for Mbarara after checking three current sources.',
    evidence_pack:[{id:'LAB-A',source_doc_id:'LAB-DOC-A',source_hash:docs.licence.sha256,claim:'Licence register extract (proprietary lab fixture)',evidence_type:'public_filing',source_class:'regulator_published',stakeholder_class:'regulator',verification_status:'unverified'}]};
  const created=ok(await call('institution','case',{action:'create',operation_id:op('case'),preflight_context:context,reference_secret:randomBytes(32).toString('hex'),share_redacted_with_reference_holders:true,redacted_no_personal_data:true}),'create a clean, geographically matched case');
  const caseId=created.case_id,caseRevision=created.revision;
  let tools=ok(await call('institution','case',{action:'get_review_tools',case_id:caseId}),'read review tools').review_tools;
  const tool=async(role,request,label)=>{const r=ok(await call(role,'case',{case_id:caseId,expected_revision:caseRevision,expected_tools_revision:tools.revision,operation_id:op(request.action),...request}),label);tools=r.review_tools;return r;};
  const decision=()=>tools.decision_state,target=name=>decision().targets.find(t=>t.target===name);
  // Institution keys, a designation for the reviewer, one source authentication.
  for(const [id,role,org,key,principal] of [['lab-institution','institution_authority','lab-institution',keys.institution,'institution'],['lab-standing','standing_issuer','lab-professional-body',keys.standing,'institution'],['lab-source','source_issuer','lab-source-custodian',keys.source,'source_issuer']]){
    const operation_id=op('anchor'),anchor={type:'mvr.authority-anchor/1',anchor_id:id,anchor_role:role,organization_ref:org,organization_name_declared:'AMOS Lab '+org,public_key_spki_b64:key.spki,jurisdictions:['UG'],provenance:'lab_fixture',not_before:from,not_after:until};
    const possession={type:'mvr.anchor-possession/1',anchor_id:id,...scope,public_key_spki_b64:key.spki,operation_id};
    ok(await call(principal,'authority',{action:'register_anchor',operation_id,anchor,possession_signature_b64:await key.sign('mvr.anchor-possession/1',possession)}),'register lab '+role+' key');
  }
  const designationId='lab-designation-reviewer';
  const standing={type:'mvr.reviewer-standing/1',credential_id:designationId,issuer_anchor_id:'lab-standing',subject_principal_sha256:P('reviewer'),reviewer_display_name:'AMOS Lab designated reviewer',organization_ref:'lab-independent-reviewer',role_title:'Designated distribution reviewer',competence:{residual_codes:['CLAIM_TRUTH_UNVERIFIED','SOURCE_AUTHENTICITY_UNVERIFIED'],jurisdictions:['UG']},independence:{relationship_to_subject:'none',conflicts_declared:[],declared_at:from},delegation:{mode:'issuer_direct',max_further_delegation:0},not_before:from,not_after:until};
  ok(await chain('institution',{action:'register_credential',document:standing,signature_b64:await keys.standing.sign(standing.type,standing)}),'institution designates a reviewer (identity, organization, competence, delegation, expiry)');
  const sourceDoc={type:'mvr.source-authentication/1',record_id:'lab-source-licence',issuer_anchor_id:'lab-source',record_kind:'source_authenticity',source_doc_id:'LAB-DOC-A',source_sha256:docs.licence.sha256,jurisdiction:'UG',statement:'Proprietary lab source hash only',valid_from:from,valid_until:until};
  ok(await chain('source_issuer',{action:'register_source_record',document:sourceDoc,signature_b64:await keys.source.sign(sourceDoc.type,sourceDoc)}),'source custodian authenticates the licence extract hash');
  const closure=ok(await chain('reviewer',{action:'close_residual',case_id:caseId,residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED',scope_ref:'source:LAB-DOC-A',credential_id:designationId,source_record_ids:['lab-source-licence'],statement:'Lab hash match only',expires_at:until}),'designated reviewer closes one residual').closure.closure_id;
  // Three originals and a model with three named effects.
  for(const d of Object.values(docs))await tool('institution',{action:'register_review_document',original_document:{name:d.name,text:d.text,provenance:'proprietary_generated_test_data'},redacted_no_personal_data:true},'register original '+d.name);
  const span=fact=>{const [doc,text]=PASSAGES[fact],start=docs[doc].text.indexOf(text);assert(start>=0);return {doc:docs[doc],start,end:start+text.length,text};};
  const binding=fact=>{const s=span(fact);return {document_sha256:s.doc.sha256,locator:'utf16:'+s.start+':'+s.end,claim:'Lab claim: '+fact.replaceAll('_',' '),relationship:'direct_support',subject:'AMOS Lab Distributor Ltd',action:'create_draft_record',geography:'UG',valid_from:from,valid_until:until,reviewer_standing_ref:designationId,model_version:'lab-1',extractor_version:'utf8-exact'};};
  const model={model_id:'lab-favourable-path',version:'1',scope:tools.context_sha256,facts:Object.keys(PASSAGES).map(id=>({id,label:id.replaceAll('_',' '),cost:1,binding:binding(id)})),
    rule:{all:[{fact:'licence_current'},{fact:'local_partner_active'},{fact:'retail_presence'}]},
    effects:[{effect_type:'create_draft_record',rule:{all:[{fact:'licence_current'},{fact:'local_partner_active'}]}},{effect_type:'publish_document',rule:{fact:'retail_presence'}},{effect_type:'amos.owner_lab.artifact.create@1',rule:{fact:'licence_current'}}]};
  await tool('institution',{action:'set_review_model',review_model:model,redacted_no_personal_data:true},'set a review model with three named effects');
  const prohibition=decision().interpretation_tasks.find(t=>t.signal==='lexical_adverse'&&t.document_sha256===docs.licence.sha256);
  const prohibitionSpan=docs.licence.text.indexOf(EXPLICIT_PROHIBITION);
  check(prohibition&&prohibition.locator==='utf16:'+prohibitionSpan+':'+(prohibitionSpan+EXPLICIT_PROHIBITION.length)&&prohibition.fact_id==='licence_current','explicit prohibition routed to its exact passage without any caller relationship label',prohibition);
  check(decision().effects_modelled===true&&target('internal_recommendation').state==='pending','nothing is favourable before review');
  // Acceptance 1: designated reviews reach a bounded internal recommendation.
  const review=async(fact,disposition,extra={})=>{const s=span(fact);return tool('reviewer',{action:'review_document_clause',designation_credential_id:designationId,clause_review:{document_sha256:s.doc.sha256,fact_id:fact,start:s.start,end:s.end,clause_text:s.text,disposition,note:'Designated lab review',...extra}},'designated '+disposition+' of '+fact);};
  const roleOnly=await call('institution','case',{action:'review_document_clause',case_id:caseId,expected_revision:caseRevision,expected_tools_revision:tools.revision,operation_id:op('self'),designation_credential_id:designationId,clause_review:{document_sha256:docs.partner.sha256,fact_id:'local_partner_active',start:span('local_partner_active').start,end:span('local_partner_active').end,clause_text:span('local_partner_active').text,disposition:'approve',note:'Case owner tries to review'}});
  check(roleOnly.http_status===403&&['REVIEW_DESIGNATION_CASE_CREATOR','REVIEW_DESIGNATION_INVALID','AUTHORITY_CONFORMANCE_ROLE_DENIED'].includes(roleOnly.code),'the case owner cannot act as the designated reviewer',roleOnly.code);
  await review('licence_current','approve');await review('local_partner_active','approve');await review('retail_presence','approve');
  check(target('internal_recommendation').state==='revoked'||target('internal_recommendation').state==='pending','the open prohibition flag holds the licence claim until disposed',target('internal_recommendation'));
  check(target('internal_recommendation').open_signals.includes(prohibition.task_id),'the hold names the routed passage');
  await tool('reviewer',{action:'dispose_interpretation',designation_credential_id:designationId,interpretation_disposition:{task_id:prohibition.task_id,disposition:'accept',label:'unrelated',note:'The decision is inside Uganda.'}},'designated reviewer disposes the prohibition flag');
  const rec=decision().internal_recommendation;
  check(target('internal_recommendation').state==='positive'&&rec.state==='positive'&&rec.permitted_uses.join()==='internal_planning,pilot_design,board_reporting'&&rec.execution_permission===false&&rec.external_effect_permission===false,'acceptance 1: bounded internal recommendation after legitimate reviews',rec);
  check(['effect:create_draft_record','effect:publish_document','effect:amos.owner_lab.artifact.create@1'].every(t=>target(t).state==='positive'),'all three effects are supported');
  // Acceptance 3: an irrelevant passage reopens nothing.
  const beforeIrrelevant=decision().state_sha256;
  await review('canteen_note','reject');
  let journal=ok(await call('institution','case',{action:'get_decision_journal',case_id:caseId}),'read the decision journal').decision_journal;
  const last=journal.journal.at(-1);
  check(last.type==='review_accepted'&&last.transition.targets_changed.length===0&&last.transition.targets_independent.length===4&&target('internal_recommendation').state==='positive','acceptance 3: an irrelevant passage does not reopen or block',last.transition);
  check(decision().coverage.not_needed.includes('canteen_note')&&decision().state_sha256!==beforeIrrelevant,'the irrelevant claim is listed not_needed');
  // Institution capabilities for each effect, the permission statement and the single-use commit.
  const residuals=async()=>{const current=ok(await call('institution','case',{action:'get',case_id:caseId}),'read open residuals');return [...new Set([...current.review_progress.residual_risks.map(r=>r.code).filter(c=>c!=='SOURCE_AUTHENTICITY_UNVERIFIED'),'PERMISSION_STATUS_UNASSESSED'])];};
  // The lab signs only harmless effects. publish_document stays modelled but unsigned: its state is observed, never executed.
  const effects={draft:{effect_id:'lab-draft-1',effect_type:'create_draft_record',resource:{system:'amos-lab',resource_type:'draft',resource_id:'LAB-DRAFT-1'},amount_minor:0,currency:'UGX',external_contact:false,counterparty_ref:'lab-only'},
    artifact:{effect_id:'lab-artifact-1',effect_type:'amos.owner_lab.artifact.create@1',resource:{system:'amos-lab',resource_type:'lab_artifact',resource_id:'LAB-ARTIFACT-1'},amount_minor:0,currency:'UGX',external_contact:false,counterparty_ref:'lab-only'}};
  const capabilities={};
  for(const [name,effect] of Object.entries(effects)){
    const doc={type:'mvr.action-capability/1',capability_id:'lab-capability-'+name,issuer_anchor_id:'lab-institution',...scope,case_id:caseId,basis:{required_closures:[{residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED',closure_id:closure}],accepted_open_residuals:await residuals(),minimum_closure_assurance:'lab_fixture'},actor:{executor_principal_sha256:P('executor')},action:{effect_type:effect.effect_type,resource_scope:effect.resource,amount_minor:0,max_amount_minor:0,currency:'UGX',max_uses:5,external_contact_allowed:false,counterparty_ref:'lab-only'},human_authorization:{approver_ref_sha256:P('institution'),approved_at:from,method:'institution_signature'},not_before:from,not_after:until};
    ok(await chain('institution',{action:'register_capability',document:doc,signature_b64:await keys.institution.sign(doc.type,doc)}),'institution signs a capability for '+effect.effect_type);capabilities[name]=doc.capability_id;
  }
  const verify=async(name,effect=effects[name])=>ok(await chain('executor',{action:'verify_capability',capability_id:capabilities[name],requested_effect:{...effect,effect_id:op('e')}}),'verify '+name);
  for(const name of Object.keys(effects))check((await verify(name)).decision==='allow','executor verification allows '+name);
  // A closure recorded after the reviews changes the case basis; it must not make the review tools stale, or no later
  // review (including an adverse one) could be recorded. Found live on 2026-10-26 and fixed in the same release.
  ok(await chain('reviewer',{action:'close_residual',case_id:caseId,residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED',scope_ref:'source:LAB-DOC-A',credential_id:designationId,source_record_ids:['lab-source-licence'],statement:'Lab hash match, rechecked after the capabilities',expires_at:until}),'designated reviewer records a second closure after the reviews');
  tools=ok(await call('institution','case',{action:'get_review_tools',case_id:caseId}),'read review tools after the closure').review_tools;
  check(tools.basis_sha256===tools.current_basis_sha256,'a closure after the reviews does not make the review tools stale',{held:tools.basis_sha256,current:tools.current_basis_sha256});
  const statement=ok(await chain('executor',{action:'issue_permission_statement',case_id:caseId,capability_id:capabilities.draft,requested_effect:effects.draft}),'issue a signed permission statement for the exact draft effect');
  const registry=session.receipt_registry;
  let verdict=await verifyPermissionStatement(statement.receipt,{registry,allowLabKeys:true,expectedEffect:effects.draft,expectedExecutorPrincipalSha256:P('executor'),country:'UG'});
  check(statement.coverage==='covered'&&verdict.valid&&verdict.effect_state==='positive','offline verifier accepts the statement for exactly this effect',verdict.reasons);
  const asserted=statement.statement.standing_assertions?.find(x=>x.credential_id===designationId);
  check(asserted&&asserted.asserted_by_anchor_id==='lab-standing'&&asserted.usable===true&&asserted.not_after&&asserted.supports_effect==='create_draft_record','the statement says who asserted the reviewer’s standing, how it was checked, when it ends and which effect rests on it',asserted);
  check(!(await verifyPermissionStatement(statement.receipt,{registry,allowLabKeys:true,expectedEffect:{...effects.draft,amount_minor:1}})).valid,'the verifier refuses a broadened effect');
  const tampered=structuredClone(statement.receipt);tampered.statement.requested_effect.resource.resource_id='LAB-OTHER';
  check(!(await verifyPermissionStatement(tampered,{registry,allowLabKeys:true,expectedEffect:tampered.statement.requested_effect})).valid,'the verifier refuses an altered statement');
  const broadened=ok(await chain('executor',{action:'issue_permission_statement',case_id:caseId,capability_id:capabilities.draft,requested_effect:{...effects.draft,resource:{...effects.draft.resource,resource_type:'payment'}}}),'statement for an out-of-scope effect');
  check(broadened.coverage==='not_covered'&&broadened.statement.deny_reasons.includes('RESOURCE_OUT_OF_SCOPE'),'a statement for an out-of-scope effect says not_covered');
  const exact={...effects.draft,effect_id:op('commit')};
  const v2=ok(await chain('executor',{action:'verify_capability',capability_id:capabilities.draft,requested_effect:exact}),'verify the exact effect to commit');
  const committed=ok(await chain('executor',{action:'commit_effect',verification_id:v2.verification_id,effect_id:exact.effect_id,requested_effect:exact}),'commit the exact effect');
  check(committed.decision==='commit'&&committed.receipt.permission_basis?.effect_state==='positive'&&committed.receipt.permission_basis.decision_journal_head_sha256===decision().journal_head_sha256,'the commit receipt carries the decision basis',committed.receipt.permission_basis);
  const exactStatement=ok(await chain('executor',{action:'issue_permission_statement',case_id:caseId,capability_id:capabilities.draft,requested_effect:exact}),'statement for the committed effect');
  verdict=await verifyPermissionStatement(exactStatement.receipt,{registry,allowLabKeys:true,expectedEffect:exact,requireCommit:committed.receipt,country:'UG'});
  check(!verdict.valid&&verdict.reasons.includes('COMMIT_BEFORE_STATEMENT'),'a statement issued after the commit cannot vouch for it');
  verdict=await verifyPermissionStatement(statement.receipt,{registry,allowLabKeys:true,expectedEffect:effects.draft,requireCommit:committed.receipt,country:'UG'});
  check(!verdict.valid&&verdict.reasons.includes('COMMIT_DOES_NOT_MATCH_STATEMENT'),'a commit for a different effect id does not match the statement');
  let performed=0;const receiver=createCommitReceiver({registry,allowLabKeys:true,store:memoryCommitStore(),performEffect:async()=>{performed++;return {ref:'lab'};},reconcile:async()=>null});
  const first=await receiver.receive({receipt:committed.receipt,requested_effect:exact}),again=await receiver.receive({receipt:committed.receipt,requested_effect:exact});
  check(first.performed&&!again.performed&&again.already_performed&&performed===1,'the customer receiver performs the committed effect exactly once');
  ok(await chain('executor',{action:'record_effect',verification_id:v2.verification_id,effect_id:exact.effect_id,outcome:'succeeded'}),'record the effect outcome');
  // Priority 2: ordinary adverse meaning, read by a model under a server-issued task; a human resolves it.
  const ordinaryStart=docs.field.text.indexOf(ORDINARY_ADVERSE);
  check(!decision().interpretation_tasks.some(t=>t.signal&&t.document_sha256===docs.field.sha256),'the ordinary adverse sentence carries no lexical flag (a model must read it)');
  await tool('institution',{action:'issue_interpretation_task',interpretation_task:{document_sha256:docs.field.sha256,fact_id:'retail_presence',start:ordinaryStart,end:ordinaryStart+ORDINARY_ADVERSE.length,clause_text:ORDINARY_ADVERSE}},'issue an interpretation task for the ordinary adverse passage');
  const task=decision().interpretation_tasks.find(t=>t.document_sha256===docs.field.sha256&&t.locator==='utf16:'+ordinaryStart+':'+(ordinaryStart+ORDINARY_ADVERSE.length));
  check(task&&task.status==='not_needed'||task&&task.status==='open','the task names the exact passage and target claim',task);
  const attribution=(provider,model,output)=>({provider,model,model_version:'2026-10',prompt_sha256:sha('Label this passage against the claim: supports, qualifies, adverse or unrelated.'),output_sha256:sha(output)});
  await tool('institution',{action:'record_passage_interpretation',passage_interpretation:{document_sha256:docs.field.sha256,fact_id:'retail_presence',start:ordinaryStart,end:ordinaryStart+ORDINARY_ADVERSE.length,clause_text:ORDINARY_ADVERSE,stance:'adverse',source:'model',task_id:task.task_id,attribution:attribution('lab-provider-a','lab-model-a','adverse')},redacted_no_personal_data:true},'record an attributed model reading: adverse');
  check(decision().facts.retail_presence.value===true,'the model reading did not change the claim (no model output becomes truth)');
  check(target('effect:publish_document').state==='revoked'&&target('effect:publish_document').reason==='adverse_signal_requires_disposition'&&target('effect:create_draft_record').state==='positive'&&target('internal_recommendation').state==='revoked','the adverse reading holds only the targets that depend on the claim',decision().targets.map(t=>[t.target,t.state]));
  check((await verify('draft')).decision==='allow'&&(await verify('artifact')).decision==='allow','effects that do not use the claim still verify');
  await tool('institution',{action:'record_passage_interpretation',passage_interpretation:{document_sha256:docs.field.sha256,fact_id:'retail_presence',start:ordinaryStart,end:ordinaryStart+ORDINARY_ADVERSE.length,clause_text:ORDINARY_ADVERSE,stance:'supports',source:'model',task_id:task.task_id,attribution:attribution('lab-provider-b','lab-model-b','supports')},redacted_no_personal_data:true},'record a second model reading: supports');
  check(decision().disagreements.some(d=>d.kind==='readings'&&d.task_id===task.task_id),'disagreement between models is captured');
  await tool('reviewer',{action:'dispose_interpretation',designation_credential_id:designationId,interpretation_disposition:{task_id:task.task_id,disposition:'accept',label:'adverse',note:'Restocking is too low to support current retail presence.'}},'designated reviewer accepts the adverse reading');
  // Acceptance 2: one decisive claim turns adverse; only the effects that use it are withdrawn.
  journal=ok(await call('institution','case',{action:'get_decision_journal',case_id:caseId}),'read the decision journal').decision_journal;
  const disposal=journal.journal.at(-1);
  check(decision().facts.retail_presence.value===false&&target('effect:publish_document').state==='adverse'&&target('internal_recommendation').state==='adverse'&&target('effect:create_draft_record').state==='positive'&&target('effect:amos.owner_lab.artifact.create@1').state==='positive','acceptance 2 and priority 2: the human resolution changes the targeted claim and withdraws only its effects',decision().targets.map(t=>[t.target,t.state]));
  check(disposal.transition.targets_independent.includes('effect:create_draft_record')&&disposal.transition.targets_changed.some(c=>c.target==='effect:publish_document'),'the transition names exactly which effects changed and which were independent',disposal.transition);
  check(decision().coverage.not_needed.includes('canteen_note'),'the unrelated passage stays not_needed');
  check((await verify('draft')).decision==='allow','the unaffected effect still verifies');
  // Revocation: revoking one capability fails that exact effect; an unrelated permitted effect is unaffected.
  ok(await chain('institution',{action:'revoke_capability',capability_id:capabilities.draft,reason:'Lab revocation of the draft capability'}),'institution revokes the draft capability');
  check((await verify('draft')).decision==='deny'&&(await verify('artifact')).decision==='allow','revoking one capability fails exactly that effect; the unrelated effect still verifies');
  // Revoking the reviewer's designation withdraws every target that rests on that reviewer.
  ok(await chain('institution',{action:'revoke_credential',id:designationId,reason:'Lab revocation of the reviewer designation'}),'institution revokes the reviewer designation');
  tools=ok(await call('institution','case',{action:'get_review_tools',case_id:caseId}),'read live decision state').review_tools;
  check(decision().unjournaled_lapses.some(l=>l.credential_id===designationId)&&target('effect:amos.owner_lab.artifact.create@1').state==='revoked','a revoked designation is applied live before it is journaled');
  await tool('institution',{action:'record_dependency_check'},'journal the designation lapse');
  check((await verify('artifact')).decision==='deny','the dependent effect now fails verification');
  // Acceptance 4: the whole transition history replays from the journal, with no client reconstruction.
  journal=ok(await call('institution','case',{action:'get_decision_journal',case_id:caseId}),'read the final decision journal').decision_journal;
  const replay=replayExport(journal);
  check(replay.valid_chain&&replay.matches_server===true&&replay.state_sha256===decision().state_sha256,'acceptance 4: the public replay reproduces every transition and the server state',{valid:replay.valid_chain,matches:replay.matches_server,mismatches:replay.mismatches});
  const forged=structuredClone(journal);forged.journal[Math.min(5,forged.journal.length-1)].payload.value=!forged.journal[Math.min(5,forged.journal.length-1)].payload.value;
  check(!replayDecisionJournal({models:forged.models,journal:forged.journal,as_of:journal.server_replay.as_of}).valid_chain,'a forged journal entry fails replay');
  report.journal_events=journal.event_count;report.case_id=caseId;report.state_sha256=replay.state_sha256;report.final_targets=replay.targets;
  const closed=await send({action:'close',session_id:session.session_id,session_token:session.credentials.institution.session_token});
  report.session_closed=closed.status==='closed'||closed.http_status<400;
  report.passed=true;
  return report;
}
