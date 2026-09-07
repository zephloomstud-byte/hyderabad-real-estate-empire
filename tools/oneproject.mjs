// Controlled test: buy one plot, build one building, sell it. No events, no other
// activity. Does a completed building actually make the player richer?
import { newGame } from '../src/sim/state.js';
import { refresh, advanceMonth, buyLand, launchProject, maxBuildableSqFt,
  estimateProject, landRate } from '../src/sim/engine.js';
import { money, dateLabel } from '../src/core/util.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const s = newGame('oneproject', { cash: 2500000 });
refresh(s);
// Silence events so we isolate the project economics.
const noEvents = () => { s.pendingEvent = null; };

// Hand-place a clean Kukatpally plot so the test is deterministic.
const offer = { id: 'X', kind: 'land', locality: 'kukatpally', areaSqYd: 400,
  label: '400 sq yd at Kukatpally', price: Math.round(landRate('kukatpally', 0, s) * 400),
  seller: 'Test', defects: [], known: [], desc: '' };
const buy = buyLand(s, offer);
console.log('bought:', money(offer.price), '+ duty  ->  all-in', money(buy.parcel.allInCost), ' cash', money(s.cash));

const parcel = buy.parcel;
const cap = maxBuildableSqFt(parcel, s);
const est = estimateProject(parcel, 'standard', cap, s);
console.log('project:', cap, 'sqft  budget', money(est.budget), ' peak', money(est.schedule.peak),
  ' gross value', money(est.grossValue), ' est profit', money(est.grossValue - est.budget - buy.parcel.allInCost));

const r = launchProject(s, parcel.id, 'standard', cap, 'sell');
if (!r.ok) { console.log('LAUNCH BLOCKED:', r.msg); process.exit(1); }

const startNW = s.netWorth, startCash = s.cash;
let completedAt = null;
for (let i = 0; i < 90 && !s.over; i++) {
  advanceMonth(s); noEvents();
  const p = s.projects[0];
  if (p.done && !completedAt) completedAt = s.month;
  if (s.month % 6 === 0 || (completedAt && s.month <= completedAt + 2)) {
    console.log(`${dateLabel(s.month).padEnd(9)} cash ${money(s.cash).padStart(10)}  nw ${money(s.netWorth).padStart(10)}` +
      `  wip ${money(s.bs.wip).padStart(9)}  inv ${money(s.bs.inventory).padStart(9)}` +
      `  advances ${money(s.bs.advances).padStart(9)}  land ${money(s.bs.land).padStart(9)}` +
      `  ${p.done ? 'DONE' : p.stage}`);
  }
  if (completedAt && s.inventory.length === 0 && s.month > completedAt) break;
}
console.log('---');
console.log('start   cash', money(startCash), ' net worth', money(startNW));
console.log('end     cash', money(s.cash), ' net worth', money(s.netWorth), ' at', dateLabel(s.month));
console.log('change  cash', money(s.cash - startCash, { sign: true }), ' net worth', money(s.netWorth - startNW, { sign: true }));
console.log('project spent', money(s.projects[0].spent), 'vs budget', money(s.projects[0].budget),
  ' overrun', Math.round(s.projects[0].overrunPct * 100) + '%', ' delay', Math.round(s.projects[0].delay), 'mo');
console.log('advances taken', money(s.projects[0].advances || 0), ' presold', Math.round(s.projects[0].presold || 0), 'of', s.projects[0].sqFt);
