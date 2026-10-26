// Self-contained checks of the published decision library and replay tool (no AMOS service needed).
// Proprietary lab fixture journal; not observations of any organisation.
import assert from 'node:assert/strict';
import {digest} from './core.mjs';
import {appendDecisionEvent,replayDecisionJournal,internalRecommendation} from './decision.mjs';
import {replayExport} from './replay.mjs';
const T0=Date.parse('2026-11-02T08:00:00.000Z'),iso=ms=>new Date(T0+ms).toISOString(),H=3600000,doc='a'.repeat(64);
const fact=(id,start)=>({id,label:id,cost:1,binding:{document_sha256:doc,locator:'utf16:'+start+':'+(start+10),claim:'Lab claim '+id,relationship:'direct_support',subject:'Lab subject',action:'create_draft_record',geography:'UG',valid_from:iso(-H),valid_until:iso(48*H),reviewer_standing_ref:'designated',model_version:'lab',extractor_version:'lab'}});
const model={model_id:'lab',version:'1',scope:'b'.repeat(64),facts:[fact('licence',0),fact('partner',20),fact('retail',40),fact('note',60)],rule:{all:[{fact:'licence'},{fact:'partner'},{fact:'retail'}]},
  effects:[{effect_type:'create_draft_record',rule:{all:[{fact:'licence'},{fact:'partner'}]}},{effect_type:'publish_document',rule:{fact:'retail'}}]};
const sha=digest(model),models={[sha]:model},who={principal:'1'.repeat(64),designation:{credential_id:'lab-designation',credential_sha256:'c'.repeat(64),issuer_anchor_id:'lab-standing',trust_tier:'lab_fixture',not_after:iso(40*H),effect_types:null}};
let journal=[],n=0;const add=(type,payload,ms)=>{const r=appendDecisionEvent({models,journal,type,payload,at:iso(ms)});journal=r.journal;return r;};
const review=(fact_id,value,ms)=>add('review_accepted',{review_sha256:digest({n:++n}),review_kind:'clause_review',model_sha256:sha,fact_id,value,conditions:[],reviewer_principal_sha256:who.principal,designation:who.designation},ms);
add('model_set',{model_sha256:sha},0);review('licence',true,H);review('partner',true,2*H);let r=review('retail',true,3*H);
const target=(s,t)=>s.targets.find(x=>x.target===t).state;
assert.equal(target(r.state,'internal_recommendation'),'positive');assert.equal(internalRecommendation(r.state).execution_permission,false);
r=review('note',false,4*H);assert.deepEqual(r.entry.transition.targets_changed,[],'an irrelevant claim changes nothing');
r=review('retail',false,5*H);assert.equal(target(r.state,'effect:publish_document'),'adverse');assert.equal(target(r.state,'effect:create_draft_record'),'positive','only the dependent effect moves');
const exported={journal,models,server_replay:{as_of:journal.at(-1).at,journal_head_sha256:journal.at(-1).sha256,state_sha256:journal.at(-1).state_sha256,unjournaled_lapses:[]}};
const out=replayExport(exported);assert.equal(out.valid_chain,true);assert.equal(out.matches_server,true);
const forged=structuredClone(exported);forged.journal[2].payload.value=false;assert.equal(replayExport(forged).valid_chain,false);
assert.equal(target(replayDecisionJournal({models,journal,as_of:iso(41*H)}).state,'effect:create_draft_record'),'revoked','an expired designation revokes support');
console.log(JSON.stringify({passed:true,events:journal.length,checks:['favourable path','irrelevant claim','one effect withdrawn','replay matches','forgery detected','designation expiry']}));
