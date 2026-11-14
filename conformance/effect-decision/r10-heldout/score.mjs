// Scores exact-effect answers for the R10 fixtures. results: [{case_id, body}] with body the effect-decision answer.
export function scoreSets(cohort, results) {
  const byId = new Map(results.map(r => [r.case_id, r.body]));
  const sets = {}, mismatches = [];
  for (const c of cohort.cases) {
    const s = (sets[c.set] ||= {rows: 0, exact: 0, false_favorable: 0, too_severe: 0, complete: {n: 0, exact: 0}, missing: {n: 0, exact: 0}, conditional: {n: 0, exact: 0}, planning_rows: 0, planning_favorable: 0, external_authorized: 0});
    const effects = new Map((byId.get(c.case_id)?.effects || []).map(e => [e.effect_id, e]));
    const rank = {adverse: 0, insufficient: 1, conditional: 2, favorable: 3};
    for (const [id, exp] of Object.entries(c.expected)) {
      const e = effects.get(id), got = e ? [e.analytical_evidence_status, e.institutional_authority_status, e.execution_authorization_status] : [null, null, null];
      if (id === 'INT-PLAN') { s.planning_rows++; if (got[0] === 'favorable' && got[2] === 'planning_only') s.planning_favorable++; else mismatches.push({case: c.case_id, id, got}); continue; }
      s.rows++; s[c.variant].n++;
      const agree = got[0] === exp.analytical && got[1] === exp.authority && got[2] === exp.execution;
      if (agree) { s.exact++; s[c.variant].exact++; } else mismatches.push({case: c.case_id, id, expected: [exp.analytical, exp.authority, exp.execution], got});
      if (got[0] === 'favorable' && exp.analytical !== 'favorable') s.false_favorable++;
      if (got[0] !== null && rank[got[0]] < rank[exp.analytical]) s.too_severe++;
      if (id === 'EXT' && got[2] === 'authorized') s.external_authorized++;
    }
  }
  return {sets, mismatches};
}
export function scoreStructure(structure, results) {
  const byId = new Map(results.map(r => [r.case_id, r.body]));
  const out = {cases: structure.cases.length, exact: 0, mismatches: []};
  for (const c of structure.cases) {
    const effects = new Map((byId.get(c.case_id)?.effects || []).map(e => [e.effect_id, e]));
    const ext = [...effects.values()].filter(e => e.effect_id.startsWith('EXT')), rec = effects.get('INT-REC'), plan = effects.get('INT-PLAN');
    const ok = ext.length > 0 && ext.every(e => e.analytical_evidence_status === c.expected.analytical && e.execution_authorization_status !== 'authorized' && (!c.expected.authority || e.institutional_authority_status === c.expected.authority))
      && rec?.analytical_evidence_status === c.expected.internal_recommendation && plan?.analytical_evidence_status === 'favorable' && plan?.execution_authorization_status === 'planning_only'
      && (!c.expected.reason || ext.every(e => (e.reason_codes || []).includes(c.expected.reason)));
    if (ok) out.exact++; else out.mismatches.push({case: c.case_id, expected: c.expected, got: {external: ext.map(e => [e.analytical_evidence_status, e.institutional_authority_status, e.reason_codes]), rec: rec?.analytical_evidence_status, plan: [plan?.analytical_evidence_status, plan?.execution_authorization_status]}});
  }
  return out;
}
