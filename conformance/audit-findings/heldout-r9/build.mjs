#!/usr/bin/env node
// Builds the R9 held-out audit cohort: 16 planted defects and 8 controls (7 clean, 1 internal-only) across twelve audit
// routes, each in the request shape that route accepts, with wording and field spellings different from the R8 cohort.
// All case data are proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); none is an observation of
// a real organisation. Writes heldout-r9.json next to this file.
//   node conformance/audit-findings/heldout-r9/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const AD = '2026-11-01';
const scope = {country: 'KE'};
const reg = (id, text, extra = {}) => ({evidence_id: id, claim: text, source_class: 'regulator_published', evidence_type: 'registry_extract', evidence_geography: {country: 'KE'}, source_date: '2026-08-14', ...extra});
const fld = (id, text, extra = {}) => ({evidence_id: id, claim: text, source_class: 'field_observation', evidence_geography: {country: 'KE', locality: 'nakuru'}, source_date: '2026-09-20', ...extra});
const claim = (id, text, links) => ({claim_id: id, claim: text, support_links: links.map(([e, rel = 'direct_support', loc = 'claim']) => ({evidence_id: e, relationship: rel, locator: loc}))});
const baseClaims = () => [claim('C1', 'Rift Valley Dairies Ltd holds a current county trading permit for Nakuru.', [['E1']]), claim('C2', 'Nakuru outlets agreed to stock the yoghurt range.', [['E2']])];
const baseItems = () => [reg('E1', 'The Nakuru County Government issued trading permit NKR-2026-0417 to Rift Valley Dairies Ltd on 2026-08-14, valid until 2027-08-13.'),
  fld('E2', 'Field visits on 2026-09-20 found 23 of 30 Nakuru outlets agreed to stock the yoghurt range.')];
