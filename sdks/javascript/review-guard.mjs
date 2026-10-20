const MIN_DELAY = 1000;
const MAX_DELAY = 60000;
const MAX_TIMER_DELAY = 2147483647;
const CLOCK_SKEW_MS = 1000;
const CASE_ID = /^RC-[a-f0-9]{64}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);

export const REVIEW_GUARD_REASONS = Object.freeze({
  PENDING: "REVIEW_PENDING",
  CURRENT: "REVIEW_CURRENT",
  STOPPED: "REVIEW_STOPPED",
  ABORTED: "REVIEW_ABORTED",
  NETWORK_ERROR: "REVIEW_NETWORK_ERROR",
  REQUEST_TIMEOUT: "REVIEW_REQUEST_TIMEOUT",
  MALFORMED_SNAPSHOT: "REVIEW_MALFORMED_SNAPSHOT",
  CASE_MISMATCH: "REVIEW_CASE_MISMATCH",
  BASIS_MISMATCH: "REVIEW_BASIS_MISMATCH",
  WITHDRAWN: "REVIEW_WITHDRAWN",
  NOT_READY: "REVIEW_NOT_READY",
  EXPIRED: "REVIEW_EXPIRED",
  STALE_SNAPSHOT: "REVIEW_STALE_SNAPSHOT",
  CLOCK_INVALID: "REVIEW_CLOCK_INVALID",
});
const R = REVIEW_GUARD_REASONS;

function boundedDelay(value, name) {
  if (!Number.isInteger(value) || value < MIN_DELAY || value > MAX_DELAY) {
    throw new RangeError(`${name} must be an integer from 1000 through 60000 ms.`);
  }
  return value;
}

function timestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return NaN;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return NaN;
  return new Date(parsed).toISOString() === value.replace(/Z$/, value.includes(".") ? "Z" : ".000Z") ? parsed : NaN;
}

/**
 * Monitor one existing draft, bound to an exact review case and basis.
 *
 * fetchSnapshot({action:"get", case_id, signal}) must perform the authenticated
 * read-only POST, reject HTTP failures, honor signal, and return parsed JSON
 * {status:"ok", case_id, review_progress}. Authentication belongs to the host;
 * this module never receives credentials, retains snapshots, or invokes actions.
 *
 * Returns {get state(), stop()}. Initially unusable; invalidation is terminal and
 * not retried. Create a NEW guard only after explicitly rechecking a new draft.
 * onInvalidate receives a frozen, sanitized state once; notification errors are
 * isolated. stop()/external abort are silent and suppress all late notifications.
 * Aborting a non-cooperative fetch cannot cancel its transport, but its eventual
 * result is ignored. No replacement request is started after invalidation.
 *
 * intervalMs (default 5000) and requestTimeoutMs (default 5000) are integers in
 * [1000, 60000]. Polls start after the previous call settles. scheduler supplies
 * setTimeout/clearTimeout; now returns Unix epoch milliseconds (Date.now by
 * default). checked_at must fall within the request window, allowing 1s clock
 * skew, and advance between polls. Expiry is never extended for the bound draft.
 * A successful check ages out after intervalMs + requestTimeoutMs.
 *
 * Time-of-check only: revocation may occur between checks; suspended browsers
 * delay timers. Reading state rechecks local deadlines. Clocks must be aligned;
 * a backwards/invalid clock fails closed. This is not signature verification or
 * external execution authority. The server action remains authoritative and
 * must revalidate current prerequisites; a local "current" state cannot replace it.
 *
 * @param {object} options
 * @param {function({action:string, case_id:string, signal:AbortSignal}): Promise<object>} options.fetchSnapshot
 * @param {string} options.expectedCaseId
 * @param {string} options.expectedBasisSha256
 * @param {function(object): void} options.onInvalidate
 * @param {number} [options.intervalMs=5000]
 * @param {number} [options.requestTimeoutMs=5000]
 * @param {AbortSignal} [options.signal]
 * @param {{setTimeout:function, clearTimeout:function}} [options.scheduler]
 * @param {function(): number} [options.now]
 */
