# Decision state: replay

AMOS records every designated review, withdrawal, lapse, task and reading on a review case in a hash-chained decision journal. Each entry records:
- which claims changed;
- which targets changed (a target is the internal recommendation or one named effect);
- which targets were independent of the change.

`decision.mjs`, `review.mjs` and `core.mjs` here are byte-identical to the library the AMOS server runs. AMOS's CI fails if they differ.

```sh
# Export from AMOS: POST /v1/review-cases {"action":"get_decision_journal","case_id":"RC-..."}
node conformance/decision-state/replay.mjs decision-journal.json
```

`replay.mjs` does three things:
- recomputes every entry hash, transition and state hash;
- computes the state at the server's `as_of`, including revocations the server observed but had not yet journaled;
- reports whether its result matches the server's (`matches_server`).

A forged or edited entry fails. For the offline checks, run `node conformance/decision-state/test.mjs`.

**Limits.** A replay proves two things: the journal is internally consistent, and the recorded transitions reproduce. It does not verify who the reviewers are, what the originals say, or any permission.
