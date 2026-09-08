// Projects: approval, construction, completion. Nothing here finishes on time by default.
// Money is spent on an S-curve; if the cash is not there in a given month, work simply
// stops and the programme slips while interest keeps running. That single mechanic is
// the difference between a developer and a man who owns land.

import { clamp, SQYD_PER_ACRE } from '../core/util.js';
import { BUILD_TYPES, LAYOUT_TYPES, CONVERSION_COST_PER_SQYD, APPROVAL_BASE_MONTHS } from '../data/costs.js';
import { BY_ID } from '../data/geo.js';
import { costIndex, farFor, salePrice, rentRate, capRate, absorptionRate,
  landRate, plotPrice, plotAbsorption } from './market.js';

let projSeq = 0;
let assetSeq = 0;

/** Fraction of total cost spent in month i of an n-month programme (classic S-curve). */
export function sCurve(i, n) {
  const t0 = i / n, t1 = (i + 1) / n;
  const f = (t) => 1 / (1 + Math.exp(-9 * (t - 0.5)));
  const lo = f(0), hi = f(1);
  return ((f(t1) - f(t0)) / (hi - lo));
}

/** Land still available on a parcel, in square yards. Big sites get built in phases. */
export function freeSqYd(parcel) {
  return Math.max(0, parcel.areaSqYd - (parcel.usedSqYd || 0));
}

/**
 * How long this actually takes to build. A six-flat building in Kukatpally went up in
 * a bit over a year; a township took three. `months` on the build type is the duration
 * at `refSqFt`, and everything scales off that with a damped exponent, because doubling
 * the area does not double the programme.
 */
export function projectMonths(bt, sqFt) {
  const ref = bt.refSqFt || bt.minSqFt * 3;
  const scale = Math.pow(Math.max(0.2, sqFt / ref), 0.38);
  return Math.max(bt.minMonths || Math.round(bt.months * 0.5), Math.round(bt.months * scale));
}

export function maxBuildableSqFt(parcel, s) {
  const loc = BY_ID[parcel.locality];
  const far = farFor(loc, s.month, s.flags);
  const efficiency = 0.92;                      // setbacks, staircases, unusable corners
  return Math.floor(freeSqYd(parcel) * 9 * far * efficiency);
}

/** Square yards of land a given built-up area consumes at today's permitted density. */
export function landConsumedBy(parcel, sqFt, s) {
  const far = farFor(BY_ID[parcel.locality], s.month, s.flags);
  return Math.min(freeSqYd(parcel), Math.ceil(sqFt / (9 * far * 0.92)));
}

/**
 * Month-by-month cash requirement for a project, and the peak cumulative funding it
 * needs before a single rupee comes back. This is the number that kills developers:
 * they look at total profit and never look at the hole they have to fund first.
 */
export function fundingSchedule(budget, approvalMonths, months) {
  const soft = budget * 0.09, hard = budget * 0.91;
  const out = [];
  for (let i = 0; i < approvalMonths; i++) out.push(soft / approvalMonths);
  for (let i = 0; i < months; i++) out.push(hard * sCurve(i, months));
  let run = 0;
  const cum = out.map((v) => (run += v));
  return { monthly: out, cumulative: cum, peak: run, firstYear: cum[Math.min(cum.length - 1, 11)] };
}

export const isLayout = (typeId) => !!LAYOUT_TYPES[typeId];

/**
 * Costing a plotted layout. Everything is per square yard of gross site: conversion out
 * of agricultural use, sanction, then roads, drains, water and power. What is left after
 * roads and surrendered open space is what you actually have to sell.
 */
