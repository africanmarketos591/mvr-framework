#!/usr/bin/env node
// Builds the R10 exact-reducer fixtures:
//   cohort.json     four sentence sets (C, D, E, F), each 8 scenarios x (5 complete, 5 missing, 5 conditional) = 120 cases, written
//                   one after another on 2026-11-10/11, each frozen before it was first run. 480 cases, 1,440 effect rows.
//   structure.json  one case encoded every way a caller can encode a missing link or a qualifier (replaced record, added beside
//                   support, each declared relationship, unlinked, context only, dated earlier or later, undated, geography
//                   undeclared, in the claim's own wording), plus silent support, unrelated additions that carry cue words,
//                   and revoked and prohibited records.
// All case data are proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); none is an observation of a
// real organisation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const AD = '2026-11-01';
const effects = [{effect_id: 'EXT', effect_type: 'external_offer', description: 'Send the offer to the counterparty'}, {effect_id: 'INT-REC', effect_type: 'internal_recommendation', description: 'Recommend proceeding to the board'}, {effect_id: 'INT-PLAN', effect_type: 'internal_planning', description: 'Plan the internal workstream'}];
const EXPECT = {
  complete: {EXT: ['favorable', 'not_authorized', 'not_authorized'], 'INT-REC': ['favorable', 'planning_only', 'planning_only'], 'INT-PLAN': ['favorable', 'planning_only', 'planning_only']},
  missing: {EXT: ['insufficient', 'not_authorized', 'not_authorized'], 'INT-REC': ['insufficient', 'planning_only', 'not_authorized'], 'INT-PLAN': ['favorable', 'planning_only', 'planning_only']},
  conditional: {EXT: ['conditional', 'not_authorized', 'not_authorized'], 'INT-REC': ['conditional', 'planning_only', 'planning_only'], 'INT-PLAN': ['favorable', 'planning_only', 'planning_only']}};
const triple = ([analytical, authority, execution]) => ({analytical, authority, execution});
const cases = [];
for (const set of ['c', 'd', 'e', 'f']) {
  const {SCENARIOS, P, M, C} = await import('./set-' + set + '.mjs');
  for (const [variant, group] of [['complete', P], ['missing', M], ['conditional', C]]) for (const [sid, list] of Object.entries(group)) for (const [i, text] of list.entries()) {
    const sc = SCENARIOS[sid];
    cases.push({case_id: `${set.toUpperCase()}:${variant}:${sid}.${i + 1}`, set: set.toUpperCase(), scenario: sid, variant,
      request: {analysis_date: AD, market_scope: {country: sc.country}, subject: {entity_name: sc.subject}, requested_effects: effects,
        claims: [{claim_id: 'C1', claim: sc.claim, support_links: [{evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}]}],
        evidence_pack: [{evidence_id: 'E1', claim: text, source_class: 'counterparty_record', evidence_geography: {country: sc.country}, source_date: '2026-10-05'}]},
      expected: Object.fromEntries(Object.entries(EXPECT[variant]).map(([id, v]) => [id, triple(v)]))});
  }
}
fs.writeFileSync(path.join(here, 'cohort.json'), JSON.stringify({classification: 'proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); not observations of real organisations', frozen: '2026-11-11',
  contract_version: 'mvr.effect-decision/1', precedence_version: 'mvr.effect-precedence/3', support_state_version: 'mvr.support-state/2',
  shape: '4 sets x 8 scenarios x (5 complete, 5 missing, 5 conditional) x 3 effects (external offer, internal recommendation, internal planning) = 480 cases, 1,440 effect rows',
  measured: 'See README.md: each set was scored once before any change made for it, and those first passes are the generalisation record.', cases}, null, 1) + '\n');

// ---- structure
const rec = (id, text, extra = {}) => ({evidence_id: id, claim: text, source_class: id === 'E1' ? 'regulator_published' : 'counterparty_record', evidence_geography: {country: 'UG', locality: 'gulu'}, source_date: '2026-09-20', ...extra});
const P1 = 'The Electricity Regulatory Authority granted retail licence ERA-RL-221 to Nile Solar Ltd on 2026-05-20, valid until 2028-05-19.';
const P2 = 'Acholi Power Services executed an installation partnership with Nile Solar Ltd on 2026-07-11.';
const Mtext = 'The installation partnership has not been signed.', Ctext = 'The partnership applies subject to ratification by the Acholi Power Services board.';
const fx = [{effect_id: 'EXT-OFFER', effect_type: 'external_offer', description: 'Send distribution terms to the gulu partner'}, {effect_id: 'EXT-ORDER', effect_type: 'procurement_order', description: 'Place the first stock order'},
  {effect_id: 'INT-REC', effect_type: 'internal_recommendation', description: 'Recommend market entry to the board'}, {effect_id: 'INT-PLAN', effect_type: 'internal_planning', description: 'Plan the internal entry workstream'}];
