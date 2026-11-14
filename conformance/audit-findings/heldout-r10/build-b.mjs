#!/usr/bin/env node
// Builds the second R10 held-out audit cohort (set B): 16 planted defects and 8 controls in another domain (seed
// distribution) and other wording. Written on 2026-11-11 after set A had been used to revise the detectors, and frozen
// before its first run; scored once as measured (README.md). Proprietary lab fixtures; not observations of real organisations.
//   node conformance/audit-findings/heldout-r10/build-b.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const AD = '2026-11-01';
const scope = {country: 'KE'};
const reg = (id, text, extra = {}) => ({evidence_id: id, claim: text, source_class: 'regulator_published', evidence_type: 'registry_extract', evidence_geography: {country: 'KE'}, source_date: '2026-03-11', ...extra});
const fld = (id, text, extra = {}) => ({evidence_id: id, claim: text, source_class: 'counterparty_record', evidence_geography: {country: 'KE', locality: 'nakuru'}, source_date: '2026-08-02', ...extra});
const claim = (id, text, links) => ({claim_id: id, claim: text, support_links: links.map(([e, rel = 'direct_support', loc = 'claim']) => ({evidence_id: e, relationship: rel, locator: loc}))});
const baseClaims = () => [claim('C1', 'Savanna Seeds Ltd is registered by KEPHIS as a seed merchant.', [['E1']]), claim('C2', 'Highland Agrovet Ltd signed the Nakuru stockist agreement with Savanna Seeds Ltd.', [['E2']])];
const baseItems = () => [reg('E1', 'KEPHIS registered Savanna Seeds Ltd as a seed merchant on 2026-03-11, registration SM-2026-0412, valid until 2027-03-10.'), fld('E2', 'Highland Agrovet Ltd signed the Nakuru stockist agreement with Savanna Seeds Ltd on 2026-08-02.')];
const subject = {entity_name: 'Savanna Seeds Ltd'};
const decision = (claims, items, extra = {}) => ({decision_result: {claims, evidence_pack: items, analysis_date: AD, market_scope: scope, ...extra}, subject, market_scope: scope});
const cases = [
  {case_id: 'b_validation_old_survey', route: '/v1/evidence-validation', expected_defect_code: 'EVIDENCE_STALE', expected_locus: {evidence_id: 'V2'},
    body: {analysis_date: AD, market_scope: scope, subject, entity_archetype: 'distributor', evidence_pack: [reg('V1', 'KEPHIS registered Savanna Seeds Ltd as a seed merchant on 2026-03-11.'), {evidence_id: 'V2', claim: 'Baseline survey of seed demand among Nakuru smallholders.', source_class: 'third_party_survey', country: 'KE', published_at: '2022-05-01'}]}},
  {case_id: 'b_validation_neighbour_country', route: '/v1/evidence-validation', expected_defect_code: 'GEOGRAPHY_MISMATCH', expected_locus: {evidence_id: 'V2'},
    body: {analysis_date: AD, market_scope: scope, subject, entity_archetype: 'distributor', evidence_pack: [reg('V1', 'KEPHIS registered Savanna Seeds Ltd as a seed merchant on 2026-03-11.'), {evidence_id: 'V2', claim: 'Agro-dealer density map for the northern zone.', source_class: 'third_party_survey', geography: 'TZ', date: '2026-06-15'}]}},
  {case_id: 'b_privacy_personal_email', route: '/v1/privacy-risk-review', expected_defect_code: 'PRIVACY_ENVELOPE_CONFLICT', expected_locus: {input_path: '/narrative'},
    body: {analysis_date: AD, market_scope: scope, subject, privacy_envelope: {contains_personal_data: false}, narrative: 'Send the signed forms to jane.wanjiru@gmail.com, the cooperative treasurer.'}},
  {case_id: 'b_privacy_member_list', route: '/v1/privacy-risk-review', expected_defect_code: 'PERSONAL_DATA_UNDECLARED', expected_locus: {evidence_id: 'P1'},
    body: {analysis_date: AD, market_scope: scope, subject, evidence_pack: [{evidence_id: 'P1', claim: 'Cooperative member list used for the seed pre-order drive.', notes: 'Member 7: passport number A1234567, born on 12/03/1985.', source_class: 'programme_record', evidence_geography: {country: 'KE'}, source_date: '2026-09-10'}]}},
  {case_id: 'b_suitability_social_post', route: '/v1/evidence-suitability-scan', expected_defect_code: 'SOURCE_UNSUITABLE_FOR_USE', expected_locus: {evidence_id: 'S1'},
    body: {analysis_date: AD, market_scope: scope, subject, available_data: [{evidence_id: 'S1', claim: 'Savanna Seeds Ltd is licensed by KEPHIS to sell certified maize seed.', source_class: 'social_media_post', evidence_geography: {country: 'KE'}, source_date: '2026-10-03'}]}},
  {case_id: 'b_suitability_not_yet_issued', route: '/v1/evidence-suitability-scan', expected_defect_code: 'SUPPORT_STATES_LINK_MISSING', expected_locus: {evidence_id: 'S2'},
    body: {analysis_date: AD, market_scope: scope, subject, evidence_pack: [{evidence_id: 'S2', claim: 'KEPHIS has not yet issued the seed merchant registration to Savanna Seeds Ltd.', source_class: 'government_correspondence', evidence_geography: {country: 'KE'}, source_date: '2026-10-08'}]}},
  {case_id: 'b_board_calls_it_full', route: '/v1/board-safety-check', expected_defect_code: 'OUTPUT_OVERSTATES_EVIDENCE', expected_locus: {input_path: '/report_pack/recommendation'},
    body: {report_pack: {claims: [claim('C1', 'The county has approved the Nakuru stockist network of Savanna Seeds Ltd.', [['E1']])], evidence_pack: [reg('E1', 'The county approved the Nakuru stockist network of Savanna Seeds Ltd provisionally for one season.')], analysis_date: AD, market_scope: scope,
      recommendation: 'The network is fully approved; proceed with the national rollout.'}, subject, market_scope: scope}},
  {case_id: 'b_board_statement_as_evidence', route: '/v1/board-safety-check', expected_defect_code: 'RECEIPT_USED_AS_EVIDENCE', expected_locus: {evidence_id: 'X4'},
    body: {report_pack: {claims: [claim('C1', 'Savanna Seeds Ltd is registered by KEPHIS as a seed merchant.', [['E1'], ['X4']])], evidence_pack: [baseItems()[0], {evidence_id: 'X4', claim: 'The MVR permission statement PSR-3f9a1c2e7b4d5a60 shows the registration as current.', source_class: 'workflow_output', evidence_geography: {country: 'KE'}, source_date: '2026-10-22'}], analysis_date: AD, market_scope: scope}, subject, market_scope: scope}},
  {case_id: 'b_redteam_signed_off', route: '/v1/red-team', expected_defect_code: 'OUTPUT_CITES_AMOS_AS_PERMISSION', expected_locus: {input_path: '/decision_result/agent_output'},
    body: {...decision(baseClaims(), baseItems(), {agent_output: 'MVR has signed off the launch, so we will ship the first consignment on Monday.'}), red_team_depth: 'standard'}},
  {case_id: 'b_redteam_deregistered', route: '/v1/red-team', expected_defect_code: 'REVOCATION_PRESENT', expected_locus: {claim_id: 'C1', evidence_id: 'E1'},
    body: {...decision(baseClaims(), [reg('E1', 'KEPHIS deregistered Savanna Seeds Ltd as a seed merchant on 3 October 2026.', {source_date: '2026-10-03'}), baseItems()[1]]), red_team_depth: 'standard'}},
  {case_id: 'b_release_county_ban', route: '/v1/release-check', expected_defect_code: 'PROHIBITION_PRESENT', expected_locus: {claim_id: 'C3', evidence_id: 'E3'},
    body: decision([...baseClaims(), claim('C3', 'Savanna Seeds Ltd may trade seed in Nakuru.', [['E3']])], [...baseItems(), reg('E3', 'The county government banned Savanna Seeds Ltd from trading in uncertified seed in Nakuru.', {source_date: '2026-10-14'})])},
  {case_id: 'b_claimaudit_count', route: '/v1/claim-audit', expected_defect_code: 'UNSUPPORTED_QUANTITY', expected_locus: {claim_id: 'C2'},
    body: {analysis_date: AD, market_scope: scope, subject, claims: [baseClaims()[0], claim('C2', 'Field teams recorded 1,200 farmer pre-orders for the season.', [['E2']])],
      evidence_pack: [baseItems()[0], fld('E2', 'Field teams recorded 920 farmer pre-orders for the season.')]}},
  {case_id: 'b_claimaudit_one_season', route: '/v1/claim-audit', expected_defect_code: 'QUALIFIER_IN_SUPPORT', expected_locus: {claim_id: 'C2', evidence_id: 'E2'},
    body: {analysis_date: AD, market_scope: scope, subject, claims: baseClaims(), evidence_pack: [baseItems()[0], fld('E2', 'Highland Agrovet Ltd signed the Nakuru stockist agreement with Savanna Seeds Ltd on 2026-08-02 for the long-rains season only.')]}},
  {case_id: 'b_decision_background_only', route: '/v1/decision-check', expected_defect_code: 'CONTEXT_ONLY_SUPPORT', expected_locus: {claim_id: 'C2'},
    body: {analysis_date: AD, market_scope: scope, subject, entity_name: 'Savanna Seeds Ltd', country: 'KE', claims: [baseClaims()[0], claim('C2', 'Highland Agrovet Ltd signed the Nakuru stockist agreement with Savanna Seeds Ltd.', [['E2', 'context_only']])], evidence_pack: baseItems()}},
  {case_id: 'b_completeness_similar_name', route: '/v1/evidence-completeness', expected_defect_code: 'UNSUPPORTED_ACTOR', expected_locus: {claim_id: 'C2'},
    body: {analysis_date: AD, market_scope: scope, subject, decision_question: 'Should we ship the first consignment to the Nakuru stockist?', claims: [baseClaims()[0], claim('C2', 'Highland Agrovet Ltd signed the Nakuru stockist agreement.', [['E2']])],
      evidence_pack: [baseItems()[0], fld('E2', 'Highlands Farm Supplies Ltd signed the Nakuru stockist agreement on 2026-08-02.')]}},
  {case_id: 'b_review_rule_against', route: '/v1/evidence-review', expected_defect_code: 'DIRECTIVE_IN_SUPPORT', expected_locus: {claim_id: 'R1', evidence_id: 'E8'},
    body: {analysis_date: AD, market_scope: scope, subject, evidence_id: 'E8', review_status: 'pending', evidence_item: reg('E8', 'Seed merchants must not sell treated seed to unregistered stockists.'),
      claim_support: [{claim_id: 'R1', claim: 'Savanna Seeds Ltd may sell treated seed to any Nakuru stockist.', relationship: 'direct_support', locator: 'claim'}]}},
  // ---- controls
  {case_id: 'b_clean_claimaudit_not_suspended', route: '/v1/claim-audit', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, claims: baseClaims(), evidence_pack: [reg('E1', 'KEPHIS registered Savanna Seeds Ltd as a seed merchant on 2026-03-11; the registration has not been suspended and runs until 2027-03-10.'), baseItems()[1]]}},
  {case_id: 'b_clean_release_terms', route: '/v1/release-check', expected_outcome: 'no_defects_found',
    body: decision(baseClaims(), [baseItems()[0], fld('E2', 'Stockist agreement SA-114 between Savanna Seeds Ltd and Highland Agrovet Ltd, signed by both parties on 2026-08-02, runs until 2027-08-01 and is governed by the laws of Kenya.')])},
  {case_id: 'b_clean_privacy_role_contact', route: '/v1/privacy-risk-review', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, privacy_envelope: {contains_personal_data: false}, narrative: 'Orders go through orders@savannaseeds.example or the Nakuru depot helpdesk, 0800 720 114.'}},
  {case_id: 'b_clean_validation_spellings', route: '/v1/evidence-validation', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, entity_archetype: 'distributor', evidence_pack: [{evidence_id: 'V1', claim: 'KEPHIS seed merchant registration SM-2026-0412 issued to Savanna Seeds Ltd.', source_class: 'regulator_published', country: 'KE', published_at: '2026-03-11'}, {evidence_id: 'V2', claim: 'Stockist agreement SA-114 signed with Highland Agrovet Ltd.', source_class: 'counterparty_record', geography: 'KE', date: '2026-08-02'}]}},
  {case_id: 'b_clean_board_trial', route: '/v1/board-safety-check', expected_outcome: 'no_defects_found',
    body: {report_pack: {claims: baseClaims(), evidence_pack: baseItems(), analysis_date: AD, market_scope: scope, recommendation: 'The pack supports preparing a one-season trial with the named stockist; shipping waits for the institution approver.'}, subject, market_scope: scope}},
  {case_id: 'b_clean_redteam_wait', route: '/v1/red-team', expected_outcome: 'no_defects_found',
    body: {...decision(baseClaims(), baseItems(), {agent_output: 'Do not ship until the institution approver has countersigned the release.'}), red_team_depth: 'standard'}},
  {case_id: 'b_clean_suitability_register', route: '/v1/evidence-suitability-scan', expected_outcome: 'no_defects_found',
    body: {analysis_date: AD, market_scope: scope, subject, available_data: [reg('S1', 'KEPHIS seed merchant register, entry SM-2026-0412: Savanna Seeds Ltd, registered 2026-03-11.')]}},
  {case_id: 'b_internal_only_completeness', route: '/v1/evidence-completeness', expected_outcome: 'not_applicable',
    body: {analysis_date: AD, market_scope: scope, subject, decision_question: 'Refactor the unit tests for the payroll module', claims: baseClaims(), evidence_pack: baseItems()}}
];
const recordDateOf = it => [it.source_date, it.freshness_date, it.date, it.published_at].find(v => typeof v === 'string');
function shapeRecord(it) {
  const regulator = ['regulator_published', 'administrative_record', 'independently_audited'].includes(it.source_class);
  const cls = {counterparty_record: 'structured_field_research', third_party_survey: 'nonprobability_survey', programme_record: 'administrative_record', social_media_post: 'entity_reported', government_correspondence: 'administrative_record', workflow_output: 'entity_reported'}[it.source_class] ?? it.source_class ?? 'structured_field_research';
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
const out = {classification: 'proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); not observations of real organisations', frozen_at: '2026-11-11', contract_version: 'mvr.audit-finding/1', set: 'B',
  bar: {defects_detected_at_least: 15, defects: 16, route_level_false_permits: 0, clean_false_positives: 0, controlling_at_least: 23, targeted_at_least: 15, internal_only_false_triggers: 0},
  scoring: 'Same scorer as heldout-r9 (../heldout-r9/score.mjs).', routes: [...new Set(cases.map(c => c.route))], cases};
fs.writeFileSync(path.join(here, 'heldout-r10b.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({cases: cases.length, routes: out.routes.length}));
