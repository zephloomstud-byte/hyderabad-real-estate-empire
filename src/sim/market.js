// The market: what land costs, what rent it fetches, what building costs, what the
// player is allowed to know, and what deals walk through the door in a given month.

import { anchorAt, clamp, lerp, yearOf, SQYD_PER_ACRE } from '../core/util.js';
import { MACRO, SHOCKS, CPI_INDEX, regimeAt } from '../data/history.js';
import { LOCALITIES, BY_ID, RENT_TRACK, DEFECTS } from '../data/geo.js';
import { COST_TRACK, DUTY_TRACK, FAR_TRACK, FAR_AIRPORT, MATERIALS, WAGES, WAGE_TRACK,
  SALARY_TRACK, BUILD_TYPES, TAX_TRACK } from '../data/costs.js';
import { FIRST_NAMES, SURNAMES } from './state.js';

/** Blend the annual macro series into a monthly reading, applying month-keyed shocks. */
export function macroAt(m) {
  const y = yearOf(m);
  const cur = MACRO[y] || MACRO[2020];
  const nxt = MACRO[y + 1] || cur;
  const t = (m % 12) / 12;
  const blend = (k) => lerp(cur[k], nxt[k], t);
  const out = {
    year: y, cpi: cur.cpi, gdp: blend('gdp'), plr: blend('plr'),
    usd: blend('usd'), credit: blend('credit'), demand: blend('demand'),
    cpiIndex: lerp(CPI_INDEX[y], CPI_INDEX[y + 1] || CPI_INDEX[y] * 1.05, t),
    regime: regimeAt(m),
  };
  const shock = SHOCKS[m];
  if (shock) Object.assign(out, shock);
  return out;
}

export const costIndex = (m) => anchorAt(COST_TRACK, m);
export const dutyRate = (m) => anchorAt(DUTY_TRACK, m);
export const salaryIndex = (m) => anchorAt(SALARY_TRACK, m);
export const wageIndex = (m) => anchorAt(WAGE_TRACK, m);

export function farFor(loc, m, flags) {
  const base = anchorAt(FAR_TRACK, m);
  if (loc.airportCap && !flags.AIRPORT_LIVE) return Math.min(base, FAR_AIRPORT);
  return base;
}

/**
 * Land rate in rupees per square yard. The multiplier track carries the historical
 * shape; the demand cycle modulates it so a crash actually bites, and a small
 * deterministic wobble keeps every playthrough from producing identical numbers.
 */
export function landRate(locId, m, s) {
  const loc = BY_ID[locId];
  if (!loc) return 0;
  const base = loc.base * anchorAt(loc.track, m);
  const macro = s ? s.macro : macroAt(m);
  const yearAvgDemand = MACRO[yearOf(m)].demand;
  // Track anchors already embed the annual demand path, so only deviations count.
  const cycle = clamp(1 + (macro.demand - yearAvgDemand) * 0.55, 0.6, 1.4);
  const wobble = s ? 1 + Math.sin((m + locId.length * 7) * 0.7) * 0.018 : 1;
  return base * cycle * wobble;
}

/** Rent in rupees per square foot per month for a use in a locality. */
export function rentRate(locId, use, m, flags = {}) {
  const loc = BY_ID[locId];
  if (!loc) return 0;
  const b = loc.rentBase[use];
  if (!b) return 0;
  if (use === 'office' && loc.officeUnlock && !flags[loc.officeUnlock]) return 0;
  return b * anchorAt(RENT_TRACK[use], m);
}

/** Sale price of finished built area, rupees per square foot. */
export function salePrice(locId, buildType, m, s) {
  const loc = BY_ID[locId];
  const bt = BUILD_TYPES[buildType];
  const land = landRate(locId, m, s);
  const far = farFor(loc, m, s ? s.flags : {});
  // Land cost embedded in every built square foot, plus construction and soft cost,
  // plus the developer's margin. Locality prestige is deliberately NOT applied again
  // here: it is already fully expressed in the land rate, which is fifty times higher
  // in Banjara Hills than in Manikonda. Applying it twice crushed margins in cheap
  // localities and made peripheral development permanently unprofitable.
  const landPerSqFt = land / (9 * far);          // 1 sq yd = 9 sq ft
  const build = bt.cost * costIndex(m);          // already all-in
  const macro = s ? s.macro : macroAt(m);
  // Gross developer margin on total cost: a little under 40% in the flat mid-nineties,
  // near 85% at the peak of the 2006 mania, barely 15% through the Telangana agitation.
  // Interest, overheads, delays and tax all come out of this, which is why plenty of
  // builders who looked profitable on paper were not — but it has to be wide enough
  // that a well-run project beats leaving the money in a fixed deposit, or nobody
  // would ever have built anything.
  const margin = clamp(0.48 + (macro.demand - 1) * 0.50, -0.05, 0.95);
  const quality = 0.92 + bt.quality * 0.22;
  return (landPerSqFt + build) * (1 + margin) * quality;
}

