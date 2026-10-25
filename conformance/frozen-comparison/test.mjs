// Tests the frozen comparison harness with proprietary lab fixtures. The decisions and outcomes below exercise the scorer
// only: they are not observations of any organisation or operator.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {freezeCases, verifyFrozen, runAmosArm, scoreComparison, mcnemarExact, parseCsv, DECISION_COLUMNS, OUTCOME_COLUMNS, canonicalJson, sha256} from './comparison.mjs';
const revision = '2026-10-26.review-feedback.1', frozenAt = '2026-11-01T08:00:00.000Z';
const labCase = i => ({case_ref:'LAB-' + String(i).padStart(3, '0'), redacted_no_personal_data:true, preflight_context:{subject:{entity_name:'Proprietary lab operator ' + i}, market_scope:{country:'UG'}, decision_question:'Lab fixture: approve one bounded disbursement?'}});
const input = n => ({cases:Array.from({length:n}, (_, i) => labCase(i + 1))});
const results = [];
const test = (name, run) => { run(); results.push(name); };
const refuses = (run, pattern) => assert.throws(run, e => e.code === 'FROZEN_COMPARISON_REFUSED' && pattern.test(e.message), 'expected refusal ' + pattern);

test('exact McNemar values', () => {
  const near = (x, y) => assert(Math.abs(x - y) < 1e-12, x + ' vs ' + y);
  near(mcnemarExact(0, 0), 1); near(mcnemarExact(0, 6), 2 / 64); near(mcnemarExact(6, 0), 2 / 64);
  assert(Math.abs(mcnemarExact(1, 5) - 14 / 64) < 1e-12); near(mcnemarExact(3, 3), 1);
  const big = mcnemarExact(500, 600); assert(big > 0 && big < 0.01, 'large n stays finite: ' + big);
});
test('freezing refuses unredacted, duplicate or revision-less input', () => {
  refuses(() => freezeCases({cases:[{...labCase(1), redacted_no_personal_data:false}]}, {revision}), /redacted/);
  refuses(() => freezeCases({cases:[labCase(1), labCase(1)]}, {revision}), /unique/);
  refuses(() => freezeCases(input(2), {revision:'latest'}), /revision/);
});
test('any change after freezing is refused', () => {
  const frozen = freezeCases(input(3), {revision, frozenAt});
  const edited = structuredClone(input(3)); edited.cases[1].preflight_context.decision_question = 'changed';
  refuses(() => verifyFrozen(frozen, edited), /changed after freezing/);
  refuses(() => verifyFrozen({...frozen, cases:frozen.cases.slice(1)}, input(3)), /edited/);
  refuses(() => verifyFrozen({...frozen, protocol_sha256:'0'.repeat(64)}, input(3)), /PROTOCOL/);
  assert.equal(verifyFrozen(frozen, input(3)).size, 3);
});
// Lab decision fixtures: n cases, a set of harmful refs, and per-arm approvals.
const rows = (n, approveA, approveB, minutesA = 10, minutesB = 12) => Array.from({length:n}, (_, i) => labCase(i + 1).case_ref).flatMap(ref => [
  {case_ref:ref, arm:'A', decision:approveA(ref) ? 'approve' : 'hold', decided_at:'2026-11-02T08:00:00.000Z', decider_ref:'lab-decider-a', minutes:String(minutesA)},
  {case_ref:ref, arm:'B', decision:approveB(ref) ? 'approve' : 'hold', decided_at:'2026-11-20T08:00:00.000Z', decider_ref:'lab-decider-b', minutes:String(minutesB)}]);
