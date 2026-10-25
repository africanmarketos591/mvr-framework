// Made-in-Cloudflare receipt key ceremony.
// The Ed25519 receipt key is generated inside the Worker and handed straight to Cloudflare as a non-extractable
// secret_key binding, so no person, laptop or AI ever holds the private key. The Cloudflare API token the operator
// supplies is the authority to run it (only members of the account can create one); it is used for this one request,
// never stored, logged or returned. Witnesses watch a short, recordable session because nothing secret is shown.
export const RECEIPT_KEY_CEREMONY_VERSION = 'mvr.receipt-key-ceremony/1';
export const RECEIPT_CEREMONY_BINDINGS = Object.freeze({private_key:'MVR_RECEIPT_SIGNING_PRIVATE_KEY', record:'MVR_RECEIPT_SIGNING_CEREMONY_JSON'});
// The single-key environment path predates this ceremony. Either path, never both.
export const LEGACY_RECEIPT_SIGNING_VARS = Object.freeze(['MVR_RECEIPT_SIGNING_KEY_ID', 'MVR_RECEIPT_SIGNING_PUBLIC_KEY_SPKI_B64', 'MVR_RECEIPT_SIGNING_PRIVATE_KEY_PKCS8_B64', 'MVR_RECEIPT_SIGNING_CEREMONY_AT', 'MVR_RECEIPT_SIGNING_KEY_CREATED_AT', 'MVR_RECEIPT_SIGNING_NOT_BEFORE', 'MVR_RECEIPT_SIGNING_ROTATION_DUE_AT', 'MVR_RECEIPT_SIGNING_CEREMONY_ID', 'MVR_RECEIPT_SIGNING_CEREMONY_PARTICIPANTS_HASH', 'MVR_RECEIPT_VERIFICATION_KEYS_JSON']);
export const RECEIPT_KEY_BIRTH_PREFIX = 'MVR-RECEIPT-KEY-BIRTH-V1\n';
export const RECEIPT_KEY_PROOF_PREFIX = 'MVR-RECEIPT-KEY-PROOF-V1\n';
// The dashboard sets token expiry in whole days (00:00 UTC), so a token made for the ceremony day lives under 26 hours.
export const CEREMONY_TOKEN_MAX_LIFETIME_MS = 26 * 3600 * 1000;
const MIN_TOKEN_REMAINING_MS = 10 * 60 * 1000, API = 'https://api.cloudflare.com/client/v4';
const KEY_ID = /^amos-receipt-ed25519-(20\d\d)-(\d\d)$/, CEREMONY_ID = /^KC-AMOS-RECEIPT-(20\d\d)-(\d\d)$/, HEX64 = /^[a-f0-9]{64}$/, HEX32 = /^[a-f0-9]{32}$/, TOKEN = /^[A-Za-z0-9_-]{30,200}$/;
const SPKI_PREFIX = [0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00];
const INPUT_FIELDS = ['action', 'ceremony_id', 'key_id', 'participants_sha256', 'cloudflare_api_token', 'confirm_witnesses_present'];
const BIRTH_FIELDS = ['type', 'ceremony_id', 'key_id', 'algorithm', 'public_key_spki_b64', 'public_key_fingerprint_sha256', 'participants_sha256', 'generated_at', 'not_before', 'rotation_due_at', 'generated_in', 'worker_script', 'deployment_revision', 'deployed_version_before', 'private_key_destination', 'private_key_returned_to_caller', 'cloudflare_token_id_sha256', 'statement'];
const STATEMENT = 'Generated inside the Cloudflare Worker named above and stored only as a non-extractable secret_key binding. No person, device or AI agent received the private key. This record proves possession of the key and its ceremony metadata, not who attended: the signed paper record and sworn declarations do that.';
const NO_AUTHORITY = {execution_authorized:false, issued_by_amos_as_authority:false, grants_permission:false};

