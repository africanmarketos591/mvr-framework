import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFeedSubscriber} from '../feed-subscriber.mjs';
const {registry_key: registryKey, session_id: sessionId, batch, first_batch} =
  JSON.parse(fs.readFileSync(new URL('./vectors.json', import.meta.url)));
const subscriber = createFeedSubscriber({registryKey, sessionId, now: () => Date.parse(batch.head.observed_at)});
const damaged = structuredClone(batch);
damaged.entries[1].entry_sha256 = '0'.repeat(64);
await assert.rejects(subscriber.apply(damaged));
assert.equal(subscriber.state.last_sequence, 0);
await subscriber.apply(first_batch);
await subscriber.apply(batch);
assert.ok(subscriber.state.revoked_capabilities.has(batch.entries[1].id));
await assert.rejects(subscriber.apply(first_batch), {code: 'FEED_SEQUENCE_REGRESSED'});
assert.equal(subscriber.state.last_sequence, 2);
assert.equal(subscriber.fresh({}).fresh, false);
await subscriber.apply(batch);
assert.equal(subscriber.fresh({}).fresh, true);
console.log('Verified atomic application, rollback refusal and recovery');
