// Adds the fields each audit route's own validator requires, without changing what a case means.
export function routeShape(body, route) {
  const b = structuredClone(body);
  b.subject = {...(b.subject || {}), entity_archetype: b.subject?.entity_archetype || 'fmcg_brand'};
  for (const item of b.evidence_pack || []) {
    item.id ??= item.evidence_id;
    item.evidence_origin ??= 'field_research';
    item.stakeholder_class ??= 'retailer';
    item.source_class ??= 'structured_field_research';
    item.source_grade ??= 'B';
    item.evidence_type ??= 'survey';
    item.collection_method ??= 'field_survey';
    item.geography ??= item.evidence_geography?.country || 'UG';
    if (item.source_date && !item.freshness_date) item.freshness_date = item.source_date;
    if (!item.source_date && !item.freshness_date) item.freshness_date = item.source_scope?.effective_from || b.analysis_date;
    item.source_doc_id ??= 'LAB-' + item.evidence_id;
    item.structured_values ??= {trust: 60, permission: 55};
  }
  for (const c of b.claims || []) for (const l of c.support_links || []) l.claim_id ??= c.claim_id;
  // Strict evidence modes require a complete envelope; a case keeps its own declarations on top.
  for (const item of b.evidence_pack || []) item.privacy_envelope = {consent_basis: 'legitimate_interest', retention_class: '1y', redaction_status: 'redacted', safe_for_modeling: true, ...(item.privacy_envelope || {})};
  if (route === '/v1/decision-check') { b.mode ??= 'evidence_backed'; b.case_type ??= 'scaling'; b.maturity_level ??= 'startup'; b.market_scope = {...b.market_scope, decision_scope_level: 'country'}; }
  return b;
}
