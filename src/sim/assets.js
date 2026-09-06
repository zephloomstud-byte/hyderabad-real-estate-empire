// The rental book. This is the part of the business that compounds: an asset let at a
// market rent, revalued on a cap rate that compresses over twenty-five years, funded
// with amortising debt, is a wealth machine. It is also the part that bleeds quietly
// when the cycle turns and the floors empty.

import { clamp } from '../core/util.js';
import { rentRate, capRate } from './market.js';
import { taxRate } from './market.js';

/** Lease-up, rent revision, vacancy and operating cost for one asset, one month. */
export function tickAsset(a, s, rng) {
  const market = rentRate(a.locality, a.use, s.month, s.flags);
  if (market > 0) {
    // Rents drift toward market, faster on renewal, slower under a running lease.
    a.rentPerSqFt += (market * (0.85 + a.quality * 0.3) - a.rentPerSqFt) * 0.035;
  }

  // Lease-up. Demand, reputation, a property manager and asset quality all matter.
  const pull = clamp(
    0.055 * Math.pow(clamp(s.macro.demand, 0.3, 2), 1.5)
    * (0.75 + s.reputation / 180)
    * (0.8 + a.quality * 0.4)
    * (s.staff.some((x) => x.impact === 'rental') ? 1.3 : 1),
    0.004, 0.22,
  );
  if (a.occupancy < a.targetOcc) {
    a.occupancy = clamp(a.occupancy + pull * (a.targetOcc - a.occupancy) * 3.2, 0, a.targetOcc);
  }
  // Tenants leave in bad markets.
  if (s.macro.demand < 0.85 && rng.chance(0.06)) {
    a.occupancy = clamp(a.occupancy - rng.range(0.05, 0.25), 0, 1);
  }

  const gross = a.sqFt * a.rentPerSqFt * a.occupancy;
  const holiday = a.rentHolidayLeft > 0;
  if (holiday) a.rentHolidayLeft -= 1;
  const collected = holiday ? 0 : gross * (1 - (a.defaultRate || 0.02));
  const opex = a.sqFt * a.rentPerSqFt * a.opexRatio * 0.55 + a.sqFt * 0.6;
  const noi = collected - opex;

  a.lastGross = gross;
  a.lastNoi = noi;
  return { collected, opex, noi };
}

export function assetValue(a, s) {
  const noiAnnual = Math.max(0, (a.lastNoi || 0) * 12);
  const cr = capRate(a.use, s.month, s);
  if (noiAnnual <= 0) {
    // An empty building is still worth something: land plus depreciated construction.
    return Math.round(a.bookCost * 0.75);
  }
  const stabilised = a.sqFt * a.rentPerSqFt * Math.max(a.occupancy, 0.6) * 12 * (1 - a.opexRatio);
  return Math.round(((noiAnnual * 0.4) + (stabilised * 0.6)) / cr);
}

export function portfolioNoiAnnual(s) {
  return s.assets.reduce((t, a) => t + (a.lastNoi || 0) * 12, 0);
}

export function propertyTax(s) {
  const gross = s.assets.reduce((t, a) => t + (a.lastGross || 0), 0);
  return gross * taxRate('propertyTaxOfNOI', s.month);
}
