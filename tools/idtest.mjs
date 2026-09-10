// Regression tests for identifier handling.
//
// These exist because a lost backslash in a template-literal regex made reseedIds match
// nothing, so every sequence reseeded to zero and the duplicate repair handed each
// duplicate back its own id while reporting success. It was invisible from the outside:
// the counter said "repaired", the save stayed broken, and a player's land bank kept
// insisting that four acres had nothing left to build on.
import { startGame, refresh } from '../src/sim/engine.js';
import { idNumber, reseedIds, repairDuplicateIds, findDuplicateIds, nextId } from '../src/sim/state.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

let failed = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
};

check('idNumber reads a plain id', idNumber('PL12', 'PL'), 12);
check('idNumber rejects a foreign prefix', idNumber('PL12', 'A'), 0);
check('a short prefix does not swallow a long one', idNumber('PL12', 'P'), 0);
check('idNumber tolerates rubbish', [idNumber(null, 'PL'), idNumber('PL', 'PL'), idNumber('PLx', 'PL')], [0, 0, 0]);

const s = { seq: {}, parcels: [{ id: 'PL1' }, { id: 'PL7' }], projects: [], assets: [], loans: [], staff: [], offers: [], jvs: [] };
reseedIds(s);
check('reseedIds finds the highest id in use', s.seq.PL, 7);
check('nextId continues above it', nextId(s, 'PL'), 'PL8');

const dup = { seq: {}, parcels: [{ id: 'PL1', label: 'built out' }, { id: 'PL1', label: 'four acres' }], projects: [], assets: [], loans: [], staff: [], offers: [], jvs: [] };
reseedIds(dup);
const repaired = repairDuplicateIds(dup);
check('a duplicate is given a genuinely new id', repaired, ['PL1 -> PL2']);
check('the first holder keeps its id', dup.parcels.map((p) => p.id), ['PL1', 'PL2']);
check('no duplicates remain', findDuplicateIds(dup), []);

// End to end, through a JSON round trip exactly as localStorage does it.
const g = startGame('idtest', { cash: 5e8 });
g.parcels.push({ id: 'PL1', owned: true, locality: 'gachibowli', areaSqYd: 740, label: 'small', allInCost: 1, defects: [], known: [] });
g.parcels.push({ id: 'PL1', owned: true, locality: 'pocharam', areaSqYd: 18000, label: 'acreage', allInCost: 1, defects: [], known: [] });
delete g.idsRepaired;
delete g.seq;
const loaded = JSON.parse(JSON.stringify(g));
refresh(loaded);
check('refresh repairs a corrupted save on load', findDuplicateIds(loaded), []);
check('the acreage is addressable again',
  loaded.parcels.find((p) => p.id === loaded.parcels.find((x) => x.label === 'acreage').id).label, 'acreage');

console.log(failed ? `\n${failed} test(s) failed.` : '\nAll identifier tests pass.');
process.exit(failed ? 1 : 0);
