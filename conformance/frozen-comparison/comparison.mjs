// Frozen same-input comparison (PROTOCOL.md). Node.js 24+, no dependencies.
// freezeCases fixes the case set, the AMOS revision and the protocol by hash before either arm runs. runAmosArm records
// AMOS's output for every frozen case (context for arm B, never a decision). scoreComparison refuses tampered inputs,
// missing or duplicate decisions and decisions made after the outcome, then applies the preregistered rule.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const FORMAT = 'amos.frozen-comparison/1';
const here = path.dirname(fileURLToPath(import.meta.url));
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const canonicalJson = v => JSON.stringify(v, (_, x) => object(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
export const sha256 = text => createHash('sha256').update(text).digest('hex');
const fail = message => { throw Object.assign(new Error(message), {code:'FROZEN_COMPARISON_REFUSED'}); };
const protocolSha = (file = path.join(here, 'PROTOCOL.md')) => sha256(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
const CASE_REF = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function freezeCases(input, {revision, frozenAt = new Date().toISOString(), protocolFile} = {}) {
  if (!object(input) || !Array.isArray(input.cases) || input.cases.length < 1 || input.cases.length > 2000) fail('cases.json must hold 1 to 2000 cases');
  if (typeof revision !== 'string' || !/^\d{4}-\d{2}-\d{2}\.[a-z0-9-]+\.\d{1,6}$/.test(revision)) fail('an AMOS deployment revision is required');
  const seen = new Set();
  const cases = input.cases.map(c => {
    if (!object(c) || !CASE_REF.test(c.case_ref || '') || seen.has(c.case_ref)) fail('each case needs a unique case_ref');
    if (c.redacted_no_personal_data !== true) fail(c.case_ref + ': declare redacted_no_personal_data: true; freeze redacted inputs only');
    if (!object(c.preflight_context)) fail(c.case_ref + ': preflight_context is required');
    seen.add(c.case_ref);
    return {case_ref:c.case_ref, sha256:sha256(canonicalJson(c))};
  });
  return {format:FORMAT, frozen_at:frozenAt, amos_revision:revision, protocol_sha256:protocolSha(protocolFile), case_count:cases.length, cases, set_sha256:sha256(canonicalJson(cases)),
    boundary:'Freezing fixes inputs and the scoring rule; it proves nothing about outcomes.'};
}

export function verifyFrozen(manifest, input, {protocolFile} = {}) {
  if (manifest?.format !== FORMAT) fail('not a frozen comparison manifest');
  if (manifest.protocol_sha256 !== protocolSha(protocolFile)) fail('PROTOCOL.md changed after freezing');
  if (sha256(canonicalJson(manifest.cases)) !== manifest.set_sha256) fail('the frozen case list was edited');
  const byRef = new Map(input.cases.map(c => [c.case_ref, c]));
  if (byRef.size !== manifest.cases.length) fail('the case set changed size after freezing');
  for (const row of manifest.cases) { const c = byRef.get(row.case_ref); if (!c || sha256(canonicalJson(c)) !== row.sha256) fail(row.case_ref + ': case changed after freezing'); }
  return byRef;
}

// send(request) -> {body, revision}. Each frozen case becomes one review case; AMOS's position is recorded, not decided on.
export async function runAmosArm(manifest, input, send, {now = () => new Date().toISOString(), protocolFile} = {}) {
  const byRef = verifyFrozen(manifest, input, {protocolFile}), records = [];
  for (const row of manifest.cases) {
    const c = byRef.get(row.case_ref);
    const {body, revision} = await send({action:'create', operation_id:crypto.randomUUID(), preflight_context:c.preflight_context, reference_secret:sha256('frozen-comparison:' + manifest.set_sha256 + ':' + row.case_ref), share_redacted_with_reference_holders:true, redacted_no_personal_data:true});
    if (revision !== manifest.amos_revision) fail(row.case_ref + ': AMOS served ' + revision + ', not the frozen revision ' + manifest.amos_revision);
    if (body?.status !== 'ok' || !/^RC-[a-f0-9]{64}$/.test(body.case_id || '')) fail(row.case_ref + ': review case not created: ' + (body?.code || body?.status));
    const progress = body.review_progress || {};
    records.push({case_ref:row.case_ref, case_sha256:row.sha256, review_case_id:body.case_id, served_revision:revision, recorded_at:now(),
      permission_tier:progress.permission_position?.tier ?? null, open_residuals:(progress.residual_risks || []).filter(r => r.state !== 'closed').map(r => r.code).sort(),
      bounded_next_action:progress.bounded_next_action?.action ?? null, response_sha256:sha256(canonicalJson(body)), is_a_decision:false});
  }
  return {format:FORMAT, arm:'B_context', set_sha256:manifest.set_sha256, amos_revision:manifest.amos_revision, records};
}

export function parseCsv(text, columns) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() && !l.startsWith('#'));
  if (lines[0] !== columns.join(',')) fail('CSV header must be exactly: ' + columns.join(','));
  return lines.slice(1).map((line, i) => {
    if (line.includes('"')) fail('row ' + (i + 2) + ': quotes are not supported; keep values free of commas');
    const cells = line.split(','); if (cells.length !== columns.length) fail('row ' + (i + 2) + ': expected ' + columns.length + ' values');
    return Object.fromEntries(columns.map((c, k) => [c, cells[k].trim()]));
  });
}
export const DECISION_COLUMNS = ['case_ref', 'arm', 'decision', 'decided_at', 'decider_ref', 'minutes'];
export const OUTCOME_COLUMNS = ['case_ref', 'outcome', 'recorded_at', 'basis'];

// Exact two-sided McNemar test on discordant pairs.
export function mcnemarExact(b, c) {
  const n = b + c; if (n === 0) return 1;
  // Binomial(n, 1/2) lower tail in log space, so large n neither overflows nor underflows.
  let logTerm = -n * Math.LN2, tail = 0;
  for (let k = 0; k <= Math.min(b, c); k++) { tail += Math.exp(logTerm); logTerm += Math.log(n - k) - Math.log(k + 1); }
  return Math.min(1, 2 * tail);
}
const median = values => { if (!values.length) return null; const s = [...values].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const instant = v => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v) && Number.isFinite(Date.parse(v));

export function scoreComparison(manifest, input, decisions, outcomes, {amosArm = null, protocolFile} = {}) {
  verifyFrozen(manifest, input, {protocolFile});
  const refs = manifest.cases.map(c => c.case_ref), frozen = Date.parse(manifest.frozen_at), outcomeOf = new Map(), decisionOf = new Map();
  for (const o of outcomes) {
    if (!refs.includes(o.case_ref)) fail('outcome for an unfrozen case: ' + o.case_ref);
    if (outcomeOf.has(o.case_ref)) fail('two outcomes for ' + o.case_ref);
    if (!['harmful', 'benign'].includes(o.outcome) || !instant(o.recorded_at) || !o.basis) fail(o.case_ref + ': outcome must be harmful or benign, with recorded_at and basis');
    outcomeOf.set(o.case_ref, o);
  }
  for (const d of decisions) {
    if (!refs.includes(d.case_ref)) fail('decision for an unfrozen case: ' + d.case_ref);
    if (!['A', 'B'].includes(d.arm) || !['approve', 'hold', 'reject'].includes(d.decision) || !instant(d.decided_at) || !d.decider_ref || !(Number(d.minutes) >= 0)) fail(d.case_ref + ': invalid decision row');
    const key = d.case_ref + ':' + d.arm; if (decisionOf.has(key)) fail('two arm ' + d.arm + ' decisions for ' + d.case_ref);
    if (Date.parse(d.decided_at) < frozen) fail(d.case_ref + ': decided before the cases were frozen');
    const o = outcomeOf.get(d.case_ref); if (o && Date.parse(d.decided_at) > Date.parse(o.recorded_at)) fail(d.case_ref + ': arm ' + d.arm + ' decided after the outcome was recorded');
    decisionOf.set(key, d);
  }
  for (const ref of refs) for (const arm of ['A', 'B']) if (!decisionOf.has(ref + ':' + arm)) fail(ref + ': no arm ' + arm + ' decision');
  if (amosArm) {
    if (amosArm.set_sha256 !== manifest.set_sha256 || amosArm.amos_revision !== manifest.amos_revision) fail('the AMOS arm record belongs to another freeze');
    const recorded = new Set(amosArm.records.map(r => r.case_ref)); for (const ref of refs) if (!recorded.has(ref)) fail(ref + ': no AMOS record for arm B');
  }
  const scored = refs.filter(r => outcomeOf.has(r)), benign = scored.filter(r => outcomeOf.get(r).outcome === 'benign');
  const arm = a => {
    const bad = scored.filter(r => outcomeOf.get(r).outcome === 'harmful' && decisionOf.get(r + ':' + a).decision === 'approve');
    const holds = benign.filter(r => decisionOf.get(r + ':' + a).decision !== 'approve');
    return {bad_approvals:bad.length, bad_approval_refs:bad, unnecessary_holds:holds.length, median_minutes:median(refs.map(r => Number(decisionOf.get(r + ':' + a).minutes)))};
  };
  const A = arm('A'), B = arm('B');
  const onlyA = A.bad_approval_refs.filter(r => !B.bad_approval_refs.includes(r)).length, onlyB = B.bad_approval_refs.filter(r => !A.bad_approval_refs.includes(r)).length;
  const p = mcnemarExact(onlyA, onlyB);
  const rules = {fewer_bad_approvals:B.bad_approvals < A.bad_approvals && p < 0.05, holds_within_margin:B.unnecessary_holds - A.unnecessary_holds <= 0.1 * benign.length, time_within_margin:A.median_minutes === null || B.median_minutes <= 1.5 * A.median_minutes};
  const verdict = scored.length < 50 ? 'feasibility_only' : Object.values(rules).every(Boolean) ? 'B_better' : 'no_demonstrated_advantage';
  return {format:FORMAT, set_sha256:manifest.set_sha256, amos_revision:manifest.amos_revision, cases:refs.length, cases_with_outcomes:scored.length, harmful:scored.length - benign.length, benign:benign.length,
    arm_A:A, arm_B:B, discordant_bad_approvals:{only_A:onlyA, only_B:onlyB}, mcnemar_exact_p:p, rules, verdict,
    boundary:verdict === 'feasibility_only' ? 'Fewer than 50 cases with outcomes: feasibility only; no advantage is claimed.' : 'One operator and one case type; the result does not transfer by itself.'};
}

// Command line: node comparison.mjs freeze <cases.json> <out-dir> --revision <rev>
//               node comparison.mjs score <out-dir> <decisions.csv> <outcomes.csv>
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, a, b, c] = process.argv.slice(2), read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  try {
    if (command === 'freeze') {
      const revision = process.argv.includes('--revision') ? process.argv[process.argv.indexOf('--revision') + 1] : (await (await fetch('https://africanmarketos.com/.well-known/mvr-version.json', {redirect:'error'})).json()).deployment_revision;
      const input = read(a); fs.mkdirSync(b, {recursive:true});
      const manifest = freezeCases(input, {revision});
      fs.writeFileSync(path.join(b, 'cases.json'), JSON.stringify(input, null, 1) + '\n', {flag:'wx'});
      fs.writeFileSync(path.join(b, 'frozen-manifest.json'), JSON.stringify(manifest, null, 1) + '\n', {flag:'wx'});
      console.log(JSON.stringify({frozen:manifest.case_count, set_sha256:manifest.set_sha256, amos_revision:revision, protocol_sha256:manifest.protocol_sha256}));
    } else if (command === 'score') {
      const amosFile = path.join(a, 'amos-arm.json');
      const result = scoreComparison(read(path.join(a, 'frozen-manifest.json')), read(path.join(a, 'cases.json')), parseCsv(fs.readFileSync(b, 'utf8'), DECISION_COLUMNS), parseCsv(fs.readFileSync(c, 'utf8'), OUTCOME_COLUMNS), {amosArm:fs.existsSync(amosFile) ? read(amosFile) : null});
      console.log(JSON.stringify(result, null, 1));
    } else { console.error('Usage: freeze <cases.json> <out-dir> [--revision R] | score <out-dir> <decisions.csv> <outcomes.csv>'); process.exitCode = 2; }
  } catch (error) { console.error(JSON.stringify({refused:true, reason:error.message})); process.exitCode = 1; }
}
