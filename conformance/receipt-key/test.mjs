// Checks the verifier itself: the lab registry (made by AMOS's real ceremony code with a proprietary lab key) verifies,
// and every tampered copy fails. Node 20+, no dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), verifier = path.join(here, 'verify.mjs');
const registry = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/lab-registry.json'), 'utf8'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-key-'));
const run = value => { const file = path.join(temp, Math.random().toString(36).slice(2) + '.json'); fs.writeFileSync(file, JSON.stringify(value)); try { return {code:0, out:JSON.parse(execFileSync(process.execPath, [verifier, '--registry', file], {encoding:'utf8'}))}; } catch (e) { return {code:e.status, out:JSON.parse(e.stdout)}; } };
try {
  const good = run(registry);
  assert.equal(good.code, 0, JSON.stringify(good.out)); assert.equal(good.out.status, 'verified');
  const edits = {
    'participants hash changed':r => { r.key_ceremony.birth_record.participants_sha256 = '6'.repeat(64); },
    'generation place changed':r => { r.key_ceremony.birth_record.generated_in = 'operator_laptop'; },
    'published key swapped':r => { r.keys[0].public_key_spki_b64 = 'MCowBQYDK2VwAyEA' + 'A'.repeat(43) + '='; },
    'signature altered':r => { r.key_ceremony.birth_signature_b64 = r.key_ceremony.birth_signature_b64.replace(/^./, c => c === 'A' ? 'B' : 'A'); },
    'key ID changed':r => { r.key_ceremony.birth_record.key_id = 'amos-receipt-ed25519-2026-98'; },
    'private key said returned':r => { r.key_ceremony.birth_record.private_key_returned_to_caller = true; }
  };
  for (const [name, edit] of Object.entries(edits)) { const copy = structuredClone(registry); edit(copy); assert.equal(run(copy).code, 1, name + ' must fail'); }
  console.log(JSON.stringify({passed:true, verified:'lab registry', tampered_rejected:Object.keys(edits).length}));
} finally { fs.rmSync(temp, {recursive:true, force:true}); }
