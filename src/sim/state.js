// Game state: creation, serialisation, and the fixed cast of the world.

import { makeRng, hashSeed } from '../core/rng.js';
import { LOCALITIES } from '../data/geo.js';
import { initialIntel } from './intel.js';

export const SAVE_KEY = 'ree_hyd_save_v1';
export const SAVE_VERSION = 1;

export const FIRST_NAMES = [
  'Venkat', 'Ramesh', 'Srinivas', 'Prasad', 'Narayana', 'Krishna', 'Satyanarayana', 'Rajesh',
  'Anjaiah', 'Balaraju', 'Chandra', 'Damodar', 'Gopal', 'Hanumantha', 'Jagadish', 'Kishore',
  'Lakshman', 'Madhav', 'Narsimha', 'Prabhakar', 'Raghavendra', 'Sudhakar', 'Tirumala', 'Yadagiri',
  'Mohd Ghouse', 'Mohd Iqbal', 'Abdul Rahim', 'Syed Ahmed', 'Zafar', 'Farooq',
];
export const SURNAMES = [
  'Reddy', 'Rao', 'Naidu', 'Sharma', 'Goud', 'Yadav', 'Chary', 'Prasad', 'Raju', 'Murthy',
  'Shastri', 'Varma', 'Gupta', 'Agarwal', 'Jain', 'Khan', 'Ali', 'Hussain', 'Siddiqui',
];

export const COMPETITORS = [
  {
    id: 'myhome', name: 'My Home Group', real: true, from: 0, strength: 0.62, style: 'disciplined',
    desc: 'Founded 1981. Cement interests behind it, so their input costs are structurally lower than yours. Builds well, sells steadily, never over-leverages. The benchmark.',
  },
  {
    id: 'ncc', name: 'Nagarjuna Construction Co.', real: true, from: 0, strength: 0.75, style: 'contractor',
    desc: 'Serious civil contractor since 1978. Government work, industrial plants, large infrastructure. Not really your competitor yet — but if you ever build a contracting arm, they are what you are up against.',
  },
  {
    id: 'ramky', name: 'Ramky', real: true, from: 0, strength: 0.2, style: 'aggressive',
    desc: 'Founded last year, 1994. Tiny, hungry and run by an engineer your age who is not going to stay tiny.',
  },
  {
    id: 'srisai', name: 'Sri Sai Constructions', real: false, from: 0, strength: 0.3, style: 'reckless',
    desc: 'Bandaru Prasad Rao. Fourteen buildings in Kukatpally. Cheap flats, thin slabs, sells fast, funds each project from the last one’s advances. Generous, well-liked, and one bad quarter from collapse.',
  },
  {
    id: 'deccan', name: 'Deccan Estates', real: false, from: 0, strength: 0.45, style: 'connected',
    desc: 'Old Hyderabadi family sitting on Banjara Hills and Shaikpet land, half of it in urban land ceiling and Wakf litigation. Slow, grand, and extremely well connected in the Secretariat.',
  },
  {
    id: 'sujatha', name: 'Sujatha Housing', real: false, from: 0, strength: 0.28, style: 'quality',
    desc: 'A retired PWD engineer builds the best mid-market structures in the city and takes four years to finish a two-year building.',
  },
  {
    id: 'aparna', name: 'Aparna Constructions', real: true, from: 18, strength: 0.35, style: 'disciplined',
    desc: 'Formed in 1996. Engineering-led, quality-obsessed, and about to spend twenty years compounding quietly.',
  },
  {
    id: 'lanco', name: 'Lanco', real: true, from: 40, strength: 0.55, style: 'aggressive',
    desc: 'Infrastructure and power money moving into real estate. Deep pockets, political weight, and a taste for very large bets.',
  },
  {
    id: 'prestige', name: 'Prestige (Bangalore)', real: true, from: 130, strength: 0.7, style: 'institutional',
    desc: 'Bangalore’s biggest developer entering Hyderabad with institutional capital and a brand you cannot match on price.',
  },
  {
    id: 'phoenix', name: 'Phoenix / institutional entrants', real: true, from: 150, strength: 0.72, style: 'institutional',
    desc: 'Foreign and domestic institutional money buying finished, leased office assets at cap rates that make development look like hard work.',
  },
];