const fault = (code, status = 422, extra = {}) => Object.assign(new Error(code), {code, status, ceremony_error:true, ...extra});
const need = (ok, code, status) => { if (!ok) throw fault(code, status); };
const object = v => v && typeof v === 'object' && !Array.isArray(v);
export const bytesToB64 = bytes => { const b = new Uint8Array(bytes); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
export const b64ToBytes = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
export const sha256Hex = async data => hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? new TextEncoder().encode(data) : data));
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') { need(value !== undefined, 'KEY_CEREMONY_RECORD_INVALID'); return JSON.stringify(value); }
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}';
}
// Seconds precision, UTC: the form the receipt registry accepts.
const iso = ms => new Date(Math.floor(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z');
const plusOneYear = ms => { const d = new Date(Math.floor(ms / 1000) * 1000); return Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()); };
const instant = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v) && Number.isFinite(Date.parse(v));
function spkiValid(text) {
  if (typeof text !== 'string' || text.length !== 60) return false;
  let bytes; try { bytes = b64ToBytes(text); } catch { return false; }
  return bytes.length === 44 && bytesToB64(bytes) === text && SPKI_PREFIX.every((b, i) => bytes[i] === b);
}
export const birthPayload = birth => new TextEncoder().encode(RECEIPT_KEY_BIRTH_PREFIX + canonicalJson(birth));
export const keyProofPayload = (keyId, nonce) => new TextEncoder().encode(RECEIPT_KEY_PROOF_PREFIX + keyId + '\n' + nonce);
export const validProofNonce = nonce => typeof nonce === 'string' && HEX32.test(nonce);