export function estimateLayout(parcel, typeId, grossSqYd, s) {
  const lt = LAYOUT_TYPES[typeId];
  const ci = costIndex(s.month);
  const conversion = lt.unapproved ? 0 : Math.round(grossSqYd * CONVERSION_COST_PER_SQYD * ci);
  const works = Math.round(grossSqYd * lt.cost * ci);
  const budget = conversion + works;

  const speed = (2 - s.macro.regime.approvalSpeed) / (s.approvalSpeedMod || 1)
    * (1 - clamp(s.relations.bureaucrats, 0, 100) / 260)
    * (s.staff.some((x) => x.impact === 'approvals') ? 0.72 : 1);
  const approvalMonths = lt.unapproved ? 0
    : Math.max(2, Math.round((lt.conversionMonths + lt.approvalMonths) * speed));
  const months = Math.max(lt.months, Math.round(lt.months * Math.pow(Math.max(0.3, grossSqYd / (SQYD_PER_ACRE * 5)), 0.3)));

  const saleableSqYd = Math.floor(grossSqYd * lt.saleable);
  const rate = plotPrice(parcel.locality, typeId, s.month, s);
  const sched = fundingSchedule(budget, Math.max(1, approvalMonths), months);
  return {
    budget, approvalMonths, months, conversion, works,
    saleableSqYd, plotRate: rate,
    grossValue: Math.round(saleableSqYd * rate),
    costPerSqYd: budget / Math.max(1, grossSqYd),
    schedule: sched,
    firstYearCash: Math.round(sched.firstYear),
    isLayout: true,
  };
}

export function estimateProject(parcel, typeId, sqFt, s) {
  if (isLayout(typeId)) return estimateLayout(parcel, typeId, sqFt, s);
  const bt = BUILD_TYPES[typeId];
  const ci = costIndex(s.month);
  // The 9% spent during the approval phase is design, approval and launch cost — part
  // of the all-in figure, not an addition to it.
  const budget = Math.round(sqFt * bt.cost * ci);
  // Small residential files move faster than large or unusual ones.
  const sizeFactor = clamp(0.62 + sqFt / 90000, 0.62, 1.5);
  const approvalMonths = Math.max(2, Math.round(
    APPROVAL_BASE_MONTHS
    * sizeFactor
    * (2 - s.macro.regime.approvalSpeed)
    / (s.approvalSpeedMod || 1)
    * (1 - clamp(s.relations.bureaucrats, 0, 100) / 260)
    * (s.staff.some((x) => x.impact === 'approvals') ? 0.72 : 1),
  ));
  const months = projectMonths(bt, sqFt);
  const price = salePrice(parcel.locality, typeId, s.month, s);
  const sched = fundingSchedule(budget, approvalMonths, months);
  return {
    budget, approvalMonths,
    months,
    grossValue: Math.round(sqFt * price),
    pricePerSqFt: price,
    costPerSqFt: budget / sqFt,
    schedule: sched,
    firstYearCash: Math.round(sched.firstYear),
    mobilisation: Math.round(sched.cumulative[Math.min(sched.cumulative.length - 1, approvalMonths + 5)]),
  };
}

export function startProject(s, parcel, typeId, sqFt, mode, name) {
  if (isLayout(typeId)) return startLayout(s, parcel, typeId, sqFt, name);
  const est = estimateProject(parcel, typeId, sqFt, s);
  const bt = BUILD_TYPES[typeId];
  const landUsed = landConsumedBy(parcel, sqFt, s);
  // Land cost attributable to this phase, so each phase carries its own share.
  const landShare = Math.round((parcel.allInCost || 0) * (landUsed / Math.max(1, parcel.areaSqYd)));
  const p = {
    id: `P${++projSeq}`,
    name: name || `${bt.name}, ${BY_ID[parcel.locality].name}`,
    parcelId: parcel.id, locality: parcel.locality, type: typeId, use: bt.use,
    sqFt, mode,
    budget: est.budget, spent: 0, overrunPct: 0,
    stage: 'approval', approvalLeft: est.approvalMonths, approvalTotal: est.approvalMonths,
    months: est.months, elapsed: 0, delay: 0, stalled: 0, riskDelay: 0,
    quality: bt.quality,
    askPerSqFt: est.pricePerSqFt,
    devAgreement: parcel.devAgreement || null,
    started: s.month, done: false,
    landUsed, landShare,
    phase: (parcel.phases || 0) + 1,
  };
  parcel.phases = (parcel.phases || 0) + 1;
  parcel.usedSqYd = (parcel.usedSqYd || 0) + landUsed;
  if (freeSqYd(parcel) < 100) parcel.usedBy = p.id;
  if (parcel.phases > 1) p.name = `${p.name} — phase ${parcel.phases}`;
  s.projects.push(p);
  return p;
}

