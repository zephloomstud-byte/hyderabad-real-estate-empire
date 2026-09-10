// Play to the 2020 ending, carry on, and run to December 2030.
import { startGame, refresh, advanceMonth, resolveEvent, continuePast2020, buyLand,
  doDueDiligence, launchProject, maxBuildableSqFt, estimateProject, remainingCommitments,
  freeSqYd, landRate } from '../src/sim/engine.js';
import { money, usd, dateLabel } from '../src/core/util.js';
import { makeRng } from '../src/core/rng.js';
import { BUILD_TYPES } from '../src/data/costs.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const s = startGame('extend', { cash: 5e8, firmName: 'Test Corp' });
const rng = makeRng(31337);
const step = () => {
  if (s.pendingEvent) { const l = s.pendingEvent.choices.map((c, i) => ({ c, i })).filter((x) => !x.c.illegal);
    resolveEvent(s, (s.cash > 3e6 ? l[0] : l[Math.min(1, l.length - 1)]).i); return; }
  const committed = remainingCommitments(s);
  for (const p of s.parcels.filter((x) => x.owned && !x.consumed && freeSqYd(x) > 400)) {
    const cap = maxBuildableSqFt(p, s);
    for (const t of Object.values(BUILD_TYPES)) {
      if (t.minSqFt > cap) continue;
      for (const want of [cap, 60000, 25000, 12000, 6000, 4000]) {
        const sq = Math.min(cap, want); if (sq < t.minSqFt) continue;
        const e = estimateProject(p, t.id, sq, s);
        if ((committed + e.schedule.peak) * 0.32 > s.cash) continue;
        if (e.grossValue > e.budget * 1.2) launchProject(s, p.id, t.id, sq, 'sell');
        break;
      }
      break;
    }
  }
  if (s.cash > committed * 0.6 + 3e6 && rng.chance(0.5)) {
    const c = s.offers.filter((o) => o.kind === 'land' && o.price * 1.16 < (s.cash - committed * 0.4) * 0.4);
    if (c.length) { const o = rng.pick(c); doDueDiligence(s, o, 'standard');
      if (!o.known.some((d) => ['ASSIGNED_LAND', 'GOVT_CLAIM'].includes(d))) buyLand(s, o); }
  }
  advanceMonth(s);
};

while (!s.over) step();
console.log(`base game ended  ${dateLabel(s.month)}  (${s.overReason})  net worth ${money(s.netWorth)} / ${usd(s.netWorth, s.macro.usd)}`);

if (s.overReason !== 'time') { console.log('did not reach 2020; nothing to extend'); process.exit(0); }

const r = continuePast2020(s);
console.log(`carry on: ${r.ok ? 'accepted' : r.msg}`);
const marks = [303, 310, 324, 347, 360, 396, 431];
while (!s.over) {
  step();
  if (marks.includes(s.month)) {
    console.log(`  ${dateLabel(s.month).padEnd(9)} nw ${money(s.netWorth).padStart(10)}  cash ${money(s.cash).padStart(10)}  demand ${s.macro.demand.toFixed(2)}  PLR ${s.macro.plr.toFixed(1)}%  USD ${s.macro.usd.toFixed(1)}  ${s.macro.regime.name.split('(')[0].trim()}`);
  }
}
console.log(`\nextended run ended ${dateLabel(s.month)} (${s.overReason})`);
console.log(`final net worth ${money(s.netWorth)} / ${usd(s.netWorth, s.macro.usd)}  |  projects ${s.stats.projectsDone}  |  years ${(s.month / 12).toFixed(1)}`);
