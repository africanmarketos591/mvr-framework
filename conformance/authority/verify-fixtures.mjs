import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash,webcrypto} from 'node:crypto';
import {canonicalJson,verifyAuthorityReceipt} from '../../sdks/javascript/authority-receipts.mjs';
globalThis.crypto??=webcrypto;
const read=name=>JSON.parse(fs.readFileSync(import.meta.dirname+'/'+name));
const registry=read('public-test-key.json');const publicKey=await crypto.subtle.importKey('spki',Buffer.from(registry.keys[0].public_key_spki_b64,'base64'),'Ed25519',false,['verify']);let count=0;
for(const row of [...read('positive.json'),...read('negative.json')]){
 if(!row.signature_b64)continue;
 const payload=`MVR-AUTHORITY-V1\n${row.document_type}\n${canonicalJson(row.document)}`;
 const valid=await crypto.subtle.verify('Ed25519',publicKey,Buffer.from(row.signature_b64,'base64'),new TextEncoder().encode(payload));assert.equal(valid,row.expected_signature_valid??true,row.name||row.schema_name);count++;
}
for(const vector of read('canonicalization-vectors.json')){assert.equal(canonicalJson(vector.value),vector.canonical);assert.equal(createHash('sha256').update(vector.canonical).digest('hex'),vector.sha256);count++;}
let previousHead={sequence:0,sha256:'0'.repeat(64)};
for(const receipt of read('signed-receipts.json')){assert((await verifyAuthorityReceipt(receipt,{registry,allowLabKeys:true,previousHead})).valid);previousHead={sequence:receipt.sequence,sha256:receipt.sha256};count++;}
console.log(`PASS: ${count} signed fixture, canonicalization and receipt checks; public lab key only.`);
