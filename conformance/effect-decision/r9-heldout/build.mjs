#!/usr/bin/env node
// Builds the R9-shaped held-out exact-effect cohort: 8 scenarios x 6 variants (complete, missing link, conditional,
// revoked, prohibited, irrelevant addition) x 5 effects (three external, an internal recommendation, internal planning),
// plus 8 internal non-market controls. Missing links and qualifiers are written in prose, in wording that differs per
// scenario. All case data are proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); none is an
// observation of a real organisation. Writes cohort.json next to this file.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const AD = '2026-11-01';
// Each scenario: country, subject, two load-bearing claims (C1 permission, C2 relationship), clean record texts, and per-variant prose.
const S = [
  {id: 'dairy-ke', country: 'KE', locality: 'nakuru', subject: 'Rift Valley Dairies Ltd', c1: 'Rift Valley Dairies Ltd holds a current county trading permit for Nakuru.', c2: 'Rift Valley Dairies Ltd has an active Nakuru distributor.',
    e1: 'The Nakuru County Government issued trading permit NKR-0417 to Rift Valley Dairies Ltd on 2026-08-14; it runs to 2027-08-13.', e2: 'Highland Traders signed a two-year distribution agreement with Rift Valley Dairies Ltd on 2026-09-02.',
    missing: 'Rift Valley Dairies Ltd lodged its trading permit application with Nakuru County on 2026-08-14; the permit has not been issued.', conditional: 'Nakuru County approved the trading permit for Rift Valley Dairies Ltd on condition that the cold room passes inspection.',
    revoked: {text: 'Nakuru County revoked trading permit NKR-0417 of Rift Valley Dairies Ltd on 2026-10-09.'}, prohibited: {text: 'The Kenya Dairy Board prohibited Rift Valley Dairies Ltd from distributing raw milk products in Kenya.', structured: false}},
  {id: 'solar-ug', country: 'UG', locality: 'gulu', subject: 'Nile Solar Ltd', c1: 'Nile Solar Ltd holds a current electricity retail licence in Uganda.', c2: 'Nile Solar Ltd has an active Gulu installation partner.',
    e1: 'The Electricity Regulatory Authority granted retail licence ERA-RL-221 to Nile Solar Ltd on 2026-05-20, valid until 2028-05-19.', e2: 'Acholi Power Services executed an installation partnership with Nile Solar Ltd on 2026-07-11.',
    missing: 'The installation partnership agreement with Acholi Power Services is still awaiting countersignature.', conditional: 'The retail licence of Nile Solar Ltd is provisional for the first twelve months of operation.', missingClaim: 'C2',
    revoked: {structured: true, licence_status: 'revoked', text: 'Licence ERA-RL-221, Nile Solar Ltd.'}, prohibited: {text: 'The Electricity Regulatory Authority barred Nile Solar Ltd from selling pay-as-you-go systems in Gulu.', structured: false}},
  {id: 'pharma-tz', country: 'TZ', locality: 'arusha', subject: 'Kilima Pharma Ltd', c1: 'Kilima Pharma Ltd holds a current wholesale pharmacy permit in Tanzania.', c2: 'Kilima Pharma Ltd has an active Arusha hospital supply contract.',
    e1: 'The Pharmacy Council issued wholesale permit PC-W-889 to Kilima Pharma Ltd on 2026-03-02 for the period to 2027-03-01.', e2: 'Arusha Regional Hospital signed a supply contract with Kilima Pharma Ltd on 2026-08-30.',
    missing: 'No executed copy of the Arusha Regional Hospital supply contract is on file; only an unsigned draft was provided.', conditional: 'The wholesale permit for Kilima Pharma Ltd is restricted to non-controlled medicines.', missingClaim: 'C2',
    revoked: {structured: true, authority_effect: 'revocation', text: 'Pharmacy Council notice concerning permit PC-W-889 of Kilima Pharma Ltd.'}, prohibited: {structured: true, text: 'Pharmacy Council order concerning Kilima Pharma Ltd and controlled medicines.'}},
  {id: 'cash-transfer-ke', country: 'KE', locality: 'kisumu', subject: 'Lake Basin Relief Trust', c1: 'Lake Basin Relief Trust holds a current county no-objection for the Kisumu cash transfer programme.', c2: 'Lake Basin Relief Trust has an active Kisumu payment agent.',
    e1: 'Kisumu County issued a no-objection to Lake Basin Relief Trust for its conditional cash transfer programme on 2026-06-01, valid to 2027-05-31.', e2: 'Equator Payments Ltd entered a payment agency agreement with Lake Basin Relief Trust on 2026-07-15.',
    missing: 'The county no-objection for Lake Basin Relief Trust is expected to be issued after the November council sitting.', conditional: 'Kisumu County issued a no-objection to Lake Basin Relief Trust capped at 2,000 households for the first phase.',
    revoked: {text: 'Kisumu County withdrew the no-objection it had issued to Lake Basin Relief Trust on 2026-10-20.'}, prohibited: {text: 'Kisumu County ordered Lake Basin Relief Trust to stop enrolling households pending an audit.', structured: false}},
  {id: 'agro-rw', country: 'RW', locality: 'musanze', subject: 'Virunga Agro Inputs Ltd', c1: 'Virunga Agro Inputs Ltd holds a current fertiliser import registration in Rwanda.', c2: 'Virunga Agro Inputs Ltd has an active Musanze cooperative offtake.',
    e1: 'The Rwanda Agriculture Board registered Virunga Agro Inputs Ltd as a fertiliser importer on 2026-04-18, registration valid to 2027-04-17.', e2: 'Musanze Potato Cooperative signed an offtake with Virunga Agro Inputs Ltd on 2026-08-05.',
    missing: 'The Musanze Potato Cooperative offtake is only a letter of intent; the cooperative board has yet to ratify it.', conditional: 'The fertiliser import registration applies only to blended NPK products, until the laboratory certifies other blends.', missingClaim: 'C2',
    revoked: {structured: true, registration_status: 'cancelled', text: 'Fertiliser importer registration of Virunga Agro Inputs Ltd.'}, prohibited: {text: 'The Rwanda Agriculture Board banned the sale of the unregistered urea blend by Virunga Agro Inputs Ltd.', structured: false}},
  {id: 'agent-gh', country: 'GH', locality: 'kumasi', subject: 'Ashanti Mobile Agents Ltd', c1: 'Ashanti Mobile Agents Ltd holds a current agent network approval in Ghana.', c2: 'Ashanti Mobile Agents Ltd has an active Kumasi super-agent.',
    e1: 'The Bank of Ghana approved the agent network of Ashanti Mobile Agents Ltd on 2026-02-27; the approval runs to 2027-02-26.', e2: 'Kejetia Super Agent Ltd signed a super-agent agreement with Ashanti Mobile Agents Ltd on 2026-06-12.',
    missing: 'Ashanti Mobile Agents Ltd applied for agent network approval in July; the Bank of Ghana decision is still pending.', conditional: 'The Bank of Ghana approval for Ashanti Mobile Agents Ltd is limited to 150 agents during the pilot.',
    revoked: {text: 'The Bank of Ghana revoked the agent network approval of Ashanti Mobile Agents Ltd on 2026-10-01.'}, prohibited: {structured: true, text: 'Bank of Ghana directive concerning Ashanti Mobile Agents Ltd.'}},
  {id: 'school-meals-ng', country: 'NG', locality: 'kano', subject: 'Sahel School Meals Ltd', c1: 'Sahel School Meals Ltd holds a current state food handling certificate in Kano.', c2: 'Sahel School Meals Ltd has an active Kano grain supplier.',
    e1: 'The Kano State food safety agency certified Sahel School Meals Ltd for food handling on 2026-05-05, certificate valid to 2027-05-04.', e2: 'Dala Grains Ltd executed a grain supply agreement with Sahel School Meals Ltd on 2026-07-21.',
    missing: 'Dala Grains Ltd could not be traced in the state supplier register and no supply agreement was produced.', conditional: 'The food handling certificate of Sahel School Meals Ltd is subject to quarterly hygiene audits.', missingClaim: 'C2',
    revoked: {structured: true, authority_effect: 'revocation', text: 'Kano State food safety agency notice concerning Sahel School Meals Ltd.'}, prohibited: {text: 'The Kano State food safety agency prohibited Sahel School Meals Ltd from supplying schools in Kano.', structured: false}},
  {id: 'cement-zm', country: 'ZM', locality: 'ndola', subject: 'Copperbelt Cement Distributors Ltd', c1: 'Copperbelt Cement Distributors Ltd holds a current trading licence in Zambia.', c2: 'Copperbelt Cement Distributors Ltd has an active Ndola hardware network.',
    e1: 'Ndola City Council issued trading licence NDL-TL-552 to Copperbelt Cement Distributors Ltd on 2026-01-15, valid to 2027-01-14.', e2: 'Ndola Hardware Association signed a stockist agreement with Copperbelt Cement Distributors Ltd on 2026-05-30.',
    missing: 'The Ndola Hardware Association stockist agreement will be signed once pricing is agreed.', conditional: 'The trading licence of Copperbelt Cement Distributors Ltd is valid only within the Ndola central business district.', missingClaim: 'C2',
    revoked: {text: 'Ndola City Council cancelled trading licence NDL-TL-552 of Copperbelt Cement Distributors Ltd on 2026-09-28.'}, prohibited: {structured: true, text: 'Ndola City Council order concerning Copperbelt Cement Distributors Ltd.'}}
];
const rec = (sc, id, text, extra = {}) => ({evidence_id: id, claim: text, source_class: id === 'E1' ? 'regulator_published' : 'counterparty_record', evidence_geography: {country: sc.country, locality: sc.locality}, source_date: '2026-09-20', ...extra});
const effects = sc => [
  {effect_id: 'EXT-OFFER', effect_type: 'external_offer', description: `Send distribution terms to the ${sc.locality} partner`},
  {effect_id: 'EXT-AGREEMENT', effect_type: 'distribution_agreement', description: `Enter the ${sc.locality} distribution relationship`},
  {effect_id: 'EXT-ORDER', effect_type: 'procurement_order', description: 'Place the first stock order'},
  {effect_id: 'INT-REC', effect_type: 'internal_recommendation', description: 'Recommend market entry to the board'},
  {effect_id: 'INT-PLAN', effect_type: 'internal_planning', description: 'Plan the internal entry workstream'}];
