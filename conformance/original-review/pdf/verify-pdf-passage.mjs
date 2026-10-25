// Independent check of an AMOS PDF passage receipt.
// Usage: node verify-pdf-passage.mjs <original.pdf> <receipt.json>
// The receipt is a clause_reviews[].payload object (or a wrapper with a payload field).
// It re-hashes the original bytes, re-runs the published amos-pdf-text/1 extractor and checks
// that the exact passage sits at the recorded offsets. It does not judge what the passage means.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {extractPdfText,pdfPagesForRange,PDF_TEXT_EXTRACTOR} from './pdf-text.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function verifyPdfPassage(pdfBytes,receipt){
  const r=receipt?.payload||receipt,checks={};
  checks.document_sha256=sha(pdfBytes)===r.document_sha256;
  if(!checks.document_sha256)return {valid:false,reason:'ORIGINAL_BYTES_DIFFER',checks};
  checks.extractor=r.extractor===PDF_TEXT_EXTRACTOR;
  if(!checks.extractor)return {valid:false,reason:'EXTRACTOR_VERSION_DIFFERS',expected:r.extractor,available:PDF_TEXT_EXTRACTOR,checks};
  const extraction=await extractPdfText(new Uint8Array(pdfBytes));
  checks.extracted_text_sha256=sha(extraction.text)===r.extracted_text_sha256;
  checks.exact_passage=Number.isSafeInteger(r.start)&&Number.isSafeInteger(r.end)&&extraction.text.slice(r.start,r.end)===r.clause_text;
  checks.locator=r.locator==='utf16:'+r.start+':'+r.end;
  const pages=pdfPagesForRange(extraction.pages,r.start,r.end);
  checks.pages=JSON.stringify(pages)===JSON.stringify(r.pdf_pages);
  const valid=Object.values(checks).every(Boolean);
  return {valid,reason:valid?null:Object.entries(checks).find(([,ok])=>!ok)[0].toUpperCase()+'_MISMATCH',checks,pages,
    scope:'Confirms the bytes, the extracted text and the exact passage. It does not confirm the interpretation, the reviewer\'s standing, the document\'s authenticity or any permission.'};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const [pdf,receipt]=process.argv.slice(2);
  if(!pdf||!receipt){console.error('Usage: node verify-pdf-passage.mjs <original.pdf> <receipt.json>');process.exit(2);}
  const result=await verifyPdfPassage(fs.readFileSync(pdf),JSON.parse(fs.readFileSync(receipt,'utf8')));
  console.log(JSON.stringify(result,null,2));if(!result.valid)process.exitCode=1;
}
