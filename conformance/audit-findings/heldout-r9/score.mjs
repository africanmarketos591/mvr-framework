// Scores held-out audit responses against the R9 bar. results: [{case, body}] where body is the route response (or the
// audit_findings object itself for an in-process run).
export function scoreHeldout(cases, results) {
  const s = {cases: cases.length, defects: 0, defects_detected: 0, route_level_false_permits: 0, clean: 0, clean_false_positives: 0, internal: 0, internal_only_false_triggers: 0, controlling: 0, targeted: 0, missing_contract: 0, rows: []};
  for (const c of cases) {
    const r = results.find(x => x.case_id === c.case_id);
    const f = r?.body?.audit_findings ?? (r?.body?.contract_version === 'mvr.audit-finding/1' ? r.body : null);
    const row = {case_id: c.case_id, route: c.route};
    if (!f) { s.missing_contract++; row.missing_contract = true; s.rows.push(row); continue; }
    const codes = (f.findings || []).map(x => x.defect_code);
    row.outcome = f.audit_outcome; row.codes = codes;
    if (c.expected_defect_code) {
      s.defects++;
      const hit = (f.findings || []).find(x => x.defect_code === c.expected_defect_code);
      if (hit) s.defects_detected++;
      if (['no_defects_found', 'not_applicable'].includes(f.audit_outcome)) { s.route_level_false_permits++; row.false_permit = true; }
      if (f.findings?.[0]?.defect_code === c.expected_defect_code) s.controlling++; else row.controlling_miss = f.findings?.[0]?.defect_code ?? null;
      if (hit && Object.entries(c.expected_locus || {}).every(([k, v]) => hit.locus?.[k] === v) && hit.smallest_remediation?.action && hit.acceptance_condition?.type) s.targeted++; else if (hit) row.locus = hit.locus;
      row.detected = !!hit;
    } else if (c.expected_outcome === 'not_applicable') {
      s.internal++;
      if (f.audit_outcome === 'not_applicable') s.controlling++; else { s.internal_only_false_triggers++; row.false_trigger = true; }
    } else {
      s.clean++;
      if (codes.length) { s.clean_false_positives++; row.false_positive = true; } else if (f.audit_outcome === 'no_defects_found') s.controlling++;
    }
    s.rows.push(row);
  }
  s.passes_r9_bar = s.missing_contract === 0 && s.defects_detected >= 15 && s.route_level_false_permits === 0 && s.clean_false_positives === 0 && s.controlling >= 23 && s.targeted >= 15 && s.internal_only_false_triggers === 0;
  return s;
}
