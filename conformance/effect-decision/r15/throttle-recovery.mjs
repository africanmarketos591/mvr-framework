// Observes one real throttling response on the public first-call route, then follows its recovery metadata once. It sends no key,
// stops at the first 429, and sends at most 45 requests. A server failure cannot be requested, so this tool does not test one.
//   node conformance/effect-decision/r15/throttle-recovery.mjs --out throttle-recovery.json
import fs from 'node:fs';
import {setTimeout as pause} from 'node:timers/promises';
const opt = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = opt('base') || 'https://africanmarketos.com', body = JSON.stringify({question: 'Reformat the internal newsletter template'});
const send = async () => { const r = await fetch(BASE + '/v1/first-call', {method: 'POST', signal: AbortSignal.timeout(60000), headers: {'Content-Type': 'application/json'}, body}); let j = {}; try { j = await r.json(); } catch {} return {status: r.status, retry_after: r.headers.get('Retry-After'), retryable: r.headers.get('X-MVR-Retryable'), consumed: r.headers.get('X-MVR-Request-Consumed'), body: j}; };
let sent = 0, limited = null;
while (sent < 45 && !limited) { const r = await send(); sent++; if (r.status === 429) limited = r; else if (r.status !== 200) throw new Error('unexpected HTTP ' + r.status); }
const out = {class: 'throttling', requests_before_limit: limited ? sent - 1 : sent, observed: !!limited, transient_server_failure_observed: false, transient_server_failure_note: 'Not induced. A real 5xx was not available to observe.'};
if (limited) {
  const rec = limited.body.recovery ?? {};
  Object.assign(out, {http_status: 429, retry_after_header: limited.retry_after, retryable_header: limited.retryable, request_consumed_header: limited.consumed, recovery: rec});
  const wait = Math.min(75, Number(rec.retry_after_seconds) || 60); await pause((wait + 1) * 1000);
  const again = await send(); Object.assign(out, {waited_seconds: wait + 1, retry_http_status: again.status});
  out.checks = {contract: rec.contract_version === 'mvr.request-recovery/1', retryable: rec.retryable === true && limited.retryable === 'true', not_consumed: rec.request_consumed === 'not_consumed' && limited.consumed === 'not_consumed', retry_after_matches_header: Number(limited.retry_after) === rec.retry_after_seconds, retry_after_wait_succeeded: again.status === 200};
  out.passed = Object.values(out.checks).every(Boolean);
} else out.passed = false;
if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out, null, 1)); process.exitCode = out.passed ? 0 : 1;