/** Start a plotted layout. `grossSqYd` is site area, not saleable area. */
export function startLayout(s, parcel, typeId, grossSqYd, name) {
  const est = estimateLayout(parcel, typeId, grossSqYd, s);
  const lt = LAYOUT_TYPES[typeId];
  const landUsed = Math.min(freeSqYd(parcel), grossSqYd);
  const landShare = Math.round((parcel.allInCost || 0) * (landUsed / Math.max(1, parcel.areaSqYd)));
  const p = {
    id: `P${++projSeq}`,
    name: name || `${lt.name}, ${BY_ID[parcel.locality].name}`,
    parcelId: parcel.id, locality: parcel.locality, type: typeId, use: 'plots',
    isLayout: true, grossSqYd: landUsed, sqFt: est.saleableSqYd, mode: 'sell',
    budget: est.budget, spent: 0, overrunPct: 0,
    stage: est.approvalMonths > 0 ? 'approval' : 'construction',
    approvalLeft: est.approvalMonths, approvalTotal: Math.max(1, est.approvalMonths),
    months: est.months, elapsed: 0, delay: 0, stalled: 0, riskDelay: 0,
    quality: lt.unapproved ? 0.35 : 0.7,
    askPerSqFt: est.plotRate,
    started: s.month, done: false,
    landUsed, landShare, phase: (parcel.phases || 0) + 1,
  };
  parcel.phases = (parcel.phases || 0) + 1;
  parcel.usedSqYd = (parcel.usedSqYd || 0) + landUsed;
  if (freeSqYd(parcel) < 100) parcel.usedBy = p.id;
  if (parcel.phases > 1) p.name = `${p.name} — phase ${parcel.phases}`;
  // An unapproved venture puts a defect into the world that follows the buyers.
  if (lt.unapproved) {
    s.reputation = clamp(s.reputation - 1.5, 0, 100);
    p.unapproved = true;
  }
  s.projects.push(p);
  return p;
}

