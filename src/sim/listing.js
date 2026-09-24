// Going public, and the REIT.
//
// This is the part the simulation was missing, and its absence was the reason a best-case
// run topped out around two hundred million dollars while the firms named on screen as
// competitors produced dollar billionaires. My Home Group's founder is one. DLF's family
// is worth many times that. The gap was never the economics of a project — a single
// twenty-four acre scheme at Kokapet in 2020 clears a thousand crore of profit — it was
// that the game had no way to turn a business into a valuation.
//
// A private developer is worth roughly what his assets are worth. A listed one is worth
// what the market says, and the market pays a multiple of book that swings from under one
// in a bust to three or four at a peak. DLF listed in 2007 and made K. P. Singh briefly
// the richest man in India; the same company's market value fell by more than eighty per
// cent in the eighteen months that followed. Both halves of that are modelled here.
//
// None of this is free money. A listing demands audited accounts, a real board, disclosure
// of every title defect, and it hands outsiders a quarter of the company forever. The
// multiple that makes you rich on paper in a boom is the same multiple that destroys the
// number in a crash, and the public company cannot simply stop and wait the way a private
// one can.

import { clamp } from '../core/util.js';

/** Indian developers could not realistically list before the mid-2000s. */
export const IPO_FROM_MONTH = 138;        // July 2006
export const REIT_FROM_MONTH = 289;       // February 2019, when the first Indian REIT listed

/**
 * What the public market pays for a rupee of a developer's net assets.
 *
 * Property is valued on sentiment far more than on book. At the top of a cycle the market
 * capitalises a land bank at several times what it cost; at the bottom it will not pay
 * book value at all. The swing is the whole story of listed Indian real estate.
 */
export function marketMultiple(s) {
  const demand = s.macro.demand;
  const credit = s.macro.credit;
  const base = clamp(0.55 + demand * 1.35 + (credit - 0.6) * 0.9, 0.5, 4.2);
  // The market pays up for delivery, governance and recurring income, and marks down
  // anyone whose accounts it does not believe.
  const quality = 1
    + clamp(s.reputation, 0, 100) / 330
    + (s.flags.cleanBooks ? 0.12 : -0.15)
    + (s.flags.internalAudit ? 0.06 : 0)
    + (s.staff.some((x) => x.role === 'cfo') ? 0.07 : 0)
    + clamp((s.ratios.noi * 8) / Math.max(1, s.netWorth), 0, 0.35)   // recurring income
    - (s.flags.underInvestigation ? 0.35 : 0)
    - (s.flags.npa ? 0.2 : 0)
    - clamp((s.ratios.debtToAssets - 0.45) * 0.8, 0, 0.35);
  return clamp(base * quality, 0.35, 5.5);
}

/** Can this company list, and if not, why not. */
export function ipoReadiness(s) {
  const reasons = [];
  if (s.month < IPO_FROM_MONTH) reasons.push('No Indian developer has listed yet. The market for this does not exist.');
  if (s.listed) reasons.push('The company is already listed.');
  if (s.stats.projectsDone < 8) reasons.push(`Underwriters want a delivery record. ${s.stats.projectsDone} of 8 projects completed.`);
  if (s.netWorth < 3e9) reasons.push(`Net assets of ${Math.round(s.netWorth / 1e7)} crore are below the 300 crore a main-board listing needs.`);
  if (!s.flags.cleanBooks) reasons.push('Accounts must be audited and cheque-based. No merchant banker will take these books to the market.');
  if (s.reputation < 45) reasons.push(`Market standing of ${Math.round(s.reputation)} is too low; the issue would not be subscribed.`);
  if (s.ratios.debtToAssets > 0.6) reasons.push(`Leverage at ${Math.round(s.ratios.debtToAssets * 100)}% of assets would have to come down first.`);
  if (s.flags.underInvestigation) reasons.push('An open corruption case makes a public offering impossible.');
  if (s.macro.credit < 0.4) reasons.push('The issue window is shut. Nothing is listing in this market.');
  return { ready: reasons.length === 0, reasons };
}

/**
 * Quote an offering. The company sells new shares; the founder keeps the rest, and the
 * money raised is primary capital that goes into the business.
 */
export function ipoQuote(s, dilution = 0.25) {
  const mult = marketMultiple(s);
  const preMoney = Math.max(0, s.netWorth) * mult;
  const d = clamp(dilution, 0.1, 0.4);
  const raised = preMoney * (d / (1 - d));
  const postMoney = preMoney + raised;
  // Merchant bankers, lawyers, registrars, printing and the rest.
  const costs = raised * 0.06;
  return {
    multiple: mult, preMoney, raised, postMoney, dilution: d, costs,
    founderStake: (1 - d) * (s.founderStake ?? 1),
    founderValue: postMoney * (1 - d) * (s.founderStake ?? 1),
  };
}

/**
 * Market capitalisation of a listed company, and the founder's stake in it.
 *
 * This is what makes the number large, and it is also what makes it unstable: the same
 * mechanism that turns two thousand crore of assets into eight thousand crore of market
 * value in a boom takes it back below book in a crash.
 */
export function marketCap(s) {
  if (!s.listed) return 0;
  return Math.max(0, s.netWorth) * marketMultiple(s);
}

export function founderWealth(s) {
  if (!s.listed) return Math.max(0, s.netWorth) * (s.founderStake ?? 1);
  return marketCap(s) * (s.founderStake ?? 1);
}

// ---------------------------------------------------------------- REIT

export function reitReadiness(s) {
  const reasons = [];
  const leased = s.assets.filter((a) => a.use !== 'res' && a.occupancy > 0.7);
  const area = leased.reduce((t, a) => t + a.sqFt, 0);
  const noi = leased.reduce((t, a) => t + (a.lastNoi || 0) * 12, 0);
  if (s.month < REIT_FROM_MONTH) reasons.push('There is no REIT regime in India yet.');
  if (s.reitListed) reasons.push('Your rental portfolio is already in a listed trust.');
  if (area < 2e6) reasons.push(`A REIT needs scale: ${(area / 1e6).toFixed(2)} million sq ft of let commercial space against the 2 million required.`);
  if (noi < 1.5e8) reasons.push('Net operating income is too thin to support a public trust.');
  if (!s.flags.cleanBooks) reasons.push('A trust requires audited accounts and clean title on every asset.');
  return { ready: reasons.length === 0, reasons, leased, area, noi };
}

/**
 * A REIT values the rental book on its income at a yield institutions will accept —
 * materially finer than the cap rate a private buyer would use, because the units are
 * liquid and the income is contracted. Selling the portfolio into a trust you sponsor
 * releases most of that value as cash while you keep a sponsor's stake.
 */
export function reitQuote(s) {
  const r = reitReadiness(s);
  const yieldReq = clamp(0.075 - (s.macro.demand - 1) * 0.012, 0.055, 0.095);
  const grossValue = r.noi / yieldReq;
  const sponsorStake = 0.25;
  const raised = grossValue * (1 - sponsorStake);
  return { ...r, yieldReq, grossValue, sponsorStake, raised, costs: raised * 0.04 };
}