const EXPECT = {
  complete: {external: ['favorable', 'not_authorized', 'not_authorized', 'R5_ALL_LOAD_BEARING_CLAIMS_SUPPORTED'], rec: ['favorable', 'planning_only', 'planning_only'], plan: ['favorable', 'planning_only', 'planning_only']},
  missing: {external: ['insufficient', 'not_authorized', 'not_authorized', 'R3_LOAD_BEARING_CLAIM_INSUFFICIENT'], rec: ['insufficient', 'planning_only', 'not_authorized'], plan: ['favorable', 'planning_only', 'planning_only']},
  conditional: {external: ['conditional', 'not_authorized', 'not_authorized', 'R4_LOAD_BEARING_CLAIM_CONDITIONAL'], rec: ['conditional', 'planning_only', 'planning_only'], plan: ['favorable', 'planning_only', 'planning_only']},
  revoked: {external: ['adverse', 'revoked', 'revoked', null], rec: ['adverse', 'planning_only', 'not_authorized'], plan: ['favorable', 'planning_only', 'planning_only']},
  prohibited: {external: ['adverse', 'not_authorized', 'not_authorized', null], rec: ['adverse', 'planning_only', 'not_authorized'], plan: ['favorable', 'planning_only', 'planning_only']},
  irrelevant: null};
