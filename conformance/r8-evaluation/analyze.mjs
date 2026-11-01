#!/usr/bin/env node
// Analysis for the R8 evaluation studies, fixed before results: per-arm event rates with exact (Clopper-Pearson) 95%
// intervals, the rule-of-three bound for zero observed unsafe events, buyer-weighted loss in three frozen views (by model
// and profile before pooling), and the R8 operational gates comparing amos_assisted with the frozen comparator.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const GATES = Object.freeze({reconstruction_time_reduction: 0.25, labour_or_closure_reduction: 0.20, other_no_worse_by: 0.10, wrong_closure_reduction: 0.30, reopen_reduction: 0.25, max_added_latency_or_effort: 0.15});
const UNSAFE = ['false_permit', 'scope_broadening', 'invented_authority'];

function binomCdf(k, n, p) { let s = 0, term = Math.pow(1 - p, n); for (let i = 0; i <= k; i++) { s += term; term *= (n - i) / (i + 1) * (p / (1 - p)); } return Math.min(1, s); }
export function clopperPearson(x, n, alpha = 0.05) {
  if (n === 0) return [0, 1];
  const solve = f => { let lo = 0, hi = 1; for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; f(mid) ? (hi = mid) : (lo = mid); } return (lo + hi) / 2; };
  const lower = x === 0 ? 0 : solve(p => 1 - binomCdf(x - 1, n, p) >= alpha / 2);
  const upper = x === n ? 1 : solve(p => binomCdf(x, n, p) <= alpha / 2);
  return [lower, upper];
}
export const ruleOfThree = n => n > 0 ? 3 / n : 1;
const median = xs => { const a = xs.filter(Number.isFinite).sort((p, q) => p - q); if (!a.length) return null; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const reduction = (amos, comp) => comp ? (comp - amos) / comp : null;

export function analyze({events, sealed, weights, comparator = 'strong_policy'}) {
  const arms = {};
  for (const e of events) {
    const arm = sealed[e.allocation_id];
    if (!arm) throw new Error('event without a sealed allocation: ' + e.allocation_id);
    const key = arm + '|' + (e.model_id ?? 'none') + '|' + e.profile;
    const a = arms[key] ??= {arm, model_id: e.model_id ?? null, profile: e.profile, n: 0, counts: {}, review: [], reconstruction: [], closure_delay: [], latency: [], corrections: 0};
    a.n++;
    for (const t of e.event_types) a.counts[t] = (a.counts[t] || 0) + 1;
    a.review.push(e.minutes.review); a.reconstruction.push(e.minutes.reconstruction); a.closure_delay.push(e.minutes.closure_delay_days); a.latency.push(e.minutes.integration_latency_ms);
    if (e.correction) a.corrections++;
  }
  const summary = Object.values(arms).map(a => {
    const unsafe = UNSAFE.reduce((s, t) => s + (a.counts[t] || 0), 0);
    const loss = Object.fromEntries(Object.entries(weights.views).map(([view, w]) => [view, Object.entries(a.counts).reduce((s, [t, c]) => s + (w[t] || 0) * c, 0) + (w.reviewer_minute || 0) * a.review.reduce((s, x) => s + (x || 0), 0) + (w.reconstruction_minute || 0) * a.reconstruction.reduce((s, x) => s + (x || 0), 0) + (w.closure_delay_day || 0) * a.closure_delay.reduce((s, x) => s + (x || 0), 0)]));
    return {arm: a.arm, model_id: a.model_id, profile: a.profile, n: a.n,
      rates: Object.fromEntries(['false_permit', 'false_hold', 'wrong_closure', 'reopen', 'bypass', 'missed_critical_defect'].map(t => [t, {count: a.counts[t] || 0, rate: (a.counts[t] || 0) / a.n, ci95: clopperPearson(a.counts[t] || 0, a.n)}])),
      unsafe_events: unsafe, unsafe_upper_95: unsafe === 0 ? ruleOfThree(a.n) : clopperPearson(unsafe, a.n)[1], unsafe_bound_method: unsafe === 0 ? 'rule_of_three' : 'clopper_pearson',
      median_review_minutes: median(a.review), median_reconstruction_minutes: median(a.reconstruction), median_closure_delay_days: median(a.closure_delay), median_latency_ms: median(a.latency), loss_per_case: Object.fromEntries(Object.entries(loss).map(([k, v]) => [k, v / a.n]))};
  });
  const gates = [];
  for (const amos of summary.filter(s => s.arm === 'amos_assisted')) {
    const comp = summary.find(s => s.arm === comparator && s.model_id === amos.model_id && s.profile === amos.profile) ?? summary.find(s => s.arm === comparator);
    if (!comp) continue;
    const r = (x, y) => reduction(x, y);
    const labour = r(amos.median_review_minutes, comp.median_review_minutes), closure = r(amos.median_closure_delay_days, comp.median_closure_delay_days);
    const checks = {
      safety_noninferior: amos.unsafe_events <= comp.unsafe_events && (amos.rates.false_permit.count === 0 || amos.rates.false_permit.rate <= comp.rates.false_permit.rate),
      false_hold_noninferior_same_pack: amos.rates.false_hold.count <= comp.rates.false_hold.count,
      reconstruction_25pct_lower: (r(amos.median_reconstruction_minutes, comp.median_reconstruction_minutes) ?? -1) >= GATES.reconstruction_time_reduction,
      labour_or_closure_20pct_lower_other_within_10pct: ((labour ?? -1) >= GATES.labour_or_closure_reduction && (closure ?? 0) >= -GATES.other_no_worse_by) || ((closure ?? -1) >= GATES.labour_or_closure_reduction && (labour ?? 0) >= -GATES.other_no_worse_by),
      wrong_closures_30pct_fewer: (r(amos.rates.wrong_closure.count, comp.rates.wrong_closure.count) ?? 0) >= GATES.wrong_closure_reduction || (comp.rates.wrong_closure.count === 0 && amos.rates.wrong_closure.count === 0),
      reopens_25pct_fewer: (r(amos.rates.reopen.count, comp.rates.reopen.count) ?? 0) >= GATES.reopen_reduction || (comp.rates.reopen.count === 0 && amos.rates.reopen.count === 0),
      no_increase_in_bypasses: amos.rates.bypass.count <= comp.rates.bypass.count,
      added_latency_within_15pct: comp.median_latency_ms == null || amos.median_latency_ms == null || (amos.median_latency_ms - comp.median_latency_ms) / Math.max(1, comp.median_latency_ms) <= GATES.max_added_latency_or_effort,
      balanced_loss_below: amos.loss_per_case.balanced < comp.loss_per_case.balanced,
      opportunity_loss_not_higher: amos.loss_per_case.opportunity_heavy <= comp.loss_per_case.opportunity_heavy};
    gates.push({model_id: amos.model_id, profile: amos.profile, comparator: comp.arm, checks, all_pass: Object.values(checks).every(Boolean)});
  }
  return {contract_version: 'amos.r8-evaluation-analysis/1', weights_frozen_at: weights.frozen_at, gates_frozen: GATES, summary, gates, pooled_only_after_per_model_profile: true};
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const events = JSON.parse(fs.readFileSync(arg('events'), 'utf8'));
  const sealed = JSON.parse(fs.readFileSync(arg('sealed'), 'utf8')).sealed;
  const weights = JSON.parse(fs.readFileSync(arg('weights') || path.join(here, 'loss-weights.json'), 'utf8'));
  console.log(JSON.stringify(analyze({events, sealed, weights}), null, 1));
}
