# PDF passage verifier (amos-pdf-text/1)

AMOS lets a reviewer bind an interpretation to an exact passage in an original PDF. The server hashes the original bytes, extracts the PDF's text layer with the extractor in this folder, and records the passage by its UTF-16 offsets in that text. AMOS keeps the hash, the page offsets and the extracted text, not the PDF itself.

Anyone holding the same PDF can check a passage receipt without trusting AMOS:

```bash
npm ci
node verify-pdf-passage.mjs path/to/original.pdf path/to/receipt.json
```

`receipt.json` is one entry of `review_tools.clause_reviews` (or its `payload`). The verifier confirms that:

1. the SHA-256 of the file equals `document_sha256`;
2. the receipt names this extractor version;
3. re-extracting gives text whose SHA-256 equals `extracted_text_sha256`;
4. the text between `start` and `end` is exactly `clause_text`, and `locator` matches;
5. the passage falls on the recorded `pdf_pages`.

It does not confirm what the passage means, who reviewed it, whether the document is authentic or whether anything is permitted.

## What the extractor does and refuses

- Reads the page content text layer, including composite fonts with ToUnicode maps, standard and custom encodings, embedded forms and rotated text. Spacing and line breaks follow fixed rules, so the same bytes always give the same text.
- Refuses encrypted PDFs, scanned or image-only PDFs (no OCR is performed), text layers with more than 2% unmapped glyphs, unsupported stream filters, and files beyond the published limits (1 MB, 60 pages, 100,000 text units, bounded decompression).
- Lists signature fields but does not verify signatures cryptographically.
- Does not read annotation or form-field text.

`pdf-text.mjs` here is byte-identical to the module the AMOS Worker runs; the private CI fails if they differ. The same extraction was checked to be byte-identical in Node and in the Cloudflare Workers runtime (workerd).

## Fixtures

`fixtures/` holds proprietary lab fixtures: one HTML page printed to PDF by two producers (headless Chromium and WPS Office), their expected hashes, and a server-generated example receipt from a local AMOS lab run. They are test data, not observations of any real organisation. `node test.mjs` checks them, plus four tampering cases that must fail.
