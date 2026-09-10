// Build a realistic late-game save that includes plotted layouts, so the interface can
// be exercised against the kind of state a real player actually reaches.
import { startGame, refresh, advanceMonth, resolveEvent, buyLand, doDueDiligence,
  launchProject, maxBuildableSqFt, estimateProject, estimateLayout, remainingCommitments,
  landRate, freeSqYd, hire, applyForLoan } from '../src/sim/engine.js';
import { money, dateLabel } from '../src/core/util.js';
import { makeRng } from '../src/core/rng.js';
import { BUILD_TYPES, LAYOUT_TYPES } from '../src/data/costs.js';
import { writeFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const BAD = ['ASSIGNED_LAND', 'GOVT_CLAIM'];
const s = startGame('bigsave', { cash: 2500000, name: 'Ravi', firmName: 'Sri Lakshmi Constructions' });
const rng = makeRng(4242);
let layouts = 0;

while (!s.over && s.month < 303) {
  if (s.pendingEvent) { const l = s.pendingEvent.choices.map((c,i)=>({c,i})).filter(x=>!x.c.illegal);
    resolveEvent(s, (s.cash > 3e6 ? l[0] : l[Math.min(1,l.length-1)]).i); continue; }

  const committed = remainingCommitments(s);
  const idle = s.parcels.filter(p => p.owned && !p.consumed && freeSqYd(p) > 500);

  for (const p of idle) {
    // Prefer a layout on anything big; otherwise build.
    const site = freeSqYd(p);
    let launched = false;
    for (const lt of Object.values(LAYOUT_TYPES)) {
      if (site < lt.minAcres * 4840) continue;
      const e = estimateLayout(p, lt.id, Math.floor(site), s);
      if ((committed + e.schedule.peak) * 0.32 > s.cash) continue;
      if (e.grossValue > e.budget * 1.25) {
        if (launchProject(s, p.id, lt.id, Math.floor(site), 'sell').ok) { layouts++; launched = true; }
        break;
      }
    }
    if (launched) break;
    const cap = maxBuildableSqFt(p, s);
    for (const t of Object.values(BUILD_TYPES)) {
      if (t.minSqFt > cap) continue;
      for (const want of [cap, 60000, 30000, 15000, 8000, 4000]) {
        const sq = Math.min(cap, want); if (sq < t.minSqFt) continue;
        const e = estimateProject(p, t.id, sq, s);
        if ((committed + e.schedule.peak) * 0.32 > s.cash) continue;
        if (e.grossValue > e.budget * 1.2) {
          launchProject(s, p.id, t.id, sq, s.stats.projectsDone > 4 && rng.chance(0.35) ? 'hold' : 'sell');
          launched = true;
        }
        break;
      }
      if (launched) break;
    }
    if (launched) break;
  }

  if (s.cash > committed * 0.6 + 2e6 && idle.length < 3 && rng.chance(0.5)) {
    const c = s.offers.filter(o => o.kind === 'land' && o.price * 1.16 < (s.cash - committed * 0.4) * 0.5);
    if (c.length) { const o = rng.pick(c); doDueDiligence(s, o, 'standard');
      if (!o.known.some(d => BAD.includes(d))) buyLand(s, o); }
  }
  if (s.stress > 55 && s.cash > 3e6) {
    const want = ['engineer','accountant','salesManager','legal','liaison','propertyManager','seniorEngineer']
      .find(r => !s.staff.some(x => x.role === r));
    if (want) hire(s, want);
  }
  advanceMonth(s);
}

writeFileSync('dist/bigsave.json', JSON.stringify(s));
console.log(`end ${dateLabel(s.month)} (${s.overReason})  net worth ${money(s.netWorth)}`);
console.log(`layouts launched ${layouts} | projects ${s.projects.length} | inventory ${s.inventory.length} | assets ${s.assets.length} | loans ${s.loans.length} | parcels ${s.parcels.length}`);
console.log('inventory kinds:', s.inventory.map(i => `${i.type}${i.isLayout?'(layout)':''}`).join(', ') || 'none');
console.log('project kinds:', s.projects.map(p => `${p.type}${p.isLayout?'(layout)':''}`).slice(0,12).join(', ') || 'none');
