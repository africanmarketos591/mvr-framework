# Public register snapshots

A review case can store bounded snapshots of free public registers through `lookup_public_register` with `register_query: {adapter, id}` (the older `register_lei` form still works). Each snapshot records what the register said at one moment: the fixed URL, request and retrieval times, a SHA-256 of the response, the fields it supports and the claims it cannot support.

| Adapter | Register | Identifier | Supports | Does not support |
| --- | --- | --- | --- | --- |
| `gleif-lei/1` | GLEIF Global LEI Index | LEI, checksum verified | legal name, jurisdiction, entity and registration status, renewal date | authority to act, delegation, licences, beneficial ownership |
| `gleif-parent/1` | GLEIF relationship records | child LEI | reported direct consolidation parent and its status | control or authority, unreported parents |
| `ror-org/1` | Research Organization Registry | ROR ID | organization name, status, types, country, founding year | legal identity, authority of any person |
| `crossref-doi/1` | Crossref works | DOI | title, publisher, type, issue date, retraction and correction notices deposited in Crossref (including Retraction Watch) | truth of findings, notices not deposited; absence of a notice is not clearance |
| `worldbank-project/1` | World Bank Projects & Operations | P-number | project name, status, country, approval and closing dates, commitment, instrument, borrower, implementing agency | disbursement to any party, procurement awards |
| `eu-vies-vat/1` | European Commission VIES | country code + VAT number | validity on the request date; optional yes/no match to a name you supply | identity beyond the name match, tax compliance |
| `sec-edgar/1` | US SEC EDGAR | CIK | registrant name, entity type, industry, state of incorporation, tickers, latest filing | authority of officers, accuracy of filings |

Every adapter calls one fixed host with GET only, refuses redirects, sends no credentials or case text, stops after 5 seconds (9 for SEC) and caps the response size. All endpoints are free and need no API key. SEC and Crossref receive a contact address (`info@africanmarketos.com`) as their usage policies ask.

For EU VAT numbers, a registrant's name and address can be personal data for sole traders. AMOS hashes the response for audit but stores only validity and the yes/no name match, never the returned name or address.

No snapshot verifies authority, delegation, licensing, permission or revocation. Refresh before relying on one. Up to 16 snapshots are kept per case.
