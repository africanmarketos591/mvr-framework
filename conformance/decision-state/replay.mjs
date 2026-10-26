#!/usr/bin/env node
// Replays an exported AMOS decision journal offline with the same library the server runs (decision.mjs, review.mjs
// and core.mjs are byte-identical to the deployed engine's copies). It recomputes every entry hash, every recorded
// transition and every state hash, then the state at --as-of, and compares with the server's own replay.
//   node replay.mjs decision-journal.json [--as-of 2026-11-02T08:00:00.000Z] [--live-lapses id1,id2]
// The input is the decision_journal object from POST /v1/review-cases {action:"get_decision_journal"}.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {replayDecisionJournal,internalRecommendation} from './decision.mjs';
import {digest} from './core.mjs';

export function replayExport(exported,{as_of,live_lapses}={}){
  if(!exported||!Array.isArray(exported.journal)||!exported.models||typeof exported.models!=='object')throw new Error('Supply the decision_journal object returned by get_decision_journal.');
  for(const [sha,model] of Object.entries(exported.models))if(digest(model)!==sha)throw new Error('Model does not match its digest: '+sha);
  const server=exported.server_replay||null;
  const asOf=as_of||server?.as_of||exported.journal.at(-1)?.at;
  const lapses=live_lapses||(server?.unjournaled_lapses||[]).map(l=>l.credential_id);
  const r=replayDecisionJournal({models:exported.models,journal:exported.journal,as_of:asOf,live_lapses:lapses});
  return {valid_chain:r.valid_chain,mismatches:r.mismatches,event_count:r.event_count,journal_head_sha256:r.journal_head_sha256,as_of:r.as_of,state_sha256:r.state.state_sha256,
    matches_server:server?server.journal_head_sha256===r.journal_head_sha256&&server.state_sha256===r.state.state_sha256:null,
    internal_recommendation:internalRecommendation(r.state).state,
    targets:r.state.targets.map(t=>({target:t.target,state:t.state,reason:t.reason,conditions:t.conditions,pending:t.pending_reviews.map(p=>p.fact_id)})),
    transitions:exported.journal.map(e=>({seq:e.seq,type:e.type,claims:e.transition.claims,targets_changed:e.transition.targets_changed,targets_independent:e.transition.targets_independent})),
    boundary:'A replay proves the journal is internally consistent and reproduces the recorded transitions. It does not verify who the reviewers are, what the originals say, or any permission.'};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--'));
  const opt=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
  if(!file){console.error('Usage: node replay.mjs decision-journal.json [--as-of ISO] [--live-lapses id1,id2]');process.exit(2);}
  const exported=JSON.parse(fs.readFileSync(file,'utf8'));
  const out=replayExport(exported.decision_journal||exported,{as_of:opt('--as-of'),live_lapses:opt('--live-lapses')?.split(',').filter(Boolean)});
  console.log(JSON.stringify(out,null,1));
  process.exitCode=out.valid_chain&&out.matches_server!==false?0:1;
}