function build(sc, variant) {
  const missingClaim = sc.missingClaim ?? 'C1';
  let e1 = rec(sc, 'E1', sc.e1), e2 = rec(sc, 'E2', sc.e2);
  const extra = [];
  const links1 = [{evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}], links2 = [{evidence_id: 'E2', relationship: 'direct_support', locator: 'claim'}];
  if (variant === 'missing') { if (missingClaim === 'C1') e1 = rec(sc, 'E1', sc.missing); else e2 = rec(sc, 'E2', sc.missing); }
  if (variant === 'conditional') e1 = rec(sc, 'E1', sc.conditional);
  if (variant === 'revoked') {
    const r = sc.revoked;
    if (r.structured) { const {structured, text, ...fields} = r; extra.push(rec(sc, 'R1', text, {source_date: '2026-10-10', ...fields})); links1.push({evidence_id: 'R1', relationship: 'contradicts', locator: 'claim'}); }
    else e1 = rec(sc, 'E1', r.text, {source_date: '2026-10-10'});
  }
  if (variant === 'prohibited') {
    const p = sc.prohibited;
    extra.push(rec(sc, 'P1', p.text, {source_date: '2026-10-12', ...(p.structured ? {authority_effect: 'prohibition'} : {})}));
    links1.push({evidence_id: 'P1', relationship: 'contradicts', locator: 'claim'});
  }
  if (variant === 'irrelevant') extra.push({evidence_id: 'Z1', claim: `A ${sc.locality} weather bulletin forecast seasonal rains for late November.`, source_class: 'public_bulletin', evidence_geography: {country: sc.country}, source_date: '2026-10-25'});
  return {analysis_date: AD, market_scope: {country: sc.country, locality: sc.locality}, subject: {entity_name: sc.subject},
    claims: [{claim_id: 'C1', claim: sc.c1, support_links: links1}, {claim_id: 'C2', claim: sc.c2, support_links: links2}],
    evidence_pack: [e1, e2, ...extra], requested_effects: effects(sc)};
}
const cases = [];
for (const sc of S) for (const variant of ['complete', 'missing', 'conditional', 'revoked', 'prohibited', 'irrelevant']) {
  const exp = EXPECT[variant] ?? EXPECT.complete;
  cases.push({case_id: sc.id + ':' + variant, scenario: sc.id, variant, request: build(sc, variant),
    expected: Object.fromEntries(effects(sc).map(e => [e.effect_id, e.effect_id.startsWith('EXT') ? {analytical: exp.external[0], authority: exp.external[1], execution: exp.external[2], ...(exp.external[3] ? {precedence_rule: exp.external[3]} : {})}
      : e.effect_id === 'INT-REC' ? {analytical: exp.rec[0], authority: exp.rec[1], execution: exp.rec[2]} : {analytical: exp.plan[0], authority: exp.plan[1], execution: exp.plan[2], precedence_rule: 'R0_INTERNAL_PLANNING'}])),
    ...(variant === 'irrelevant' ? {paired_with: sc.id + ':complete'} : {})});
}
const INTERNAL = ['Reformat the quarterly operations report template for the finance team', 'Service the warehouse generator and replace its air filter', 'Schedule the staff fire-safety training for Friday morning',
  'Reset the shared mailbox password and update the antivirus on office laptops', 'Merge the two HR leave policy documents into one handbook', 'Write up the minutes of the internal budget meeting',
  'Proofread the internal newsletter before it goes to staff', 'Rename and tidy up the shared drive folders for the operations team'];