export function createReviewGuard({
  fetchSnapshot,
  expectedCaseId,
  expectedBasisSha256,
  onInvalidate,
  intervalMs = 5000,
  requestTimeoutMs = 5000,
  signal,
  scheduler = globalThis,
  now = Date.now,
} = {}) {
  if (typeof fetchSnapshot !== "function" || typeof onInvalidate !== "function" || typeof now !== "function") {
    throw new TypeError("fetchSnapshot, onInvalidate, and now must be functions.");
  }
  if (typeof expectedCaseId !== "string" || !CASE_ID.test(expectedCaseId) ||
      typeof expectedBasisSha256 !== "string" || !SHA256.test(expectedBasisSha256)) {
    throw new TypeError("An exact review case ID and SHA-256 basis are required.");
  }
  boundedDelay(intervalMs, "intervalMs");
  boundedDelay(requestTimeoutMs, "requestTimeoutMs");
  if (!scheduler || typeof scheduler.setTimeout !== "function" || typeof scheduler.clearTimeout !== "function") {
    throw new TypeError("scheduler must provide setTimeout and clearTimeout.");
  }
  if (signal !== undefined && (!signal || typeof signal.aborted !== "boolean" ||
      typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function")) {
    throw new TypeError("signal must be an AbortSignal.");
  }
  const schedule = scheduler.setTimeout.bind(scheduler);
  const cancel = scheduler.clearTimeout.bind(scheduler);
  let active = true, stopped = false, pollTimer = null, watchdog = null, pending = null;
  let lastNow = -Infinity, lastChecked = -Infinity, validUntil = Infinity, refreshBy = Infinity;
  let state = Object.freeze({
    status: "pending",
    usable: false,
    reason_code: R.PENDING,
    case_id: expectedCaseId,
    basis_sha256: expectedBasisSha256,
    checked_at: null,
    valid_until: null,
    next_action: "recheck",
    signature_verified: false,
    execution_authorized: false,
    external_action_authorized: false,
  });
  const publish = patch => { state = Object.freeze({...state, ...patch}); };
  const abort = () => stop(R.ABORTED);

  function cleanup() {
    if (pollTimer !== null) cancel(pollTimer);
    if (watchdog !== null) cancel(watchdog);
    pollTimer = watchdog = null;
    signal?.removeEventListener("abort", abort);
    const request = pending;
    pending = null;
    request?.controller.abort();
  }

  function stop(reason = R.STOPPED) {
    stopped = true;
    active = false;
    if (state.status !== "invalidated" && state.status !== "stopped") {
      publish({status: "stopped", usable: false, reason_code: reason});
    }
    cleanup();
  }

  function invalidate(reason) {
    if (!active) return;
    active = false;
    publish({status: "invalidated", usable: false, reason_code: reason});
    cleanup();
    if (stopped) return;
    // A host notification failure must not alter the terminal state or leak a rejection.
    try { Promise.resolve(onInvalidate(state)).catch(() => {}); } catch {}
  }

  function checkTime() {
    if (!active) return null;
    let time;
    try { time = now(); } catch { invalidate(R.CLOCK_INVALID); return null; }
    if (typeof time !== "number" || !Number.isFinite(time) || time < 0 ||
        time > 8640000000000000 || time < lastNow) {
      invalidate(R.CLOCK_INVALID);
      return null;
    }
    lastNow = time;
    if (time >= validUntil) invalidate(R.EXPIRED);
    else if (pending && time >= pending.deadline) invalidate(R.REQUEST_TIMEOUT);
    else if (time >= refreshBy) invalidate(R.STALE_SNAPSHOT);
    return active ? time : null;
  }

  function armWatchdog(time) {
    if (watchdog !== null) cancel(watchdog);
    const deadline = Math.min(validUntil, refreshBy, pending?.deadline ?? Infinity);
    watchdog = Number.isFinite(deadline) ? schedule(() => {
      watchdog = null;
      const current = checkTime();
      if (current !== null) armWatchdog(current);
    }, Math.min(MAX_TIMER_DELAY, Math.max(0, deadline - time))) : null;
  }

  function inspect(snapshot, request, time) {
    if (!object(snapshot) || snapshot.status !== "ok" || !object(snapshot.review_progress)) {
      return {reason: R.MALFORMED_SNAPSHOT};
    }
    const progress = snapshot.review_progress;
    const checked = timestamp(progress.checked_at), expiry = timestamp(progress.valid_until);
    if (typeof snapshot.case_id !== "string" || !CASE_ID.test(snapshot.case_id) ||
        typeof progress.case_id !== "string" || !CASE_ID.test(progress.case_id) ||
        typeof progress.basis_sha256 !== "string" || !SHA256.test(progress.basis_sha256) ||
        typeof progress.status !== "string" || progress.current_state_required !== true ||
        !Number.isFinite(checked) || !Number.isFinite(expiry) ||
        snapshot.execution_authorized === true || snapshot.external_action_authorized === true ||
        progress.execution_authorized === true || progress.external_action_authorized === true) {
      return {reason: R.MALFORMED_SNAPSHOT};
    }
    if (snapshot.case_id !== expectedCaseId || progress.case_id !== expectedCaseId) return {reason: R.CASE_MISMATCH};
    if (progress.status === "withdrawn") return {reason: R.WITHDRAWN};
    if (progress.status !== "bounded_review_ready" || progress.bounded_next_action == null) return {reason: R.NOT_READY};
    if (!object(progress.bounded_next_action) || typeof progress.bounded_next_action.action !== "string" ||
        !progress.bounded_next_action.action.trim() || progress.bounded_next_action.external_action_authorized === true) {
      return {reason: R.MALFORMED_SNAPSHOT};
    }
    if (progress.basis_sha256 !== expectedBasisSha256) return {reason: R.BASIS_MISMATCH};
    if (expiry <= time) return {reason: R.EXPIRED};
    if (expiry <= checked) return {reason: R.MALFORMED_SNAPSHOT};
    if (checked < request.startedAt - CLOCK_SKEW_MS || checked > time + CLOCK_SKEW_MS || checked <= lastChecked) {
      return {reason: R.STALE_SNAPSHOT};
    }
    return {checked, expiry};
  }

  async function poll() {
    pollTimer = null;
    if (!active || pending) return;
    const startedAt = checkTime();
    if (startedAt === null) return;
    const request = {controller: new AbortController(), startedAt, deadline: startedAt + requestTimeoutMs};
    pending = request;
    armWatchdog(startedAt);
    try {
      const snapshot = await fetchSnapshot(Object.freeze({
        action: "get", case_id: expectedCaseId, signal: request.controller.signal,
      }));
      if (!active || pending !== request) return;
      const time = checkTime();
      if (time === null) return;
      let result;
      try { result = inspect(snapshot, request, time); } catch { result = {reason: R.MALFORMED_SNAPSHOT}; }
      if (result.reason) { invalidate(result.reason); return; }
      lastChecked = result.checked;
      validUntil = Math.min(validUntil, result.expiry);
      refreshBy = time + intervalMs + requestTimeoutMs;
      publish({
        status: "current", usable: true, reason_code: R.CURRENT,
        checked_at: new Date(lastChecked).toISOString(), valid_until: new Date(validUntil).toISOString(),
      });
    } catch {
      if (active && pending === request && checkTime() !== null) invalidate(R.NETWORK_ERROR);
    } finally {
      if (active && pending === request) {
        pending = null;
        const time = checkTime();
        if (time !== null) {
          armWatchdog(time);
          pollTimer = schedule(poll, intervalMs);
        }
      }
    }
  }

  if (signal?.aborted) stop(R.ABORTED);
  else {
    signal?.addEventListener("abort", abort, {once: true});
    pollTimer = schedule(poll, 0);
  }
  return Object.freeze({
    get state() { checkTime(); return state; },
    stop: () => stop(),
  });
}