/** One month of progress for one project. Returns cash spent. */
export function tickProject(p, s, rng) {
  if (p.done) return 0;

  if (p.stage === 'approval') {
    // Conversion and sanction charges run whether or not the file actually moves.
    const softShare = p.isLayout ? 0.16 : 0.09;
    const soft = Math.round((p.budget * softShare) / Math.max(1, p.approvalTotal));
    p.approvalLeft -= 1;
    p.spent += soft;
    if (p.approvalLeft <= 0) {
      p.stage = 'construction';
      s.news.push({
        m: s.month, tag: 'PROJECT',
        head: p.isLayout ? `Layout sanctioned: ${p.name}` : `Sanction received: ${p.name}`,
        body: p.isLayout
          ? `Conversion out of agricultural use and layout permission both through, after ${p.approvalTotal} months. Roads, drains and services can start, and the plots can now be sold as approved.`
          : `Building permission granted after ${p.approvalTotal} months. Construction can begin.`,
      });
    }
    return soft;
  }

  if (p.stage !== 'construction') return 0;

  // The programme length is set by construction risk only. Running out of money does
  // not make the remaining work smaller, it just means it does not happen this month.
  const n = p.months + (p.riskDelay || 0);
  const share = sCurve(p.elapsed, n);
  const hard = p.budget * (p.isLayout ? 0.84 : 0.91);
  const cap = hard * (1 + p.overrunPct);
  const softSpent = p.budget * (p.isLayout ? 0.16 : 0.09);
  const hardSpent = Math.max(0, p.spent - softSpent);
  const want = Math.round(Math.min(hard * share * (1 + p.overrunPct), Math.max(0, cap - hardSpent)));
  // The work is paid for; nothing is left to spend but the programme is not finished.
  if (want <= 0) { completeProject(p, s); return 0; }

  // Sites do not stop dead when money is short; they slow down. Pay what you can,
  // and the programme stretches by whatever fraction of the month's work you could
  // not fund. Below a fifth of the bill, the contractor pulls his men off entirely.
  const avail = Math.max(0, s.cash);
  const pay = Math.min(want, avail);
  const frac = want > 0 ? pay / want : 1;

  if (frac < 0.2) {
    p.stalled += 1;
    p.delay += 1;                               // display only: months lost
    if (p.stalled === 1 || p.stalled % 6 === 0) {
      s.news.push({
        m: s.month, tag: 'PROJECT', head: `Work stopped at ${p.name}`,
        body: 'There is no money to pay running bills. The contractor has pulled his men off site. Every idle month costs interest, credibility and a little more of the building.',
      });
    }
    p.quality = clamp(p.quality - 0.008, 0.25, 1);
    return 0;
  }

  p.spent += pay;
  p.progressUnits = (p.progressUnits || 0) + frac;
  p.delay += 1 - frac;
  if (p.progressUnits >= 1) { p.progressUnits -= 1; p.elapsed += 1; }
  p.stalled = frac > 0.9 ? 0 : p.stalled + 1;
  if (frac < 0.75) p.quality = clamp(p.quality - 0.004, 0.25, 1);

  // Ordinary programme risk. Roughly a quarter of months go wrong for an inexperienced
  // builder running a site himself, under a twentieth for one with a real project
  // manager and good contractor relationships. Both delay and overrun are bounded:
  // buildings do get finished, just late and dear.
  const capability = clamp(
    0.70 + s.skills.construction / 320
    + (s.staff.some((x) => x.impact === 'construction' && x.skill > 55) ? 0.10 : 0)
    + (s.staff.some((x) => x.role === 'coo') ? 0.07 : 0)
    + s.relations.contractors / 900, 0.58, 0.97,
  );
  const maxRiskDelay = p.months * 0.6;
  if (rng.f() > capability) {
    if (rng.chance(0.55)) p.riskDelay = Math.min(maxRiskDelay, (p.riskDelay || 0) + 1);
    else p.overrunPct = Math.min(0.35, p.overrunPct + rng.range(0.004, 0.018));
  }
  if (rng.chance(0.05)) p.quality = clamp(p.quality + rng.normal(0, 0.03), 0.25, 1);

  if (p.elapsed >= n) completeProject(p, s);
  return pay;
}