/** Capitalisation rate used to value an income-producing asset. */
export function capRate(use, m, s) {
  const macro = s ? s.macro : macroAt(m);
  // Cap rates start high (12-14%) because money costs 16% and enforcement is weak,
  // and compress through the 2000s as institutional capital arrives.
  const base = anchorAt([
    { year: 1995, v: 0.135 }, { year: 2000, v: 0.125 }, { year: 2004, v: 0.115 },
    { year: 2007, v: 0.095 }, { year: 2009, v: 0.115 }, { year: 2013, v: 0.105 },
    { year: 2016, v: 0.090 }, { year: 2020, v: 0.078 },
  ], m);
  const useAdj = { office: 0, retail: 0.005, res: 0.02, industrial: 0.012 }[use] || 0;
  const cyc = (1 - macro.demand) * 0.02;
  return clamp(base + useAdj + cyc, 0.055, 0.19);
}

export function materialPrice(key, m) {
  const mat = MATERIALS[key];
  return mat.base * anchorAt(mat.track, m);
}

export function wage(key, m) { return WAGES[key] * wageIndex(m); }

export function taxRate(kind, m) { return anchorAt(TAX_TRACK[kind], m); }

/** What the player is allowed to see about a locality at this date. */
export function marketView(m, s) {
  return LOCALITIES.map((loc) => {
    const rate = landRate(loc.id, m, s);
    const prev = m >= 12 ? landRate(loc.id, m - 12, s) : rate;
    const known = loc.zone === 'core' || loc.tags.includes('residential') ||
      s.flags.HITEC_ANNOUNCE || m > 60 || s.skills.realestate > 70;
    return {
      id: loc.id, name: loc.name, zone: loc.zone, rate, yoy: rate / prev - 1,
      perAcre: rate * SQYD_PER_ACRE,
      resRent: rentRate(loc.id, 'res', m, s.flags),
      officeRent: rentRate(loc.id, 'office', m, s.flags),
      retailRent: rentRate(loc.id, 'retail', m, s.flags),
      far: farFor(loc, m, s.flags),
      liquidity: loc.liquidity, prestige: loc.prestige, desc: loc.desc,
      tags: loc.tags, obscure: !known,
    };
  });
}

// ---------------------------------------------------------------------------- offers

let offerSeq = 1000;
const nextId = () => `O${++offerSeq}`;

