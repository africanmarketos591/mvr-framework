import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [set,output,engine]=process.argv.slice(2);
if(!['A','B','C'].includes(set)||!output)throw Error('Usage: node score.mjs A|B|C result.json [worker checkout]. For live runs set MVR_API_KEY.');
const bytes=fs.readFileSync(new URL('./wording-'+set+'.json',import.meta.url),'utf8').replaceAll('\r\n','\n');
const hash=createHash('sha256').update(bytes).digest('hex');
const local=engine?await import(pathToFileURL(path.resolve(engine,'mvr-effect-decision.js'))):null;
const key=process.env.MVR_API_KEY;
if(!local&&!key)throw Error('Set MVR_API_KEY');
const rows=[];
const revisions=new Set();
for(const c of JSON.parse(bytes)){
 const request={analysis_date:'2026-11-14',subject:{entity_name:c.subject},market_scope:{country:c.country},
   claims:[{claim_id:'C1',claim:c.claim,support_links:[{evidence_id:'E1',relationship:'direct_support',locator:'claim'}]}],
   evidence_pack:[{evidence_id:'E1',claim:c.passage,source_class:'counterparty_record',source_date:'2026-11-10',evidence_geography:{country:c.country}}],
   requested_effects:[{effect_id:'EXT',effect_type:'external_offer',description:'Send a formal offer to the counterparty'}]};
 let result;
 if(local){
   const n=local.normalizeEffectDecisionRequest(request);
   if(!n.ok)throw Error(JSON.stringify(n.issues));
   result=await local.evaluateEffectDecisions(n);
 }else{
   const r=await fetch('https://africanmarketos.com/v1/effect-decision',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','X-API-Key':key,'X-Response-Profile':'full_advisory'},body:JSON.stringify(request),signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error(c.id+' HTTP '+r.status);
   revisions.add(r.headers.get('X-MVR-Release-Manifest'));
   result=await r.json();
 }
 const e=result.effects[0];
 rows.push({id:c.id,expected:c.expected,observed:e.analytical_evidence_status,execution:e.execution_authorization_status});
}
const report={set,corpus_sha256:hash,environment:engine?'local':'live',manifests:[...revisions],total:rows.length,
 exact:rows.filter(r=>r.expected===r.observed).length,false_favorable:rows.filter(r=>r.expected!=='favorable'&&r.observed==='favorable').length,
 external_authorizations:rows.filter(r=>r.execution==='authorized').length,rows};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(set,report.exact,report.total,'false favorable',report.false_favorable,'authorized',report.external_authorizations);