export function completeProject(p, s) {
  if (p.isLayout) return completeLayout(p, s);
  p.done = true;
  p.stage = 'complete';
  p.completed = s.month;
  s.stats.projectsDone += 1;
  s.stats.sqftBuilt += p.sqFt;
  // Delivering is how a builder earns a name. Quality and punctuality both count.
  const onTime = p.delay <= p.months * 0.25;
  s.reputation = clamp(s.reputation + 3 + (p.quality - 0.6) * 12 + (onTime ? 2 : -1), 0, 100);

  const parcel = s.parcels.find((x) => x.id === p.parcelId);
  let ownSqFt = p.sqFt;
  if (p.devAgreement) ownSqFt = Math.round(p.sqFt * (1 - p.devAgreement.ownerShare));

  if (p.mode === 'hold') {
    const use = p.use;
    const rate = rentRate(p.locality, use, s.month, s.flags) || rentRate(p.locality, 'res', s.month, s.flags);
    s.assets.push({
      id: `A${++assetSeq}`,
      name: p.name, locality: p.locality, use, type: p.type, sqFt: ownSqFt,
      rentPerSqFt: rate * (0.85 + p.quality * 0.3),
      occupancy: 0.0, targetOcc: 0.9,
      opexRatio: 0.22, quality: p.quality,
      bookCost: Math.round(p.spent * (ownSqFt / p.sqFt)) + (p.landShare || 0),
      completed: s.month, deposit: 0, leaseEnds: null, rentHolidayLeft: 0,
    });
    s.news.push({
      m: s.month, tag: 'PROJECT', head: `${p.name} complete and held for rent`,
      body: `${ownSqFt.toLocaleString('en-IN')} sq ft added to the rental portfolio at an asking rent of about ₹${Math.round(rate)} per square foot. It is empty today. Filling it is the next job.`,
    });
  } else {
    const ask = salePrice(p.locality, p.type, s.month, s);
    // Area booked during construction is already part-paid; collect the balance now
    // and take it out of what is left to sell, so pre-sales are not counted twice.
    const presoldOwn = Math.min(ownSqFt, Math.round((p.presold || 0) * (ownSqFt / p.sqFt)));
    const balance = Math.round(presoldOwn * ask * 0.20);
    s.cash += balance;
    s.revenueYTD += balance;
    // Delivery discharges the advances taken during construction. The money itself was
    // already recognised as revenue when it was collected, month by month; adding it
    // again here taxed the player twice on the same rupee.
    s.customerAdvances = Math.max(0, (s.customerAdvances || 0) - (p.advances || 0));
    s.inventory.push({
      id: `I${p.id}`, projectId: p.id, name: p.name, locality: p.locality,
      type: p.type, use: p.use, sqFt: ownSqFt, remaining: ownSqFt - presoldOwn,
      askPerSqFt: ask,
      quality: p.quality, completed: s.month,
      cost: Math.round(p.spent * (ownSqFt / p.sqFt)) + (p.landShare || 0),
    });
    s.news.push({
      m: s.month, tag: 'PROJECT', head: `${p.name} complete`,
      body: `${ownSqFt.toLocaleString('en-IN')} sq ft delivered${p.devAgreement ? `, after handing ${Math.round(p.devAgreement.ownerShare * 100)}% of the built area to the landowner` : ''}. ${presoldOwn ? `${presoldOwn.toLocaleString('en-IN')} sq ft was booked during construction; ` : ''}${(ownSqFt - presoldOwn).toLocaleString('en-IN')} sq ft is unsold. Delivered ${p.delay} month${p.delay === 1 ? '' : 's'} late at ${Math.round(p.overrunPct * 100)}% over budget.`,
    });
  }
  if (parcel) {
    parcel.builtCost = (parcel.builtCost || 0) + (p.landShare || 0);
    if (freeSqYd(parcel) < 100) parcel.consumed = true;
  }
}