function plan(input) {
  const k = KEY_ID.exec(input.key_id || ''), c = CEREMONY_ID.exec(input.ceremony_id || '');
  need(k, 'KEY_CEREMONY_KEY_ID_INVALID'); need(c, 'KEY_CEREMONY_ID_INVALID');
  need(k[1] === c[1] && k[2] === c[2], 'KEY_CEREMONY_ID_KEY_ID_MISMATCH');
  need(HEX64.test(input.participants_sha256 || ''), 'KEY_CEREMONY_PARTICIPANTS_HASH_INVALID');
  return {key_id:input.key_id, ceremony_id:input.ceremony_id, participants_sha256:input.participants_sha256};
}
// What the running Worker already has. Any existing receipt key or record blocks the ceremony.
export function localReceiptKeyState(env = {}) {
  const present = [...Object.values(RECEIPT_CEREMONY_BINDINGS), ...LEGACY_RECEIPT_SIGNING_VARS].filter(name => env?.[name] !== undefined && env?.[name] !== null && env?.[name] !== '');
  return {configured:present.length > 0, present};
}
async function cf(ctx, path, {method = 'GET', body, token}) {
  let response, data = null;
  try {
    response = await ctx.fetch(API + path, {method, redirect:'error', headers:{Authorization:'Bearer ' + token, ...(body ? {'Content-Type':'application/json'} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
    data = await response.json();
  } catch { return {ok:false, status:0, result:null, errors:['network']}; }
  return {ok:response.ok && data?.success === true, status:response.status, result:data?.result ?? null, errors:(Array.isArray(data?.errors) ? data.errors : []).map(e => e?.code).filter(x => typeof x === 'number').slice(0, 5)};
}
async function verifyToken(ctx, token, now) {
  // User tokens and account-owned tokens verify at different paths.
  let r = await cf(ctx, '/user/tokens/verify', {token}), kind = 'user';
  if (!r.ok) { r = await cf(ctx, '/accounts/' + ctx.accountId + '/tokens/verify', {token}); kind = 'account'; }
  need(r.ok && object(r.result), 'KEY_CEREMONY_TOKEN_INVALID', 401);
  need(r.result.status === 'active', 'KEY_CEREMONY_TOKEN_NOT_ACTIVE', 401);
  const expires = Date.parse(r.result.expires_on || '');
  need(Number.isFinite(expires), 'KEY_CEREMONY_TOKEN_EXPIRY_REQUIRED', 422);
  need(expires - now <= CEREMONY_TOKEN_MAX_LIFETIME_MS, 'KEY_CEREMONY_TOKEN_LIFETIME_TOO_LONG', 422);
  need(expires - now >= MIN_TOKEN_REMAINING_MS, 'KEY_CEREMONY_TOKEN_EXPIRING', 422);
  if (r.result.not_before) need(Date.parse(r.result.not_before) <= now + 60000, 'KEY_CEREMONY_TOKEN_NOT_YET_VALID', 422);
  need(typeof r.result.id === 'string' && r.result.id.length <= 64, 'KEY_CEREMONY_TOKEN_INVALID', 401);
  return {kind, id_sha256:await sha256Hex('cloudflare-token-id:' + r.result.id), expires_on:iso(expires)};
}
async function deployedVersion(ctx, token) {
  const d = await cf(ctx, ctx.scriptPath + '/deployments', {token});
  need(d.ok, d.status === 403 || d.status === 401 ? 'KEY_CEREMONY_SCRIPT_ACCESS_DENIED' : 'KEY_CEREMONY_CLOUDFLARE_UNAVAILABLE', d.status === 403 || d.status === 401 ? 403 : 502);
  const list = Array.isArray(d.result?.deployments) ? d.result.deployments : Array.isArray(d.result) ? d.result : [];
  const latest = [...list].sort((a, b) => Date.parse(b.created_on) - Date.parse(a.created_on))[0];
  need(latest && Array.isArray(latest.versions) && latest.versions.length === 1 && latest.versions[0].percentage === 100, 'KEY_CEREMONY_SPLIT_DEPLOYMENT', 409);
  return latest.versions[0].version_id;
}
async function scriptState(ctx, token) {
  const deployed = await deployedVersion(ctx, token);
  // Adding a secret copies the newest uploaded version and deploys it, so an uploaded-but-undeployed version would go live.
  const v = await cf(ctx, ctx.scriptPath + '/versions', {token});
  need(v.ok, 'KEY_CEREMONY_CLOUDFLARE_UNAVAILABLE', 502);
  const items = Array.isArray(v.result?.items) ? v.result.items : Array.isArray(v.result) ? v.result : [];
  const newest = [...items].sort((a, b) => (b.number ?? 0) - (a.number ?? 0) || Date.parse(b.metadata?.created_on || 0) - Date.parse(a.metadata?.created_on || 0))[0];
  need(newest && newest.id === deployed, 'KEY_CEREMONY_UNDEPLOYED_VERSION_PRESENT', 409);
  const s = await cf(ctx, ctx.scriptPath + '/secrets', {token});
  need(s.ok && Array.isArray(s.result), 'KEY_CEREMONY_CLOUDFLARE_UNAVAILABLE', 502);
  const blocked = s.result.map(x => x?.name).filter(name => Object.values(RECEIPT_CEREMONY_BINDINGS).includes(name) || LEGACY_RECEIPT_SIGNING_VARS.includes(name));
  need(!blocked.length, 'KEY_CEREMONY_SECRET_ALREADY_PRESENT', 409);
  return {deployed_version:deployed, secret_count:s.result.length};
}
function checkLock(lock, p) {
  if (!lock) return;
  need(lock.state !== 'completed', 'KEY_CEREMONY_ALREADY_COMPLETED', 409);
  need(lock.state !== 'started', 'KEY_CEREMONY_INTERRUPTED', 409);
  need(!(lock.attempts || []).some(a => a.ceremony_id === p.ceremony_id || a.key_id === p.key_id), 'KEY_CEREMONY_ID_ALREADY_USED', 409);
}
const publicLock = lock => lock ? {state:lock.state, revision:lock.revision, ceremony_id:lock.ceremony_id, key_id:lock.key_id, started_at:lock.started_at, completed_at:lock.completed_at || null, failed_at:lock.failed_at || null, failed_step:lock.failed_step || null, failure_code:lock.failure_code || null, secrets_written:lock.secrets_written || [], deployed_version_before:lock.deployed_version_before || null, deployed_version_after:lock.deployed_version_after || null, public_key_fingerprint_sha256:lock.public_key_fingerprint_sha256 || null, birth_record:lock.birth_record || null, birth_signature_b64:lock.birth_signature_b64 || null, attempts:(lock.attempts || []).map(a => ({ceremony_id:a.ceremony_id, key_id:a.key_id, failed_step:a.failed_step}))} : {state:'not_started'};

export function receiptKeyCeremonyContract() {
  return {contract_version:RECEIPT_KEY_CEREMONY_VERSION, route:'/v1/key-ceremony', page:'/key-ceremony/', status_route:'/v1/key-ceremony/status', proof_route:'/.well-known/mvr-signing-key-proof?nonce={32 lowercase hex}',
    actions:{precheck:'Checks the token and the Worker; generates nothing.', check_token:'Reports whether a token still works (used to show it was deleted).', recover_interrupted:'Closes a run cut off before its final record, after checking no receipt-key secret was written. Its IDs cannot be reused.', run:'Generates the receipt key inside the Worker, stores it as a non-extractable secret_key binding, then publishes the signed birth record. Once only.'},
    request:{required:['action', 'ceremony_id', 'key_id', 'participants_sha256', 'cloudflare_api_token'], run_also_requires:['confirm_witnesses_present'], formats:{ceremony_id:'KC-AMOS-RECEIPT-YYYY-NN', key_id:'amos-receipt-ed25519-YYYY-NN (same YYYY-NN)', participants_sha256:'SHA-256 of the canonical participants line, computed in the browser; the line itself is never sent', cloudflare_api_token:'Account API token with Workers Scripts Edit, an expiry within 26 hours and no IP filter. Used once, never stored.'}},
    custody:{private_key:'Generated in the Worker isolate; sent once to the Cloudflare API as a secret_key binding (Ed25519, PKCS#8, usages sign only). The Worker receives it as a non-extractable CryptoKey: code can ask Cloudflare to sign with it but cannot read it back. It is never returned, logged or stored elsewhere.', residual_trust:['Cloudflare, which stores the key.', 'Anyone who can deploy code to the Worker can make it sign while that code runs, but cannot copy the key out.']},
    order:['precheck: token active with an expiry under 26 hours; the Worker has no receipt key; the newest uploaded version is the deployed one; no receipt-key secret exists', 'lock: an atomic once-only claim', 'generate an Ed25519 key pair inside the Worker; sign the birth record with it', 'store the private key binding (signing stays off: there is no ceremony record yet)', 'store the ceremony record (signing switches on in this single step)', 'confirm a new deployment and both bindings; mark completed'],
    refusals:['KEY_CEREMONY_ALREADY_COMPLETED', 'KEY_CEREMONY_INTERRUPTED', 'KEY_CEREMONY_ID_ALREADY_USED', 'KEY_CEREMONY_KEY_ALREADY_CONFIGURED', 'KEY_CEREMONY_SECRET_ALREADY_PRESENT', 'KEY_CEREMONY_UNDEPLOYED_VERSION_PRESENT', 'KEY_CEREMONY_SPLIT_DEPLOYMENT', 'KEY_CEREMONY_TOKEN_INVALID', 'KEY_CEREMONY_TOKEN_EXPIRY_REQUIRED', 'KEY_CEREMONY_TOKEN_LIFETIME_TOO_LONG', 'KEY_CEREMONY_SCRIPT_ACCESS_DENIED', 'KEY_CEREMONY_CONCURRENT_ATTEMPT', 'KEY_CEREMONY_WITNESS_CONFIRMATION_REQUIRED'],
    birth_record:{signature_payload:'UTF-8 bytes of "MVR-RECEIPT-KEY-BIRTH-V1\\n" + canonical JSON of birth_record (keys sorted, no spaces)', fields:BIRTH_FIELDS},
    proof:{signature_payload:'UTF-8 bytes of "MVR-RECEIPT-KEY-PROOF-V1\\n{key_id}\\n{nonce}"; distinct from receipt signatures, which start "MVR-RECEIPT-V1\\n"'},
    rate_limits:CEREMONY_RATE_LIMITS,
    key_status:{variable:'MVR_RECEIPT_SIGNING_CEREMONY_KEY_STATUS', values:['active (default)', 'retired: still verifies, no longer signs', 'revoked: stops signing and verification'], time_variable:'MVR_RECEIPT_SIGNING_CEREMONY_KEY_STATUS_AT (required for retired or revoked)', limitation:'Rotation to a second made-in-Cloudflare key needs ceremony version 2, which keeps earlier records verifiable. Due before the first rotation date.'},
    boundary:'The ceremony makes AMOS\'s receipt-signing key. It authorizes nothing and is not an institution\'s capability key. Who attended is proven by the signed paper record and sworn statements, not by this system.', ...NO_AUTHORITY};
}

export async function runReceiptKeyCeremony(input = {}, ctx) {
  try {
    need(object(input) && Object.keys(input).every(k => INPUT_FIELDS.includes(k)), 'KEY_CEREMONY_FIELD_NOT_ALLOWED');
    if (typeof ctx.limit === 'function') await ctx.limit();
    need(['precheck', 'run', 'check_token', 'recover_interrupted'].includes(input.action), 'KEY_CEREMONY_ACTION_REQUIRED');
    // After the ceremony the operator deletes the token; this shows the deletion took effect.
    if (input.action === 'check_token') {
      need(TOKEN.test(input.cloudflare_api_token || ''), 'KEY_CEREMONY_TOKEN_REQUIRED', 401);
      const info = await verifyToken(ctx, input.cloudflare_api_token, ctx.now());
      return {status:'token_active', token:info, note:'This token still works. Delete it in the Cloudflare dashboard, then check again.', ...NO_AUTHORITY};
    }
    // A run cut off between its claim and its final record leaves "started". Recovery needs the same authority as a run
    // and proof that no receipt-key secret was written; the attempt stays in the history and its IDs cannot be reused.
    if (input.action === 'recover_interrupted') {
      const lock = await ctx.lock.read();
      need(lock?.state === 'started', 'KEY_CEREMONY_NOTHING_TO_RECOVER', 409);
      need(TOKEN.test(input.cloudflare_api_token || ''), 'KEY_CEREMONY_TOKEN_REQUIRED', 401);
      await verifyToken(ctx, input.cloudflare_api_token, ctx.now());
      need(!localReceiptKeyState(ctx.env).configured, 'KEY_CEREMONY_KEY_ALREADY_CONFIGURED', 409);
      await scriptState(ctx, input.cloudflare_api_token);
      const failed = {...lock, revision:lock.revision + 1, state:'failed', failed_at:iso(ctx.now()), failed_step:'interrupted', failure_code:'KEY_CEREMONY_INTERRUPTED', secrets_written:[], attempts:[...(lock.attempts || []), {ceremony_id:lock.ceremony_id, key_id:lock.key_id, failed_step:'interrupted'}]};
      need(await ctx.lock.swap(lock.revision, failed), 'KEY_CEREMONY_CONCURRENT_ATTEMPT', 409);
      return {status:'recovered', ceremony:publicLock(failed), next:'Start again with a new ceremony ID and key ID.', ...NO_AUTHORITY};
    }
    const p = plan(input), now = ctx.now();
    const local = localReceiptKeyState(ctx.env);
    need(!local.configured, 'KEY_CEREMONY_KEY_ALREADY_CONFIGURED', 409);
    const lock = await ctx.lock.read();
    checkLock(lock, p);
    need(TOKEN.test(input.cloudflare_api_token || ''), 'KEY_CEREMONY_TOKEN_REQUIRED', 401);
    const token = input.cloudflare_api_token;
    const tokenInfo = await verifyToken(ctx, token, now);
    const script = await scriptState(ctx, token);
    const summary = {contract_version:RECEIPT_KEY_CEREMONY_VERSION, ...p, worker_script:ctx.scriptName, deployment_revision:ctx.deploymentRevision, token:{kind:tokenInfo.kind, id_sha256:tokenInfo.id_sha256, expires_on:tokenInfo.expires_on}, deployed_version_before:script.deployed_version, will_create:Object.values(RECEIPT_CEREMONY_BINDINGS)};
    if (input.action === 'precheck') return {status:'ready', ...summary, next:'Run the ceremony with the witnesses present.', ...NO_AUTHORITY};
    need(input.confirm_witnesses_present === true, 'KEY_CEREMONY_WITNESS_CONFIRMATION_REQUIRED');
    const started = {revision:(lock?.revision || 0) + 1, state:'started', ...p, started_at:iso(now), deployed_version_before:script.deployed_version, token_id_sha256:tokenInfo.id_sha256, attempts:lock?.attempts || []};
    need(await ctx.lock.swap(lock?.revision || 0, started), 'KEY_CEREMONY_CONCURRENT_ATTEMPT', 409);
    let step = 'generate'; const written = [];
    try {
      const pair = await crypto.subtle.generateKey({name:'Ed25519'}, true, ['sign', 'verify']);
      const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
      const generatedAt = iso(ctx.now());
      const birth = {type:'mvr.receipt-key-birth/1', ceremony_id:p.ceremony_id, key_id:p.key_id, algorithm:'Ed25519', public_key_spki_b64:bytesToB64(spki), public_key_fingerprint_sha256:await sha256Hex(spki), participants_sha256:p.participants_sha256,
        generated_at:generatedAt, not_before:generatedAt, rotation_due_at:iso(plusOneYear(Date.parse(generatedAt))), generated_in:'cloudflare_worker', worker_script:ctx.scriptName, deployment_revision:ctx.deploymentRevision, deployed_version_before:script.deployed_version,
        private_key_destination:'cloudflare_secret_key_binding:' + RECEIPT_CEREMONY_BINDINGS.private_key, private_key_returned_to_caller:false, cloudflare_token_id_sha256:tokenInfo.id_sha256, statement:STATEMENT};
      const birthSignature = bytesToB64(await crypto.subtle.sign({name:'Ed25519'}, pair.privateKey, birthPayload(birth)));
      const record = JSON.stringify({contract_version:RECEIPT_KEY_CEREMONY_VERSION, birth_record:birth, birth_signature_b64:birthSignature});
      step = 'store_private_key';
      const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
      const stored = await cf(ctx, ctx.scriptPath + '/secrets', {method:'PUT', token, body:{name:RECEIPT_CEREMONY_BINDINGS.private_key, type:'secret_key', algorithm:{name:'Ed25519'}, format:'pkcs8', usages:['sign'], key_base64:bytesToB64(pkcs8)}});
      pkcs8.fill(0);
      need(stored.ok, 'KEY_CEREMONY_PRIVATE_KEY_STORE_FAILED', 502); written.push(RECEIPT_CEREMONY_BINDINGS.private_key);
      // Signing stays off until this record exists: the registry needs it to publish an active key.
      step = 'store_record';
      const published = await cf(ctx, ctx.scriptPath + '/secrets', {method:'PUT', token, body:{name:RECEIPT_CEREMONY_BINDINGS.record, type:'secret_text', text:record}});
      need(published.ok, 'KEY_CEREMONY_RECORD_STORE_FAILED', 502); written.push(RECEIPT_CEREMONY_BINDINGS.record);
      step = 'confirm_deployment';
      const after = await deployedVersion(ctx, token);
      need(after !== script.deployed_version, 'KEY_CEREMONY_DEPLOYMENT_NOT_CHANGED', 502);
      const names = await cf(ctx, ctx.scriptPath + '/secrets', {token});
      const types = Object.fromEntries((Array.isArray(names.result) ? names.result : []).map(x => [x?.name, x?.type]));
      need(types[RECEIPT_CEREMONY_BINDINGS.private_key] === 'secret_key' && types[RECEIPT_CEREMONY_BINDINGS.record] === 'secret_text', 'KEY_CEREMONY_BINDINGS_NOT_CONFIRMED', 502);
      const completed = {...started, revision:started.revision + 1, state:'completed', completed_at:iso(ctx.now()), deployed_version_after:after, secrets_written:written, public_key_fingerprint_sha256:birth.public_key_fingerprint_sha256, birth_record:birth, birth_signature_b64:birthSignature};
      need(await ctx.lock.swap(started.revision, completed), 'KEY_CEREMONY_LOCK_LOST', 409);
      return {status:'completed', ...summary, deployed_version_after:after, public_key_fingerprint_sha256:birth.public_key_fingerprint_sha256, birth_record:birth, birth_signature_b64:birthSignature,
        next:['Compare the fingerprint with the witnesses and write it on the paper record.', 'Wait for the registry to show the key, then run the proof of possession.', 'Run the ceremony again and see it refused.', 'Delete the Cloudflare API token now, then show a precheck with it fails.'], ...NO_AUTHORITY};
    } catch (error) {
      const failed = {...started, revision:started.revision + 1, state:'failed', failed_at:iso(ctx.now()), failed_step:step, failure_code:error?.ceremony_error ? error.code : 'KEY_CEREMONY_INTERNAL_ERROR', secrets_written:written, attempts:[...(started.attempts || []), {ceremony_id:p.ceremony_id, key_id:p.key_id, failed_step:step}]};
      try { await ctx.lock.swap(started.revision, failed); } catch { /* the started record still blocks a rerun */ }
      throw fault('KEY_CEREMONY_FAILED', 502, {failed_step:step, cause:failed.failure_code, secrets_written:written});
    }
  } catch (error) {
    const known = error?.ceremony_error === true;
    return {status:'refused', http_status:known ? error.status : 500, code:known ? error.code : 'KEY_CEREMONY_INTERNAL_ERROR', ...(error?.failed_step ? {failed_step:error.failed_step, cause:error.cause, secrets_written:error.secrets_written, recovery:'The ceremony stopped. If secrets_written is not empty, delete those secrets on the Worker in the Cloudflare dashboard, then start again with a new ceremony ID and key ID (see the runbook, part F).'} : {}), ...NO_AUTHORITY};
  }
}

// Strict, synchronous parse for the registry. The birth signature is checked by verifyReceiptKeyBirthRecord.
export function parseReceiptCeremonyRecord(text) {
  need(typeof text === 'string' && text.length <= 16384, 'KEY_CEREMONY_RECORD_INVALID');
  let value; try { value = JSON.parse(text); } catch { throw fault('KEY_CEREMONY_RECORD_INVALID'); }
  need(object(value) && Object.keys(value).sort().join() === 'birth_record,birth_signature_b64,contract_version' && value.contract_version === RECEIPT_KEY_CEREMONY_VERSION, 'KEY_CEREMONY_RECORD_INVALID');
  const b = value.birth_record;
  need(object(b) && Object.keys(b).sort().join() === [...BIRTH_FIELDS].sort().join() && b.type === 'mvr.receipt-key-birth/1' && b.algorithm === 'Ed25519', 'KEY_CEREMONY_RECORD_INVALID');
  const k = KEY_ID.exec(b.key_id || ''), c = CEREMONY_ID.exec(b.ceremony_id || '');
  need(k && c && k[1] === c[1] && k[2] === c[2] && spkiValid(b.public_key_spki_b64) && HEX64.test(b.public_key_fingerprint_sha256 || '') && HEX64.test(b.participants_sha256 || ''), 'KEY_CEREMONY_RECORD_INVALID');
  need(instant(b.generated_at) && instant(b.not_before) && instant(b.rotation_due_at) && b.not_before === b.generated_at && b.private_key_returned_to_caller === false && b.generated_in === 'cloudflare_worker', 'KEY_CEREMONY_RECORD_INVALID');
  need(typeof value.birth_signature_b64 === 'string' && value.birth_signature_b64.length === 88, 'KEY_CEREMONY_RECORD_INVALID');
  return {key_id:b.key_id, public_key_spki_b64:b.public_key_spki_b64, ceremony_id:b.ceremony_id, ceremony_at:b.generated_at, not_before:b.not_before, rotation_due_at:b.rotation_due_at, participants_sha256:b.participants_sha256, public_key_fingerprint_sha256:b.public_key_fingerprint_sha256, birth_record:b, birth_signature_b64:value.birth_signature_b64};
}
export async function verifyReceiptKeyBirthRecord(record) {
  const checks = {format:false, fingerprint:false, signature:false};
  try {
    const parsed = parseReceiptCeremonyRecord(typeof record === 'string' ? record : JSON.stringify(record)); checks.format = true;
    const spki = b64ToBytes(parsed.public_key_spki_b64);
    checks.fingerprint = await sha256Hex(spki) === parsed.public_key_fingerprint_sha256;
    const key = await crypto.subtle.importKey('spki', spki, {name:'Ed25519'}, false, ['verify']);
    checks.signature = await crypto.subtle.verify({name:'Ed25519'}, key, b64ToBytes(parsed.birth_signature_b64), birthPayload(parsed.birth_record));
    return {valid:Object.values(checks).every(Boolean), checks, key_id:parsed.key_id, public_key_fingerprint_sha256:parsed.public_key_fingerprint_sha256};
  } catch { return {valid:false, checks}; }
}
// The binding must be a private Ed25519 key that can sign. Duck-typed so it also works outside workerd.
export function receiptKeyFromBinding(env = {}) {
  const key = env?.[RECEIPT_CEREMONY_BINDINGS.private_key];
  if (key === undefined || key === null) return null;
  need(object(key) && key.type === 'private' && key.algorithm?.name === 'Ed25519' && Array.isArray(key.usages) && key.usages.includes('sign'), 'RECEIPT_KEY_BINDING_INVALID');
  return key;
}
export function receiptKeyBindingSummary(env = {}) {
  const key = env?.[RECEIPT_CEREMONY_BINDINGS.private_key];
  if (key === undefined || key === null) return {present:false};
  return {present:true, type:typeof key?.type === 'string' ? key.type : null, algorithm:key?.algorithm?.name || null, extractable:typeof key?.extractable === 'boolean' ? key.extractable : null, usages:Array.isArray(key?.usages) ? [...key.usages] : null};
}
export async function receiptKeyCeremonyStatus(env, lock, registryActivation) {
  const record = env?.[RECEIPT_CEREMONY_BINDINGS.record];
  const verification = typeof record === 'string' ? await verifyReceiptKeyBirthRecord(record) : null;
  return {contract_version:RECEIPT_KEY_CEREMONY_VERSION, ceremony:publicLock(lock), registry_activation:registryActivation, private_key_binding:receiptKeyBindingSummary(env), ceremony_record_present:typeof record === 'string', birth_record_verification:verification, ...NO_AUTHORITY};
}
const ceremonyTx = env => { need(env?.MVR_DURABLE_RUNTIME_ENABLED === 'true' && env?.MVR_RUNTIME_SERVICES?.createRuntimeTransaction, 'KEY_CEREMONY_DURABLE_STORAGE_REQUIRED', 503); return env.MVR_RUNTIME_SERVICES.createRuntimeTransaction(env, {tenant_id:'amos-platform', workspace_id:'receipt-key-ceremony'}); };
// Every request that would reach the Cloudflare API is counted first, so the route cannot be used to hammer the
// token check or the API from AMOS's Worker. Counts are never refunded.
export const CEREMONY_RATE_LIMITS = Object.freeze({per_client_ip_per_hour:30, global_per_hour:300});
export function durableCeremonyLimiter(env, clientIp) {
  return async () => {
    const ipHash = await sha256Hex('mvr-key-ceremony-ip/1:' + String(clientIp || 'unknown').trim().toLowerCase());
    const bucket = Math.floor(Date.now() / 3600e3);
    for (let attempt = 0; attempt < 3; attempt++) {
      const t = ceremonyTx(env); let limited = false;
      for (const [key, limit] of [['receipt_key_ceremony:rate:' + bucket + ':global', CEREMONY_RATE_LIMITS.global_per_hour], ['receipt_key_ceremony:rate:' + bucket + ':ip:' + ipHash, CEREMONY_RATE_LIMITS.per_client_ip_per_hour]]) {
        const record = await t.read(key), count = Number.isSafeInteger(record?.count) && record.count >= 0 ? record.count : 0;
        if (count >= limit) { limited = true; break; }
        await t.write(key, {count:count + 1}, {expirationTtl:7200});
      }
      if (limited) throw fault('KEY_CEREMONY_RATE_LIMITED', 429);
      try { await t.commit(); return; } catch (error) { if (error?.code === 'runtime_state_conflict' && attempt < 2) continue; throw error; }
    }
    throw fault('KEY_CEREMONY_RATE_LIMITED', 429);
  };
}
// Production lock on the shared Durable Object runtime: one record, compare-and-swap on its revision.
export function durableCeremonyLock(env) {
  const key = 'receipt_key_ceremony:state', tx = () => ceremonyTx(env);
  return {
    async read() { const t = tx(); const value = await t.read(key); try { await t.commit(); } catch { /* read-only */ } return value || null; },
    async swap(expectedRevision, next) {
      const t = tx(); const current = await t.read(key);
      if ((current?.revision || 0) !== expectedRevision) return false;
      await t.write(key, next);
      try { await t.commit(); return true; } catch (error) { if (error?.code === 'runtime_state_conflict') return false; throw error; }
    }
  };
}
