// Banking. Lenders in this game have credit policies, not a slider. They look at your
// completed track record, your leverage, your interest cover, the collateral on offer
// and — heavily — what the credit cycle is doing that month. In 1995 they will mostly
// say no, and they will be right to.

import { clamp } from '../core/util.js';
import { LENDERS } from '../data/costs.js';
import { emiFor } from './state.js';

let loanSeq = 0;

export function availableLenders(s) {
  return Object.values(LENDERS).filter((l) => (l.from ?? 0) <= s.month);
}

/** Effective interest rate offered to this borrower by this lender, right now. */
export function offeredRate(lender, s) {
  const plr = s.macro.plr / 100;
  const risk = clamp(0.06 - s.stats.projectsDone * 0.008 - s.relations.banks / 900, 0, 0.06);
  const cycle = (1 - s.macro.credit) * 0.035;
  const leverage = clamp((s.ratios.debtToAssets - 0.4) * 0.06, 0, 0.05);
  if (lender.kind === 'private') return clamp(0.26 + cycle * 2 + leverage * 2, 0.24, 0.48);
  return clamp(plr + lender.spread / 100 + risk + cycle + leverage, 0.08, 0.34);
}

/**
 * Credit decision. Returns { approved, amount, rate, tenure, reasons[] }.
 * Reasons are the honest text a credit committee would put on the note.
 */
export function creditDecision(lender, requested, collateralValue, s) {
  const reasons = [];
  let cap = collateralValue * lender.maxLtv;

  const track = s.stats.projectsDone;
  if (track < lender.minTrack) {
    reasons.push(`No completed track record. ${lender.name} requires at least ${lender.minTrack} delivered project${lender.minTrack === 1 ? '' : 's'}.`);
    cap *= 0.25;
  }

  const credAdj = clamp(s.macro.credit / 0.7, 0.25, 1.25);
  if (s.macro.credit < 0.45) {
    reasons.push('Credit conditions are tight; the bank is not adding developer exposure this quarter.');
  }
  cap *= credAdj;

  const relAdj = clamp(0.55 + s.relations.banks / 130, 0.4, 1.35);
  if (s.relations.banks < 25) reasons.push('The bank does not know you well enough to stretch.');
  cap *= relAdj;

  if (s.ratios.debtToAssets > 0.62) {
    reasons.push(`Existing leverage at ${Math.round(s.ratios.debtToAssets * 100)}% of assets is above the bank's comfort.`);
    cap *= 0.35;
  }
  if (s.ratios.interestCover < 1.4 && s.debt > 0) {
    reasons.push(`Interest cover of ${s.ratios.interestCover.toFixed(2)}x is below the 1.5x covenant.`);
    cap *= 0.4;
  }
  if (s.reputation < 15 && lender.kind !== 'private') {
    reasons.push('Limited market standing.');
    cap *= 0.7;
  }
  if (s.flags.cleanBooks && lender.kind !== 'private') {
    reasons.push('Audited, cheque-based accounts support a larger facility.');
    cap *= 1.35;
  }
  if (s.flags.deviationFlagged) {
    reasons.push('Sanctioned-plan deviations on record raise the risk weighting.');
    cap *= 0.75;
  }

  const amount = Math.floor(Math.min(requested, Math.max(0, cap)) / 10000) * 10000;
  const rate = offeredRate(lender, s);
  const tenure = Math.min(lender.maxTenure, s.month < 60 ? 60 : lender.maxTenure);

  if (amount < 50000) {
    return { approved: false, amount: 0, rate, tenure, reasons: reasons.length ? reasons : ['The proposal does not meet the bank’s lending norms.'] };
  }
  if (amount < requested) {
    reasons.push(`Sanctioned at ${Math.round((amount / requested) * 100)}% of the amount sought.`);
  }
  return { approved: true, amount, rate, tenure, reasons };
}

export function takeLoan(s, lender, amount, rate, tenure, opts = {}) {
  const loan = {
    id: `L${++loanSeq}`,
    lender: lender.name, kind: lender.kind, lenderId: lender.id,
    principal: amount, outstanding: amount, rate, tenure,
    taken: s.month, emi: emiFor(amount, rate, tenure),
    collateral: opts.collateral || null,
    projectId: opts.projectId || null,
    missed: 0,
  };
  s.loans.push(loan);
  s.cash += amount;
  return loan;
}

/** Service all debt for one month. Returns { interest, principal, missed }. */
export function serviceDebt(s) {
  let interest = 0, principal = 0, missed = 0;
  for (const l of s.loans) {
    if (l.outstanding <= 0) continue;
    const i = l.outstanding * (l.rate / 12);
    const due = Math.min(l.emi, l.outstanding + i);
    if (s.cash >= due) {
      s.cash -= due;
      interest += i;
      principal += due - i;
      l.outstanding = Math.max(0, l.outstanding - (due - i));
      l.missed = Math.max(0, l.missed - 0.5);
    } else {
      // Unpaid interest capitalises. This is how developers die.
      l.outstanding += i;
      interest += i;
      missed++;
      l.missed++;
    }
  }
  s.loans = s.loans.filter((l) => l.outstanding > 1);
  return { interest, principal, missed };
}

export function totalDebt(s) {
  return s.loans.reduce((a, l) => a + l.outstanding, 0);
}

/** Any lender with three missed instalments starts recovery proceedings. */
export function distressedLoans(s) {
  return s.loans.filter((l) => l.missed >= 3);
}