export const REL_KEYS = {
  banks: 'Banks',
  financiers: 'Private financiers',
  bureaucrats: 'Bureaucrats (HUDA / MCH)',
  politicians: 'Politicians',
  landowners: 'Landowners & farmers',
  contractors: 'Contractors & labour',
  investors: 'Investors',
  journalists: 'Journalists',
  associations: 'Builders’ associations',
  community: 'Local communities',
  family: 'Family',
};

export function newGame(seedText = String(Date.now()), opts = {}) {
  const seed = hashSeed(seedText);
  const rng = makeRng(seed);
  const startCash = opts.cash ?? 2500000;

  const s = {
    version: SAVE_VERSION,
    seedText, seed, rngState: rng.state,
    month: 0,
    over: false, overReason: null,
    tickCount: 0,

    founder: {
      name: opts.name || 'You',
      firmName: opts.firmName || null,
      age0: opts.age ?? 24,
      born: 1970,
    },
    cash: startCash,
    equityPaidIn: startCash,
    retained: 0,
    personalExpense: 4200,
    stress: 20,
    reputation: 2,

    skills: { realestate: 55, construction: 25, finance: 40, legal: 20, negotiation: 50 },
    relations: {
      banks: 22, financiers: 10, bureaucrats: 8, politicians: 12, landowners: 35,
      contractors: 40, investors: 5, journalists: 3, associations: 10, community: 20, family: 70,
    },

    parcels: [],       // land held or under negotiation
    projects: [],      // under approval / construction
    inventory: [],     // completed unsold units
    assets: [],        // completed and held for rent
    loans: [],
    staff: [],
    jvs: [],
    offers: [],        // live market opportunities
    subsidiaries: [],  // diversification arms

    news: [],
    ledger: [],
    yearbook: [],
    pendingEvent: null,
    eventCooldown: {},

    flags: {},
    intel: initialIntel(),
    stats: { projectsDone: 0, unitsSold: 0, sqftBuilt: 0, landBoughtSqYd: 0, defectsHit: 0, bribesTaken: 0 },
    soldUnits: 0,
    revenueYTD: 0, costYTD: 0, interestYTD: 0, opexYTD: 0, taxYTD: 0, noiYTD: 0,
    interestAnnual: 0,
    pendingRefund: 0,
    absorptionBoost: 0,
    materialSpike: 0,
    crashActive: false,
    safetySpend: false,
    infraBudget: 1.0,
    bizConfidence: 1.0,
    approvalSpeedMod: 1.0,

    competitors: COMPETITORS.filter((c) => c.from === 0).map((c) => ({ ...c, scale: c.strength })),

    // derived, recomputed each tick
    macro: {}, ratios: {}, netWorth: 0, debt: 0, assetValue: 0, avgQuality: 0.65,
  };

  // Opening loan: the jewel loan taken against the mother's gold in December 1994.
  s.loans.push({
    id: 'L0', lender: 'Andhra Bank (jewel loan)', kind: 'bank', principal: 200000,
    outstanding: 200000, rate: 0.16, tenure: 12, taken: -1, emi: emiFor(200000, 0.16, 12),
    secret: true, note: 'Against your mother’s gold. She thinks it is in the locker.',
  });

  s.news.push({
    m: 0, tag: 'PERSONAL', head: 'You begin',
    body: 'Twenty-five lakh rupees, a Bajaj Chetak, a commerce degree and a father who trusts you with money that was not entirely yours to take. Hyderabad, January 1995.',
  });

  return s;
}

