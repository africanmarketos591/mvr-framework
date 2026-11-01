// Scorer adapter for the audit finding contract (mvr.audit-finding/1). Reads route responses and produces the R8
// qualification measures per route/profile cell. A global hold elsewhere in a response is ignored: only audit_findings
// and route_audit_result count, as the contract states.
export function scoreCell(results) {
  const cell = {cells: 0, defects: 0, defects_detected: 0, fully_targeted: 0, clean_controls: 0, clean_false_positives: 0, controlling_preserved: 0, critical_false_permits: 0, missing_contract: 0};
  for (const r of results) {
    cell.cells++;
    const f = r.body?.audit_findings;
    if (!f) { cell.missing_contract++; continue; }
    if (/"execution_authorized":\s*true|"external_action_authorized":\s*true/.test(JSON.stringify(r.body))) cell.critical_false_permits++;
    if (r.expected_defect_code) {
      cell.defects++;
      const hit = (f.findings || []).find(x => x.defect_code === r.expected_defect_code);
      if (!hit) continue;
      cell.defects_detected++;
      const locusOk = Object.entries(r.expected_locus || {}).every(([k, v]) => hit.locus?.[k] === v);
      if (locusOk && hit.acceptance_condition?.type && hit.smallest_remediation?.action && (f.findings || []).every(x => x.defect_code === r.expected_defect_code)) cell.fully_targeted++;
      if (r.body.route_audit_result?.controlling_finding_id === f.controlling_finding_id && f.findings[0]?.defect_code === r.expected_defect_code) cell.controlling_preserved++;
    } else {
      cell.clean_controls++;
      if ((f.findings || []).length) cell.clean_false_positives++;
      else if (r.body.route_audit_result?.audit_outcome === 'no_defects_found') cell.controlling_preserved++;
    }
  }
  cell.passes_r8_bar = cell.cells === 24 && cell.missing_contract === 0 && cell.defects_detected >= 15 && cell.clean_false_positives === 0 && cell.critical_false_permits === 0 && cell.controlling_preserved >= 23 && cell.fully_targeted >= 15;
  return cell;
}