/** A finished layout becomes plots on the market, priced by the square yard. */
export function completeLayout(p, s) {
  p.done = true;
  p.stage = 'complete';
  p.completed = s.month;
  s.stats.projectsDone += 1;
  s.stats.plotsDeveloped = (s.stats.plotsDeveloped || 0) + p.sqFt;
  const onTime = p.delay <= p.months * 0.25;
  s.reputation = clamp(s.reputation + (p.unapproved ? 1 : 3) + (onTime ? 1 : -1), 0, 100);

  const parcel = s.parcels.find((x) => x.id === p.parcelId);
  const rate = plotPrice(p.locality, p.type, s.month, s);
  const presold = Math.min(p.sqFt, Math.round(p.presold || 0));
  const balance = Math.round(presold * rate * 0.20);
  s.cash += balance;
  s.revenueYTD += balance;
  // Already recognised month by month as it was collected; not revenue a second time.
  s.customerAdvances = Math.max(0, (s.customerAdvances || 0) - (p.advances || 0));

  s.inventory.push({
    id: `I${p.id}`, projectId: p.id, name: p.name, locality: p.locality,
    type: p.type, use: 'plots', isLayout: true, unit: 'sq yd',
    sqFt: p.sqFt, remaining: p.sqFt - presold,
    askPerSqFt: rate, quality: p.quality, completed: s.month,
    unapproved: !!p.unapproved,
    cost: Math.round(p.spent) + (p.landShare || 0),
  });
  s.news.push({
    m: s.month, tag: 'PROJECT', head: `${p.name} ready for sale`,
    body: `${p.sqFt.toLocaleString('en-IN')} saleable square yards out of a ${Math.round(p.grossSqYd).toLocaleString('en-IN')} square yard site — the rest went to roads, drains and surrendered open space. `
      + `Plots are quoted at ₹${Math.round(rate).toLocaleString('en-IN')} a square yard against a raw land rate of ₹${Math.round(landRate(p.locality, s.month, s)).toLocaleString('en-IN')}. `
      + (p.unapproved ? 'Unapproved, so the buyers are carrying a regularisation risk you have priced in and passed on.' : 'Sanctioned, serviced and registrable, which is most of what the buyer is paying for.'),
  });
  if (parcel) {
    parcel.builtCost = (parcel.builtCost || 0) + (p.landShare || 0);
    if (freeSqYd(parcel) < 100) parcel.consumed = true;
  }
}

/**
 * Cash still to be spent on live projects. Pass a month window to see the near-term
 * call; omit it for the full remaining commitment, which is what actually matters when
 * deciding whether you can afford to start something else.
 */
export function remainingCommitments(s, months = Infinity) {
  let total = 0;
  for (const p of s.projects) {
    if (p.done) continue;
    const sched = fundingSchedule(p.budget * (1 + p.overrunPct), p.approvalTotal, p.months + p.delay);
    const pos = p.stage === 'approval' ? p.approvalTotal - p.approvalLeft : p.approvalTotal + p.elapsed;
    const end = months === Infinity ? sched.monthly.length : Math.min(sched.monthly.length, pos + months);
    for (let i = pos; i < end; i++) total += sched.monthly[i];
  }
  return Math.max(0, total);
}

/**
 * Abandon a project: sell the site and whatever is standing on it. Half-built buildings
 * fetch badly — the buyer inherits your contractor disputes, your deviations and your
 * buyers. Real developers do this, and it is usually the right call once a site has
 * been idle for a year.
 */
export function abandonProject(s, projectId, marketFactor = 1) {
  const p = s.projects.find((x) => x.id === projectId && !x.done);
  if (!p) return { ok: false, msg: 'Not found.' };
  const parcel = s.parcels.find((x) => x.id === p.parcelId);
  const wipRecovery = p.spent * (p.stage === 'approval' ? 0.25 : 0.55) * marketFactor;
  s.projects = s.projects.filter((x) => x.id !== projectId);
  if (parcel) {
    parcel.usedSqYd = Math.max(0, (parcel.usedSqYd || 0) - (p.landUsed || 0));
    parcel.phases = Math.max(0, (parcel.phases || 1) - 1);
    parcel.usedBy = null;
  }
  s.cash += Math.round(wipRecovery);
  s.revenueYTD += Math.round(wipRecovery);
  // Buyers who paid advances on a project you walked away from become creditors.
  if (p.advances) {
    s.payables = (s.payables || 0) + p.advances;
    s.customerAdvances = Math.max(0, (s.customerAdvances || 0) - p.advances);
    s.reputation = Math.max(0, s.reputation - 8);
  }
  s.reputation = Math.max(0, s.reputation - 4);
  s.news.push({
    m: s.month, tag: 'PROJECT', head: `${p.name} abandoned`,
    body: `Work in progress sold for ${Math.round(wipRecovery).toLocaleString('en-IN')} rupees against ${Math.round(p.spent).toLocaleString('en-IN')} spent. The land is back on your books. Buyers, brokers and your bank all now know that you started something you could not finish.`,
  });
  return { ok: true, recovered: Math.round(wipRecovery) };
}

