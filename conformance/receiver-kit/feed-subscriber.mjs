// Reference subscriber for the signed current-state feed (mvr.current-state-feed/1). A receiver keeps one per session:
//   follow()  long-polls the feed (wait up to 20 s), so a connected receiver learns of a revocation within seconds;
//   poll()    catches up from the last sequence it holds, after a restart or a network loss;
//   fresh()   says whether the receiver may still act offline for an effect risk class (mvr.offline-policy/1).
// Every head is verified with the registry key and every entry against the hash chain; a gap, a broken link, a sequence
// regression or a bad signature stops the subscriber, and a receiver that cannot read the feed applies zero effects.
import {verifyStatement, canonical, sha256} from '../../sdks/javascript/trust-chain-verifier.mjs';
export const FEED_SUBSCRIBER_VERSION = 'amos.feed-subscriber/1';
export const FEED_CONTRACT = 'mvr.current-state-feed/1';
const fault = code => Object.assign(new Error(code), {code});

export function createFeedSubscriber({base = 'https://africanmarketos.com', sessionId, registryKey, fetchImpl = fetch, now = () => Date.now()}) {
  if (!sessionId || !registryKey?.key_id || !registryKey?.public_key_spki_b64) throw new Error('sessionId and registryKey {key_id, public_key_spki_b64} are required');
  const state = {last_sequence: 0, head_sha256: null, head_observed_at: null, revoked_capabilities: new Set(), revocations: [], session_closed: false, offline_policy: null, entries: [], polls: 0};
  async function apply(body) {
    const head = body?.head;
    const checked = await verifyStatement(head, {key_id: registryKey.key_id, public_key_spki_b64: registryKey.public_key_spki_b64, contract: FEED_CONTRACT});
    if (!checked.valid) throw fault('FEED_HEAD_INVALID:' + checked.reason);
    if (head.session_id !== sessionId) throw fault('FEED_SESSION_MISMATCH');

    // Hashes are asynchronous. Recheck the cursor before committing if another poll wins the race.
    const start = state.last_sequence;
    const observed = Date.parse(head.observed_at);
    if (!Number.isSafeInteger(head.last_sequence) || head.last_sequence < start) throw fault('FEED_SEQUENCE_REGRESSED');
    if (!Number.isFinite(observed) || observed > now() + 1000 || observed < (state.head_observed_at ?? -Infinity)) throw fault('FEED_OBSERVATION_INVALID');
    if (state.session_closed && head.session_status === 'active') throw fault('FEED_SESSION_REOPENED');
    if (!Array.isArray(body.entries)) throw fault('FEED_ENTRIES_REQUIRED');
    let prev = state.head_sha256;
    let sequence = start;
    const additions = [];
    for (const entry of body.entries) {
      if (!Number.isSafeInteger(entry?.sequence) || entry.sequence < 1) throw fault('FEED_GAP');
      const {entry_sha256, ...rest} = entry;
      if (await sha256(canonical(rest)) !== entry_sha256) throw fault('FEED_ENTRY_HASH_MISMATCH');
      if (entry.sequence <= start) {
        if (state.entries[entry.sequence - 1]?.entry_sha256 !== entry_sha256) throw fault('FEED_CHAIN_BROKEN');
        continue;
      }
      if (entry.sequence !== sequence + 1) throw fault('FEED_GAP');
      if (entry.prev_entry_sha256 !== prev) throw fault('FEED_CHAIN_BROKEN');
      prev = entry_sha256;
      sequence = entry.sequence;
      additions.push(entry);
    }
    if (head.last_sequence !== sequence || head.head_sha256 !== prev) throw fault('FEED_HEAD_MISMATCH');
    if (state.last_sequence !== start || observed < (state.head_observed_at ?? -Infinity) || (state.session_closed && head.session_status === 'active')) throw fault('FEED_CURSOR_CHANGED');
    for (const entry of additions) {
      state.entries.push(entry);
      if (entry.receivers_must_reverify) state.revocations.push({sequence: entry.sequence, action: entry.action, id: entry.id, at: entry.at});
      if (entry.action === 'revoke_capability' && entry.id) state.revoked_capabilities.add(entry.id);
      if (entry.action === 'close_session') state.session_closed = true;
    }
    state.last_sequence = sequence;
    state.head_sha256 = prev;
    if (head.session_status !== 'active') state.session_closed = true;
    state.head_observed_at = observed;
    state.offline_policy = head.offline_policy;
    return state;
  }
  let verificationFailed = false;
  async function verifyAndApply(body) {
    try {
      const verified = await apply(body);
      verificationFailed = false;
      return verified;
    } catch (error) {
      verificationFailed = true;
      throw error;
    }
  }
  async function poll({wait = 0} = {}) {
    state.polls++;
    const response = await fetchImpl(`${base}/v1/authority-conformance/feed?session_id=${encodeURIComponent(sessionId)}&after=${state.last_sequence}&wait=${wait}`, {headers: {'User-Agent': 'amos-feed-subscriber', Accept: 'application/json'}, signal: AbortSignal.timeout(40000)});
    const body = await response.json().catch(() => null);
    if (response.status !== 200 || !body) throw fault('FEED_UNAVAILABLE:' + response.status);
    return verifyAndApply(body);
  }
  return {
    version: FEED_SUBSCRIBER_VERSION, state, poll, apply: verifyAndApply,
    // Long-poll until stop() returns true or the deadline passes; onRevocation runs for each new revoke_* or close entry.
    async follow({deadlineMs, stop = () => false, onRevocation = () => {}, wait = 20} = {}) {
      let seen = state.revocations.length;
      while (Date.now() < deadlineMs && !stop()) {
        await poll({wait: Math.max(0, Math.min(wait, Math.floor((deadlineMs - Date.now()) / 1000)))});
        for (const r of state.revocations.slice(seen)) await onRevocation(r);
        seen = state.revocations.length;
        if (state.session_closed) break;
      }
      return state;
    },
    fresh({riskClass = 'standard'} = {}) {
      if (verificationFailed) return {fresh: false, reason: 'FEED_VERIFICATION_FAILED'};
      const max = state.offline_policy?.risk_classes?.[riskClass]?.max_offline_age_seconds;
      if (max === undefined || state.head_observed_at === null) return {fresh: false, reason: 'FEED_NOT_READ'};
      const age = (now() - state.head_observed_at) / 1000;
      return Number.isFinite(max) && max >= 0 && age >= -1 && age <= max ? {fresh: true, age_seconds: age, max_offline_age_seconds: max} : {fresh: false, reason: 'FEED_OLDER_THAN_OFFLINE_POLICY', age_seconds: age, max_offline_age_seconds: max};
    }
  };
}
