// Self-test for the public PDF passage verifier. Run after: npm ci (in this folder).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {extractPdfText} from './pdf-text.mjs';
import {verifyPdfPassage} from './verify-pdf-passage.mjs';
const dir=new URL('./fixtures/',import.meta.url),read=name=>fs.readFileSync(new URL(name,dir)),sha=b=>createHash('sha256').update(b).digest('hex');
const expected=JSON.parse(read('expected.json')),receipt=JSON.parse(read('example-receipt.json'));
for(const [name,want] of Object.entries(expected.fixtures)){
  const bytes=read(name),r=await extractPdfText(new Uint8Array(bytes));
  assert.equal(sha(bytes),want.document_sha256,name);assert.equal(sha(r.text),want.extracted_text_sha256,name+' text');assert.deepEqual(r.pages,want.pages,name+' pages');assert.equal(r.unmapped_glyph_count,0);
}
const pdf=read('lab-disbursement-conditions-skia.pdf');
assert.equal((await verifyPdfPassage(pdf,receipt)).valid,true,'published receipt verifies');
const tampered=Buffer.from(pdf);tampered[tampered.length-20]^=1;
assert.equal((await verifyPdfPassage(tampered,receipt)).reason,'ORIGINAL_BYTES_DIFFER');
assert.equal((await verifyPdfPassage(pdf,{...receipt.payload,clause_text:'Tranche 2 may be released.'})).reason,'EXACT_PASSAGE_MISMATCH');
assert.equal((await verifyPdfPassage(pdf,{...receipt.payload,extractor:'amos-pdf-text/0'})).reason,'EXTRACTOR_VERSION_DIFFERS');
assert.equal((await verifyPdfPassage(pdf,{...receipt.payload,pdf_pages:[2]})).reason,'PAGES_MISMATCH');
console.log(JSON.stringify({passed:true,fixtures:Object.keys(expected.fixtures).length,receipt_verified:true,negative_checks:4,classification:'proprietary lab fixtures'}));