/** Pre-launch sales during construction: bookings and advances, at a discount. */
export function tickPresales(p, s, rng) {
  if (p.mode !== 'sell') return 0;
  if (p.stage !== 'construction' && p.stage !== 'approval') return 0;
  // From 2017, RERA escrow means only a fraction of buyer money is usable elsewhere.
  const reraDrag = s.flags.RERA ? 0.42 : 1;

  // Pre-launch. Builders took bookings the moment the file was in, at a real discount,
  // and that money is what paid for the foundation. Waiting for the structure to come
  // up would have starved every project in the city of working capital.
  const preLaunch = p.stage === 'approval';
  if (preLaunch && p.approvalTotal - p.approvalLeft < 1) return 0;

  const progress = preLaunch ? 0 : p.elapsed / Math.max(1, p.months + p.delay);
  if (!preLaunch && progress < 0.02) return 0;
  // Under-construction stock sells at a discount to finished stock, and that discount
  // is exactly what makes it move. `disc` below 1 means cheaper than market.
  const disc = preLaunch ? 0.80 : 0.86 + progress * 0.12;
  const rate = (p.isLayout
    ? plotAbsorption(p.locality, p.type, disc, s)
    : absorptionRate(p.locality, p.type, disc, s)) * reraDrag * (preLaunch ? 0.45 : 1);
  const sqFtSold = Math.min((p.sqFt - (p.presold || 0)) * rate, p.sqFt * (preLaunch ? 0.04 : 0.08));
  if (sqFtSold < 1) return 0;
  p.presold = Math.min(p.sqFt, (p.presold || 0) + sqFtSold);
  const price = (p.isLayout ? plotPrice(p.locality, p.type, s.month, s)
    : salePrice(p.locality, p.type, s.month, s)) * disc;
  // Construction-linked payment plans: roughly four-fifths of the price is collected
  // as the slabs go up, the balance at handover. This is how Indian residential
  // development was actually financed — the buyers were the lender.
  const collected = Math.round(sqFtSold * price * 0.78);
  // Money taken from buyers before delivery is a liability, not profit. Releasing it
  // only on completion is what stops pre-sales from inflating net worth.
  s.customerAdvances = (s.customerAdvances || 0) + collected;
  p.advances = (p.advances || 0) + collected;
  s.stats.unitsSold += 0;
  return collected;
}

/** Monthly sales out of completed inventory. */
export function tickInventory(s, rng) {
  let revenue = 0, cogs = 0;
  for (const inv of s.inventory) {
    if (inv.remaining <= 0) continue;
    const market = inv.isLayout
      ? plotPrice(inv.locality, inv.type, s.month, s)
      : salePrice(inv.locality, inv.type, s.month, s);
    const askVs = inv.askPerSqFt / market;
    const rate = inv.isLayout
      ? plotAbsorption(inv.locality, inv.type, askVs, s)
      : absorptionRate(inv.locality, inv.type, askVs, s);
    const sold = Math.min(inv.remaining, inv.sqFt * rate * rng.range(0.6, 1.4));
    if (sold < 1) continue;
    inv.remaining -= sold;
    revenue += sold * inv.askPerSqFt;
    cogs += (sold / inv.sqFt) * inv.cost;
    s.soldUnits += 1;
    // Ageing stock loses pricing power.
    if (s.month - inv.completed > 24) inv.askPerSqFt *= 0.997;
  }
  s.inventory = s.inventory.filter((i) => i.remaining > 1);
  return { revenue: Math.round(revenue), cogs: Math.round(cogs) };
}
