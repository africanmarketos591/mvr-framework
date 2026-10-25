// Constructors for AMOS issuer state version 2 (SPEC.md section 2). Standalone: WebCrypto only, no AMOS code.
// Build order: document with source_review null and condition_receipts [] -> attachSourceReview ->
// attachConditionReceipts -> signIssuerState. Proprietary lab protocol; signatures prove attribution only.
export const SIGNING_DOMAIN = 'MVR-AUTHORITY-V1';
export const REVIEW_TYPE = 'mvr.issuer-state-review/1';
export const RESOLUTION_TYPE = 'mvr.condition-resolution/1';
const PKCS8_PREFIX = '302e020100300506032b657004220420', SPKI_PREFIX = '302a300506032b6570032100';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const utf8 = text => new TextEncoder().encode(text);
const toHex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const fromHex = text => Uint8Array.from(text.match(/../g), pair => parseInt(pair, 16));
const toB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));

// Canonical JSON (SPEC 1.1): sorted keys by UTF-16 code units, arrays in order, ECMAScript string and number encoding.
export function canonicalJson(value, depth = 0) {
  if (depth > 40) throw new TypeError('canonicalJson: nesting deeper than 40');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new TypeError('canonicalJson: non-finite number'); return JSON.stringify(value); }
  if (Array.isArray(value)) return '[' + value.map(item => canonicalJson(item, depth + 1)).join(',') + ']';
  if (isObject(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key], depth + 1)).join(',') + '}';
  throw new TypeError('canonicalJson: unsupported value');
}
export const sha256Hex = async text => toHex(await crypto.subtle.digest('SHA-256', utf8(text)));
export const digest = value => sha256Hex(canonicalJson(value));
export const payloadText = (type, document) => `${SIGNING_DOMAIN}\n${type}\n${canonicalJson(document)}`;
export const assertionOf = ({source_review, condition_receipts, ...assertion}) => assertion;
export const conditionScopeOf = document => ({...document, condition_receipts:[]});

// Every preimage, keyed by the constructor names used in vectors.json -> preimages.
export const PREIMAGES = Object.freeze({
  issuer_state_document:doc => canonicalJson(doc),
  issuer_state_signing_payload:doc => payloadText(doc.type, doc),
  assertion:doc => canonicalJson(assertionOf(doc)),
  review_signing_payload:doc => payloadText(doc.source_review.document.type, doc.source_review.document),
  condition:doc => canonicalJson(doc.conditions[0]),
  condition_scope:doc => canonicalJson(conditionScopeOf(doc)),
  condition_resolution_signing_payload:doc => payloadText(doc.condition_receipts[0].document.type, doc.condition_receipts[0].document),
  standing_reference:row => canonicalJson(row.document),
  source_record_reference:row => canonicalJson(row.document),
  closure_reference:row => canonicalJson(row.content),
  anchor_document:row => canonicalJson(row.document)
});
export const issuerStateDigest = doc => digest(doc);
export const assertionDigest = doc => digest(assertionOf(doc));
export const conditionDigest = condition => digest(condition);
export const conditionScopeDigest = doc => digest(conditionScopeOf(doc));
export const standingDigest = credentialDocument => digest(credentialDocument);
export const sourceRecordDigest = sourceDocument => digest(sourceDocument);
export const closureDigest = closureContent => digest(closureContent);

// A signer from a 32-byte Ed25519 seed (hex). Lab use: production keys belong in an HSM or a key ceremony.
export async function signerFromSeed(seedHex) {
  if (!/^[a-f0-9]{64}$/.test(seedHex)) throw new TypeError('signerFromSeed: 64 hex characters required');
  const privateKey = await crypto.subtle.importKey('pkcs8', fromHex(PKCS8_PREFIX + seedHex), {name:'Ed25519'}, true, ['sign']);
  const {x} = await crypto.subtle.exportKey('jwk', privateKey);
  const raw = Uint8Array.from(atob(x.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - x.length % 4) % 4)), c => c.charCodeAt(0));
  return {
    public_key_spki_b64:toB64(new Uint8Array([...fromHex(SPKI_PREFIX), ...raw])),
    sign:async (type, document) => toB64(await crypto.subtle.sign({name:'Ed25519'}, privateKey, utf8(payloadText(type, document))))
  };
}

// Attach the reviewer's signed source review. Must run before any condition receipt (the scope covers the review).
export async function attachSourceReview(doc, fields, reviewer) {
  if (doc.condition_receipts?.length) throw new Error('attachSourceReview: attach the review before condition receipts');
  const review = {type:REVIEW_TYPE, assertion_sha256:await assertionDigest(doc), original_document_sha256:doc.original_document_sha256, clause_text:fields.clause_text, clause_locator:fields.clause_locator, target_claim:fields.target_claim, relationship:fields.relationship, reviewer_credential_id:fields.reviewer_credential_id, standing_sha256:fields.standing_sha256, reviewed_at:fields.reviewed_at, valid_until:fields.valid_until, extractor_name:fields.extractor_name, extractor_version:fields.extractor_version, model_version:fields.model_version, runtime_model_version:fields.runtime_model_version};
  return {...doc, source_review:{document:review, signature_b64:await reviewer.sign(REVIEW_TYPE, review)}, condition_receipts:[]};
}

// One signed receipt per entry: {condition_id, receipt_id, disposition, reason, issued_at, expires_at, signer}.
export async function attachConditionReceipts(doc, entries) {
  if (!doc.source_review) throw new Error('attachConditionReceipts: attach the source review first');
  const scope_sha256 = await conditionScopeDigest(doc), receipts = [];
  for (const entry of entries) {
    const condition = doc.conditions.find(c => c.condition_id === entry.condition_id);
    if (!condition) throw new Error('attachConditionReceipts: unknown condition ' + entry.condition_id);
    const receipt = {type:RESOLUTION_TYPE, receipt_id:entry.receipt_id, condition_sha256:await conditionDigest(condition), scope_sha256, resolver_credential_id:condition.resolver_credential_id, disposition:entry.disposition, reason:entry.reason, issued_at:entry.issued_at, expires_at:entry.expires_at};
    receipts.push({document:receipt, signature_b64:await entry.signer.sign(RESOLUTION_TYPE, receipt)});
  }
  return {...doc, condition_receipts:receipts};
}
export const signIssuerState = (doc, issuer) => issuer.sign(doc.type, doc);
