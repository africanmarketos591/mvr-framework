// Tests for the R8 evaluation instruments: allocation balance and washout, exact intervals, rule of three, frozen weights
// and gate evaluation on proprietary lab fixture events (not observations of any organisation).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {allocate, ARMS} from './allocate.mjs';
import {analyze, clopperPearson, ruleOfThree} from './analyze.mjs';
const weights = JSON.parse(fs.readFileSync(new URL('./loss-weights.json', import.meta.url), 'utf8'));
let passed = 0;
const strata = [...Array(16).fill('complete_positive'), ...Array(16).fill('decisive_gap_or_adverse_change'), ...Array(8).fill('irrelevant_addition'), ...Array(8).fill('internal_only')];
const cases = strata.map((stratum, i) => ({case_id: 'OC-' + String(i + 1).padStart(2, '0'), stratum}));
const reviewers = ['RV1', 'RV2', 'RV3', 'RV4', 'RV5', 'RV6'];
const a = allocate({cases, reviewers, seed: 'frozen-seed-2026-11-01'});
assert.equal(a.schedule.length, 432); passed++;
for (const r of reviewers) { const counts = Object.values(a.diagnostics.arm_by_reviewer[r]); assert.equal(counts.reduce((s, x) => s + x, 0), 72); assert.ok(Math.max(...counts) - Math.min(...counts) <= 2, r + ' arm balance ' + counts); }
passed++;
assert.equal(a.diagnostics.same_arm_repeats, 0, 'a repeated case is always another arm'); assert.ok(a.diagnostics.min_washout_sessions >= 1, 'washout: every repeat in a later session'); passed++;
assert.deepEqual(allocate({cases, reviewers, seed: 'frozen-seed-2026-11-01'}).sealed_sha256, a.sealed_sha256, 'deterministic from the frozen seed'); passed++;
assert.ok(!JSON.stringify(a.schedule).includes('amos_assisted'), 'the schedule carries no treatment identity'); passed++;
assert.throws(() => allocate({cases, reviewers: reviewers.slice(0, 5), seed: 'x'}), /six/); passed++;
// Exact intervals and the rule of three.
const [lo, hi] = clopperPearson(0, 100); assert.equal(lo, 0); assert.ok(Math.abs(hi - 0.0362) < 0.0005, String(hi)); passed++;
const [l2, h2] = clopperPearson(5, 50); assert.ok(Math.abs(l2 - 0.0333) < 0.001 && Math.abs(h2 - 0.2181) < 0.001, l2 + ' ' + h2); passed++;
assert.equal(ruleOfThree(120), 0.025); passed++;
assert.equal(weights.frozen_before_results, true); assert.deepEqual(Object.keys(weights.views), ['risk_heavy', 'balanced', 'opportunity_heavy']); passed++;
// Gate evaluation on fixture events: amos arm better on reconstruction and closures, equal on safety.
const events = a.schedule.map((s, i) => {
  const arm = a.sealed[s.allocation_id], amos = arm === 'amos_assisted';
  const types = i % 40 === 0 && arm === 'strong_policy' ? ['wrong_closure'] : i % 50 === 0 && arm === 'competent_conventional' ? ['reopen'] : ['correct'];
  return {contract_version: 'amos.evaluation-event/1', study: 'operational_comparison', case_id: s.case_id, allocation_id: s.allocation_id, reviewer_ref: s.reviewer, model_id: null, profile: 'not_applicable', effect_id: 'E1',
    decided: {analytical: 'favorable', execution: 'not_authorized'}, oracle: {analytical: 'favorable', execution: 'not_authorized'}, event_types: types, minutes: {review: amos ? 10 : 14, reconstruction: amos ? 6 : 12, closure_delay_days: amos ? 1 : 2, integration_latency_ms: amos ? 900 : 850}};
});
const r = analyze({events, sealed: a.sealed, weights});
const g = r.gates[0];
assert.equal(g.comparator, 'strong_policy'); assert.equal(g.checks.reconstruction_25pct_lower, true); assert.equal(g.checks.safety_noninferior, true); assert.equal(g.checks.added_latency_within_15pct, true); passed++;
assert.throws(() => analyze({events: [{...events[0], allocation_id: 'AL-unknown'}], sealed: a.sealed, weights}), /sealed allocation/); passed++;
console.log(JSON.stringify({passed, tasks: a.schedule.length, diagnostics: a.diagnostics, classification: 'proprietary lab fixtures'}));
