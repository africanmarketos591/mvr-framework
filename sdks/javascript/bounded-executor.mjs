// Reference bounded executor for the AMOS authority chain.
//
// The institution signs a capability; AMOS verifies its current dependency chain; this executor enforces it.
// Before every effect it asks AMOS whether the institution's capability is currently valid for exactly this
// effect, checks the answer again locally, performs only the named effect within the returned validity window,
// and records the outcome. Anything unexpected fails closed: no answer, a malformed answer, a denial, an expired
// window, a scope mismatch or lab-fixture keys outside tests all mean the effect does not run.
//
// With commitEffect supplied (recommended), the executor also calls commit_effect at the moment of the effect.
// AMOS re-checks the whole chain atomically and records a single-use commit, so a revocation committed before
// that instant always stops the effect. The commit_id is passed to the effect handler as its idempotency key.
//
// Internal work products (drafts the host saves locally) need no capability; executeInternalArtifact refuses
// anything that would leave the host.
//
// The host supplies the authenticated transport. This module never sees API keys and never retries an effect.

const EFFECT_ID = /^[A-Za-z0-9_-]{1,120}$/;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const iso = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));

export const EXECUTOR_REASONS = Object.freeze({
  INVALID_REQUEST: "EXECUTOR_INVALID_REQUEST",
  HANDLER_MISSING: "EXECUTOR_EFFECT_HANDLER_MISSING",
  VERIFY_UNAVAILABLE: "EXECUTOR_VERIFICATION_UNAVAILABLE",
  MALFORMED: "EXECUTOR_MALFORMED_VERIFICATION",
  DENIED: "EXECUTOR_DENIED",
  LAB_FIXTURE: "EXECUTOR_LAB_FIXTURE_NOT_ALLOWED",
  SCOPE_MISMATCH: "EXECUTOR_SCOPE_MISMATCH",
  WINDOW_EXPIRED: "EXECUTOR_VALIDITY_WINDOW_EXPIRED",
  EFFECT_FAILED: "EXECUTOR_EFFECT_FAILED",
  EXECUTED: "EXECUTOR_EXECUTED",
  COMMIT_UNAVAILABLE: "EXECUTOR_COMMIT_CHECK_UNAVAILABLE",
  COMMIT_DENIED: "EXECUTOR_COMMIT_DENIED",
  ALREADY_COMMITTED: "EXECUTOR_ALREADY_COMMITTED",
  INTERNAL_ONLY: "EXECUTOR_INTERNAL_ARTIFACT_SAVED",
  NOT_INTERNAL: "EXECUTOR_NOT_AN_INTERNAL_ARTIFACT"
});
const R = EXECUTOR_REASONS;

function validRequest(requested) {
  return object(requested) && EFFECT_ID.test(requested.effect_id || "") && typeof requested.effect_type === "string"
    && object(requested.resource) && Number.isSafeInteger(requested.amount_minor) && requested.amount_minor >= 0
    && typeof requested.currency === "string" && /^[A-Z]{3}$/.test(requested.currency);
}
// Defence in depth: the executor re-checks the server's stated scope against what it is about to do.
function withinScope(scope, requested) {
  if (!object(scope) || !object(scope.resource_scope)) return false;
  const resource = requested.resource;
  return scope.effect_type === requested.effect_type
    && Number.isSafeInteger(scope.max_amount_minor) && requested.amount_minor <= scope.max_amount_minor && scope.currency === requested.currency
    && (scope.amount_minor === undefined || requested.amount_minor === scope.amount_minor)
    && (requested.external_contact === undefined || typeof requested.external_contact === 'boolean')
    && (requested.external_contact !== true || scope.external_contact_allowed === true)
    && (scope.counterparty_ref === undefined || requested.counterparty_ref === scope.counterparty_ref)
    && resource.system === scope.resource_scope.system && resource.resource_type === scope.resource_scope.resource_type
    && (scope.resource_scope.resource_id === undefined || resource.resource_id === scope.resource_scope.resource_id)
    && (scope.resource_scope.resource_id_prefix === undefined || typeof resource.resource_id === "string" && resource.resource_id.startsWith(scope.resource_scope.resource_id_prefix));
}

/**
 * createBoundedExecutor({verify, commitEffect, recordEffect, effects, allowLabFixtures, now, clockSkewMs})
 *  commitEffect({verification_id, effect_id, requested_effect, operation_id}) -> parsed JSON from commit_effect (optional, recommended)
 *  verify({capability_id, requested_effect, operation_id}) -> parsed JSON from POST /v1/authority-chain verify_capability
 *  recordEffect({verification_id, effect_id, outcome, external_ref_sha256, operation_id}) -> parsed JSON
 *  effects: {[effect_type]: async (frozenRequestedEffect, {signal, valid_until, commit_id}) => ({external_ref_sha256?})}
 *  allowLabFixtures: true only in tests; production refuses lab-fixture capabilities.
 */
