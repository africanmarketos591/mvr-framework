// Live check of the permission-path release through the isolated evaluation route. No API key needed.
// Usage (Node 24+): npm ci --prefix ../original-review/pdf && node run-live.mjs --confirm-isolated-evaluation [--output report.json]
// Uses one bounded evaluation session with proprietary lab fixtures, then closes it. Public registers are real public data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyPdfPassage} from '../original-review/pdf/verify-pdf-passage.mjs';
const origin='https://africanmarketos.com';
assert(process.argv.includes('--confirm-isolated-evaluation'),'This creates bounded generated-data review records. Supply --confirm-isolated-evaluation to run.');
const oi=process.argv.indexOf('--output'),output=oi<0?null:process.argv[oi+1];
const get=async path=>{const r=await fetch(origin+path,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});return {status:r.status,body:await r.json(),headers:r.headers};};
const version=(await get('/.well-known/mvr-version.json')).body,revision=version.deployment_revision;
let calls=0,session=null,closed=false;const checks=[];const check=(name,ok,detail)=>{checks.push({name,passed:!!ok,...(detail===undefined?{}:{detail})});assert(ok,name+(detail?': '+JSON.stringify(detail).slice(0,400):''));};
async function sandbox(body){assert(++calls<=40,'Local request budget exceeded');const r=await fetch(origin+'/v1/review-sandbox',{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json','X-MVR-Expected-Deployment-Revision':revision},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
const report={revision,started_at:new Date().toISOString(),classification:'AMOS lab verification through the isolated evaluation route; proprietary lab fixtures plus real public register data',checks};
try{
  const contract=(await get('/v1/review-cases/contract')).body;
  check('review contract lists outcome ledger actions',['record_case_outcome','get_review_outcome_ledger'].every(a=>contract.actions.includes(a)));
  check('review contract publishes PDF extractor and seven register adapters',contract.hosted_review_tools.original_documents.pdf.extractor==='amos-pdf-text/1'&&Object.keys(contract.hosted_review_tools.public_register.adapters).length===7);
  const authority=(await get('/v1/authority-chain/contract')).body;
  check('authority contract publishes check_permission, commit_effect and six permission levels',!!authority.actions.check_permission&&!!authority.actions.commit_effect&&authority.permission_position.tiers.length===6);
  const mcp=await fetch(origin+'/mcp',{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'mvr_first_call',arguments:{subject:{entity_name:'AMOS lab retailer',entity_archetype:'retail'},market_scope:{country:'UG',decision_scope_level:'country'},decision_question:'Should we pilot distribution through lab retailers?'}}})});
  // MCP tool results carry the analysis-level position at the top of structuredContent (there is no answer wrapper).
  const position=(await mcp.json()).result?.structuredContent?.permission_position;
  check('public first-call result carries an analysis-level permission position',position?.contract_version==='mvr.permission-position/1'&&position.scope==='analysis_output'&&position.execution_authorized===false,position?.tier);
  const issued=await sandbox({action:'issue',synthetic_only:true,acknowledge_no_identity_verification:true});check('evaluation issued',issued.status===201&&issued.body.status==='issued',issued.body.code);session=issued.body;
  const call=async(request,role='creator')=>(await sandbox({action:'call',session_id:session.session_id,session_token:session.credentials[role].session_token,target:'case',request})).body;
  let last=await call({action:'create',operation_id:crypto.randomUUID(),preflight_context:{subject:{entity_name:'Proprietary lab programme operator'},market_scope:{country:'UG'},decision_question:'Internal review of a staged lab disbursement'},reference_secret:'c'.repeat(64),share_redacted_with_reference_holders:true,redacted_no_personal_data:true});
  check('case created',last.status==='ok',last.code);
  check('case-level permission position is planning only',last.review_progress.permission_position?.tier==='planning_only',last.review_progress.permission_position);
  let revisionTools=0;const mutate=async(action,fields,role='creator')=>{const r=await call({action,case_id:last.case_id,expected_revision:last.revision,expected_tools_revision:revisionTools,operation_id:crypto.randomUUID(),...fields},role);if(r.status==='ok'){last=r;revisionTools=r.review_tools.revision;}return r;};
  const pdf=fs.readFileSync(new URL('../original-review/pdf/fixtures/lab-disbursement-conditions-skia.pdf',import.meta.url));
  let r=await mutate('register_review_document',{original_document:{name:'lab-disbursement-conditions.pdf',content_base64:pdf.toString('base64'),provenance:'proprietary_generated_test_data'},redacted_no_personal_data:true});
  check('original PDF registered by its exact bytes',r.status==='ok'&&r.review_tools.documents[0].format==='pdf'&&r.review_tools.documents[0].original_bytes_retained===false,r.code);
  const doc=r.review_tools.documents[0],passage='Tranche 2 (UGX 45,000,000) may be released only if the field audit is signed and dated.',start=doc.text.indexOf(passage),end=start+passage.length;
  check('server extraction contains the passage',start>=0&&doc.extractor==='amos-pdf-text/1');
  const binding={document_sha256:doc.sha256,locator:'utf16:'+start+':'+end,claim:'Tranche 2 may be released',relationship:'direct_support',subject:'Proprietary lab programme operator',action:'Release tranche 2',geography:'UG',valid_from:new Date(Date.now()-1000).toISOString(),valid_until:new Date(Date.now()+900000).toISOString(),reviewer_standing_ref:'evaluation-role-only-not-verified-standing',model_version:'proprietary/1',extractor_version:doc.extractor};
  r=await mutate('set_review_model',{review_model:{model_id:'pdf-live',version:'1',scope:last.review_progress.context_sha256,facts:[{id:'passage',label:'Tranche condition',cost:1,binding}],rule:{fact:'passage'}},redacted_no_personal_data:true});check('passage bound',r.status==='ok',r.code);
  r=await mutate('review_document_clause',{clause_review:{document_sha256:doc.sha256,fact_id:'passage',start,end,clause_text:passage,disposition:'qualify',note:'Conditional release: the field audit must be signed first.'}},'reviewer_a');
  const receipt=r.review_tools?.clause_reviews?.[0];
  check('passage review recorded with page span and conditional-wording warning',r.status==='ok'&&receipt.payload.warning==='DECLARED_RELATIONSHIP_TEXT_CONFLICT'&&JSON.stringify(receipt.payload.pdf_pages)==='[1]',r.code);
  const independent=await verifyPdfPassage(pdf,receipt);check('live receipt verified independently from the original PDF',independent.valid,independent);
  report.pdf={document_sha256:doc.sha256,extracted_text_sha256:doc.text_sha256,page_count:doc.page_count,receipt_sha256:receipt.sha256,independent_verification:independent.checks};
  const queries=[{adapter:'gleif-parent/1',id:'5493001KJTIIGC8Y1R12'},{adapter:'ror-org/1',id:'03dbr7087'},{adapter:'crossref-doi/1',id:'10.1016/S0140-6736(97)11096-0'},{adapter:'worldbank-project/1',id:'P173296'},{adapter:'eu-vies-vat/1',id:'IE6388047V',expected_name:'Google Ireland Limited'},{adapter:'sec-edgar/1',id:'320193'}];
  r=await mutate('lookup_public_register',{register_lei:'9845004RABFFAE62FB64'});
  for(const q of queries)r=await mutate('lookup_public_register',{register_query:q});
  const snaps=r.review_tools.public_register_snapshots;report.registers=snaps.map(s=>({adapter:s.adapter_version,status:s.status,reason:s.reason||null,response_sha256:s.response_sha256||null,retrieved_at:s.retrieved_at||s.checked_at}));
  check('all seven public register adapters retrieved live from the Worker',snaps.length===7&&snaps.every(s=>s.status==='retrieved'),report.registers);
  check('no register snapshot claims authority',snaps.every(s=>s.execution_authorized===false&&s.delegation_verified===false&&s.institutional_authority_verified===false));
  check('Crossref records the Retraction Watch retraction',snaps.find(s=>s.adapter_version==='crossref-doi/1')?.retraction_notice_recorded===true);
  const vies=snaps.find(s=>s.adapter_version==='eu-vies-vat/1');check('VIES stores validity and a name match, not the name',vies?.vat_valid===true&&vies.registered_name_matches_expected===true&&!JSON.stringify(vies).toUpperCase().includes('GORDON HOUSE'));
  const outcome=await call({action:'record_case_outcome',case_id:last.case_id,operation_id:crypto.randomUUID(),case_outcome:{outcome:'held_then_cleared',observed_at:new Date().toISOString(),reviewer_minutes:20}});
  check('outcome recorded with server state',outcome.status==='ok'&&outcome.outcome_entry.amos_state_at_recording.permission_tier==='planning_only'&&outcome.outcome_entry.declared_not_verified===true,outcome.code);
  const ledger=await call({action:'get_review_outcome_ledger'},'reviewer_a');
  check('workspace ledger reports metrics with honest labels',ledger.status==='ok'&&ledger.review_outcome_ledger.metrics.held_then_cleared>=1&&ledger.review_outcome_ledger.metrics.labels.causal_claim===false,ledger.code);
  const close=await sandbox({action:'close',session_id:session.session_id,session_token:session.credentials.creator.session_token});check('evaluation closed',close.body.status==='closed');closed=true;
  const denied=await sandbox({action:'call',session_id:session.session_id,session_token:session.credentials.creator.session_token,target:'case',request:{action:'get_review_tools',case_id:last.case_id}});check('access refused after close',denied.status===401,denied.body.code);
  report.passed=true;
}catch(error){report.passed=false;report.error=error.message;}
finally{if(session&&!closed){try{await sandbox({action:'close',session_id:session.session_id,session_token:session.credentials.creator.session_token});}catch{}}report.requests=calls;report.completed_at=new Date().toISOString();report.credentials_published=false;
  if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:report.passed,error:report.error||null,checks:checks.length,requests:calls,revision}));if(!report.passed)process.exitCode=1;}