INTERNAL.forEach((text, i) => cases.push({case_id: 'internal:' + (i + 1), scenario: 'internal', variant: 'internal_control', request: {analysis_date: AD, market_scope: {country: 'KE'}, requested_effects: [{effect_id: 'INT-OPS', description: text}]},
  expected: {'INT-OPS': {analytical: 'not_relevant', authority: 'not_applicable', execution: 'not_applicable'}}, first_call_task: text}));
const out = {classification: 'proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); not observations of real organisations', frozen_at: '2026-11-02', contract_version: 'mvr.effect-decision/1', precedence_version: 'mvr.effect-precedence/2',
  shape: '8 scenarios x 6 variants x 5 effects (3 external, internal_recommendation, internal_planning) + 8 internal non-market controls = 56 cases, 248 effect rows (240 market + 8 internal)',
  bar: {market_effect_agreement_at_least: 228, market_effect_rows: 240, false_favorable: 0, missing_link_precedence: '32/32', qualifier_precedence: '32/32', external_authorized: 0, irrelevant_pairs_identical: '8/8', internal_controls_not_relevant: '8/8'},
  cases};
fs.writeFileSync(path.join(here, 'cohort.json'), JSON.stringify(out, null, 1) + '\n');

// Set B: the same scenarios with new missing-link and qualifier wording, written after set A was scored and frozen before
// any engine change for it. It is reported as first measured.
const B = {
  'dairy-ke': ['Rift Valley Dairies Ltd is still waiting for Nakuru County to issue the trading permit.', 'The trading permit allows sales only from premises inspected and registered by the county.'],
  'solar-ug': ['Acholi Power Services has not yet signed the installation partnership with Nile Solar Ltd.', 'The retail licence is granted provided that Nile Solar Ltd files quarterly safety reports.'],
  'pharma-tz': ['The hospital supply contract with Kilima Pharma Ltd remains under negotiation.', 'The wholesale permit covers Arusha only and excludes controlled medicines unless separately approved.'],
  'cash-transfer-ke': ['Kisumu County has not granted the no-objection; the request is before the council.', 'The no-objection applies to the first 2,000 households and must be renewed before any further phase.'],
  'agro-rw': ['The Musanze cooperative offtake exists only as a verbal commitment.', 'The registration is temporary while the laboratory certifies the remaining blends.'],
  'agent-gh': ['The Bank of Ghana has not decided the agent network application of Ashanti Mobile Agents Ltd.', 'The Bank of Ghana approval permits a maximum of 150 agents.'],
  'school-meals-ng': ['No supply agreement between Dala Grains Ltd and Sahel School Meals Ltd has been signed.', 'The certificate remains valid as long as quarterly hygiene audits are passed.'],
  'cement-zm': ['The Ndola Hardware Association stockist agreement is at term-sheet stage and has not been executed.', 'The trading licence is limited to the central business district of Ndola.']};
