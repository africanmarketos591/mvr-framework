# Internal organisational permission dogfood (R8 P1.4)

This is AMOS proving its own permission substrate with its own people, before asking any outside institution. Passing it qualifies an **AMOS-internal** organisational permission substrate. It does not mean an unrelated institution recognises AMOS authority.

## Status

| Part | Status |
|---|---|
| Substrate: signed origin chain, current-state proofs, revocation delivery, exact-once receiver, quota answers | Built and tested (see below) |
| Lab rehearsal of the 34-case matrix (`attack-matrix.json`), realm `amos-lab` | 21 cases are proven by checks the live rehearsal runs; 9 by private CI suites (named per case); 4 need the team run |
| Team run: 30 consecutive valid effects and all 34 cases, distinct AMOS team members holding the eight roles, organisation-bound staging registry | **NOT RUN.** It needs the people below and a staging registry activated by a named operator |

## Roles (distinct people, never one person holding two)

| Role | Holds | May not |
|---|---|---|
| Policy owner | the effect policy and ceilings | review, issue or execute |
| Evidence custodian | the source records | review their own records |
| Reviewer | the closure credential | approve or execute what they reviewed |
| Issuer (institution approver) | the capability signing key | execute |
| Executor | the receiver and its effect fence | issue or review |
| Revoker | the revocation authority | issue |
| Security and key custodian | the staging trust root and rotation | hold any operational role |
| Observer and auditor | read-only journal access | change anything |

Separation is enforced by distinct credentials and by the authority chain's separation-of-duties checks (`SEPARATION_OF_DUTIES_*`). AI agents prepare and challenge; they never hold a role, sign, review or witness in a person's name.

## Run contract

- Two isolated tenants. One harmless AMOS-owned staging effect: `create_draft_record` into the `amos-lab` system, amount zero, no external contact.
- A receiver controlled by the executor, separate from the issuer's machine and credentials.
- Every commit binds the exact effect hash, target, executor build, scope and ceiling, expiry and dependencies, and is preceded by a current-state proof younger than 60 seconds.
- Expected outcomes are frozen in `attack-matrix.json` before the run. Results go to a share-safe archive with a credential scan; role credentials travel only through a separate secure channel.

## Lab rehearsal

```
node conformance/internal-dogfood/run-rehearsal.mjs --out dogfood-rehearsal.json
```

The rehearsal issues a disposable lab session, runs the authority conformance runner with the pinned trust root, and reports each matrix case as `PASS`, `FAIL` or `NOT RUN` with the check that proves it. Cases P06, N18, N19 and R08 report `NOT RUN` until the team run, because they need 30 consecutive commits under team-held roles, distinct people, and a separate observer.
