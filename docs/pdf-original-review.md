# Original PDF review

Reviewers can now bind an interpretation to an exact passage in an original PDF, not only in `.txt` or `.md` files.

1. Register the original with `register_review_document` and `original_document: {name: "file.pdf", content_base64, provenance}` (at most 1,000,000 bytes).
2. AMOS hashes the exact bytes (`document_sha256`), extracts the text layer with `amos-pdf-text/1`, and stores the hash, page offsets and extracted text. It does not keep the PDF.
3. Bind a claim with a model whose binding uses `locator: "utf16:start:end"` in that text and `extractor_version: "amos-pdf-text/1"`.
4. A reviewer records the passage review. The receipt adds `pdf_pages`, `extracted_text_sha256` and `extractor`.

The extractor is deterministic: the same bytes always give the same text in Node and in the Cloudflare Workers runtime. Anyone holding the original can check a receipt with the [public verifier](../conformance/original-review/pdf/README.md).

Refused: encrypted PDFs, scanned or image-only PDFs (no OCR), text layers with more than 2% unmapped glyphs, unsupported stream filters, and files beyond the limits (60 pages, 100,000 text units, bounded decompression). Signature fields are listed, not verified. Annotation and form-field text is not read.

On a sample of 58 real-world PDFs kept on the operator's machine (LibreOffice, iText, ReportLab, Chromium's Skia, PDFium, iLovePDF and six files with no declared producer), 55 extracted with no unmapped glyphs and the 3 scanned ones were correctly refused. Only aggregate statistics were recorded, in the release evidence; no file names or content left the machine. The two published fixtures come from Chromium and WPS Office.

As with text originals, wording that limits or conditions permission ("must not", "only if", "subject to", "provided that", "suspended" and similar) labelled as direct support needs further review. This is a check on declarations, not automatic legal interpretation.
