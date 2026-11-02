// Scores exact-effect responses for the R9-shaped held-out cohort. results: [{case_id, body}] with body the effect-decision answer.
export function scoreEffects(cohort, results) {
  const s = {market_rows: 0, market_agree: 0, false_favorable: 0, false_adverse: 0, missing_rows: 0, missing_precedence: 0, qualifier_rows: 0, qualifier_precedence: 0,
    external_rows: 0, external_authorized: 0, irrelevant_pairs: 0, irrelevant_identical: 0, internal: 0, internal_not_relevant: 0, mismatches: []};
  const byId = new Map(results.map(r => [r.case_id, r.body]));
  const rank = {adverse: 0, insufficient: 1, conditional: 2, favorable: 3};
  for (const c of cohort.cases) {
    const body = byId.get(c.case_id);
    const effects = new Map((body?.effects || []).map(e => [e.effect_id, e]));
    for (const [id, exp] of Object.entries(c.expected)) {
      const e = effects.get(id);
      const got = e ? [e.analytical_evidence_status, e.institutional_authority_status, e.execution_authorization_status] : [null, null, null];
      if (c.variant === 'internal_control') { s.internal++; if (got[0] === 'not_relevant') s.internal_not_relevant++; else s.mismatches.push({case: c.case_id, id, got}); continue; }
      s.market_rows++;
      const agree = got[0] === exp.analytical && got[1] === exp.authority && got[2] === exp.execution && (!exp.precedence_rule || e?.precedence_rule === exp.precedence_rule);
      if (agree) s.market_agree++; else s.mismatches.push({case: c.case_id, id, expected: [exp.analytical, exp.authority, exp.execution, exp.precedence_rule ?? ''], got: [...got, e?.precedence_rule ?? null]});
      if (got[0] === 'favorable' && exp.analytical !== 'favorable') s.false_favorable++;
      if (got[0] === 'adverse' && exp.analytical !== 'adverse') s.false_adverse++;
      if (id.startsWith('EXT')) { s.external_rows++; if (got[2] === 'authorized') s.external_authorized++; }
      if (c.variant === 'missing' && id !== 'INT-PLAN') { s.missing_rows++; if (got[0] === 'insufficient' && (id === 'INT-REC' || e?.precedence_rule === 'R3_LOAD_BEARING_CLAIM_INSUFFICIENT')) s.missing_precedence++; }
      if (c.variant === 'conditional' && id !== 'INT-PLAN') { s.qualifier_rows++; if (got[0] === 'conditional' && (id === 'INT-REC' || e?.precedence_rule === 'R4_LOAD_BEARING_CLAIM_CONDITIONAL')) s.qualifier_precedence++; }
    }
    if (c.paired_with) {
      s.irrelevant_pairs++;
      const a = byId.get(c.paired_with)?.effects || [], b = body?.effects || [];
      const view = list => JSON.stringify(list.map(e => [e.effect_id, e.analytical_evidence_status, e.institutional_authority_status, e.execution_authorization_status, e.precedence_rule, e.reason_codes]));
      if (a.length && view(a) === view(b)) s.irrelevant_identical++;
    }
  }
  s.passes = s.market_agree >= 228 && s.false_favorable === 0 && s.missing_precedence === s.missing_rows && s.qualifier_precedence === s.qualifier_rows && s.external_authorized === 0 && s.irrelevant_identical === s.irrelevant_pairs && s.internal_not_relevant === s.internal;
  return s;
}
