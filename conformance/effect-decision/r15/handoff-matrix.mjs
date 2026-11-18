// First-call handoff matrix: every supported entry point, every advertised continuation, both profiles. Each next request is taken
// from the previous response as written. No retries.
//   MVR_API_KEY=... node conformance/effect-decision/r15/handoff-matrix.mjs --out handoff-matrix.json
import fs from 'node:fs';
const opt = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = opt('base') || 'https://africanmarketos.com', KEY = process.env.MVR_API_KEY; if (!KEY) throw new Error('Set MVR_API_KEY');
const today = new Date().toISOString().slice(0, 10);
const post = async (path, body, profile) => { const r = await fetch(BASE + path, {method: 'POST', signal: AbortSignal.timeout(90000), headers: {'X-API-Key': KEY, 'Content-Type': 'application/json', 'X-Response-Profile': profile}, body: JSON.stringify(body)}); let j = {}; try { j = await r.json(); } catch {} return {status: r.status, body: j}; };
const tool = async (name, args, profile) => { const r = await post('/mcp/runtime', {jsonrpc: '2.0', id: 1, method: 'tools/call', params: {name, arguments: args}}, profile); return {error: r.body.result?.isError === true || !r.body.result, body: r.body.result?.structuredContent ?? r.body.error ?? {}}; };
const item = (id, stakeholder_class) => ({id, evidence_id: id, claim: 'Retailers in Nakuru reported steady weekly orders in October.', stakeholder_class, evidence_type: 'interview', source_class: 'structured_field_research', source_grade: 'B', evidence_origin: 'field_research', collection_method: 'structured_interview_protocol', source_doc_id: 'DOC-' + id, source_date: today, freshness_date: today, evidence_geography: {country: 'KE'}, structured_values: {trust: 60, permission: 55}, privacy_envelope: {consent_basis: 'legitimate_interest', retention_class: '1y', redaction_status: 'redacted', safe_for_modeling: true}});
const base = {entity_name: 'Rift Foods Ltd', country: 'KE', sector: 'fmcg_brand', entity_archetype: 'fmcg_brand', question: 'Should we launch to Nakuru retailers?', evidence_pack: [item('E1', 'retailer'), item('E2', 'consumer')]};
const SETS = {typed: [{effect_id: 'EXT-LAUNCH', effect_type: 'market_launch', description: 'Launch to Nakuru retailers'}, {effect_id: 'INT-PLAN', effect_type: 'internal_planning', description: 'Plan the launch'}], unknown_type: [{effect_id: 'EXT-OTHER', effect_type: 'not_in_the_taxonomy', description: 'Offer the range to Nakuru retailers'}, {effect_id: 'INT-PLAN', effect_type: 'internal_planning', description: 'Plan the launch'}]};
const rows = [], add = row => { row.pass = row.failures.length === 0; rows.push(row); };
const pointer = (obj, p) => String(p).split('/').filter(Boolean).reduce((x, k) => x?.[k], obj);
async function followMcp(next, digest, profile, f) { let steps = 0; while (next && steps < 8) { if (next.arguments?.payload?.requested_effects_sha256 !== digest) f.push(next.name + ': digest not carried'); const r = await tool(next.name, next.arguments, profile); steps++; if (r.error) { f.push(next.name + ': ' + (r.body.code ?? 'refused')); break; } if (r.body.effect_binding?.requested_effects_sha256 !== digest) f.push(next.name + ': binding not returned'); next = r.body.mcp_next_call; } return steps; }
async function followRest(call, digest, profile, f) { let path = new URL(call.url).pathname, body = call.body, steps = 0; while (path && steps < 6) { if (body.requested_effects_sha256 !== digest) f.push(path + ': digest not carried'); const r = await post(path, body, profile); steps++; if (r.status !== 200) { f.push(path + ': HTTP ' + r.status + ' ' + (r.body.code ?? '')); break; } if (r.body.effect_binding?.requested_effects_sha256 !== digest) f.push(path + ': binding not returned'); const c = r.body.rest_continuation; if (!c || c.required_user_inputs?.length || c.disposition === 'await_input') break; const next = {...c.body_context}; for (const [k, p] of Object.entries(c.copy_from_previous_request ?? {})) { const v = pointer(body, p); if (v !== undefined) next[k] = v; } path = new URL(c.endpoint).pathname; body = next; } return steps; }
for (const profile of ['strict_calibrated', 'full_advisory']) for (const [name, requested_effects] of Object.entries(SETS)) {
  const input = {...base, requested_effects};
  for (const path of ['mcp', 'rest']) {
    const f = [], r = await post('/v1/first-call', input, profile), b = r.body, digest = b.effect_binding?.requested_effects_sha256; let steps = 0;
    if (r.status !== 200) f.push('first call HTTP ' + r.status);
    if (b.profile_resolution?.effective_profile !== profile || b.response_meta?.response_profile !== profile) f.push('effective profile not preserved');
    if (!b.effect_binding?.type_resolution?.length) f.push('no effect type resolution');
    if (!b.next_call_paths?.some(p => p.transport === path && p.usable)) f.push(path + ' path not advertised');
    else steps = path === 'mcp' ? await followMcp(b.mcp_next_call, digest, profile, f) : await followRest(b.rest_next_call, digest, profile, f);
    if (!steps) f.push('no continuation step ran');
    add({entry: 'rest', continuation: path, profile, effects: name, steps, type_resolution: b.effect_binding?.type_resolution?.map(t => t.resolution), failures: f});
  }
  const f = [], m = await tool('mvr_first_call', input, profile), digest = m.body.effect_binding?.requested_effects_sha256; if (m.error) f.push('first call refused');
  const steps = m.error ? 0 : await followMcp(m.body.mcp_next_call, digest, profile, f); if (!steps) f.push('no continuation step ran');
  add({entry: 'mcp', continuation: 'mcp', profile, effects: name, steps, failures: f});
}
for (const profile of ['strict_calibrated', 'full_advisory']) for (const [name, requested_effects, code] of [['missing_effect_id', [{effect_type: 'market_launch'}], 'REQUESTED_EFFECT_INVALID'], ['duplicate_effect_id', [{effect_id: 'A', effect_type: 'market_launch'}, {effect_id: 'A', effect_type: 'payment'}], 'REQUESTED_EFFECT_INVALID']]) {
  const input = {...base, requested_effects}, r = await post('/v1/first-call', input, profile), m = await tool('mvr_first_call', input, profile), f = [];
  if (r.status !== 422 || r.body.code !== 'FIRST_CALL_VALIDATION_FAILED' || r.body.item_errors?.[0]?.code !== code || !r.body.item_errors?.[0]?.path) f.push('REST refusal shape');
  if (!m.error || m.body.code !== 'FIRST_CALL_VALIDATION_FAILED' || m.body.item_errors?.[0]?.path !== r.body.item_errors?.[0]?.path) f.push('MCP refusal differs');
  if (r.body.mcp_next_call || r.body.rest_next_call) f.push('a refused call offered a continuation');
  add({entry: 'both', continuation: 'none', profile, effects: name, item_error: r.body.item_errors?.[0] ?? null, failures: f});
}
const summary = {target: BASE, deployment_revision: (await (await fetch(BASE + '/.well-known/mvr-release-manifest.json')).json()).deployment_revision, rows: rows.length, passed: rows.filter(r => r.pass).length, failed: rows.filter(r => !r.pass).map(r => ({entry: r.entry, continuation: r.continuation, profile: r.profile, effects: r.effects, failures: r.failures}))};
if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify({summary, rows}, null, 1) + '\n');
console.log(JSON.stringify(summary, null, 1)); process.exitCode = summary.passed === summary.rows ? 0 : 1;
