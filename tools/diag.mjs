// Calibration harness: a deliberately *competent* auto-player, to check that a sensible
// strategy can actually survive and compound. If this player cannot build a business,
// the economics are wrong, not the player.
// `node tools/diag.mjs [runs] [--verbose]`

import { newGame } from '../src/sim/state.js';
import {
  refresh, advanceMonth, resolveEvent, buyLand, doDueDiligence, launchProject,
  maxBuildableSqFt, estimateProject, applyForLoan, hire, sellParcel, abandonProject,
  remainingCommitments, landRate,
} from '../src/sim/engine.js';
import { money, usd, dateLabel, pct } from '../src/core/util.js';
import { makeRng } from '../src/core/rng.js';
import { BUILD_TYPES } from '../src/data/costs.js';
import { DEFECTS } from '../src/data/geo.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const RUNS = Number(process.argv[2]) || 8;
const VERBOSE = process.argv.includes('--verbose');
const FATAL = ['ASSIGNED_LAND', 'WAKF_CLAIM', 'GOVT_CLAIM', 'CATCHMENT_ZONE'];

function play(seed) {
  const s = newGame(seed, { cash: 2500000, name: 'Auto', firmName: 'Auto Constructions' });
  refresh(s);
  const rng = makeRng(1000 + seed.length * 31 + seed.charCodeAt(seed.length - 1));

  while (!s.over && s.month < 303) {
    if (s.pendingEvent) {
      // Prefer the first non-illegal choice; it is usually the responsible one.
      // A real player picks the responsible option when they can afford it and the
      // cheap one when they cannot. Choice 0 is usually the expensive, correct one.
      const legal = s.pendingEvent.choices.map((c, idx) => ({ c, idx })).filter((x) => !x.c.illegal);
      const pick = s.cash > 1500000 ? legal[0] : legal[Math.min(1, legal.length - 1)];
      resolveEvent(s, pick ? pick.idx : 0);
      continue;
    }

    const live = s.projects.filter((p) => !p.done);
    const idle = s.parcels.filter((p) => p.owned && !p.consumed && maxBuildableSqFt(p, s) >= 3000);
    const committed = remainingCommitments(s, 12);
    const headroom = s.cash - committed * 0.55;

    // Abandon anything idle for a year — sunk cost is sunk.
    for (const p of live) if (p.stalled >= 14) abandonProject(s, p.id);

    // Build on land we hold, sized to what we can actually fund.
    if (headroom > 400000) {
      for (const p of idle) {
        if (p.known.some((d) => FATAL.includes(d))) continue;
        const cap = maxBuildableSqFt(p, s);
        const candidates = Object.values(BUILD_TYPES)
          .filter((b) => b.minSqFt <= cap && (b.use === 'res' || (b.use === 'office' && s.stats.projectsDone > 2)));
        if (!candidates.length) continue;
        let best = null;
        for (const t of candidates) {
          // Search absolute phase sizes, not fractions: a big cheap parcel is developed
          // in phases, and phase one has to fit the money actually in the bank.
          for (const want of [cap, 120000, 60000, 30000, 18000, 12000, 8000, 5000, 3000]) {
            const sqFt = Math.min(cap, want);
            if (sqFt < t.minSqFt) continue;
            const est = estimateProject(p, t.id, sqFt, s);
            if ((committed + est.schedule.peak) * 0.45 > s.cash) continue;
            const profit = est.grossValue - est.budget;
            const roi = profit / est.schedule.peak;
            if (profit > 0 && (!best || roi > best.roi)) best = { t, sqFt, profit, roi, est };
            break;
          }
        }
        if (best) {
          const hold = s.stats.projectsDone > 3 && rng.chance(0.4);
          const r = launchProject(s, p.id, best.t.id, best.sqFt, hold ? 'hold' : 'sell');
          if (VERBOSE) console.log(`   ${dateLabel(s.month)} LAUNCH ${best.t.id} ${best.sqFt}sf peak ${money(best.est.schedule.peak)} profit ${money(best.profit)} -> ${r.ok ? 'ok' : r.msg}`);
          if (r.ok) break;
        } else if (VERBOSE && idle.length) console.log(`   ${dateLabel(s.month)} nothing fundable on ${p.label} (cap ${cap}, cash ${money(s.cash)})`);
      }
    }

    // Buy land when we have spare capital beyond our commitments.
    if (headroom > 800000 && idle.length < 3 && rng.chance(0.5)) {
      const cands = s.offers.filter((o) => o.kind === 'land' && o.price * 1.16 < headroom * 0.6);
      if (cands.length) {
        // Prefer the best value per square yard against market.
        const scored = cands.map((o) => ({ o, v: landRate(o.locality, s.month, s) / o.askRate }));
        scored.sort((a, b) => b.v - a.v);
        const o = scored[0].o;
        doDueDiligence(s, o, o.price > 2000000 ? 'deep' : 'standard');
        if (!o.known.some((d) => FATAL.includes(d))) buyLand(s, o);
      }
    }

    // Borrow against land once there is a track record.
    if (s.cash < committed * 0.35 && s.stats.projectsDone >= 1 && rng.chance(0.3)) {
      const col = s.parcels.filter((p) => p.owned && !p.pledged).map((p) => p.id);
      if (col.length) applyForLoan(s, s.stats.projectsDone >= 3 ? 'hdfcL' : 'sbh', Math.round(committed), col);
    }

    // Staff up as the load grows.
    if (s.stress > 60 && s.cash > 1500000) {
      if (!s.staff.some((x) => x.impact === 'construction')) hire(s, 'engineer');
      else if (!s.staff.some((x) => x.impact === 'legal') && s.netWorth > 2e7) hire(s, 'legal');
      else if (!s.staff.some((x) => x.impact === 'sales') && s.netWorth > 2e7) hire(s, 'salesManager');
      else if (!s.staff.some((x) => x.impact === 'approvals') && s.netWorth > 5e7) hire(s, 'liaison');
      else if (!s.staff.some((x) => x.role === 'coo') && s.netWorth > 3e8) hire(s, 'coo');
    }

    advanceMonth(s);
    if (VERBOSE && s.month % 24 === 0) {
      console.log(`   ${dateLabel(s.month)}  cash ${money(s.cash)}  nw ${money(s.netWorth)}  debt ${money(s.debt)}  live ${s.projects.filter((p) => !p.done).length}  done ${s.stats.projectsDone}  assets ${s.assets.length}`);
    }
  }
  return s;
}

const results = [];
for (let i = 0; i < RUNS; i++) {
  const s = play(`calib-${i}`);
  results.push(s);
  console.log(
    `run ${i}: ${dateLabel(s.month)} (${s.overReason || 'running'})  ` +
    `nw ${money(s.netWorth)} / ${usd(s.netWorth, s.macro.usd)}  ` +
    `debt ${money(s.debt)}  built ${s.stats.projectsDone}  rental ${s.assets.length} (${money(s.ratios.noi)} NOI)  ` +
    `rep ${Math.round(s.reputation)}  staff ${s.staff.length}`,
  );
}
const survived = results.filter((s) => s.overReason === 'time');
console.log(`\nsurvived to 2020: ${survived.length}/${RUNS}`);
if (survived.length) {
  const nws = survived.map((s) => s.netWorth).sort((a, b) => a - b);
  console.log(`net worth range: ${money(nws[0])} — ${money(nws[nws.length - 1])} (median ${money(nws[Math.floor(nws.length / 2)])})`);
}
