# Local decision review workbench

Three dependency-free host-side tools for useful work before external authority is available: exact bounded review planning, hold tracking, and captured-proposal comparisons. This is downloadable integration code, **not a new hosted AMOS route or permission service**. It does not contain the private MVR scoring engine.

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.

## Try it free

Use Node.js 24.11 or later. No install, account, API key, cloud resource or billing is required. From the repository root:

```sh
node examples/decision-review-workbench/test.mjs
node examples/decision-review-workbench/demo.mjs --check
```

Open `examples/decision-review-workbench/demo.html` directly in a browser. It is a static, expandable demonstration with no external assets, tracking or scripts. It is not a data-entry or authenticated review application. `demo-output.json` contains the same synthetic results. To regenerate both, run `node examples/decision-review-workbench/demo.mjs`.

The modules can be imported into a host application. The CLI accepts JSON files up to 256 KiB and writes JSON to standard output; it never overwrites input files. Send output to a **new** path you control. Malformed input exits with status 1 and no successful result.

## Minimum decisive review

```js
import {planReviews, recordObservation} from './review.mjs';
const plan = planReviews(model, observations, {now: new Date().toISOString()});
```

Define a scope, model version, up to 64 fact records, and an explicit Boolean rule using `fact`, `all`, `any`, and `not`. At most eight distinct facts may be referenced by a rule; larger models reject rather than silently approximate. Each fact binds original-document hash, clause locator, claim, relationship, subject, action, geography, validity, reviewer-standing reference, model version and extractor version. See `fixtures.mjs` for the complete format. The tool binds the supplied hash; it does not fetch or authenticate the original document.

The planner exhausts all Boolean completions and computes an optimal **minimum worst-case weighted adaptive review strategy**. Positive integer cost units are supplied planning weights. They are not measured time or probabilities. The returned next review is optimal for worst-case cost, with count and stable identifier tie-breaks. Rankings also report the number of completions where changing a fact changes the outcome; that fraction is not an empirical probability or expected monetary value.

Once all remaining completions agree, the planner stops and computes a minimum-cost subset of the current declared observations sufficient for that model outcome. This handles negation and contradictions; it does not assume adding favorable evidence is always safe. The example references three of 24 facts. One adverse observation fixes its outcome, so further review cannot change **that model**, while unknown omitted risks remain.

`recordObservation` records an explicitly **unauthenticated declaration** with hash bindings. Changed model, scope, source bindings or validity invalidate reuse. Duplicate observations, future timestamps, tampering and malformed rules reject. Expired/not-yet-valid referenced sources require refresh and cannot produce a stop instruction. Authenticate reviewers and verify their standing in your governed service; a local hash or supplied reviewer reference does not do that.

CLI envelopes:

```text
plan     {"model": ..., "observations": [...], "options": {"now": "...Z"}}
observe  {"model": ..., "observation": {"fact_id": "...", "value": true,
          "reviewer_ref": "...", "observed_at": "...Z"}}
```

Run `node examples/decision-review-workbench/cli.mjs plan input.json` (or the other command names below).

## Hold tracking without invented owners or deadlines

Import `appendHoldEvent` and `summarizeHolds` from `holds.mjs`. Events are `opened`, `assigned`, `closed`, `reopened`, or `abandoned`. Every event has an ID, actor reference and UTC timestamp. Opening requires the blocker and minimum closure artifact. Closing requires an evidence reference and reason. Reopening preserves previous closure references, restarts the current episode age and clears the previous deadline commitment.

Owners remain null until assigned. A deadline requires an owner and explicit commitment reference. Reports expose current and cumulative hold age, open/closed/abandoned counts, reopening count, unassigned holds and overdue commitments. Closure fraction means currently closed holds divided by all recorded holds; it does not mean verified opportunities converted. Nothing estimates financial opportunity cost or labels an abandoned opportunity as good without evidence. The suggested work is only a local closure checklist.

The ledger hash chain detects changed bytes relative to retained records. Keep its head in separately protected storage and supply `expected_head` when reading to detect truncation or replacement. An attacker able to replace both journal and trusted head can rewrite history. The journal is neither signed nor an authorization database; it must not replace AMOS's durable permission state. Hosts must persist updates atomically and serialize writers if they use it concurrently.

```text
hold-append {"journal": [...], "event": {...}}
holds       {"journal": [...], "options": {"now": "...Z", "expected_head": "..."}}
```

## Captured proposal and decision-specific comparison

Import `captureProposal` and `compareDecision` from `counterfactual.mjs`. First capture the actual pre-AMOS proposal with request ID, scope, action, model reference and timestamp. Preserve it separately before submitting to AMOS. Supply the normalized returned decision with matching identifiers, final proposal, disposition, decision timestamp, receipt reference, and explicit rule/state/explanation references. Missing causes, changed scope, tampering and reversed chronology reject.

The comparison preserves both complete texts and their hashes. It reports whether the proposal changed and whether the supplied disposition gates an effect. Monetary exposure and opportunity cost remain explicitly unestimated. Cause references are supplied, not independently authenticated by this tool. Hashes alone cannot establish that capture actually preceded the decision; trusted capture-time logging is a host responsibility. A normalized `allow` does not authorize execution: every output still has `execution_authorized: false`.

```text
capture {"request_id": "...", "scope": "...", "action": "...", "model_ref": "...",
         "proposal": "...", "captured_at": "...Z"}
compare {"proposal": <captured record>, "decision": {...}, "options": {"now": "...Z"}}
```

## Evidence and limits

[Reproducible release evidence](../../release-evidence/2026-10-24-review-workbench/README.md) includes exact source hashes and 6,912 independent oracle comparisons: all 256 Boolean truth tables over three facts, each under all 27 partial observations. Additional tests cover the eight-fact bound, changed bindings, expiry, invalid input, hold transitions, hash-chain replacement checks, counterfactual mutations and CLI execution. These are synthetic implementation tests, not measured analyst-time savings or institutional validation.

Hosted original-page review UX, authenticated review recording, provider-specific authority adapters, production notification/reliability evidence and external institutional standing remain separate work. This release adds usable local components without activating production issuer state or changing public preflight restrictions.