function personName(rng) {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`;
}

/** Roll hidden title defects for a parcel based on locality risk profile. */
export function rollDefects(loc, rng, discountPressure = 0) {
  const out = [];
  for (const [key, p] of Object.entries(loc.risk || {})) {
    // A seller pushing an unusually cheap price is more likely to be hiding something.
    if (rng.f() < p * (1 + discountPressure * 1.4)) out.push(key);
  }
  return out;
}

/**
 * Generate a land offer. Offers carry a visible asking price and invisible problems.
 * The discount from fair value is correlated with how bad the hidden problems are,
 * which is exactly how the real market prices risk it will not disclose.
 */
export function makeLandOffer(m, s, rng, opts = {}) {
  const pool = opts.locality
    ? [BY_ID[opts.locality]]
    : LOCALITIES.filter((l) => {
      if (opts.zone && l.zone !== opts.zone) return false;
      // Cheap far-flung land only shows up if the player has been looking that way.
      if (l.tags.includes('far') && s.skills.realestate < 60 && rng.chance(0.6)) return false;
      return true;
    });
  const loc = rng.pick(pool);
  const rate = landRate(loc.id, m, s);

  const isAgri = loc.tags.includes('agri') || loc.tags.includes('far');
  let areaSqYd;
  if (isAgri) areaSqYd = Math.round(SQYD_PER_ACRE * rng.range(1, opts.big ? 24 : 6));
  else if (loc.zone === 'core') areaSqYd = Math.round(rng.range(200, opts.big ? 3000 : 900) / 10) * 10;
  else areaSqYd = Math.round(rng.range(300, opts.big ? 12000 : 2400) / 10) * 10;

  // Seller motivation drives the discount and, separately, the defect load.
  const motive = rng.weighted([
    ['partition', 3], ['medical', 2], ['relocating', 2], ['court case', 2],
    ['daughter’s marriage', 2], ['business loss', 2], ['no reason given', 3],
  ]);
  const urgency = rng.range(0, 1);
  const baseDiscount = opts.distress ? rng.range(0.20, 0.42) : rng.range(-0.12, 0.22) * (0.5 + urgency);
  const defects = rollDefects(loc, rng, Math.max(0, baseDiscount));
  const defectPressure = defects.reduce((a, d) => a + DEFECTS[d].severity, 0);
  const discount = clamp(baseDiscount + defectPressure * 0.10, -0.15, 0.62);

  const askRate = Math.round(rate * (1 - discount));
  const price = askRate * areaSqYd;

  return {
    id: nextId(), kind: 'land', locality: loc.id, localityName: loc.name,
    areaSqYd, askRate, price, seller: personName(rng), motive,
    createdAt: m, expiresAt: m + rng.int(2, 6),
    defects, known: [], ddDone: 0, ddSpend: 0,
    negotiated: false, floor: Math.round(price * rng.range(0.80, 0.96)),
    label: `${areaSqYd >= SQYD_PER_ACRE ? (areaSqYd / SQYD_PER_ACRE).toFixed(2) + ' acres' : areaSqYd + ' sq yd'} at ${loc.name}`,
    desc: loc.desc,
  };
}

/** Development agreement: no land cost, a share of the built area to the owner. */
export function makeDevAgreement(m, s, rng) {
  const pool = LOCALITIES.filter((l) => ['core', 'northwest', 'east'].includes(l.zone));
  const loc = rng.pick(pool);
  const areaSqYd = Math.round(rng.range(400, 2200) / 10) * 10;
  const ownerShare = rng.range(0.32, 0.48);
  const defects = rollDefects(loc, rng, 0.1);
  return {
    id: nextId(), kind: 'devagreement', locality: loc.id, localityName: loc.name,
    areaSqYd, ownerShare: Math.round(ownerShare * 100) / 100,
    price: 0, seller: personName(rng),
    createdAt: m, expiresAt: m + rng.int(2, 5),
    defects, known: [], ddDone: 0, ddSpend: 0,
    advance: Math.round(landRate(loc.id, m, s) * areaSqYd * rng.range(0.04, 0.14) / 1000) * 1000,
    label: `Development agreement, ${areaSqYd} sq yd at ${loc.name}`,
    desc: loc.desc,
  };
}

/** A ready, income-producing building offered for sale. */
export function makeAssetOffer(m, s, rng) {
  const pool = LOCALITIES.filter((l) => l.rentBase.office || l.rentBase.retail);
  const loc = rng.pick(pool);
  const use = rng.weighted([['office', 3], ['retail', 2], ['res', 1], ['industrial', 2]]);
  const rate = rentRate(loc.id, use, m, s.flags);
  if (!rate) return null;
  const sqFt = Math.round(rng.range(4000, 45000) / 500) * 500;
  const occ = rng.range(0.45, 1.0);
  const noi = sqFt * rate * 12 * occ * 0.78;
  const cr = capRate(use, m, s) * rng.range(0.9, 1.3);
  const price = Math.round(noi / cr / 10000) * 10000;
  const defects = rollDefects(loc, rng, 0.05);
  return {
    id: nextId(), kind: 'asset', locality: loc.id, localityName: loc.name,
    use, sqFt, occupancy: occ, rentPerSqFt: rate, price, noi,
    seller: personName(rng), createdAt: m, expiresAt: m + rng.int(2, 5),
    defects, known: [], ddDone: 0, ddSpend: 0,
    label: `${sqFt.toLocaleString('en-IN')} sq ft ${use === 'res' ? 'residential' : use} building at ${loc.name}`,
    desc: loc.desc,
  };
}

/**
 * Due diligence. Money and time buy probability of discovering each defect. Legal skill
 * and a retained legal officer help. Nothing here is ever certain, which is the point.
 */
export function runDueDiligence(offer, spend, months, s, rng) {
  const legalSkill = s.skills.legal / 100;
  const staffBonus = s.staff.some((x) => x.impact === 'legal') ? 0.18 : 0;
  const intensity = clamp(spend / (Math.max(offer.price, 200000) * 0.012), 0, 3);
  const found = [];
  for (const d of offer.defects) {
    if (offer.known.includes(d)) continue;
    const dd = DEFECTS[d];
    const p = clamp(
      (0.30 + legalSkill * 0.45 + staffBonus + intensity * 0.22 + months * 0.06) * (1 - dd.ddDifficulty),
      0.05, 0.95,
    );
    if (rng.f() < p) { offer.known.push(d); found.push(d); }
  }
  offer.ddDone += months;
  offer.ddSpend += spend;
  // A clean report is not proof of a clean title; it just means you did not find anything.
  offer.ddConfidence = clamp(0.25 + legalSkill * 0.4 + staffBonus + intensity * 0.2 + months * 0.05, 0.2, 0.92);
  return found;
}

/** Monthly absorption: what fraction of unsold stock finds a buyer. */
export function absorptionRate(loc, buildType, askVsMarket, s) {
  const macro = s.macro;
  const bt = BUILD_TYPES[buildType];
  const base = 0.075 * (0.4 + BY_ID[loc].liquidity);
  const cycle = Math.pow(clamp(macro.demand, 0.3, 2.0), 1.6);
  const price = Math.pow(clamp(1 / Math.max(0.5, askVsMarket), 0.3, 2.2), 1.9);
  const rep = 0.82 + clamp(s.reputation, 0, 100) / 160;
  const sales = s.staff.some((x) => x.impact === 'sales') ? 1.22 : 1;
  const q = 0.8 + bt.quality * 0.4;
  return clamp(base * cycle * price * rep * sales * q * (1 + s.absorptionBoost), 0.002, 0.30);
}