export function createBoundedExecutor({verify, commitEffect, recordEffect, effects = {}, allowLabFixtures = false, now = Date.now, clockSkewMs = 1000, operationId = () => crypto.randomUUID()} = {}) {
  if (typeof verify !== "function" || typeof recordEffect !== "function" || !object(effects)) throw new TypeError("verify, recordEffect and effects are required");
  if (commitEffect !== undefined && typeof commitEffect !== "function") throw new TypeError("commitEffect must be a function when supplied");
  return {
    async execute({capability_id, requested_effect}) {
      const requested = structuredClone(requested_effect);
      if (typeof capability_id !== "string" || !validRequest(requested)) return {executed:false, reason:R.INVALID_REQUEST};
      const handler = effects[requested.effect_type];
      if (typeof handler !== "function") return {executed:false, reason:R.HANDLER_MISSING};
      let answer;
      try { answer = await verify({capability_id, requested_effect:requested, operation_id:operationId()}); }
      catch { return {executed:false, reason:R.VERIFY_UNAVAILABLE}; }
      if (!object(answer) || !["allow", "deny"].includes(answer.decision) || answer.capability_id !== capability_id) return {executed:false, reason:R.MALFORMED};
      if (answer.decision !== "allow") return {executed:false, reason:R.DENIED, deny_reasons:Array.isArray(answer.deny_reasons) ? answer.deny_reasons : [], verification_id:answer.verification_id || null};
      if (answer.reliance === "lab_fixture_only" && !allowLabFixtures) return {executed:false, reason:R.LAB_FIXTURE, verification_id:answer.verification_id};
      if (!["institution_signed", "lab_fixture_only"].includes(answer.reliance) || !iso(answer.valid_until) || typeof answer.verification_id !== "string") return {executed:false, reason:R.MALFORMED};
      if (!withinScope(answer.effect_scope, requested)) return {executed:false, reason:R.SCOPE_MISMATCH, verification_id:answer.verification_id};
      let deadline = Date.parse(answer.valid_until);
      if (now() + clockSkewMs >= deadline) return {executed:false, reason:R.WINDOW_EXPIRED, verification_id:answer.verification_id};
      // Commit-time check: the last decision point before the effect.
      let commit = null;
      if (commitEffect) {
        const notAttempted = async () => { try { await recordEffect({verification_id:answer.verification_id, effect_id:requested.effect_id, outcome:"not_attempted", operation_id:operationId()}); } catch {} };
        try { commit = await commitEffect({verification_id:answer.verification_id, effect_id:requested.effect_id, requested_effect:requested, operation_id:operationId()}); }
        catch { return {executed:false, reason:R.COMMIT_UNAVAILABLE, verification_id:answer.verification_id}; }
        if (object(commit) && commit.decision === "already_committed") return {executed:false, reason:R.ALREADY_COMMITTED, verification_id:answer.verification_id, commit_id:typeof commit.commit_id === "string" ? commit.commit_id : null};
        if (!object(commit) || commit.decision !== "commit" || !/^CM-[a-f0-9]{48}$/.test(commit.commit_id || "") || !iso(commit.commit_valid_until)) {
          await notAttempted();
          return {executed:false, reason:object(commit) && commit.decision === "deny" ? R.COMMIT_DENIED : R.MALFORMED, deny_reasons:object(commit) && Array.isArray(commit.deny_reasons) ? commit.deny_reasons : [], verification_id:answer.verification_id};
        }
        deadline = Math.min(deadline, Date.parse(commit.commit_valid_until));
        if (now() + clockSkewMs >= deadline) { await notAttempted(); return {executed:false, reason:R.WINDOW_EXPIRED, verification_id:answer.verification_id, commit_id:commit.commit_id}; }
      }
      // Perform exactly the verified effect, bounded by the validity window. Never retried here.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(0, deadline - now()));
      let outcome = "succeeded", ref;
      try {
        const out = await handler(Object.freeze(structuredClone(requested)), {signal:controller.signal, valid_until:new Date(deadline).toISOString(), commit_id:commit?.commit_id || null});
        ref = object(out) && /^[a-f0-9]{64}$/.test(out.external_ref_sha256 || "") ? out.external_ref_sha256 : undefined;
      } catch { outcome = "failed"; }
      finally { clearTimeout(timer); }
      let report;
      try { report = await recordEffect({verification_id:answer.verification_id, effect_id:requested.effect_id, outcome, ...(ref ? {external_ref_sha256:ref} : {}), operation_id:operationId()}); }
      catch { report = null; }
      return {executed:outcome === "succeeded", attempted:true, reason:outcome === "succeeded" ? R.EXECUTED : R.EFFECT_FAILED, verification_id:answer.verification_id,
        commit_id:commit?.commit_id || null, commit_time_checked:!!commit, receipt:answer.receipt || null, report_status:object(report) && report.status === "recorded" ? "recorded" : "unreported_retry_record_effect"};
    }
  };
}

// Internal work products are saved locally by the host and never sent.
export async function executeInternalArtifact(workProducts, save) {
  if (typeof save !== "function" || !object(workProducts) || workProducts.effect_class !== "local_internal_artifact" || workProducts.executable_now !== true || !Array.isArray(workProducts.products)) return {saved:false, reason:R.NOT_INTERNAL};
  const products = workProducts.products.filter(product => object(product) && product.external_send === false && product.automatic_send === false);
  if (products.length !== workProducts.products.length) return {saved:false, reason:R.NOT_INTERNAL};
  for (const product of products) await save(Object.freeze(structuredClone(product)));
  return {saved:true, count:products.length, reason:R.INTERNAL_ONLY, sent:false};
}
