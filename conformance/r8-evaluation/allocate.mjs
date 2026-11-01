#!/usr/bin/env node
// Blinded Latin-square allocation for the R8 operational comparison: 48 cases x 3 arms x 3 reviews = 432 review tasks
// across at least six internally separated reviewers. A reviewer who meets a case twice meets it in two different arms,
// with every first visit scheduled before any repeat (washout). Treatment identity goes to the sealed file only.
//   node allocate.mjs --cases cases.json --reviewers R1,R2,...,R6 --seed <hex> --out <dir>
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const ARMS = Object.freeze(['strong_policy', 'amos_assisted', 'competent_conventional']);
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
function rng(seedHex) { let s = parseInt(sha(seedHex).slice(0, 8), 16) >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (list, rand) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function allocate({cases, reviewers, seed, reviewsPerArm = 3, sessionSize = 12}) {
  if (!Array.isArray(cases) || cases.length < 1) throw new Error('cases required');
  if (!Array.isArray(reviewers) || reviewers.length < 6) throw new Error('at least six internally separated reviewers are required');
  const R = reviewers.length, rand = rng(seed), tasks = [];
  cases.forEach((c, i) => {
    // Task t = arm*reviewsPerArm + review. Reviewer (base + t) mod R: a reviewer who repeats a case sees another arm.
    const base = (i * 5) % R;
    for (let a = 0; a < ARMS.length; a++) for (let k = 0; k < reviewsPerArm; k++) {
      const t = a * reviewsPerArm + k;
      tasks.push({case_id: c.case_id, stratum: c.stratum ?? null, arm: ARMS[(a + i) % ARMS.length], review: k, reviewer: reviewers[(base + t) % R]});
    }
  });
  const byReviewer = new Map(reviewers.map(r => [r, []]));
  for (const t of tasks) byReviewer.get(t.reviewer).push(t);
  const schedule = [], sealed = {};
  for (const [reviewer, list] of byReviewer) {
    const seen = new Set(), first = [], repeat = [];
    for (const t of shuffle(list, rand)) (seen.has(t.case_id) ? repeat : first).push(t), seen.add(t.case_id);
    // Every first visit before any repeat; repeats keep the order of their first visit, so the gap is maximal.
    const order = first.map(t => t.case_id);
    repeat.sort((x, y) => order.indexOf(x.case_id) - order.indexOf(y.case_id));
    [...first, ...repeat].forEach((t, position) => {
      const allocation_id = 'AL-' + sha(seed + '|' + reviewer + '|' + t.case_id + '|' + t.arm + '|' + t.review).slice(0, 20);
      sealed[allocation_id] = t.arm;
      schedule.push({allocation_id, reviewer, case_id: t.case_id, stratum: t.stratum, session: Math.floor(position / sessionSize), position});
    });
  }
  // Balance and washout diagnostics.
  const armByReviewer = Object.fromEntries(reviewers.map(r => [r, Object.fromEntries(ARMS.map(a => [a, 0]))]));
  for (const s of schedule) armByReviewer[s.reviewer][sealed[s.allocation_id]]++;
  let minGap = Infinity, sameArmRepeat = 0;
  for (const r of reviewers) {
    const mine = schedule.filter(s => s.reviewer === r), byCase = new Map();
    for (const s of mine) (byCase.get(s.case_id) ?? byCase.set(s.case_id, []).get(s.case_id)).push(s);
    for (const visits of byCase.values()) if (visits.length > 1) {
      minGap = Math.min(minGap, visits[1].session - visits[0].session);
      if (new Set(visits.map(v => sealed[v.allocation_id])).size < visits.length) sameArmRepeat++;
    }
  }
  return {schedule, sealed, diagnostics: {tasks: schedule.length, reviewers: R, arm_by_reviewer: armByReviewer, min_washout_sessions: minGap === Infinity ? null : minGap, same_arm_repeats: sameArmRepeat},
    sealed_sha256: sha(JSON.stringify(Object.keys(sealed).sort().map(k => [k, sealed[k]]))), schedule_sha256: sha(JSON.stringify(schedule))};
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const result = allocate({cases: JSON.parse(fs.readFileSync(arg('cases'), 'utf8')).cases, reviewers: arg('reviewers').split(','), seed: arg('seed')});
  const out = arg('out'); fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, 'schedule.json'), JSON.stringify({schedule: result.schedule, schedule_sha256: result.schedule_sha256, sealed_sha256: result.sealed_sha256}, null, 1));
  fs.writeFileSync(path.join(out, 'sealed-allocation.private.json'), JSON.stringify({sealed: result.sealed, sealed_sha256: result.sealed_sha256}, null, 1));
  console.log(JSON.stringify(result.diagnostics));
}
