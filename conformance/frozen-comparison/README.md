# Frozen same-input comparison

This tests whether an operator who uses an AMOS review case decides better than with their usual process, on the same cases, under a rule fixed in advance. [`PROTOCOL.md`](PROTOCOL.md) is the preregistration.

**This folder runs the comparison. It does not contain one.** The comparison needs a real operator, their real redacted cases, and outcomes that become known later. Nothing here supplies those.

## Steps

1. **Freeze.** Put your redacted cases in the shape of [`cases.example.json`](cases.example.json), then run:

   ```sh
   node conformance/frozen-comparison/comparison.mjs freeze my-cases.json frozen/
   ```

   This fixes the hash of every case, the hash of the whole set, the AMOS revision now serving, and the hash of `PROTOCOL.md`. Nothing is ever overwritten.
2. **Record AMOS's output** for every frozen case. Without an API key it uses the isolated evaluation route; with `AMOS_API_KEY` it uses your licensed workspace:

   ```sh
   node conformance/frozen-comparison/run-amos-arm.mjs frozen/
   ```

   It refuses if AMOS serves a different revision from the frozen one. What it records is context for arm B, not a decision.
3. **Decide both arms** in [`decisions.template.csv`](decisions.template.csv): arm A by the usual process, arm B after opening each case's review case. Use different people, or the same people at least 14 days apart with the order shuffled.
4. **Record outcomes** in [`outcomes.template.csv`](outcomes.template.csv), after both decisions, by someone who saw neither.
5. **Score:**

   ```sh
   node conformance/frozen-comparison/comparison.mjs score frozen/ decisions.csv outcomes.csv
   ```

## What scoring refuses

- any case, the case list or `PROTOCOL.md` changed after freezing;
- a decision made before freezing or after its outcome;
- a missing or duplicate decision or outcome;
- an AMOS record from another freeze.

## The rule

Arm B counts as better only with all three:
- fewer bad approvals, exact McNemar p < 0.05;
- unnecessary holds within 10% of benign cases;
- median minutes no more than 1.5 times arm A.

Below 50 cases with outcomes, the verdict is always `feasibility_only`.

`node conformance/frozen-comparison/test.mjs` checks the scorer, the refusals and the McNemar arithmetic on proprietary lab fixtures, which are not observations.
