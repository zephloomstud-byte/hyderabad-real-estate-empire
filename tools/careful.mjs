// A deliberately conservative builder: one project at a time, sized well inside its
// means, always holding a cash reserve. If this strategy cannot compound over 25 years,
// the game is unwinnable and the model is wrong.
import { newGame } from '../src/sim/state.js';
import {
  refresh, advanceMonth, resolveEvent, buyLand, doDueDiligence, launchProject,
  maxBuildableSqFt, estimateProject, applyForLoan, hire, remainingCommitments, landRate,
  abandonProject,
} from '../src/sim/engine.js';
import { money, usd, dateLabel, pct } from '../src/core/util.js';
import { makeRng } from '../src/core/rng.js';
import { BUILD_TYPES } from '../src/data/costs.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const RUNS = Number(process.argv[2]) || 8;
const VERBOSE = process.argv.includes('--verbose');
const BAD = ['ASSIGNED_LAND', 'WAKF_CLAIM', 'GOVT_CLAIM', 'CATCHMENT_ZONE', 'CANTONMENT', 'DOUBLE_SALE'];

function play(seed) {
  const s = newGame(seed, { cash: 2500000, name: 'Careful', firmName: 'Careful Constructions' });
  refresh(s);
  const rng = makeRng(500 + seed.charCodeAt(seed.length - 1) * 13);

  while (!s.over && s.month < 303) {
    if (s.pendingEvent) {
      // A real player picks the responsible option when they can afford it and the
      // cheap one when they cannot. Choice 0 is usually the expensive, correct one.
      const legal = s.pendingEvent.choices.map((c, idx) => ({ c, idx })).filter((x) => !x.c.illegal);
      const pick = s.cash > 1500000 ? legal[0] : legal[Math.min(1, legal.length - 1)];
      resolveEvent(s, pick ? pick.idx : 0);
      continue;
    }
    const live = s.projects.filter((p) => !p.done);
    const idle = s.parcels.filter((p) => p.owned && !p.consumed && maxBuildableSqFt(p, s) >= 3000);
    const committed = remainingCommitments(s);
    const burn = s.staff.reduce((t, x) => t + x.salary, 0) + 30000 + s.loans.reduce((t, l) => t + l.emi, 0);
    const reserve = burn * 6;
    const free = s.cash - committed * 0.5 - reserve;

    for (const p of live) if (p.stalled >= 18) abandonProject(s, p.id);

    // Build only when comfortably funded, and never more than two at a time.
    if (live.length < (s.stats.projectsDone > 4 ? 3 : 1) && free > 0) {
      for (const p of idle) {
        if (p.known.some((d) => BAD.includes(d))) continue;
        const cap = maxBuildableSqFt(p, s);
        let best = null;
        for (const t of Object.values(BUILD_TYPES)) {
          if (t.minSqFt > cap) continue;
          if (t.use === 'office' && s.stats.projectsDone < 3) continue;
          if (t.use === 'retail' && s.stats.projectsDone < 6) continue;
          for (const want of [cap, 200000, 100000, 50000, 25000, 15000, 9000, 6000, 3500]) {
            const sqFt = Math.min(cap, want);
            if (sqFt < t.minSqFt) continue;
            const est = estimateProject(p, t.id, sqFt, s);
            // Two-thirds of peak funding in hand, over and above the reserve.
            if (est.schedule.peak * 0.45 > free) continue;
            const profit = est.grossValue - est.budget;
            const roi = profit / est.schedule.peak;
            if (roi > 0.18 && (!best || roi > best.roi)) best = { t, sqFt, roi, est };
            break;
          }
        }
        if (best) {
          const hold = s.stats.projectsDone >= 3 && best.t.use !== 'res' ? true
            : (s.stats.projectsDone >= 5 && rng.chance(0.35));
          const r = launchProject(s, p.id, best.t.id, best.sqFt, hold ? 'hold' : 'sell');
          if (r.ok) { if (VERBOSE) console.log(`   ${dateLabel(s.month)} build ${best.t.id} ${best.sqFt}sf peak ${money(best.est.schedule.peak)} roi ${pct(best.roi)} ${hold ? '[hold]' : ''}`); break; }
        }
      }
    }

    // Buy land only with genuinely spare money.
    if (idle.length < 2 && free > 1500000 && rng.chance(0.4)) {
      const cands = s.offers.filter((o) => o.kind === 'land' && o.price * 1.16 < free * 0.5);
      if (cands.length) {
        const o = cands.map((x) => ({ x, v: landRate(x.locality, s.month, s) / x.askRate }))
          .sort((a, b) => b.v - a.v)[0].x;
        doDueDiligence(s, o, o.price > 1500000 ? 'deep' : 'standard');
        if (!o.known.some((d) => BAD.includes(d))) buyLand(s, o);
      }
    }

    if (s.cash < committed * 0.3 && s.stats.projectsDone >= 1 && rng.chance(0.35)) {
      const col = s.parcels.filter((p) => p.owned && !p.pledged).map((p) => p.id)
        .concat(s.assets.filter((a) => !a.pledged).map((a) => a.id));
      if (col.length) applyForLoan(s, s.stats.projectsDone >= 3 ? 'hdfcL' : 'sbh', Math.round(committed * 0.6), col);
    }

    if (s.stress > 55 && s.cash > burn * 12) {
      const want = ['engineer', 'accountant', 'salesManager', 'legal', 'liaison', 'seniorEngineer', 'propertyManager']
        .find((r) => !s.staff.some((x) => x.role === r));
      if (want) hire(s, want);
    }

    advanceMonth(s);
    if (VERBOSE && s.month % 36 === 0) {
      console.log(`   ${dateLabel(s.month)} cash ${money(s.cash)} nw ${money(s.netWorth)} debt ${money(s.debt)} done ${s.stats.projectsDone} assets ${s.assets.length} inv ${s.inventory.length} pay ${money(s.payables || 0)}`);
    }
  }
  return s;
}

const out = [];
for (let i = 0; i < RUNS; i++) {
  const s = play(`careful-${i}`);
  out.push(s);
  console.log(`run ${i}: ${dateLabel(s.month)} (${s.overReason || '-'})  nw ${money(s.netWorth)} / ${usd(s.netWorth, s.macro.usd)}  debt ${money(s.debt)}  built ${s.stats.projectsDone}  rental ${s.assets.length} ${money(s.ratios.noi)}  rep ${Math.round(s.reputation)}`);
}
const alive = out.filter((s) => s.overReason === 'time');
console.log(`\nsurvived to 2020: ${alive.length}/${RUNS}`);
if (alive.length) {
  const n = alive.map((s) => s.netWorth).sort((a, b) => a - b);
  console.log(`net worth: min ${money(n[0])}  median ${money(n[Math.floor(n.length / 2)])}  max ${money(n[n.length - 1])}`);
}