const base = () => ({analysis_date: AD, market_scope: {country: 'UG', locality: 'gulu'}, subject: {entity_name: 'Nile Solar Ltd'}, requested_effects: fx,
  claims: [{claim_id: 'C1', claim: 'Nile Solar Ltd holds a current electricity retail licence in Uganda.', support_links: [{evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}]},
    {claim_id: 'C2', claim: 'Nile Solar Ltd has an active Gulu installation partner.', support_links: [{evidence_id: 'E2', relationship: 'direct_support', locator: 'claim'}]}], evidence_pack: [rec('E1', P1), rec('E2', P2)]});
const link = (r, rel) => r.claims[1].support_links.push({evidence_id: 'E3', relationship: rel, locator: 'claim'});
const S = [];
const add = (case_id, analytical, request, note, extra = {}) => S.push({case_id, expected: {analytical, internal_recommendation: extra.rec ?? analytical, internal_planning: 'favorable', ...(extra.authority ? {authority: extra.authority} : {}), ...(extra.reason ? {reason: extra.reason} : {})}, note, request});
add('complete', 'favorable', base(), 'Both load-bearing claims have current, in-scope support that states the link established.');
for (const [kind, text, state] of [['missing', Mtext, 'insufficient'], ['qualifier', Ctext, 'conditional']]) {
  { const r = base(); r.evidence_pack[1] = rec('E2', text); add(kind + ':replaces-the-support', state, r, 'The only record for the claim says it.'); }
  { const r = base(); r.evidence_pack.push(rec('E3', text)); link(r, 'direct_support'); add(kind + ':added-beside-support', state, r, kind === 'missing' ? 'Missing-link precedence: the statement outweighs support it does not post-date.' : 'Qualifier precedence: a qualified record narrows the claim beside unqualified support.', kind === 'missing' ? {reason: 'MISSING_LINK_PRECEDES_SUPPORT'} : {reason: 'SUPPORT_QUALIFIED'}); }
  { const r = base(); r.evidence_pack.push(rec('E3', text)); link(r, 'qualifies'); add(kind + ':added-declared-qualifies', state, r, kind === 'missing' ? 'A declared qualifier whose text says the link is missing is a missing link.' : 'Declared and stated qualifier.'); }
  { const r = base(); r.evidence_pack.push(rec('E3', text)); link(r, 'context_only'); add(kind + ':added-context-only', state, r, 'A context record about the claim cannot support it, and still weakens it.'); }
  { const r = base(); r.evidence_pack.push(rec('E3', text)); add(kind + ':added-unlinked', state, r, 'Leaving a record unlinked does not silence it.'); }
  { const r = base(); r.evidence_pack.push(rec('E3', text, {source_date: '2026-10-15'})); link(r, 'direct_support'); add(kind + ':added-dated-later', state, r, 'A later statement stands.'); }
  { const r = base(); const e = rec('E3', text); delete e.source_date; r.evidence_pack.push(e); link(r, 'direct_support'); add(kind + ':added-undated', state, r, 'An undated record cannot support; what it says against the link still counts.'); }
  { const r = base(); const e = rec('E3', text); delete e.evidence_geography; r.evidence_pack.push(e); link(r, 'direct_support'); add(kind + ':added-geography-undeclared', state, r, 'A record with no declared geography cannot support; what it says against the link still counts.'); }
  { const r = base(); r.evidence_pack.push(rec('E3', text)); r.claims.push({claim_id: 'C3', claim: kind === 'missing' ? 'The installation partnership is signed.' : 'The installation partnership is in force.', support_links: [{evidence_id: 'E3', relationship: 'direct_support', locator: 'claim'}]}); add(kind + ':its-own-load-bearing-claim', state, r, 'A separate load-bearing claim carries it.'); }
  { const r = base(); r.evidence_pack.push(rec('E3', text)); r.claims.push({claim_id: 'C3', load_bearing: false, claim: 'Background on the installation partnership paperwork.', support_links: [{evidence_id: 'E3', relationship: 'context_only', locator: 'claim'}]}); add(kind + ':background-claim-about-the-same-link', state, r, 'A background claim does not carry the effect, but its record is still about a load-bearing claim and weakens it.'); }
}
{ const r = base(); r.evidence_pack.push(rec('E3', Mtext, {source_date: '2026-06-01'})); link(r, 'direct_support'); add('missing:dated-before-the-support', 'favorable', r, 'Support dated after the gap settles it: "not signed" in June, executed in July.'); }
{ const r = base(); r.evidence_pack.push(rec('E3', Mtext)); link(r, 'contradicts'); add('missing:declared-contradiction', 'insufficient', r, 'A declared contradiction beside support is contested.'); }
{ const r = base(); r.claims[1].support_links = []; r.evidence_pack.pop(); add('missing:claim-has-no-record', 'insufficient', r, 'A load-bearing claim with no linked record.'); }
{ const r = base(); r.evidence_pack[1] = rec('E2', 'Acholi Power Services is an installer based in Gulu.'); add('missing:record-is-silent-on-the-link', 'insufficient', r, 'Silence is not support for a claim that a relationship exists.', {reason: 'SUPPORT_DOES_NOT_STATE_LINK'}); }
{ const r = base(); r.evidence_pack.push(rec('E3', 'Acholi Power Services is an installer based in Gulu.')); link(r, 'direct_support'); add('complete:silent-record-beside-support', 'favorable', r, 'A silent record is not a counter-statement: other support stands.'); }
{ const r = base(); r.evidence_pack.push(rec('E3', 'Installations are carried out in Gulu municipality.')); link(r, 'qualifies'); add('qualifier:declared-qualifier-with-plain-text', 'conditional', r, 'Qualifier preservation: a declared qualifier keeps its state; a text reading cannot turn it into a missing link.'); }
// Unrelated additions: they carry cue words and must change nothing.
{ const r = base(); r.evidence_pack.push({evidence_id: 'Z1', claim: 'The Gulu road upgrade has not been completed and applies only to the northern bypass.', source_class: 'public_bulletin', evidence_geography: {country: 'UG'}, source_date: '2026-10-25'}); add('irrelevant:unlinked-with-cue-words', 'favorable', r, 'An unrelated record never changes a state, whatever words it uses.', {paired_with: 'complete'}); }
{ const r = base(); r.evidence_pack.push({evidence_id: 'Z1', claim: 'A weather bulletin says seasonal rains are pending and travel is permitted only by day.', source_class: 'public_bulletin', evidence_geography: {country: 'UG'}, source_date: '2026-10-25'}); link(r, 'context_only'); r.claims[1].support_links.at(-1).evidence_id = 'Z1'; add('irrelevant:context-link-with-cue-words', 'favorable', r, 'A context link to an unrelated record changes nothing.'); }
// Revoked and prohibited.
{ const r = base(); r.evidence_pack.push(rec('R1', 'Electricity Regulatory Authority notice concerning licence ERA-RL-221 of Nile Solar Ltd.', {source_date: '2026-10-10', authority_effect: 'revocation'})); r.claims[0].support_links.push({evidence_id: 'R1', relationship: 'contradicts', locator: 'claim'}); add('revoked:structured', 'adverse', r, 'A revocation is adverse and the authority state is revoked; planning stays planning.', {authority: 'revoked'}); }
{ const r = base(); r.evidence_pack[0] = rec('E1', 'The Electricity Regulatory Authority revoked retail licence ERA-RL-221 of Nile Solar Ltd on 2026-10-09.', {source_date: '2026-10-10'}); add('revoked:stated-in-the-support-record', 'adverse', r, 'A record linked as support that states the revocation is adverse.', {authority: 'revoked'}); }
{ const r = base(); r.evidence_pack.push(rec('X1', 'The Electricity Regulatory Authority barred Nile Solar Ltd from selling pay-as-you-go systems in Gulu.', {source_date: '2026-10-12'})); r.claims[0].support_links.push({evidence_id: 'X1', relationship: 'contradicts', locator: 'claim'}); add('prohibited:stated', 'adverse', r, 'An issuer prohibition is adverse; authority not_authorized.', {authority: 'not_authorized'}); }
fs.writeFileSync(path.join(here, 'structure.json'), JSON.stringify({classification: 'proprietary lab fixtures; not observations of real organisations', frozen: '2026-11-11', precedence_version: 'mvr.effect-precedence/3',
  rule: 'Exclusion removes a record\'s power to support a claim, never its power to weaken it. A record about a claim that says the link is missing makes the claim insufficient; one that states a qualifier makes it conditional; an unrelated record changes nothing. Internal planning is favorable and planning_only throughout.',
  cases: S}, null, 1) + '\n');
console.log(JSON.stringify({cohort_cases: cases.length, structure_cases: S.length}));
