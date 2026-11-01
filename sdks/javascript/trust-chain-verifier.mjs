// Standalone copy of the AMOS trust-chain module (mvr.trust-chain/1); no dependencies. Source: worker mvr-trust-chain.js.
// Verifiable origin chain for AMOS receipts (mvr.trust-chain/1).
//
//   trust root (pinned by the receiver from the attested public repository)
//     -> signed registry statement: organisation, tenant, realm, assurance, session, keys, validity, endpoints
//       -> receipts signed by a key the statement lists
//       -> short-lived current-state proofs signed by the same key, checked immediately before an effect
//
// A valid signature proves integrity and key possession only. Recognised standing comes from the organisation or an
// external trust source; neither AMOS nor a signature invents it. The lab realm states assurance lab_fixture.
export const TRUST_ROOT_VERSION = 'mvr.trust-root/1';
export const REGISTRY_STATEMENT_VERSION = 'mvr.authority-registry-statement/1';
export const CURRENT_STATE_VERSION = 'mvr.current-state-proof/1';
export const TRUST_SIG_STANDARD = 'MVR-TRUST-SIG-V1';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = v => Uint8Array.from(atob(v), c => c.charCodeAt(0));
export function canonical(value) {
  return JSON.stringify(value, (_, v) => object(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
}
export async function sha256(text) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
const signingInput = (contract, keyId, digest) => new TextEncoder().encode(`MVR-TRUST-V1\n${contract}\n${keyId}\n${digest}`);

export async function generateSigningKey(prefix) {
  const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const spki = b64(await crypto.subtle.exportKey('spki', pair.publicKey));
  return {key_id: prefix + '-' + (await sha256(spki)).slice(0, 24), public_key_spki_b64: spki, private_pkcs8_b64: b64(await crypto.subtle.exportKey('pkcs8', pair.privateKey))};
}
export const publicKeyOf = ({private_pkcs8_b64, ...rest}) => rest;

// Sign a statement body: the digest covers every field except sha256 and signature.
export async function signStatement(key, body) {
  if (!object(body) || typeof body.contract_version !== 'string') throw new TypeError('statement contract_version required');
  const digest = await sha256(canonical(body));
  const privateKey = await crypto.subtle.importKey('pkcs8', unb64(key.private_pkcs8_b64), {name: 'Ed25519'}, false, ['sign']);
  const signature = b64(await crypto.subtle.sign('Ed25519', privateKey, signingInput(body.contract_version, key.key_id, digest)));
  return {...body, sha256: digest, signature: {standard: TRUST_SIG_STANDARD, algorithm: 'Ed25519', key_id: key.key_id, signature_b64: signature}};
}
export async function verifyStatement(statement, {key_id, public_key_spki_b64, contract}) {
  if (!object(statement) || !object(statement.signature)) return {valid: false, reason: 'malformed_statement'};
  const {sha256: digest, signature, ...body} = statement;
  if (contract && body.contract_version !== contract) return {valid: false, reason: 'wrong_contract'};
  if (await sha256(canonical(body)) !== digest) return {valid: false, reason: 'hash_mismatch'};
  if (signature.standard !== TRUST_SIG_STANDARD || signature.algorithm !== 'Ed25519' || signature.key_id !== key_id) return {valid: false, reason: 'signer_mismatch'};
  try {
    const publicKey = await crypto.subtle.importKey('spki', unb64(public_key_spki_b64), {name: 'Ed25519'}, false, ['verify']);
    const ok = await crypto.subtle.verify({name: 'Ed25519'}, publicKey, unb64(signature.signature_b64), signingInput(body.contract_version, key_id, digest));
    return ok ? {valid: true, reason: 'verified', sha256: digest} : {valid: false, reason: 'signature_mismatch'};
  } catch { return {valid: false, reason: 'malformed_key_or_signature'}; }
}

// The self-signed root statement a receiver pins (from the attested public repository, never from a session response).
export function trustRootBody(rootKey, {realm, created_at, organization_ref, assurance}) {
  return {contract_version: TRUST_ROOT_VERSION, realm, key_id: rootKey.key_id, public_key_spki_b64: rootKey.public_key_spki_b64, created_at, organization_ref, assurance,
    production_authority: realm !== 'amos-lab' ? 'requires_activated_registry' : false, standing: 'not_asserted_by_signature',
    boundary: 'This root signs AMOS registry statements for its realm. It proves key possession, not institutional standing.'};
}

// Verify a full chain before an effect. Every substitution (session, realm, tenant, key) fails before any effect.
export async function verifyAuthorityChain({trustRoot, registryStatement, receipt, receiptVerifier, currentState, expect = {}, now = Date.now(), maxOfflineAgeSeconds = 60}) {
  const steps = [];
  const fail = reason => ({valid: false, reason, steps, effect_allowed: false});
  if (!object(trustRoot) || trustRoot.contract_version !== TRUST_ROOT_VERSION) return fail('trust_root_required');
  const root = await verifyStatement(trustRoot, {key_id: trustRoot.key_id, public_key_spki_b64: trustRoot.public_key_spki_b64, contract: TRUST_ROOT_VERSION});
  steps.push({step: 'trust_root_self_signature', ...root});
  if (!root.valid) return fail('trust_root_invalid');
  if (expect.root_key_id && trustRoot.key_id !== expect.root_key_id) return fail('trust_root_not_pinned');
  const reg = await verifyStatement(registryStatement, {key_id: trustRoot.key_id, public_key_spki_b64: trustRoot.public_key_spki_b64, contract: REGISTRY_STATEMENT_VERSION});
  steps.push({step: 'registry_statement_signed_by_root', ...reg});
  if (!reg.valid) return fail('registry_statement_invalid');
  if (registryStatement.realm !== trustRoot.realm) return fail('realm_mismatch');
  for (const field of ['realm', 'tenant_id', 'workspace_id', 'session_id', 'organization_ref']) if (expect[field] !== undefined && registryStatement[field] !== expect[field]) return fail(field + '_mismatch');
  if (Date.parse(registryStatement.expires_at) <= now) return fail('registry_statement_expired');
  steps.push({step: 'registry_binding', realm: registryStatement.realm, tenant_id: registryStatement.tenant_id, session_id: registryStatement.session_id, assurance: registryStatement.assurance_level});
  if (receipt) {
    const keyId = receipt?.signature?.key_id;
    const key = (registryStatement.keys || []).find(k => k.key_id === keyId);
    if (!key) return fail('receipt_key_not_in_registry');
    if (key.status === 'revoked') return fail('receipt_key_revoked');
    const checked = await receiptVerifier(receipt, {registry: {lab_fixture: registryStatement.assurance_level === 'lab_fixture', keys: [key]}, allowLabKeys: registryStatement.assurance_level === 'lab_fixture'});
    steps.push({step: 'receipt_signed_by_registry_key', valid: checked.valid, reason: checked.reason});
    if (!checked.valid) return fail('receipt_invalid');
    if (expect.session_id && receipt.lab_session_id !== undefined && receipt.lab_session_id !== expect.session_id) return fail('receipt_session_mismatch');
  }
  if (currentState) {
    const key = (registryStatement.keys || []).find(k => k.key_id === currentState?.signature?.key_id);
    if (!key) return fail('current_state_key_not_in_registry');
    const cs = await verifyStatement(currentState, {key_id: key.key_id, public_key_spki_b64: key.public_key_spki_b64, contract: CURRENT_STATE_VERSION});
    steps.push({step: 'current_state_signed_by_registry_key', ...cs});
    if (!cs.valid) return fail('current_state_invalid');
    if (currentState.session_id !== registryStatement.session_id || currentState.registry_id !== registryStatement.registry_id) return fail('current_state_binding_mismatch');
    const age = (now - Date.parse(currentState.observed_at)) / 1000;
    const maxAge = Math.min(maxOfflineAgeSeconds, currentState.max_offline_age_seconds ?? maxOfflineAgeSeconds);
    steps.push({step: 'current_state_age', age_seconds: Math.round(age * 1000) / 1000, max_offline_age_seconds: maxAge});
    if (!(age >= -1) || age > maxAge) return fail('current_state_stale');
    if (currentState.permitted !== true) return fail('current_state_not_permitted:' + (currentState.blocking_reasons || []).join(','));
    if (expect.capability_id && currentState.capability_id !== expect.capability_id) return fail('current_state_capability_mismatch');
    if (expect.capability_document_sha256 && currentState.heads?.capability_document_sha256 !== expect.capability_document_sha256) return fail('current_state_dependency_changed');
    steps.push({step: 'current_state_permits_effect', capability_id: currentState.capability_id, sequence: currentState.sequence, proof_sha256: currentState.sha256});
  }
  return {valid: true, reason: 'verified', steps, effect_allowed: !!currentState && currentState.permitted === true, current_state_proof_sha256: currentState?.sha256 ?? null,
    boundary: 'Integrity and key possession along the chain, and current state at the stated observation time. Standing is not established by any signature.'};
}
