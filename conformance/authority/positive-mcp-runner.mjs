import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('hex'),op=()=>randomUUID(),secret=()=>randomBytes(32).toString('hex');
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export async function runPositiveMcpFixture(transport,base,profile){
 const input=structuredClone(base),trace=[],reviews=[],originals=[];let review,attestation,anchor,anchorRegistered=false,primaryError;
 const request=async(path,body,role='creator')=>{const r=await transport(path,body,profile,role);assert(r.status<400,JSON.stringify(r));return r.body;};
 const pair=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const publicKey=Buffer.from(await crypto.subtle.exportKey('spki',pair.publicKey)).toString('base64');
 const sign=async doc=>Buffer.from(await crypto.subtle.sign('Ed25519',pair.privateKey,new TextEncoder().encode('MVR-AUTHORITY-V1\n'+doc.type+'\n'+canonical(doc)))).toString('base64');
 const stamp=Date.now(),iso=delta=>new Date(stamp+delta).toISOString(),standingId='lab-'+op(),anchorId='lab-'+op();
 for(const item of input.evidence_pack){
  const id=item.id||item.evidence_id,link=input.claims[0].support_links.find(x=>x.evidence_id===id),original=canonical(item),digest=hash(original);
  originals.push({evidence_id:id,sha256:digest,document:original});
  item.provenance_ledger.source_hash=digest;
  item.source_review={original_document_sha256:digest,clause_text:item.claim,clause_locator:link.locator,valid_from:iso(-1000),valid_until:iso(1800000),extractor_name:'published-lab-fixture',extractor_version:'1',model_version:'not_applicable_stipulated_lab_record',standing_credential_id:standingId};
 }
 const caseSecret=secret(),attestationSecret=secret();
 try{
  attestation=await request('/v1/reviewer-attestations',{action:'create',operation_id:op(),preflight_context:input,reviewer_name:'Proprietary lab fixture reviewer',reviewer_relationship:'external',claim:input.claims[0].claim,statement:'Original proprietary lab fixture records reviewed for bounded internal output use only. No real institution or external permission is asserted.',relationship:'supports',source_records:originals.slice(0,8).map(x=>({source_ref:x.evidence_id,locator:'Published original fixture document'})),reviewed_at:iso(-1000),expires_at:iso(1800000),residual_gaps:['Lab fixture truth is stipulated; real source authenticity and institutional standing remain unverified.'],reference_secret:attestationSecret,share_redacted_with_reference_holders:true,original_records_examined:true,redacted_no_personal_data:true},'reviewer');
  const principal=attestation.attestation.reviewer_account_ref;assert(principal);
  const scope=attestation.reference_scope,operation_id=op();
  anchor={type:'mvr.authority-anchor/1',anchor_id:anchorId,anchor_role:'standing_issuer',organization_ref:'proprietary-lab-review',organization_name_declared:'Proprietary lab fixtures only',public_key_spki_b64:publicKey,jurisdictions:[input.market_scope.country],provenance:'lab_fixture',not_before:iso(-1000),not_after:iso(3600000)};
  await request('/v1/authority-chain',{action:'register_anchor',operation_id,anchor,possession_signature_b64:await sign({type:'mvr.anchor-possession/1',anchor_id:anchorId,...scope,public_key_spki_b64:publicKey,operation_id})});
  anchorRegistered=true;
  const credential={type:'mvr.reviewer-standing/1',credential_id:standingId,issuer_anchor_id:anchorId,subject_principal_sha256:hash(principal),reviewer_display_name:'Lab reviewer',organization_ref:'proprietary-lab-review',role_title:'Lab clause reviewer',competence:{residual_codes:['CLAIM_TRUTH_UNVERIFIED'],jurisdictions:[input.market_scope.country]},independence:{relationship_to_subject:'none',conflicts_declared:[],declared_at:iso(-1000)},delegation:{mode:'issuer_direct',max_further_delegation:0},not_before:iso(-1000),not_after:iso(3600000)};
  await request('/v1/authority-chain',{action:'register_credential',operation_id:op(),document:credential,signature_b64:await sign(credential)});
  for(const item of input.evidence_pack){const id=item.id||item.evidence_id,link=input.claims[0].support_links.find(x=>x.evidence_id===id);const r=await request('/v1/evidence-review',{evidence_id:id,evidence_item:item,review_status:'approved',analysis_date:input.analysis_date,source_review_context:input,claim_support:[{...link,claim:input.claims[0].claim}]},'reviewer');assert.equal(r.strict_eligible,true,JSON.stringify(r));reviews.push(r.audit_event_id);}
  review=await request('/v1/review-cases',{action:'create',operation_id:op(),preflight_context:input,reference_secret:caseSecret,redacted_no_personal_data:true,share_redacted_with_reference_holders:true});
  const attestationRef={attestation_id:attestation.attestation.attestation_id,...scope,reference_secret:attestationSecret};
  const linked=await request('/v1/review-cases',{action:'link_attestation',operation_id:op(),case_id:review.case_id,expected_revision:review.revision,attestation_ref:attestationRef});assert.equal(linked.review_progress.status,'bounded_review_ready',JSON.stringify(linked));
  let params={name:'mvr_first_call',arguments:{...input,review_case_ref:{case_id:review.case_id,...review.reference_scope,reference_secret:caseSecret},attestation_refs:[attestationRef]}},last,first;
  while(params){const body=await request('/mcp/runtime',{jsonrpc:'2.0',id:1,method:'tools/call',params});const r=body.result;assert.equal(r?.isError,false,JSON.stringify(r));assert(r.content.every(c=>!c.text||c.text.length<=4500));assert(!JSON.stringify(r).includes(caseSecret)&&!JSON.stringify(r).includes(attestationSecret));last=r.structuredContent;trace.push({tool:params.name,status:last.status,disposition:last.continuation_disposition});assert(trace.length<=5);params=last.mcp_next_call;first??=params;}
  assert.deepEqual(trace.map(x=>x.tool),['mvr_first_call','mvr_entity_resolve','mvr_evidence_completeness','mvr_context_compile','mvr_decision_check'],JSON.stringify({trace,last}));
  assert.equal(last.claim_review.governed_review.blocking,false);
  assert.equal(last.claim_review.governed_review.verified_link_count,input.evidence_pack.length);
  assert.equal(last.analysis_use.execution_permission,false);
  assert.equal(last.action_capability.status,'not_issued');
  if(profile==='strict_calibrated'){
   assert.equal(last.analysis_use.status,'permitted_for_listed_uses_only',JSON.stringify(last.decision_authorization));
   assert(last.analysis_use.permitted_uses.includes('internal_planning'));
   assert(last.analysis_use.permitted_uses.every(use=>['internal_planning','pilot_design','board_reporting'].includes(use)));
  }else assert.equal(last.analysis_use.status,'not_permitted');
  const replay=await transport('/mcp/runtime',{jsonrpc:'2.0',id:2,method:'tools/call',params:first},profile,'creator');
  assert(replay.status>=400||replay.body.error||replay.body.result?.isError,'Consumed handoff must reject replay');
  return {passed:true,profile,classification:'AMOS lab verification; proprietary lab fixtures; no empirical fieldwork or institutional authentication',stages:trace,persisted_review_event_ids:reviews,original_document_hashes:originals.map(({evidence_id,sha256})=>({evidence_id,sha256})),five_stage_completed:true,reviewed_link_count:last.claim_review.governed_review.verified_link_count,analysis_use:last.analysis_use,action_capability:last.action_capability,replayed_handoff_rejected:true,residual_findings:last.red_team?.findings,protected_review_status:last.review_progress?.status};
 }catch(error){primaryError=error;throw error;}finally{
  const cleanupFailures=[];
  const cleanup=async(name,fn)=>{try{await fn();}catch{cleanupFailures.push(name);}};
  if(attestation)await cleanup('attestation',()=>request('/v1/reviewer-attestations',{action:'revoke',operation_id:op(),attestation_id:attestation.attestation.attestation_id,reason:'Lab fixture cleanup'},'reviewer'));
  if(review)await cleanup('case',async()=>{const current=await request('/v1/review-cases',{action:'get',case_id:review.case_id});await request('/v1/review-cases',{action:'withdraw',operation_id:op(),case_id:review.case_id,expected_revision:current.revision,reason:'Lab fixture cleanup'});});
  if(anchorRegistered)await cleanup('anchor',()=>request('/v1/authority-chain',{action:'revoke_anchor',operation_id:op(),anchor_id:anchorId,reason:'Lab fixture cleanup'}));
  if(cleanupFailures.length){if(primaryError)primaryError.cleanup_failures=cleanupFailures;else throw Object.assign(new Error('Fixture cleanup requires reconciliation'),{cleanup_failures:cleanupFailures});}
 }
}
