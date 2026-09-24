// Can a competent player reach the scale the real firms reached? Buys land aggressively
// when cheap, builds at the largest fundable size, retains commercial, lists when ready.
import { startGame, refresh, advanceMonth, resolveEvent, continuePast2020, buyLand,
  doDueDiligence, launchProject, maxBuildableSqFt, estimateProject, remainingCommitments,
  freeSqYd, askBrokers, hire, goPublic, launchREIT, ipoReadiness, reitReadiness, equityRequirement as eq,
  signDevAgreement, availableLenders, applyForLoan,
  founderWealth, marketCap, landRate, quoteLRD, takeLRD, lrdAvailable } from '../src/sim/engine.js';
import { money, usd, dateLabel } from '../src/core/util.js';
import { makeRng } from '../src/core/rng.js';
import { BUILD_TYPES } from '../src/data/costs.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const BAD = ['ASSIGNED_LAND', 'GOVT_CLAIM', 'WAKF_CLAIM'];

function play(seed) {
  const s = startGame(seed, { cash: 2500000, firmName: 'Test Group' });
  const rng = makeRng(seed.length * 977);
  let listedAt = null, reitAt = null;
  const block = { noLand: 0, gate: 0, roi: 0, built: 0, landTooDear: 0, noOffers: 0, jda: 0, jdaDear: 0 };

  while (true) {
    if (s.over) { if (!continuePast2020(s).ok) break; }
    if (s.pendingEvent) {
      const l = s.pendingEvent.choices.map((c, i) => ({ c, i })).filter((x) => !x.c.illegal);
      resolveEvent(s, (s.cash > 2e7 ? l[0] : l[Math.min(1, l.length - 1)]).i);
      continue;
    }
    const committed = remainingCommitments(s);
    let free = s.cash - committed * 0.35;

    // A developer arranges construction finance before he breaks ground; he does not wait
    // until he has the whole job in cash. Pledge land and draw against it.
    if (s.ratios.debtToAssets < 0.45 && s.cash < committed * 0.5 && rng.chance(0.5)) {
      const pledgeable = s.parcels.filter((p) => p.owned && !p.consumed && !p.pledged && !p.isDev);
      if (pledgeable.length) {
        const coll = pledgeable.reduce((t, p) => t + landRate(p.locality, s.month, s) * p.areaSqYd, 0);
        const want = Math.min(coll * 0.45, Math.max(0, committed * 0.6 - s.cash));
        if (want > 5e5) {
          for (const l of availableLenders(s).filter((x) => x.kind !== 'private')) {
            if (applyForLoan(s, l.id, want, pledgeable.map((p) => p.id)).ok) break;
          }
        }
      }
    }
    free = s.cash - committed * 0.35;

    // Build at the largest size the money allows, retaining commercial once established.
    if (free > 0) {
      for (const p of s.parcels.filter((x) => x.owned && !x.consumed && freeSqYd(x) > 400)) {
        if (p.known.some((d) => BAD.includes(d))) continue;
        const cap = maxBuildableSqFt(p, s);
        let best = null;
        for (const t of Object.values(BUILD_TYPES)) {
          if (t.minSqFt > cap) continue;
          for (const want of [cap, 1200000, 600000, 250000, 100000, 40000, 15000, 6000].filter((w, i, a) => a.indexOf(w) === i)) {
            const sq = Math.min(cap, want);
            if (sq < t.minSqFt) continue;
            const e = estimateProject(p, t.id, sq, s);
            if ((committed + e.schedule.peak) * eq(s) > s.cash) { block.gate++; continue; }
            const roi = (e.grossValue - e.budget) / e.schedule.peak;
            if (roi > 0.2 && (!best || roi > best.roi)) best = { t, sq, roi }; else block.roi++;
            break;
          }
        }
        if (best) {
          const hold = best.t.use !== 'res' && s.stats.projectsDone > 4;
          if (launchProject(s, p.id, best.t.id, best.sq, hold ? 'hold' : 'sell').ok) { block.built++; break; }
        }
      }
    }
    // Take every joint development the advance allows: the land is free, so the money
    // goes into construction instead of a sale deed. This is the scaling route.
    for (const o of s.offers.filter((x) => x.kind === 'devagreement')) {
      if ((o.advance || 0) > free * 0.3) { block.jdaDear++; continue; }
      doDueDiligence(s, o, 'standard');
      if (o.known.some((d) => BAD.includes(d))) continue;
      if (signDevAgreement(s, o).ok) block.jda++;
    }
    // Keep buying land, harder when it is cheap.
    if (free > 2e6 && rng.chance(s.macro.demand < 0.9 ? 0.7 : 0.4)) {
      if (rng.chance(0.3)) askBrokers(s, 'acreage');
      const c = s.offers.filter((o) => o.kind === 'land' && o.price * 1.16 < free * 0.55);
      if (!c.length) block.landTooDear++;
      if (c.length) {
        const o = c.sort((a, b) => b.areaSqYd - a.areaSqYd)[0];
        doDueDiligence(s, o, 'standard');
        if (!o.known.some((d) => BAD.includes(d))) buyLand(s, o);
      }
    }
    // Recycle capital out of let buildings.
    if (lrdAvailable(s) && rng.chance(0.25)) {
      for (const a of s.assets.filter((x) => !x.pledged && x.use !== 'res')) {
        const q = quoteLRD(s, a.id);
        if (q && q.eligible && q.amount > 1e7) { takeLRD(s, a.id, q.amount); break; }
      }
    }
    if (s.stress > 50 && s.cash > 5e6) {
      const want = ['engineer', 'accountant', 'salesManager', 'legal', 'liaison', 'seniorEngineer',
        'propertyManager', 'financeManager', 'coo', 'cfo', 'audit'].find((r) => !s.staff.some((x) => x.role === r));
      if (want) hire(s, want);
    }
    if (!s.flags.cleanBooks && s.netWorth > 2e8 && rng.chance(0.15)) s.flags.cleanBooks = true;
    if (!s.listed && ipoReadiness(s).ready && s.macro.demand > 1.02) { goPublic(s); listedAt = s.month; }
    if (!s.reitListed && reitReadiness(s).ready) { launchREIT(s); reitAt = s.month; }

    advanceMonth(s);
  }
  return { s, listedAt, reitAt, block };
}