const outcomesFor = (n, harmful) => Array.from({length:n}, (_, i) => labCase(i + 1).case_ref).map(ref => ({case_ref:ref, outcome:harmful(ref) ? 'harmful' : 'benign', recorded_at:'2026-12-15T08:00:00.000Z', basis:'lab fixture'}));
const num = ref => Number(ref.slice(4));
test('fewer than 50 outcomes is feasibility only, whatever the numbers', () => {
  const n = 20, frozen = freezeCases(input(n), {revision, frozenAt}), harmful = ref => num(ref) <= 6;
  const r = scoreComparison(frozen, input(n), rows(n, () => true, ref => !harmful(ref)), outcomesFor(n, harmful));
  assert.equal(r.verdict, 'feasibility_only'); assert.equal(r.arm_A.bad_approvals, 6); assert.equal(r.arm_B.bad_approvals, 0);
});
test('a preregistered advantage on 60 cases', () => {
  const n = 60, frozen = freezeCases(input(n), {revision, frozenAt}), harmful = ref => num(ref) <= 10;
  const r = scoreComparison(frozen, input(n), rows(n, () => true, ref => !harmful(ref) || num(ref) === 1), outcomesFor(n, harmful));
  assert.deepEqual(r.discordant_bad_approvals, {only_A:9, only_B:0}); assert(r.mcnemar_exact_p < 0.05);
  assert.equal(r.arm_B.unnecessary_holds, 0); assert.equal(r.verdict, 'B_better');
});
test('too many unnecessary holds is no demonstrated advantage', () => {
  const n = 60, frozen = freezeCases(input(n), {revision, frozenAt}), harmful = ref => num(ref) <= 10;
  const r = scoreComparison(frozen, input(n), rows(n, () => true, ref => num(ref) > 25), outcomesFor(n, harmful));
  assert(r.rules.fewer_bad_approvals); assert.equal(r.rules.holds_within_margin, false); assert.equal(r.verdict, 'no_demonstrated_advantage');
});
test('too much time is no demonstrated advantage', () => {
  const n = 60, frozen = freezeCases(input(n), {revision, frozenAt}), harmful = ref => num(ref) <= 10;
  const r = scoreComparison(frozen, input(n), rows(n, () => true, ref => !harmful(ref), 10, 16), outcomesFor(n, harmful));
  assert.equal(r.rules.time_within_margin, false); assert.equal(r.verdict, 'no_demonstrated_advantage');
});
test('decisions after the outcome, before freezing, duplicated or missing are refused', () => {
  const n = 3, frozen = freezeCases(input(n), {revision, frozenAt}), base = rows(n, () => true, () => true), out = outcomesFor(n, () => false);
  refuses(() => scoreComparison(frozen, input(n), base.map((d, i) => i === 1 ? {...d, decided_at:'2026-12-20T08:00:00.000Z'} : d), out), /after the outcome/);
  refuses(() => scoreComparison(frozen, input(n), base.map((d, i) => i === 0 ? {...d, decided_at:'2026-10-01T08:00:00.000Z'} : d), out), /before the cases were frozen/);
  refuses(() => scoreComparison(frozen, input(n), [...base, base[0]], out), /two arm A/);
  refuses(() => scoreComparison(frozen, input(n), base.slice(1), out), /no arm A/);
  refuses(() => scoreComparison(frozen, input(n), base, [...out, out[0]]), /two outcomes/);
});
const frozen = freezeCases(input(3), {revision, frozenAt});
const send = served => async request => ({revision:served, body:{status:'ok', case_id:'RC-' + sha256(request.preflight_context.subject.entity_name), review_progress:{permission_position:{tier:'planning_only'}, residual_risks:[{code:'PERMISSION_STATUS_UNASSESSED', state:'open'}], bounded_next_action:null}}});
const arm = await runAmosArm(frozen, input(3), send(revision));
assert.equal(arm.records.length, 3); assert(arm.records.every(r => r.is_a_decision === false && r.permission_tier === 'planning_only' && r.served_revision === revision));
await assert.rejects(() => runAmosArm(frozen, input(3), send('2026-10-27.other.1')), /not the frozen revision/);
const decisions = rows(3, () => true, () => true), outcomes = outcomesFor(3, () => false);
assert.equal(scoreComparison(frozen, input(3), decisions, outcomes, {amosArm:arm}).verdict, 'feasibility_only');
refuses(() => scoreComparison(frozen, input(3), decisions, outcomes, {amosArm:{...arm, records:arm.records.slice(1)}}), /no AMOS record/);
refuses(() => scoreComparison(frozen, input(3), decisions, outcomes, {amosArm:{...arm, set_sha256:'0'.repeat(64)}}), /another freeze/);
test('CSV templates parse and malformed rows are refused', () => {
  assert.equal(parseCsv(fs.readFileSync(new URL('./decisions.template.csv', import.meta.url), 'utf8'), DECISION_COLUMNS).length, 2);
  assert.equal(parseCsv(fs.readFileSync(new URL('./outcomes.template.csv', import.meta.url), 'utf8'), OUTCOME_COLUMNS).length, 1);
  refuses(() => parseCsv('case_ref,arm\nx,A', DECISION_COLUMNS), /header/);
  refuses(() => parseCsv(DECISION_COLUMNS.join(',') + '\n"a,b",A,approve,x,y,1', DECISION_COLUMNS), /quotes/);
  assert.equal(sha256(canonicalJson({b:1, a:2})), sha256('{"a":2,"b":1}'));
});
console.log(JSON.stringify({passed:true, tests:results.length + 1, results, classification:'proprietary lab fixtures exercising the scorer; not observations'}));
