// Balance sheet, ratios and the yearly close. Net worth is computed the way a valuer
// would compute it: land at market, income assets on a cap rate, unsold stock at cost
// or realisable value whichever is lower, less every rupee owed.

import { yearOf } from '../core/util.js';
import { landRate, unapprovedPenalty } from './market.js';
import { assetValue, portfolioNoiAnnual } from './assets.js';
import { totalDebt } from './finance.js';

export function landValue(s) {
  return s.parcels
    .filter((p) => p.owned && !p.consumed)
    .reduce((t, p) => {
      const gross = landRate(p.locality, s.month, s) * p.areaSqYd;
      // Known unresolved defects destroy value; a fatal one destroys all of it.
      let haircut = 1;
      for (const d of p.known) {
        if (p.resolved && p.resolved.includes(d)) continue;
        if (d === 'ASSIGNED_LAND') haircut *= 0.02;
        else if (d === 'WAKF_CLAIM') haircut *= 0.25;
        // Being unapproved cost you little in 1995 and a great deal once buyers
        // needed a bank behind them.
        else if (d === 'LAYOUT_UNAPPROVED') haircut *= 0.55 + unapprovedPenalty(s.month).price * 0.45;
        else haircut *= 0.7;
      }
      return t + gross * haircut * (p.stigma || 1);
    }, 0);
}

export function wipValue(s) {
  return s.projects.filter((p) => !p.done).reduce((t, p) => t + p.spent, 0);
}

export function inventoryValue(s) {
  return s.inventory.reduce((t, i) => t + Math.min(i.remaining * i.askPerSqFt * 0.92, (i.remaining / i.sqFt) * i.cost * 1.35), 0);
}

export function investmentValue(s) {
  return s.assets.reduce((t, a) => t + assetValue(a, s), 0)
    + s.subsidiaries.reduce((t, x) => t + x.value, 0);
}

export function balanceSheet(s) {
  const cash = s.cash;
  const land = landValue(s);
  const wip = wipValue(s);
  const inv = inventoryValue(s);
  const invest = investmentValue(s);
  const other = s.pendingRefund || 0;
  const assets = cash + land + wip + inv + invest + other;

  const debt = totalDebt(s);
  const payables = s.payables || 0;
  const advances = s.customerAdvances || 0;
  const liabilities = debt + payables + advances;

  return {
    cash, land, wip, inventory: inv, investments: invest, other,
    assets, debt, payables, advances, liabilities,
    netWorth: assets - liabilities,
    equityPaidIn: s.equityPaidIn, retained: assets - liabilities - s.equityPaidIn,
  };
}

export function computeRatios(s, bs) {
  const noi = portfolioNoiAnnual(s);
  const ytd = (s.revenueYTD - s.costYTD - s.opexYTD) + noi;
  // Early in a year the year-to-date figures are meaningless, so fall back to the last
  // completed year. Otherwise every January reports an interest cover of zero.
  const last = s.yearbook[s.yearbook.length - 1];
  const monthsIn = (s.month % 12) || 12;
  const ebitda = monthsIn >= 6 || !last ? ytd : Math.max(ytd, last.ebitda);
  const interest = Math.max(1, s.interestAnnual || s.interestYTD * (12 / monthsIn));
  return {
    debtToAssets: bs.assets > 0 ? bs.debt / bs.assets : 0,
    debtToEbitda: ebitda > 0 ? bs.debt / ebitda : 99,
    interestCover: ebitda > 0 ? ebitda / interest : 0,
    ltv: bs.land + bs.investments > 0 ? bs.debt / (bs.land + bs.investments) : 0,
    dscr: interest > 0 ? (noi + Math.max(0, s.revenueYTD - s.costYTD)) / interest : 0,
    occupancy: s.assets.length
      ? s.assets.reduce((t, a) => t + a.occupancy * a.sqFt, 0) / Math.max(1, s.assets.reduce((t, a) => t + a.sqFt, 0))
      : 0,
    noi,
    yieldOnCost: s.assets.length
      ? noi / Math.max(1, s.assets.reduce((t, a) => t + a.bookCost, 0))
      : 0,
  };
}

export function closeYear(s, bs) {
  const y = yearOf(s.month);
  const noi = portfolioNoiAnnual(s);
  const grossProfit = s.revenueYTD - s.costYTD;
  const ebitda = grossProfit + noi - s.opexYTD;
  const pbt = ebitda - s.interestYTD;
  const rate = pbt > 0 ? (s.flags.cleanBooks ? 1 : 0.72) * taxOn(s) : 0;
  const tax = Math.max(0, pbt * rate);
  s.cash -= tax;
  s.taxYTD = tax;

  const entry = {
    year: y,
    netWorth: bs.netWorth, assets: bs.assets, debt: bs.debt, cash: bs.cash,
    land: bs.land, investments: bs.investments, inventory: bs.inventory,
    revenue: s.revenueYTD, ebitda, pbt, tax, pat: pbt - tax,
    noi, interest: s.interestYTD,
    usdRate: s.macro.usd, cpiIndex: s.macro.cpiIndex,
    realNetWorth: bs.netWorth / (s.macro.cpiIndex / 100),
    usdNetWorth: bs.netWorth / s.macro.usd,
    reputation: s.reputation, projects: s.stats.projectsDone,
    occupancy: s.ratios.occupancy, staff: s.staff.length,
  };
  s.yearbook.push(entry);

  s.retained += pbt - tax;
  s.interestAnnual = s.interestYTD;
  s.revenueYTD = 0; s.costYTD = 0; s.interestYTD = 0; s.opexYTD = 0; s.noiYTD = 0;
  return entry;
}

function taxOn(s) {
  // Simplified effective corporate rate for the year.
  const y = yearOf(s.month);
  if (y < 1997) return 0.46;
  if (y < 2000) return 0.35;
  if (y < 2005) return 0.37;
  if (y < 2012) return 0.335;
  if (y < 2018) return 0.335;
  return 0.27;
}
