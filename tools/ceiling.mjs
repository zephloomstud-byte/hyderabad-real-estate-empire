// What does the game actually permit at maximum scale, and how does that compare with
// the firms it puts on screen as competitors?
import { startGame, refresh, estimateProject, maxBuildableSqFt, landRate, salePrice } from '../src/sim/engine.js';
import { makeLandOffer } from '../src/sim/market.js';
import { makeRng } from '../src/core/rng.js';
import { money } from '../src/core/util.js';
import { BUILD_TYPES } from '../src/data/costs.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const s = startGame('ceiling', { cash: 1e11 });   // effectively unlimited money
const rng = makeRng(5);

console.log('LARGEST PARCEL THE DEAL DESK WILL EVER OFFER (1000 samples per era)');
for (const [lbl, m] of [['1995', 0], ['2007', 150], ['2020', 302], ['2040', 542]]) {
  s.month = m; refresh(s);
  let max = 0, maxLabel = '';
  for (let i = 0; i < 1000; i++) {
    const o = makeLandOffer(m, s, rng, { big: true });
    if (o.areaSqYd > max) { max = o.areaSqYd; maxLabel = o.label; }
  }
  console.log(`  ${lbl}: ${(max / 4840).toFixed(1)} acres  (${maxLabel})`);
}

console.log('\nLARGEST SINGLE PROJECT POSSIBLE ON THAT LAND');
s.month = 302; refresh(s);
const parcel = { id: 'X', owned: true, locality: 'kokapet', areaSqYd: 24 * 4840, allInCost: 0, known: [], defects: [] };
const cap = maxBuildableSqFt(parcel, s);
const est = estimateProject(parcel, 'premium', cap, s);
console.log(`  24 acres at Kokapet, 2020 -> ${(cap / 1e6).toFixed(2)} million sq ft`);
console.log(`  budget ${money(est.budget)}  gross value ${money(est.grossValue)}  profit ${money(est.grossValue - est.budget)}`);

console.log('\nREAL COMPARABLES (the firms this game names as your competitors)');
console.log('  My Home Group      ~30 million sq ft delivered; founder a dollar billionaire');
console.log('  Ramky              founded 1994 alongside you; grew into infrastructure at scale');
console.log('  DLF                land bank bought cheap, then a 2007 listing');
console.log('  Embassy            office portfolio, then India\'s first REIT in 2019');
console.log('\nA best-case run in this game delivers about 1 million sq ft over 25 years.');
