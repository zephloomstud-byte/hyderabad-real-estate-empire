// Unit-economics check: what does one clean project actually earn, in several eras?
import { newGame } from '../src/sim/state.js';
import { refresh, estimateProject, landRate, salePrice, dutyRate, costIndex, advanceMonth } from '../src/sim/engine.js';
import { money, pct, dateLabel } from '../src/core/util.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const cases = [
  { m: 0,   loc: 'kukatpally', type: 'standard', yd: 400 },
  { m: 0,   loc: 'banjara',    type: 'premium',  yd: 600 },
  { m: 0,   loc: 'madhapur',   type: 'economy',  yd: 2000 },
  { m: 120, loc: 'kukatpally', type: 'standard', yd: 400 },
  { m: 140, loc: 'gachibowli', type: 'premium',  yd: 2000 },
  { m: 250, loc: 'kokapet',    type: 'villa',    yd: 6000 },
];
for (const c of cases) {
  const s = newGame('econ', { cash: 1e12 });
  s.month = c.m; refresh(s);
  const parcel = { id: 'X', owned: true, locality: c.loc, areaSqYd: c.yd, allInCost: 0, known: [], defects: [] };
  const cap = Math.floor(c.yd * 9 * (s.flags.AIRPORT_LIVE ? 1 : 1) * 1);
  const { farFor } = await import('../src/sim/market.js');
  const { BY_ID } = await import('../src/data/geo.js');
  const far = farFor(BY_ID[c.loc], c.m, s.flags);
  const sqFt = Math.floor(c.yd * 9 * far * 0.92);
  const est = estimateProject(parcel, c.type, sqFt, s);
  const land = landRate(c.loc, c.m, s) * c.yd;
  const landAllIn = land * (1 + dutyRate(c.m));
  const total = est.budget + landAllIn;
  const gross = est.grossValue;
  console.log(
    `${dateLabel(c.m).padEnd(9)} ${c.loc.padEnd(12)} ${c.type.padEnd(9)} ${String(sqFt).padStart(7)} sf  FAR ${far.toFixed(2)}  ` +
    `land ${money(landAllIn).padStart(10)}  build ${money(est.budget).padStart(10)}  total ${money(total).padStart(10)}  ` +
    `gross ${money(gross).padStart(10)}  margin ${pct((gross - total) / total).padStart(7)}  ` +
    `₹${Math.round(est.pricePerSqFt)}/sf vs cost ₹${Math.round(total / sqFt)}/sf`);
}
