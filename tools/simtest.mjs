// Headless smoke test: run several full 1995-2020 playthroughs with a crude
// auto-player, so engine crashes and absurd numbers surface before the browser does.
// `node tools/simtest.mjs [runs]`

import { newGame } from '../src/sim/state.js';
import {
  refresh, advanceMonth, resolveEvent, buyLand, doDueDiligence, launchProject,
  applyForLoan, marketView, maxBuildableSqFt, estimateProject, hire, signDevAgreement,
} from '../src/sim/engine.js';
import { money, usd, pct, dateLabel, END_MONTH } from '../src/core/util.js';
import { makeRng } from '../src/core/rng.js';
import { BUILD_TYPES } from '../src/data/costs.js';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const RUNS = Number(process.argv[2]) || 5;
let failures = 0;

for (let run = 0; run < RUNS; run++) {
  const seed = `test-${run}`;
  const s = newGame(seed, { cash: 2500000, name: 'Test', firmName: 'Test Constructions' });
  refresh(s);
  const rng = makeRng(1234 + run * 77);
  let crashed = null;

  try {
    while (!s.over && s.month < END_MONTH) {
      if (s.pendingEvent) {
        resolveEvent(s, rng.int(0, s.pendingEvent.choices.length - 1));
        continue;
      }

      // Crude strategy: buy an affordable clean-looking parcel, build on idle land,
      // borrow when short, hire when stressed.
      if (rng.chance(0.35)) {
        const affordable = s.offers.filter((o) => o.kind === 'land' && (o.price * 1.2) < s.cash * 0.6);
        if (affordable.length) {
          const o = rng.pick(affordable);
          doDueDiligence(s, o, 'standard');
          const fatal = o.known.some((d) => ['ASSIGNED_LAND', 'WAKF_CLAIM', 'GOVT_CLAIM'].includes(d));
          if (!fatal) buyLand(s, o);
        }
      }
      if (rng.chance(0.4)) {
        const idle = s.parcels.filter((p) => p.owned && !p.usedBy && !p.consumed && !p.known.some((d) => d === 'ASSIGNED_LAND'));
        if (idle.length) {
          const p = rng.pick(idle);
          const cap = maxBuildableSqFt(p, s);
          const types = Object.values(BUILD_TYPES).filter((b) => b.minSqFt <= cap);
          if (types.length) {
            const t = rng.pick(types);
            const sqFt = Math.max(t.minSqFt, Math.floor(cap * 0.85));
            launchProject(s, p.id, t.id, sqFt, rng.chance(0.4) ? 'hold' : 'sell');
          }
        }
      }
      if (s.cash < 300000 && rng.chance(0.25)) {
        const col = s.parcels.filter((p) => p.owned && !p.pledged).map((p) => p.id);
        applyForLoan(s, 'sbh', 1500000, col);
      }
      if (s.stress > 70 && s.staff.length < 6 && rng.chance(0.2)) hire(s, 'engineer');

      advanceMonth(s);

      // Invariants.
      if (!Number.isFinite(s.cash)) throw new Error(`cash is ${s.cash} at ${dateLabel(s.month)}`);
      if (!Number.isFinite(s.netWorth)) throw new Error(`netWorth is ${s.netWorth} at ${dateLabel(s.month)}`);
      if (!Number.isFinite(s.bs.assets)) throw new Error(`assets NaN at ${dateLabel(s.month)}`);
      for (const p of s.projects) if (!Number.isFinite(p.spent)) throw new Error(`project spend NaN: ${p.name}`);
    }
  } catch (e) {
    crashed = e;
    failures++;
  }

  const nw = s.netWorth;
  console.log(
    `run ${run}  ${crashed ? 'CRASH: ' + crashed.message : 'ok  '}` +
    `  end=${dateLabel(s.month)} (${s.overReason || 'running'})` +
    `  nw=${money(nw)} ${usd(nw, s.macro.usd)}` +
    `  debt=${money(s.debt)}  projects=${s.stats.projectsDone}` +
    `  assets=${s.assets.length}  rep=${Math.round(s.reputation)}` +
    `  news=${s.news.length}`,
  );
  if (crashed) console.log(crashed.stack.split('\n').slice(0, 4).join('\n'));
}

console.log(failures ? `\n${failures}/${RUNS} runs crashed.` : `\nAll ${RUNS} runs completed clean.`);
process.exit(failures ? 1 : 0);
