# Durable executor outcomes

The reference executor checks every signed effect boundary before invoking a handler. The durable wrapper additionally writes an intent to a persistent SQLite outbox before the effect and saves the immutable outcome before attempting `record_effect`.

```js
import { createSqliteOutcomeOutbox } from '../sdks/javascript/sqlite-outcome-outbox.mjs';
import { createDurableBoundedExecutor } from '../sdks/javascript/durable-bounded-executor.mjs';
const outbox = createSqliteOutcomeOutbox('/persistent-volume/mvr-outcomes.sqlite');
const executor = createDurableBoundedExecutor({ outbox, verify, recordEffect, effects });
const result = await executor.execute({ capability_id, requested_effect });
await outbox.flush(recordEffect); // Repeat at a bounded interval after restart.
outbox.close();
```

`verify` and `recordEffect` are authenticated transports supplied by the host; `recordEffect` posts `{action:'record_effect', ...payload}` to `/v1/authority-chain`. Keep their credentials outside model arguments. Effect handlers and the surrounding application must respect cancellation/deadlines and reconcile external systems; a thrown exception does not prove that a remote effect did not occur.

The adapter uses Node's `node:sqlite`, tested with Node 24.11.0, where SQLite is experimental. Store the database on a durable volume and preserve its WAL during backups. `:memory:` is rejected. Intent insertion uses a transaction, unique effect and verification IDs, WAL and `synchronous=FULL`. The wrapper checks the deadline again after durable intent persistence and before invoking the handler.

Retries resend only the saved outcome with its original `operation_id`; they never repeat the effect. Duplicate effect IDs are rejected even with a new verification. Reporting retries use bounded exponential backoff; after the configured attempt limit, rows require review. Acknowledged IDs remain as deduplication tombstones. Ten thousand unacknowledged rows stop admission; applications must monitor disk space and resolve failures.

A crash after an external effect but before saving its outcome leaves an `unknown` intent. `outbox.unresolved()` exposes it. Query the actual external system using the stable effect ID, establish the outcome, and only then call `outbox.reconcile(verification_id, {operation_id, operator_ref, basis_ref, outcome, external_ref_sha256})`. That explicit reconciliation creates a reportable outcome; it does not execute an effect. Conflicting outcomes are rejected. This design does not claim exactly-once execution.

The production notification outbox remains bounded retry or reconciliation. Notifications accelerate a fresh check; they do not replace it. The public conformance runner demonstrates failed delivery, lost acknowledgement, signature verification and deduplication against a fixed AMOS-owned lab receiver, and reconciles missing notifications from a durable journal. A closed or expired lab session cancels pending lab delivery. No third-party webhook site is used.

Use `outbox.deadLetters()` to list exhausted reports and `outbox.reconciliations()` to inspect the durable operator audit. `outbox.retryReport(verification_id, {operation_id, operator_ref, basis_ref})` explicitly authorizes another bounded reporting attempt after the underlying issue is repaired. Replaying the same operator operation cannot revive an acknowledged or exhausted row. Duplicate `recordOutcome` calls preserve the existing schedule and terminal status; they cannot reset retry limits. Preserve operator and evidence references without putting private evidence or credentials in the database.

The published executor revocation harness performs a harmless in-process draft effect. It verifies a fresh allow, denies after revocation without reusing the previous result, and suppresses effects on verification outage. It also deliberately revokes after successful verification but before the effect: the effect still executes. This exposes an unresolved distributed race, not atomic enforcement. A customer must enforce current authority in the same transaction as the effect or implement an equivalent fencing protocol. The AMOS receiver is tested; a customer-controlled receiver remains untested.
