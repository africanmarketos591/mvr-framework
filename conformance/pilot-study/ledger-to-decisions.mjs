#!/usr/bin/env node
// Fills arm A's server-recorded columns from the AMOS outcome ledger, so AMOS collects the operational events while
// adjudication stays outside it. A ledger entry is matched to a decision when its evidence_ref equals the decision_ref.
//   node ledger-to-decisions.mjs <ledger.json> <decisions.csv> > decisions.with-ledger.csv
// ledger.json is the response of POST /v1/review-cases {action:"get_review_outcome_ledger"}.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parseCsv,DECISION_COLUMNS} from './pilot.mjs';

export function mergeLedger(ledger,rows){
  const entries=(ledger?.review_outcome_ledger?.entries||ledger?.entries||[]).filter(e=>e&&typeof e.evidence_ref==='string');
  const byRef=new Map();for(const e of entries)byRef.set(e.evidence_ref,e);
  const changed=[],out=rows.map(r=>{
    if(r.arm!=='A')return r;
    const e=byRef.get(r.decision_ref),x=e?.economics;if(!x)return r;
    const next={...r,...(Number.isFinite(x.reviewer_minutes)?{reviewer_minutes:String(x.reviewer_minutes)}:{}),...(Number.isFinite(x.integration_minutes)?{integration_minutes:String(x.integration_minutes)}:{}),
      ...(Number.isFinite(x.elapsed_to_outcome_ms)?{elapsed_closure_minutes:String(Math.round(x.elapsed_to_outcome_ms/60000))}:{}),...(Number.isInteger(x.reopenings)?{reopened:String(x.reopenings>0)}:{})};
    changed.push({decision_ref:r.decision_ref,case_id:e.case_id,ledger_sequence:e.sequence});return next;
  });
  return {rows:out,changed,unmatched_arm_a:rows.filter(r=>r.arm==='A'&&!byRef.has(r.decision_ref)).map(r=>r.decision_ref)};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const [ledgerFile,csvFile]=process.argv.slice(2);
  if(!ledgerFile||!csvFile){console.error('Usage: node ledger-to-decisions.mjs <ledger.json> <decisions.csv>');process.exit(2);}
  const {rows,changed,unmatched_arm_a}=mergeLedger(JSON.parse(fs.readFileSync(ledgerFile,'utf8')),parseCsv(fs.readFileSync(csvFile,'utf8'),DECISION_COLUMNS));
  process.stdout.write(DECISION_COLUMNS.join(',')+'\n'+rows.map(r=>DECISION_COLUMNS.map(c=>r[c]).join(',')).join('\n')+'\n');
  console.error(JSON.stringify({filled_from_ledger:changed.length,unmatched_arm_a}));
}
