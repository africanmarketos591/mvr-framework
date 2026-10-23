import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
export async function runProtectedMcpFixture(transport,fixture){
 const {profile,input}=fixture,op=()=>randomUUID(),secret=()=>randomBytes(32).toString('hex');let review,attestation;
 const request=async(path,body,role='creator')=>{const r=await transport(path,body,profile,role);assert(r.status<400,'HTTP '+r.status+' '+(r.body.code||r.body.error||''));return r.body;};
 const rpc=async params=>{const body=await request('/mcp/runtime',{jsonrpc:'2.0',id:1,method:'tools/call',params});assert(body.result,'MCP result missing');assert(body.result.content.every(c=>!c.text||c.text.length<=4500),'Text exceeds 4500');return body.result;};
 const caseSecret=secret(),attestationSecret=secret(),trace=[];
 try{
  review=await request('/v1/review-cases',{action:'create',operation_id:op(),preflight_context:input,reference_secret:caseSecret,redacted_no_personal_data:true,share_redacted_with_reference_holders:true});
  attestation=await request('/v1/reviewer-attestations',{action:'create',operation_id:op(),preflight_context:input,reviewer_name:'AMOS lab reviewer',reviewer_relationship:'external',claim:'Lab retailer interest does not establish permission.',statement:'Proprietary lab fixtures only. Unverified supporting material.',relationship:'qualifies',source_records:[{source_ref:'LAB-1',locator:'Lab fixture row 1'}],reviewed_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+1800000).toISOString(),residual_gaps:['No authenticated permission evidence.'],reference_secret:attestationSecret,share_redacted_with_reference_holders:true,original_records_examined:true,redacted_no_personal_data:true},'reviewer');
  let params={name:'mvr_first_call',arguments:{...input,review_case_ref:{case_id:review.case_id,...review.reference_scope,reference_secret:caseSecret},attestation_refs:[{attestation_id:attestation.attestation.attestation_id,...attestation.reference_scope,reference_secret:attestationSecret}]}};
  let firstHandoff,last;
  while(params){
   const sent=JSON.stringify(params),result=await rpc(params);assert.equal(result.isError,false,'Stage rejected: '+(result.structuredContent?.code||params.name));assert.equal(JSON.stringify(params),sent,'Host altered server handoff');
   last=result.structuredContent;assert(!JSON.stringify(result).includes(caseSecret)&&!JSON.stringify(result).includes(attestationSecret),'Private reference leaked');
   trace.push({tool:params.name,request_sha256:createHash('sha256').update(sent).digest('hex'),status:last.status,continuation_disposition:last.continuation_disposition});assert(trace.length<=5);
   params=last.mcp_next_call;firstHandoff??=params;
  }
  assert.deepEqual(trace.map(r=>r.tool),fixture.expected_executed_stages);assert.equal(last.continuation_disposition,'await_input');assert.equal(trace.at(-1).tool,'mvr_evidence_completeness');
  if(firstHandoff)assert.equal((await rpc(firstHandoff)).isError,true,'Consumed handoff replay accepted');
  return {passed:true,profile,classification:'AMOS lab verification',fixture_type:'proprietary lab fixtures',stages:trace,stages_not_executed:fixture.five_stage_order.slice(trace.length),stop_reason:'Evidence completeness remains unsatisfied. No stage or evidence gate was bypassed.',five_stage_completed:false};
 }finally{
  if(attestation)await request('/v1/reviewer-attestations',{action:'revoke',operation_id:op(),attestation_id:attestation.attestation.attestation_id,reason:'AMOS lab verification complete'},'reviewer');
  if(review){const current=await request('/v1/review-cases',{action:'get',case_id:review.case_id});await request('/v1/review-cases',{action:'withdraw',operation_id:op(),case_id:review.case_id,expected_revision:current.revision,reason:'AMOS lab verification complete'});}
 }
}
