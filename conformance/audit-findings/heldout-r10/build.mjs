#!/usr/bin/env node
// Builds the R10 held-out audit cohort: 16 planted defects and 8 controls (7 clean, 1 internal-only) across twelve audit
// routes, in a new domain (programme disbursement readiness) and new wording. Written on 2026-11-11 and frozen before its
// first run; the first pass is reported as measured in README.md.
// All case data are proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); none is an observation of
// a real organisation. Writes heldout-r10.json next to this file.
//   node conformance/audit-findings/heldout-r10/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const AD = '2026-11-01';
const scope = {country: 'UG'};
const don = (id, text, extra = {}) => ({evidence_id: id, claim: text, source_class: 'administrative_record', evidence_geography: {country: 'UG'}, source_date: '2026-09-14', ...extra});
const ctr = (id, text, extra = {}) => ({evidence_id: id, claim: text, source_class: 'counterparty_record', evidence_geography: {country: 'UG'}, source_date: '2026-07-03', ...extra});
const claim = (id, text, links) => ({claim_id: id, claim: text, support_links: links.map(([e, rel = 'direct_support', loc = 'claim']) => ({evidence_id: e, relationship: rel, locator: loc}))});
const baseClaims = () => [claim('C1', 'The donor has approved the release of the second tranche to Kivu Health Trust.', [['E1']]), claim('C2', 'Mara Clinics Ltd is the contracted supplier of cold-chain equipment for the programme.', [['E2']])];
const baseItems = () => [don('E1', 'By letter of 2026-09-14 the donor approved release of the second tranche to Kivu Health Trust.'), ctr('E2', 'Mara Clinics Ltd and the programme signed supply contract CC-2026-07 on 2026-07-03.')];
const subject = {entity_name: 'Kivu Health Trust'};
const decision = (claims, items, extra = {}) => ({decision_result: {claims, evidence_pack: items, analysis_date: AD, market_scope: scope, ...extra}, subject, market_scope: scope});
const cases = [
  // ---- defects
  {case_id: 'validation_old_record', route: '/v1/evidence-validation', expected_defect_code: 'EVIDENCE_STALE', expected_locus: {evidence_id: 'V2'},
    body: {analysis_date: AD, market_scope: scope, subject, entity_archetype: 'distributor', evidence_pack: [don('V1', 'The donor approved release of the second tranche on 2026-09-14.'), {evidence_id: 'V2', claim: 'Cold-chain capacity assessment of district stores.', source_class: 'third_party_survey', country: 'UG', published_at: '2023-11-20'}]}},
  {case_id: 'validation_other_country', route: '/v1/evidence-validation', expected_defect_code: 'GEOGRAPHY_MISMATCH', expected_locus: {evidence_id: 'V2'},
    body: {analysis_date: AD, market_scope: scope, subject, entity_archetype: 'distributor', evidence_pack: [don('V1', 'The donor approved release of the second tranche on 2026-09-14.'), {evidence_id: 'V2', claim: 'Supplier performance review for vaccine fridges.', source_class: 'third_party_survey', geography: 'KE', date: '2026-08-05'}]}},
  {case_id: 'privacy_named_officer', route: '/v1/privacy-risk-review', expected_defect_code: 'PRIVACY_ENVELOPE_CONFLICT', expected_locus: {input_path: '/narrative'},
    body: {analysis_date: AD, market_scope: scope, subject, privacy_envelope: {contains_personal_data: false}, narrative: 'Before delivery, call the district cold-chain officer, Mr Okello Peter, on his mobile 0772 310 448.'}},
  {case_id: 'privacy_patient_extract', route: '/v1/privacy-risk-review', expected_defect_code: 'PERSONAL_DATA_UNDECLARED', expected_locus: {evidence_id: 'P1'},
    body: {analysis_date: AD, market_scope: scope, subject, evidence_pack: [{evidence_id: 'P1', claim: 'Clinic register extract for the outreach cohort.', notes: 'Entry 31: National ID CM90012345ABCD, date of birth 1990-02-11.', source_class: 'programme_record', evidence_geography: {country: 'UG'}, source_date: '2026-09-22'}]}},
  {case_id: 'suitability_company_website', route: '/v1/evidence-suitability-scan', expected_defect_code: 'SOURCE_UNSUITABLE_FOR_USE', expected_locus: {evidence_id: 'S1'},
    body: {analysis_date: AD, market_scope: scope, subject, available_data: [{evidence_id: 'S1', claim: 'Mara Clinics Ltd is authorised by the National Drug Authority to import cold-chain equipment.', source_class: 'company_website', evidence_geography: {country: 'UG'}, source_date: '2026-10-06'}]}},
  {case_id: 'suitability_decision_awaited', route: '/v1/evidence-suitability-scan', expected_defect_code: 'SUPPORT_STATES_LINK_MISSING', expected_locus: {evidence_id: 'S2'},
    body: {analysis_date: AD, market_scope: scope, subject, evidence_pack: [{evidence_id: 'S2', claim: 'Safeguards clearance for the Lira works has been requested from the authority; a decision is awaited.', source_class: 'government_correspondence', evidence_geography: {country: 'UG'}, source_date: '2026-10-09'}]}},
  {case_id: 'board_claims_conditions_met', route: '/v1/board-safety-check', expected_defect_code: 'OUTPUT_OVERSTATES_EVIDENCE', expected_locus: {input_path: '/report_pack/recommendation'},
    body: {report_pack: {claims: [baseClaims()[0]], evidence_pack: [don('E1', 'The donor approved release of the second tranche on 2026-09-14, on receipt of the audited accounts.')], analysis_date: AD, market_scope: scope,
      recommendation: 'Every approval is in place and the board can release the second tranche now.'}, subject, market_scope: scope}},
  {case_id: 'board_receipt_in_pack', route: '/v1/board-safety-check', expected_defect_code: 'RECEIPT_USED_AS_EVIDENCE', expected_locus: {evidence_id: 'X7'},
    body: {report_pack: {claims: [claim('C1', 'The donor has approved the release of the second tranche to Kivu Health Trust.', [['E1'], ['X7']])], evidence_pack: [baseItems()[0], {evidence_id: 'X7', claim: 'Tranche release confirmed.', amos_receipt: 'ISR-' + '9f8e7d6c'.repeat(4), source_class: 'workflow_output', evidence_geography: {country: 'UG'}, source_date: '2026-10-21'}], analysis_date: AD, market_scope: scope}, subject, market_scope: scope}},
  {case_id: 'redteam_check_as_authority', route: '/v1/red-team', expected_defect_code: 'OUTPUT_CITES_AMOS_AS_PERMISSION', expected_locus: {input_path: '/decision_result/agent_output'},
    body: {...decision(baseClaims(), baseItems(), {agent_output: 'The AMOS check came back favorable, which authorises the payment run to the supplier.'}), red_team_depth: 'standard'}},
  {case_id: 'redteam_approval_withdrawn', route: '/v1/red-team', expected_defect_code: 'REVOCATION_PRESENT', expected_locus: {claim_id: 'C1', evidence_id: 'E1'},
    body: {...decision(baseClaims(), [don('E1', 'The donor withdrew its approval of the second tranche on 20 October 2026.', {source_date: '2026-10-20'}), baseItems()[1]]), red_team_depth: 'standard'}},
  {case_id: 'release_ministry_stop_order', route: '/v1/release-check', expected_defect_code: 'PROHIBITION_PRESENT', expected_locus: {claim_id: 'C3', evidence_id: 'E3'},
    body: decision([...baseClaims(), claim('C3', 'Kivu Health Trust may procure the cold-chain equipment.', [['E3']])], [...baseItems(), don('E3', 'The Ministry of Health prohibited Kivu Health Trust from procuring cold-chain equipment pending an audit.', {source_date: '2026-10-12'})])},
  {case_id: 'claimaudit_amount', route: '/v1/claim-audit', expected_defect_code: 'UNSUPPORTED_QUANTITY', expected_locus: {claim_id: 'C1'},
    body: {analysis_date: AD, market_scope: scope, subject, claims: [claim('C1', 'The donor approved a second tranche of USD 480,000.', [['E1']]), baseClaims()[1]],
      evidence_pack: [don('E1', 'By letter of 2026-09-14 the donor approved a second tranche of USD 400,000.'), baseItems()[1]]}},
  {case_id: 'claimaudit_scope_limit', route: '/v1/claim-audit', expected_defect_code: 'QUALIFIER_IN_SUPPORT', expected_locus: {claim_id: 'C1', evidence_id: 'E1'},
    body: {analysis_date: AD, market_scope: scope, subject, claims: baseClaims(), evidence_pack: [don('E1', 'The donor approved release of the second tranche on 2026-09-14 for health activities but not construction.'), baseItems()[1]]}},
  {case_id: 'decision_background_only', route: '/v1/decision-check', expected_defect_code: 'CONTEXT_ONLY_SUPPORT', expected_locus: {claim_id: 'C2'},
    body: {analysis_date: AD, market_scope: scope, subject, entity_name: 'Kivu Health Trust', country: 'UG', claims: [baseClaims()[0], claim('C2', 'Mara Clinics Ltd is the contracted supplier of cold-chain equipment for the programme.', [['E2', 'context_only']])], evidence_pack: baseItems()}},
  {case_id: 'completeness_other_company', route: '/v1/evidence-completeness', expected_defect_code: 'UNSUPPORTED_ACTOR', expected_locus: {claim_id: 'C2'},
    body: {analysis_date: AD, market_scope: scope, subject, decision_question: 'Should we release the supplier advance?', claims: [baseClaims()[0], claim('C2', 'Mara Medical Supplies Ltd is the contracted supplier of cold-chain equipment.', [['E2']])],
      evidence_pack: [baseItems()[0], ctr('E2', 'Mara Clinics Ltd and the programme signed supply contract CC-2026-07 on 2026-07-03.')]}},
  {case_id: 'review_rule_against', route: '/v1/evidence-review', expected_defect_code: 'DIRECTIVE_IN_SUPPORT', expected_locus: {claim_id: 'R1', evidence_id: 'E9'},
    body: {analysis_date: AD, market_scope: scope, subject, evidence_id: 'E9', review_status: 'pending', evidence_item: don('E9', 'Sub-grantees must not procure equipment above USD 10,000 without the donor\'s prior approval.'),
      claim_support: [{claim_id: 'R1', claim: 'Tukole Youth Initiative may procure the cold room directly.', relationship: 'direct_support', locator: 'claim'}]}},
  // ---- controls (clean, and one internal-only request)
  {case_id: 'clean_claimaudit_no_objection', route: '/v1/claim-audit', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, claims: baseClaims(), evidence_pack: [don('E1', 'The donor approved release of the second tranche to Kivu Health Trust on 2026-09-14; no objections were raised by the co-financier and no further approval is needed.'), baseItems()[1]]}},
  {case_id: 'clean_release_contract_terms', route: '/v1/release-check', expected_outcome: 'no_defects_found',
    body: decision(baseClaims(), [baseItems()[0], ctr('E2', 'Supply contract CC-2026-07 between Mara Clinics Ltd and the programme, price UGX 380 million inclusive of taxes and governed by the laws of Uganda, was signed by both parties on 2026-07-03.')])},
  {case_id: 'clean_privacy_office_contact', route: '/v1/privacy-risk-review', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, privacy_envelope: {contains_personal_data: false}, narrative: 'Queries go to procurement@kivuhealth.example or the trust reception on +256 414 555 010.'}},
  {case_id: 'clean_validation_field_spellings', route: '/v1/evidence-validation', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, entity_archetype: 'distributor', evidence_pack: [{evidence_id: 'V1', claim: 'Donor letter approving release of the second tranche.', source_class: 'administrative_record', country: 'UG', published_at: '2026-09-14'}, {evidence_id: 'V2', claim: 'Supply contract CC-2026-07 signed with Mara Clinics Ltd.', source_class: 'counterparty_record', geography: 'UG', date: '2026-07-03'}]}},
  {case_id: 'clean_board_bounded', route: '/v1/board-safety-check', expected_outcome: 'no_defects_found',
    body: {report_pack: {claims: baseClaims(), evidence_pack: baseItems(), analysis_date: AD, market_scope: scope, recommendation: 'The record supports preparing the release request; funds should move after the institution approver has signed.'}, subject, market_scope: scope}},
  {case_id: 'clean_redteam_hold', route: '/v1/red-team', expected_outcome: 'no_defects_found',
    body: {...decision(baseClaims(), baseItems(), {agent_output: 'Hold the payment run until the approver has signed the release form.'}), red_team_depth: 'standard'}},
  {case_id: 'clean_suitability_register', route: '/v1/evidence-suitability-scan', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, available_data: [{evidence_id: 'S1', claim: 'National Drug Authority register: Mara Clinics Ltd, import licence NDA-IL-2291, issued 2026-03-04.', source_class: 'regulator_published', evidence_type: 'registry_extract', evidence_geography: {country: 'UG'}, source_date: '2026-03-04'}]}},
  {case_id: 'internal_only_completeness', route: '/v1/evidence-completeness', expected_outcome: 'not_applicable',
    body: {analysis_date: AD, market_scope: scope, subject, decision_question: 'Archive last year\'s project folders on the shared drive', claims: baseClaims(), evidence_pack: baseItems()}}
];
const recordDateOf = it => [it.source_date, it.freshness_date, it.date, it.published_at].find(v => typeof v === 'string');
function shapeRecord(it) {
  const regulator = ['regulator_published', 'administrative_record', 'independently_audited'].includes(it.source_class);
  const cls = {counterparty_record: 'structured_field_research', third_party_survey: 'nonprobability_survey', programme_record: 'administrative_record', company_website: 'entity_reported', government_correspondence: 'administrative_record', workflow_output: 'entity_reported'}[it.source_class] ?? it.source_class ?? 'structured_field_research';
  const d = recordDateOf(it);
  const country = it.evidence_geography?.country ?? (typeof it.geography === 'string' ? it.geography : it.geography?.country) ?? it.country;
  return {...it, id: it.id ?? it.evidence_id, ...(country && !it.evidence_geography ? {evidence_geography: {country}} : {}), source_class: cls, evidence_type: regulator || cls === 'administrative_record' ? 'public_filing' : it.evidence_type && it.evidence_type !== 'registry_extract' ? it.evidence_type : 'survey',
    evidence_origin: regulator || cls === 'administrative_record' ? 'public_osint' : 'field_research', collection_method: regulator || cls === 'administrative_record' ? 'secondary_source' : 'field_survey',
    stakeholder_class: regulator || cls === 'administrative_record' ? 'public_official' : cls === 'entity_reported' ? 'internal_operations' : 'retailer', source_grade: 'B', source_doc_id: 'LAB-' + (it.evidence_id ?? it.id),
    ...(d ? {freshness_date: it.freshness_date ?? d} : {}), structured_values: it.structured_values ?? {trust: 60, permission: 55},
    privacy_envelope: {consent_basis: 'legitimate_interest', retention_class: '1y', redaction_status: 'redacted', safe_for_modeling: true, ...(it.privacy_envelope || {})}};
}
function shapeBody(body, route) {
  const b = structuredClone(body);
  const visit = container => { if (!container || typeof container !== 'object') return; for (const k of ['evidence_pack', 'evidence_items', 'available_data']) if (Array.isArray(container[k])) container[k] = container[k].map(shapeRecord); if (container.evidence_item) container.evidence_item = shapeRecord(container.evidence_item); };
  visit(b); for (const k of ['decision_result', 'report_pack', 'release_candidate', 'claim_set']) visit(b[k]);
  b.subject = {...(b.subject || {}), entity_archetype: b.subject?.entity_archetype || 'fmcg_brand'};
  if (route === '/v1/decision-check') { b.mode ??= 'evidence_backed'; b.case_type ??= 'scaling'; b.maturity_level ??= 'startup'; b.stakeholder_scope ??= ['retailer', 'public_official']; b.market_scope = {...b.market_scope, decision_scope_level: 'country'}; }
  return b;
}
for (const c of cases) c.body = shapeBody(c.body, c.route);
const out = {classification: 'proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); not observations of real organisations', frozen_at: '2026-11-11', contract_version: 'mvr.audit-finding/1',
  bar: {defects_detected_at_least: 15, defects: 16, route_level_false_permits: 0, clean_false_positives: 0, controlling_at_least: 23, targeted_at_least: 15, internal_only_false_triggers: 0},
  scoring: 'Same scorer as heldout-r9 (../heldout-r9/score.mjs).', routes: [...new Set(cases.map(c => c.route))], cases};
fs.writeFileSync(path.join(here, 'heldout-r10.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({cases: cases.length, routes: out.routes.length}));