const casesB = [];
for (const sc of S) {
  const [missing, conditional] = B[sc.id];
  for (const [variant, scB] of [['missing', {...sc, missing}], ['conditional', {...sc, conditional}]]) {
    const exp = EXPECT[variant];
    casesB.push({case_id: sc.id + ':' + variant + ':B', scenario: sc.id, variant, request: build(scB, variant),
      expected: Object.fromEntries(effects(sc).map(e => [e.effect_id, e.effect_id.startsWith('EXT') ? {analytical: exp.external[0], authority: exp.external[1], execution: exp.external[2], precedence_rule: exp.external[3]}
        : e.effect_id === 'INT-REC' ? {analytical: exp.rec[0], authority: exp.rec[1], execution: exp.rec[2]} : {analytical: exp.plan[0], authority: exp.plan[1], execution: exp.plan[2], precedence_rule: 'R0_INTERNAL_PLANNING'}]))});
  }
}
fs.writeFileSync(path.join(here, 'cohort-b.json'), JSON.stringify({...out, set: 'B', shape: '8 scenarios x (missing, conditional) x 5 effects, new wording = 16 cases, 80 effect rows', bar: {market_effect_rows: 80, false_favorable: 0}, cases: casesB}, null, 1) + '\n');
console.log(JSON.stringify({cases: cases.length, cases_b: casesB.length}));
