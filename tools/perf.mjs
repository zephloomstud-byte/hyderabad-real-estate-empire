// Profile a long game: what grows, and where each month's time goes.
import { startGame, refresh, advanceMonth, resolveEvent, continuePast2020, buyLand,
  doDueDiligence, launchProject, maxBuildableSqFt, estimateProject, remainingCommitments,
  freeSqYd, askBrokers } from '../src/sim/engine.js';
import { dateLabel, money } from '../src/core/util.js';
import { makeRng } from '../src/core/rng.js';
import { BUILD_TYPES, LAYOUT_TYPES } from '../src/data/costs.js';
import { findDuplicateIds } from '../src/sim/state.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const s = startGame('perf', { cash: 5e8, firmName: 'Perf Corp' });
const rng = makeRng(7);
const t = { advance: 0, refresh: 0, stringify: 0, estimate: 0, dupe: 0 };
const time = (k, fn) => { const a = performance.now(); const r = fn(); t[k] += performance.now() - a; return r; };

function play() {
  if (s.pendingEvent) { const l = s.pendingEvent.choices.map((c, i) => ({ c, i })).filter((x) => !x.c.illegal);
    resolveEvent(s, (s.cash > 3e6 ? l[0] : l[Math.min(1, l.length - 1)]).i); return; }
  const committed = time('estimate', () => remainingCommitments(s));
  for (const p of s.parcels.filter((x) => x.owned && !x.consumed && freeSqYd(x) > 400).slice(0, 4)) {
    const cap = maxBuildableSqFt(p, s);
    const t0 = Object.values(BUILD_TYPES).find((b) => b.minSqFt <= cap);
    if (!t0) continue;
    const e = time('estimate', () => estimateProject(p, t0.id, Math.min(cap, 40000), s));
    if ((committed + e.schedule.peak) * 0.32 < s.cash) launchProject(s, p.id, t0.id, Math.min(cap, 40000), rng.chance(0.3) ? 'hold' : 'sell');
  }
  if (rng.chance(0.3)) askBrokers(s, 'acreage');
  if (s.cash > committed * 0.5 + 5e6) {
    for (const o of s.offers.filter((x) => x.kind === 'land').slice(0, 2)) {
      doDueDiligence(s, o, 'quick'); buyLand(s, o);
    }
  }
  time('advance', () => advanceMonth(s));
  time('refresh', () => refresh(s));
  time('dupe', () => findDuplicateIds(s));
}

const checkpoints = [60, 180, 302, 431, 671];
let last = performance.now();
while (true) {
  if (s.over) {
    const r = continuePast2020(s);
    if (!r.ok) break;
  }
  play();
  if (checkpoints.includes(s.month)) {
    const json = time('stringify', () => JSON.stringify(s));
    const elapsed = performance.now() - last; last = performance.now();
    console.log(`${dateLabel(s.month).padEnd(9)} save ${(json.length / 1024).toFixed(0).padStart(6)} KB  ` +
      `news ${String(s.news.length).padStart(5)}  ledger ${String(s.ledger.length).padStart(5)}  ` +
      `projects ${String(s.projects.length).padStart(4)} (live ${s.projects.filter((p) => !p.done).length})  ` +
      `parcels ${String(s.parcels.length).padStart(4)}  offers ${String(s.offers.length).padStart(3)}  ` +
      `inventory ${String(s.inventory.length).padStart(3)}  assets ${String(s.assets.length).padStart(3)}  ` +
      `| ${(elapsed / 1000).toFixed(1)}s for this stretch`);
  }
}
console.log('\ncumulative ms by phase:', Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)])));
const json = JSON.stringify(s);
const { writeFileSync } = await import('node:fs');
writeFileSync('dist/perfsave.json', json);
console.log(`final save ${(json.length / 1024 / 1024).toFixed(2)} MB  (browser localStorage limit is about 5 MB)`);
