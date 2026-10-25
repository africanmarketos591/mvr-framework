// Independent check of AMOS's receipt signing key after a made-in-Cloudflare ceremony. Node 20+, no dependencies,
// no AMOS code. Usage:
//   node verify.mjs                      live registry and a fresh proof of possession
//   node verify.mjs --registry file.json a saved registry (offline; no proof)
// It checks that the published birth record belongs to the published key, was signed by it, and says what AMOS
// claims; and, live, that the Worker can sign a random challenge with that key right now. It cannot check who attended:
// the signed paper record and sworn declarations do that.
import fs from 'node:fs';
import {webcrypto, randomBytes, createHash} from 'node:crypto';
const subtle = webcrypto.subtle, args = process.argv.slice(2);
const fileArg = args.includes('--registry') ? args[args.indexOf('--registry') + 1] : null;
const REGISTRY_URL = 'https://africanmarketos.com/.well-known/mvr-signing-keys.json';
const canonical = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
const b64 = t => new Uint8Array(Buffer.from(t, 'base64'));
const iso = s => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s || '');
const report = {source:fileArg || REGISTRY_URL, checked_at:new Date().toISOString(), checks:[]};
const check = (name, ok, detail) => report.checks.push({name, passed:!!ok, ...(detail === undefined ? {} : {detail})});
try {
  const registry = fileArg ? JSON.parse(fs.readFileSync(fileArg, 'utf8')) : await (await fetch(REGISTRY_URL, {headers:{'Cache-Control':'no-cache'}})).json();
  report.activation_status = registry.activation_status;
  if (registry.activation_status === 'not_configured_until_key_ceremony') { report.status = 'no_key_yet'; report.passed = true; }
  else {
    const kc = registry.key_ceremony || {}, birth = kc.birth_record || {}, key = (registry.keys || []).find(k => k.key_id === birth.key_id);
    check('made-in-Cloudflare ceremony record published', kc.method === 'made_in_cloudflare' && birth.type === 'mvr.receipt-key-birth/1', kc.method);
    check('the birth record names a published key', !!key && key.public_key_spki_b64 === birth.public_key_spki_b64);
    const spki = b64(birth.public_key_spki_b64 || '');
    check('Ed25519 public key in canonical SPKI form', spki.length === 44 && Buffer.from(spki).toString('base64') === birth.public_key_spki_b64 && Buffer.from(spki.subarray(0, 12)).toString('hex') === '302a300506032b6570032100');
    const fingerprint = createHash('sha256').update(spki).digest('hex');
    check('fingerprint is the SHA-256 of the public key', fingerprint === birth.public_key_fingerprint_sha256 && (!key?.public_key_fingerprint_sha256 || key.public_key_fingerprint_sha256 === fingerprint), fingerprint);
    const k = /^amos-receipt-ed25519-(20\d\d)-(\d\d)$/.exec(birth.key_id || ''), c = /^KC-AMOS-RECEIPT-(20\d\d)-(\d\d)$/.exec(birth.ceremony_id || '');
    check('key ID and ceremony ID share their year and number', k && c && k[1] === c[1] && k[2] === c[2]);
    check('generated inside the Worker; private key not returned; signing starts at generation', birth.generated_in === 'cloudflare_worker' && birth.private_key_returned_to_caller === false && iso(birth.generated_at) && birth.not_before === birth.generated_at && /^cloudflare_secret_key_binding:/.test(birth.private_key_destination || ''));
    const publicKey = await subtle.importKey('spki', spki, {name:'Ed25519'}, false, ['verify']);
    const payload = new TextEncoder().encode('MVR-RECEIPT-KEY-BIRTH-V1\n' + canonical(birth));
    check('the birth record is signed by this key', await subtle.verify({name:'Ed25519'}, publicKey, b64(kc.birth_signature_b64 || ''), payload));
    report.key = {key_id:birth.key_id, ceremony_id:birth.ceremony_id, generated_at:birth.generated_at, fingerprint, participants_sha256:birth.participants_sha256, deployed_version_before:birth.deployed_version_before, deployment_revision:birth.deployment_revision, key_status:key?.status || null};
    if (!fileArg) {
      const nonce = randomBytes(16).toString('hex'), proof = await (await fetch('https://africanmarketos.com/.well-known/mvr-signing-key-proof?nonce=' + nonce, {headers:{'Cache-Control':'no-cache'}})).json();
      const expectSigning = registry.active_key_id === birth.key_id;
      const ok = proof.status === 'signed' && proof.key_id === birth.key_id && await subtle.verify({name:'Ed25519'}, publicKey, b64(proof.signature_b64 || ''), new TextEncoder().encode('MVR-RECEIPT-KEY-PROOF-V1\n' + birth.key_id + '\n' + nonce));
      check(expectSigning ? 'the live Worker signs a fresh random challenge with this key' : 'the key is not active, so the live Worker does not sign with it', expectSigning ? ok : proof.status !== 'signed', proof.status);
    }
    report.passed = report.checks.every(x => x.passed);
    report.status = report.passed ? 'verified' : 'failed';
  }
} catch (error) { report.error = error.message; report.passed = false; report.status = 'error'; }
report.boundary = 'Verifies the key and its birth record. It does not establish who attended the ceremony, independent signing time, or any authority.';
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