export function emiFor(principal, annualRate, months) {
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

export function saveGame(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.version !== SAVE_VERSION) return null;
    return s;
  } catch (e) { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

export const ZONES = [...new Set(LOCALITIES.map((l) => l.zone))];

// ---------------------------------------------------------------- identity

/**
 * Identifiers must be unique for the life of a save, not the life of a page.
 *
 * These counters used to live in module scope, which meant they reset to zero on every
 * reload. A game reloaded after buying twelve parcels would mint the thirteenth as PL1,
 * colliding with the first — and every lookup by id thereafter found the wrong object.
 * The visible symptom was clicking Build on four acres of Shamshabad and being told the
 * parcel had nothing left, because the code was looking at a different, exhausted plot.
 *
 * Keeping the counters in the saved state fixes it for good: the sequence is part of the
 * game, not part of the session.
 */
/**
 * The numeric part of an id, or 0 if it does not belong to this prefix.
 *
 * Deliberately written without a regular expression built from a template literal: the
 * first version of this used `new RegExp(`^${prefix}(\d+)$`)`, and a lost backslash
 * turned the pattern into `^PL(d+)$`, which matches nothing. Every sequence therefore
 * reseeded to zero, the repair handed a duplicate back its own id, and the whole thing
 * reported success while fixing nothing at all.
 *
 * Note that a prefix must not swallow a longer one: 'P' against 'PL1' leaves 'L1', which
 * is not a number, so parcels are never mistaken for projects.
 */
export function idNumber(id, prefix) {
  const str = String(id == null ? '' : id);
  if (!str.startsWith(prefix)) return 0;
  const rest = str.slice(prefix.length);
  if (!rest.length) return 0;
  for (let i = 0; i < rest.length; i++) {
    const c = rest.charCodeAt(i);
    if (c < 48 || c > 57) return 0;
  }
  return Number(rest);
}

export function nextId(s, prefix) {
  if (!s.seq) s.seq = {};
  s.seq[prefix] = (s.seq[prefix] || 0) + 1;
  return `${prefix}${s.seq[prefix]}`;
}

/**
 * Repair a save written before the counters were persisted: set each sequence above the
 * highest id already in use, so nothing new can collide with anything old.
 */
export function reseedIds(s) {
  if (!s.seq) s.seq = {};
  const bump = (prefix, list) => {
    let max = s.seq[prefix] || 0;
    for (const item of list || []) max = Math.max(max, idNumber(item && item.id, prefix));
    s.seq[prefix] = max;
  };
  bump('PL', s.parcels);
  bump('P', s.projects);
  bump('A', s.assets);
  bump('L', s.loans);
  bump('S', s.staff);
  bump('O', s.offers);
  bump('JV', s.jvs);
  return s;
}

/**
 * Renumber anything that shares an id with something earlier in the same collection.
 *
 * Lifting the sequence above the highest id in use stops NEW collisions, but a save
 * written before that fix already contains them — two parcels both called PL3, so
 * clicking Build on the second finds the first, which may be fully built out. The
 * visible symptom is a land bank full of acreage where the game insists there is
 * nothing left.
 *
 * The first holder of an id keeps it, so existing cross-references (a project pointing
 * at its parcel, a facility pointing at its building) continue to resolve exactly as
 * they did. Every later duplicate gets a fresh id and becomes independently addressable,
 * which is what makes its buttons work again.
 */
export function repairDuplicateIds(s) {
  const repaired = [];
  const collections = [['PL', s.parcels], ['P', s.projects], ['A', s.assets],
    ['L', s.loans], ['S', s.staff], ['O', s.offers], ['JV', s.jvs]];
  for (const [prefix, list] of collections) {
    if (!Array.isArray(list)) continue;
    const seen = new Set();
    for (const item of list) {
      if (!item) continue;
      if (!item.id || seen.has(item.id)) {
        const old = item.id;
        item.id = nextId(s, prefix);
        repaired.push(`${old || '(missing)'} -> ${item.id}`);
      }
      seen.add(item.id);
    }
  }
  return repaired;
}

/**
 * Any two things sharing an id is a corrupted save. Report it rather than let the game
 * quietly operate on the wrong object.
 */
export function findDuplicateIds(s) {
  const dupes = [];
  for (const [name, list] of [['parcels', s.parcels], ['projects', s.projects],
    ['assets', s.assets], ['loans', s.loans], ['staff', s.staff], ['offers', s.offers]]) {
    const seen = new Set();
    for (const item of list || []) {
      if (!item || !item.id) continue;
      if (seen.has(item.id)) dupes.push(`${name}:${item.id}`);
      seen.add(item.id);
    }
  }
  return dupes;
}
