# African Market OS-MVR API: public MCP integration

Contract update: 2026-09-06. Public endpoints are evaluation-only, not production scoring or authorization.

## Connect and parse

GET /mcp/preflight returns discovery for five tools. GET /mcp/guided returns the one-call alternative. Neither requires a key. Adding a paid key here does not upgrade this public transport.

Use tools/list for the live inputSchema and outputSchema. Tool outputSchema validates result.structuredContent, not the JSON-RPC envelope. On /mcp/preflight and /mcp/guided, result.content is a compact human-readable summary for compatible clients, not a second schema or a complete JSON copy. Other connector profiles may retain full serialized content for compatibility. Render the message for people and use structuredContent for branching. Never interpret isError=false as evidence completeness or approval.

Legacy clients can initialize with 2025-11-25 or 2025-06-18. Modern 2026-07-28 is stateless and uses server/discover instead of initialize. Every modern request needs matching HTTP and params._meta values. Top-level _meta and mcp_protocol_version are NOT modern metadata. Omitting modern headers can select legacy compatibility; that is not modern conformance.

Modern tools/list example (POST /mcp/preflight):

Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/list

{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"your-client","version":"1"},"io.modelcontextprotocol/clientCapabilities":{}}}}

For tools/call use Mcp-Method: tools/call and Mcp-Name matching params.name. Keep _meta inside params beside name and arguments, not inside arguments. Preserve the server's mcp_next_call as the next params.name and params.arguments; add protocol metadata beside them. Follow only continuation_disposition=call_now. At await_input ask the user; at terminal stop. Handle HTTP 400 protocol errors, 429 Retry-After and temporary 503 without tight retry loops.

## Collect evidence without guessing fields

The shared item schema is https://africanmarketos.com/schemas/mvr-public-preflight-evidence.schema.json and is inlined in tools/list. First call and guided input use root fields; later canonical tools use arguments.payload. stage is free text. evidence_available contains optional labels, not proof. Accepted string labels are retained in executable handoffs; evidence_received shows only a labelled bounded preview. For document summaries, supply incomplete evidence_pack items so missing provenance can be addressed. Supply one complete evidence_pack (or the evidence_items alias), not conflicting copies.

An incomplete illustrative item, intentionally NOT verified:

{"id":"example-1","claim":"A redacted claim awaiting review","evidence_type":"interview_summary","source_class":"structured_field_research","stakeholder_class":"customer","verification_status":"self_attested","source_doc_id":"your-private-record-reference","source_date":"2026-09-01","geography":"target market","load_bearing":true}

Replace illustrative values with consented real metadata. Do not send personal identifiers, credentials, private interview transcripts or confidential documents. Source URLs are references; the public tool does not fetch them. verification_status is a caller declaration, not AMOS verification. An authentic document does not verify every claim attributed to it; an arithmetic check does not authenticate underlying transactions. Renaming copied evidence or inventing identifiers does not make it independent.

evidence_input_feedback gives indexed paths and machine codes, with at most 40 issue messages. Correct type errors before retrying; warnings identify missing metadata, not automatic rejection of genuine evidence. The public gate checks structural coverage, declared source overlap and unverified load-bearing items. Passing it only completes public routing.

evidence_fit reports comparisons of declared country and date metadata, not source authentication. Use country codes or recognized names for the target, and evidence_geography.country for a source country when geography describes a wider area. Accents and curly apostrophes in recognized country names are normalized; ambiguous localities are not guessed. Known foreign-country items and items beyond context_freshness_window_days are excluded from coverage. They may remain background when the decision does not depend on them; either load-bearing flag set to true makes that conflict blocking. Do not change source facts or dependency flags merely to pass. Contradictory metadata, invalid dates, future sources relative to analysis, and invalid policies must be corrected.

analysis_date accepts YYYY-MM-DD or an ISO timestamp with timezone, no later than the server UTC date; it defaults to that UTC date. Source dates use the same formats. context_freshness_window_days is an optional positive integer chosen for the decision, not a scientifically calibrated default. Without it, source age is reported and freshness remains unassessed. Missing dates and unrecognized broad regions remain unknown. Date/country comparisons do not assess content truth, source authenticity, actual independence, claim relevance, current permission, local applicability or readiness. source_validation_required stays true; context compilation never sets verification_required to false merely because coverage passed. A client must not treat ready_for_strict_decision_check as verified evidence or authorization.

## Recover after evidence collection

At an evidence pause, mcp_next_call is deliberately null. evidence_collection_plan lists missing-proof tasks, not external actions already performed. evidence_recovery is guidance requiring new input and user authorization, NOT a next call to execute unchanged. The free Evidence Builder at https://africanmarketos.com/mvr-evidence-builder/ can help the user prepare sources; it is optional.

The client retains the consented original context and entire pack. With corrected evidence for the same decision inside the original two-hour window, call mvr_evidence_completeness again with arguments.payload containing that full context, complete replacement pack, workflow_id and workflow_expires_at. No raw evidence is stored for retrieval or appended server-side. The ID is operational measurement, not authentication or an entitlement. After expiry, a changed decision or lost context, start mvr_first_call afresh. Each guided retry starts a fresh bounded sequence with its complete corrected input.

No Notion, Airtable or Jira connector is required. A client may show the structured task list to its user and, only after separate approval, copy a minimized version into their task system. AMOS does not do that automatically. Completion, a lead, checkout and payment remain different events. Optional paid routes never authorize purchase or replace evidence collection.

## Reproducible reports

Report endpoint, protocol version, UTC time, HTTP status, cf-ray, error code and a redacted minimal request. Do not share credentials or private evidence. A transient GET failure needs those identifiers to investigate; a current successful GET cannot disprove a past outage.

For host/model comparisons, isolate the intended connection and inspect the actual selected server and tool in the trace. Configuring a direct MCP URL does not prove the host used it if another connector exposes equivalent tools. Record both configured model IDs and any available backend snapshot, prompts, additional host policy, caching, repeated-run counts and full request/response traces. Include a policy-only control when testing whether AMOS adds value beyond instructions. Same-vendor model swaps are not cross-vendor validation; synthetic cases are not customer outcomes. Separate timing, total tokens, uncached tokens and actual price rather than interpreting token ratios as a bill.

Protocol references: https://modelcontextprotocol.io/specification/2025-11-25/server/tools and https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
