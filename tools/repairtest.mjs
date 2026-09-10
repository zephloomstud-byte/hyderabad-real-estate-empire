// Reproduce a save corrupted the way a real one is: duplicate parcel ids where an early
// parcel is fully built out and a later one is untouched acreage. Then confirm the repair
// makes the acreage addressable again.
import { startGame, refresh, buyLand, launchProject, maxBuildableSqFt, freeSqYd } from '../src/sim/engine.js';
import { findDuplicateIds } from '../src/sim/state.js';
import { money } from '../src/core/util.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const s = startGame('repair', { cash: 5e8 });
const mk = (loc, area, label) => buyLand(s, {
  id: 'x', kind: 'land', locality: loc, areaSqYd: area, label,
  price: 100000, seller: 'T', defects: [], known: [], desc: '',
}).parcel;

const small = mk('kukatpally', 400, '400 sq yd at Kukatpally');
const acreage = mk('shamshabad', 21864, '4.52 acres at Shamshabad');

// Build out the small one entirely, then forge the collision a reload used to cause.
launchProject(s, small.id, 'standard', maxBuildableSqFt(small, s), 'sell');
acreage.id = small.id;

console.log('BEFORE REPAIR');
console.log('  duplicate ids:', findDuplicateIds(s));
const foundBefore = s.parcels.find((p) => p.id === acreage.id);
console.log(`  clicking Build on "${acreage.label}" resolves to: "${foundBefore.label}"`);
console.log(`  which reports ${freeSqYd(foundBefore)} sq yd free  -> ${maxBuildableSqFt(foundBefore, s)} sq ft buildable`);

// This is what happens on load now.
delete s.idsRepaired;
refresh(s);

console.log('\nAFTER REPAIR');
console.log('  duplicate ids:', findDuplicateIds(s).length ? findDuplicateIds(s) : 'none');
const fixed = s.parcels.find((p) => p.label === '4.52 acres at Shamshabad');
const foundAfter = s.parcels.find((p) => p.id === fixed.id);
console.log(`  ids now: ${s.parcels.map((p) => p.id + '=' + p.label.slice(0, 26)).join(' | ')}`);
console.log(`  clicking Build on "${fixed.label}" resolves to: "${foundAfter.label}"`);
console.log(`  which reports ${freeSqYd(foundAfter)} sq yd free  -> ${maxBuildableSqFt(foundAfter, s).toLocaleString('en-IN')} sq ft buildable`);
console.log(`  news: ${s.news[s.news.length - 1].head}`);