console.log('seed   ended      founder wealth            listed      REIT     built');
let best = 0; const all = [];
for (let i = 0; i < 16; i++) {
  const { s, listedAt, reitAt, block } = play(`bn-${i}`);
  const w = founderWealth(s);
  const d = w / s.macro.usd; all.push(d); best = Math.max(best, d);
  console.log(`bn-${i}   ${dateLabel(s.month).padEnd(9)}  ${money(w).padStart(11)} / ${usd(w, s.macro.usd).padStart(8)}   ` +
    `${(listedAt ? dateLabel(listedAt) : '—').padEnd(10)}  ${(reitAt ? dateLabel(reitAt) : '—').padEnd(8)} ` +
    `${(s.stats.sqftBuilt / 1e6).toFixed(1)}m sq ft  ${s.overReason}`);
  if (i === 5) {
    console.log(`    projects completed ${s.stats.projectsDone}, net worth ${money(s.netWorth)}, clean books ${!!s.flags.cleanBooks}, rep ${Math.round(s.reputation)}`);
    console.log('    IPO blocked by: ' + (ipoReadiness(s).reasons.join(' | ') || 'nothing'));
    console.log('    REIT blocked by: ' + (reitReadiness(s).reasons.join(' | ') || 'nothing'));
  }
  if (i === 2) {
    console.log(`    blockers on the best run: projects launched ${block.built}, blocked by the funding gate ${block.gate}, ` +
      `months with no affordable land ${block.landTooDear}`);
    console.log(`    joint developments signed ${block.jda} (advance unaffordable ${block.jdaDear})`);
    const big = s.parcels.filter((p) => p.areaSqYd > 50 * 4840).length;
    console.log(`    parcels over 50 acres ever held: ${big}; largest project launched: ${Math.round(Math.max(0, ...s.projects.map((p) => p.sqFt)) / 1000)}k sq ft`);
  }
}
const sorted = all.slice().sort((a, b) => a - b);
const pct = (q) => sorted[Math.floor((sorted.length - 1) * q)];
console.log(`
${all.length} runs - bust ${all.filter((x) => x <= 0).length}, median $${(pct(0.5) / 1e6).toFixed(0)}M, `
  + `top quartile $${(pct(0.75) / 1e6).toFixed(0)}M, best $${(best / 1e9).toFixed(2)}B, `
  + `billionaires ${all.filter((x) => x >= 1e9).length}`);