const subject = {entity_name: 'Rift Valley Dairies Ltd'};
const decision = (claims, items, extra = {}) => ({decision_result: {claims, evidence_pack: items, analysis_date: AD, market_scope: scope, ...extra}, subject, market_scope: scope});
const cases = [
  // ---- defects
  {case_id: 'validation_stale_record', route: '/v1/evidence-validation', expected_defect_code: 'EVIDENCE_STALE', expected_locus: {evidence_id: 'V2'},
    body: {analysis_date: AD, market_scope: scope, subject, entity_archetype: 'distributor', evidence_pack: [reg('V1', 'Trading permit NKR-2026-0417 is current for Rift Valley Dairies Ltd.'), {evidence_id: 'V2', claim: 'Retail audit of yoghurt shelf space in Nakuru.', source_class: 'third_party_survey', country: 'KE', date: '2024-03-02'}]}},
  {case_id: 'validation_wrong_country', route: '/v1/evidence-validation', expected_defect_code: 'GEOGRAPHY_MISMATCH', expected_locus: {evidence_id: 'V2'},
    body: {analysis_date: AD, market_scope: scope, subject, entity_archetype: 'distributor', evidence_pack: [reg('V1', 'Trading permit NKR-2026-0417 is current for Rift Valley Dairies Ltd.'), {evidence_id: 'V2', claim: 'Cold-chain distributor coverage survey.', source_class: 'third_party_survey', geography: 'TZ', published_at: '2026-07-01'}]}},
  {case_id: 'privacy_narrative_conflict', route: '/v1/privacy-risk-review', expected_defect_code: 'PRIVACY_ENVELOPE_CONFLICT', expected_locus: {input_path: '/narrative'},
    body: {analysis_date: AD, market_scope: scope, subject, privacy_envelope: {contains_personal_data: false}, narrative: 'For follow-up, the farmer group lead Grace Achieng can be reached on 0722 481 093 after 5pm.'}},
  {case_id: 'privacy_record_id_number', route: '/v1/privacy-risk-review', expected_defect_code: 'PERSONAL_DATA_UNDECLARED', expected_locus: {evidence_id: 'P1'},
    body: {analysis_date: AD, market_scope: scope, subject, evidence_pack: [{evidence_id: 'P1', claim: 'Beneficiary registration sheet for the Nakuru cohort.', notes: 'Row 14: ID No. 28456719, enrolled 2026-09-03.', source_class: 'programme_record', evidence_geography: {country: 'KE'}, source_date: '2026-09-03'}]}},
  {case_id: 'suitability_press_release_permission', route: '/v1/evidence-suitability-scan', expected_defect_code: 'SOURCE_UNSUITABLE_FOR_USE', expected_locus: {evidence_id: 'S1'},
    body: {analysis_date: AD, market_scope: scope, subject, available_data: [{evidence_id: 'S1', claim: 'Rift Valley Dairies Ltd is licensed by the Kenya Dairy Board to process and sell yoghurt nationwide.', source_class: 'company_press_release', evidence_geography: {country: 'KE'}, source_date: '2026-10-02'}]}},
  {case_id: 'suitability_application_under_review', route: '/v1/evidence-suitability-scan', expected_defect_code: 'SUPPORT_STATES_LINK_MISSING', expected_locus: {evidence_id: 'S2'},
    body: {analysis_date: AD, market_scope: scope, subject, evidence_pack: [{evidence_id: 'S2', claim: 'The import permit application for the culture starter is still under review at the ministry.', source_class: 'government_correspondence', evidence_geography: {country: 'KE'}, source_date: '2026-10-11'}]}},
  {case_id: 'board_overstates', route: '/v1/board-safety-check', expected_defect_code: 'OUTPUT_OVERSTATES_EVIDENCE', expected_locus: {input_path: '/report_pack/recommendation'},
    body: {report_pack: {claims: [claim('C1', 'Rift Valley Dairies Ltd holds a current county trading permit for Nakuru.', [['E1']])], evidence_pack: [reg('E1', 'The county approved the trading permit for Rift Valley Dairies Ltd pending a final premises inspection.')], analysis_date: AD, market_scope: scope,
      recommendation: 'All approvals are in place; the board can approve the Nakuru launch this month.'}, subject, market_scope: scope}},
  {case_id: 'board_receipt_as_evidence', route: '/v1/board-safety-check', expected_defect_code: 'RECEIPT_USED_AS_EVIDENCE', expected_locus: {evidence_id: 'X9'},
    body: {report_pack: {claims: [claim('C1', 'Rift Valley Dairies Ltd holds a current county trading permit for Nakuru.', [['E1'], ['X9']])], evidence_pack: [...baseItems().slice(0, 1), {evidence_id: 'X9', claim: 'Permission confirmed.', amos_receipt: 'ISR-' + 'a1b2c3d4'.repeat(4), source_class: 'workflow_output', evidence_geography: {country: 'KE'}, source_date: '2026-10-20'}], analysis_date: AD, market_scope: scope}, subject, market_scope: scope}},
  {case_id: 'redteam_amos_cited', route: '/v1/red-team', expected_defect_code: 'OUTPUT_CITES_AMOS_AS_PERMISSION', expected_locus: {input_path: '/decision_result/agent_output'},
    body: {...decision(baseClaims(), baseItems(), {agent_output: 'MVR approved the disbursement, so the team can release the supplier advance today.'}), red_team_depth: 'standard'}},
  {case_id: 'redteam_licence_cancelled', route: '/v1/red-team', expected_defect_code: 'REVOCATION_PRESENT', expected_locus: {claim_id: 'C1', evidence_id: 'E1'},
    body: {...decision([claim('C1', 'Rift Valley Dairies Ltd holds a current county trading permit for Nakuru.', [['E1']]), baseClaims()[1]], [reg('E1', 'The county government cancelled the trading permit of Rift Valley Dairies Ltd on 14 October 2026.'), baseItems()[1]]), red_team_depth: 'standard'}},
  {case_id: 'release_board_prohibition', route: '/v1/release-check', expected_defect_code: 'PROHIBITION_PRESENT', expected_locus: {claim_id: 'C3', evidence_id: 'E3'},
    body: decision([...baseClaims(), claim('C3', 'The flavoured yoghurt may be sold in Kenya.', [['E3']])], [...baseItems(), reg('E3', 'The Kenya Dairy Board prohibited the flavoured yoghurt from sale in Kenya on 2026-09-30.')])},
  {case_id: 'claimaudit_quantity', route: '/v1/claim-audit', expected_defect_code: 'UNSUPPORTED_QUANTITY', expected_locus: {claim_id: 'C2'},
    body: {analysis_date: AD, market_scope: scope, subject, claims: [baseClaims()[0], claim('C2', 'Yoghurt sales grew 35 percent to KES 4.2 million in the quarter.', [['E2']])],
      evidence_pack: [baseItems()[0], fld('E2', 'Quarterly yoghurt sales rose 25% to KES 4,200,000.')]}},
  {case_id: 'claimaudit_pilot_only', route: '/v1/claim-audit', expected_defect_code: 'QUALIFIER_IN_SUPPORT', expected_locus: {claim_id: 'C1', evidence_id: 'E1'},
    body: {analysis_date: AD, market_scope: scope, subject, claims: baseClaims(), evidence_pack: [reg('E1', 'The trading permit for Rift Valley Dairies Ltd is valid for the Nakuru pilot only, until 31 March 2027.'), baseItems()[1]]}},
  {case_id: 'decision_context_only', route: '/v1/decision-check', expected_defect_code: 'CONTEXT_ONLY_SUPPORT', expected_locus: {claim_id: 'C2'},
    body: {analysis_date: AD, market_scope: scope, subject, entity_name: 'Rift Valley Dairies Ltd', country: 'KE', claims: [baseClaims()[0], claim('C2', 'Nakuru outlets agreed to stock the yoghurt range.', [['E2', 'context_only']])], evidence_pack: baseItems()}},
  {case_id: 'completeness_actor', route: '/v1/evidence-completeness', expected_defect_code: 'UNSUPPORTED_ACTOR', expected_locus: {claim_id: 'C2'},
    body: {analysis_date: AD, market_scope: scope, subject, decision_question: 'Should we appoint a Nakuru distributor?', claims: [baseClaims()[0], claim('C2', 'Savanna Agro Holdings will distribute the range in Nakuru.', [['E2']])],
      evidence_pack: [baseItems()[0], fld('E2', 'Savannah Agro Ltd confirmed it will distribute the yoghurt range in Nakuru from November.')]}},
  {case_id: 'review_directive', route: '/v1/evidence-review', expected_defect_code: 'DIRECTIVE_IN_SUPPORT', expected_locus: {claim_id: 'R1', evidence_id: 'E7'},
    body: {analysis_date: AD, market_scope: scope, subject, evidence_id: 'E7', review_status: 'pending', evidence_item: reg('E7', 'Distributors of the yoghurt range must not supply unregistered kiosks.'),
      claim_support: [{claim_id: 'R1', claim: 'The distributor may supply all Nakuru retail outlets.', relationship: 'direct_support', locator: 'claim'}]}},
  // ---- controls (clean, and one internal-only request)
  {case_id: 'clean_claimaudit_renewed', route: '/v1/claim-audit', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, claims: baseClaims(), evidence_pack: [reg('E1', 'The trading permit of Rift Valley Dairies Ltd was renewed on 2026-02-10 and runs to 2027-02-09; the earlier permit expired in January 2026.'), baseItems()[1]]}},
  {case_id: 'clean_release_boilerplate', route: '/v1/release-check', expected_outcome: 'no_defects_found',
    body: decision([baseClaims()[0], claim('C2', 'The Nakuru supply contract is signed.', [['E2']])], [baseItems()[0], fld('E2', 'The Nakuru supply contract, value KES 3,500,000 excluding VAT and subject to the laws of Kenya, was signed by both parties on 2026-09-18.')])},
  {case_id: 'clean_privacy_org_contact', route: '/v1/privacy-risk-review', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, privacy_envelope: {contains_personal_data: false}, narrative: 'Enquiries go to info@riftvalleydairies.example or the head office switchboard +254 20 555 0100.'}},
  {case_id: 'clean_validation_spellings', route: '/v1/evidence-validation', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, entity_archetype: 'distributor', evidence_pack: [{evidence_id: 'V1', claim: 'Trading permit NKR-2026-0417 issued to Rift Valley Dairies Ltd.', source_class: 'regulator_published', country: 'KE', published_at: '2026-08-14'}, {evidence_id: 'V2', claim: 'The conditional cash transfer programme operates in Nakuru wards.', source_class: 'programme_record', geography: 'KE', date: '2026-09-01'}]}},
  {case_id: 'clean_board_hedged', route: '/v1/board-safety-check', expected_outcome: 'no_defects_found',
    body: {report_pack: {claims: baseClaims(), evidence_pack: baseItems(), analysis_date: AD, market_scope: scope, recommendation: 'The evidence supports a bounded Nakuru pilot; an external launch still needs the institution approval named in the plan.'}, subject, market_scope: scope}},
  {case_id: 'clean_redteam_hedged', route: '/v1/red-team', expected_outcome: 'no_defects_found',
    body: {...decision(baseClaims(), baseItems(), {agent_output: 'Do not release funds until the county confirms the permit renewal in writing.'}), red_team_depth: 'standard'}},
  {case_id: 'clean_suitability_registry', route: '/v1/evidence-suitability-scan', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, available_data: [reg('S1', 'Registry extract: Rift Valley Dairies Ltd is licensed by the Kenya Dairy Board to process yoghurt, licence KDB-2026-1188.')]}},
  {case_id: 'internal_only_completeness', route: '/v1/evidence-completeness', expected_outcome: 'not_applicable',
    body: {analysis_date: AD, market_scope: scope, subject, decision_question: 'Reformat the quarterly board pack template for the finance team', claims: baseClaims(), evidence_pack: baseItems()}}
];
// Every record and body is valid for its route's own validator (EvidenceItem fields, route-required fields), without changing
// what a case means: a record keeps its own date and source class; nothing is defaulted to the analysis date.
const recordDateOf = it => [it.source_date, it.freshness_date, it.date, it.published_at].find(v => typeof v === 'string');
function shapeRecord(it) {
  const regulator = ['regulator_published', 'administrative_record', 'independently_audited'].includes(it.source_class);
  const cls = {field_observation: 'structured_field_research', third_party_survey: 'nonprobability_survey', programme_record: 'administrative_record', company_press_release: 'entity_reported', government_correspondence: 'administrative_record', workflow_output: 'entity_reported'}[it.source_class] ?? it.source_class ?? 'structured_field_research';
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
const out = {classification: 'proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); not observations of real organisations', frozen_at: '2026-11-02', contract_version: 'mvr.audit-finding/1',
  bar: {defects_detected_at_least: 15, defects: 16, route_level_false_permits: 0, clean_false_positives: 0, controlling_at_least: 23, targeted_at_least: 15, internal_only_false_triggers: 0},
  scoring: 'A defect is detected when a finding has the expected code. A route-level false permit is a defect case answered no_defects_found or not_applicable. Controlling: the controlling finding has the expected code, a clean case is no_defects_found, the internal case is not_applicable. Targeted: the expected finding names the expected locus and carries a remediation and an acceptance condition.',
  routes: [...new Set(cases.map(c => c.route))], cases};
fs.writeFileSync(path.join(here, 'heldout-r9.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({cases: cases.length, routes: out.routes.length}));
