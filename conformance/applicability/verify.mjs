// Offline verifier for mvr.applicability-statement/1. Needs no AMOS service and no credential.
//   node conformance/applicability/verify.mjs statement.json [--receipt receipt.json] [--now 2026-11-18T12:00:00Z]
// Exit 0 only when the signature verifies against the pinned root, the statement is unexpired and any supplied receipt matches.
import fs from 'node:fs';
import {createHash, createPublicKey, verify} from 'node:crypto';

const CONTRACT = 'mvr.applicability-statement/1', SIGNATURE = 'MVR-TRUST-SIG-V1';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const canonical = value => JSON.stringify(value, (_, v) => object(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);

export function verifyApplicabilityStatement(statement, {root, receipt = null, now = new Date()}) {
  const fail = reason => ({valid: false, reason});
  if (!object(statement) || !object(statement.signature)) return fail('malformed_statement');
  const {sha256, signature, ...body} = statement;
  if (body.contract_version !== CONTRACT) return fail('wrong_contract');
  if (createHash('sha256').update(canonical(body)).digest('hex') !== sha256) return fail('hash_mismatch');
  if (signature.standard !== SIGNATURE || signature.algorithm !== 'Ed25519' || signature.key_id !== root.key_id || body.root_key_id !== root.key_id) return fail('signer_mismatch');
  if (body.realm !== root.realm) return fail('realm_mismatch');
  const key = createPublicKey({key: Buffer.from(root.public_key_spki_b64, 'base64'), format: 'der', type: 'spki'});
  if (!verify(null, Buffer.from(`MVR-TRUST-V1\n${CONTRACT}\n${root.key_id}\n${sha256}`), key, Buffer.from(signature.signature_b64, 'base64'))) return fail('signature_mismatch');
  const expires = Date.parse(body.expires_at), issued = Date.parse(body.issued_at);
  if (!Number.isFinite(expires) || !Number.isFinite(issued) || expires <= issued) return fail('invalid_validity_window');
  if (now.getTime() >= expires) return fail('expired');
  if (body.execution_authorized !== false || body.production_authority !== false) return fail('authority_claim_present');
  if (receipt && (receipt.receipt_id !== body.receipt_id || receipt.task_sha256 !== body.task_sha256 || receipt.decision !== body.decision)) return fail('receipt_mismatch');
  return {valid: true, reason: 'verified', statement_id: body.statement_id, receipt_id: body.receipt_id, decision: body.decision, expires_at: body.expires_at};
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const args = process.argv.slice(2), opt = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
  const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
  const pinned = read(new URL('../../trust/amos-conformance-trust-root.json', import.meta.url)).trust_root;
  const result = verifyApplicabilityStatement(read(args[0]), {root: pinned, receipt: opt('receipt') ? read(opt('receipt')) : null, now: opt('now') ? new Date(opt('now')) : new Date()});
  console.log(JSON.stringify(result));
  process.exitCode = result.valid ? 0 : 1;
}
