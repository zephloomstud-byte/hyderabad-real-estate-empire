// The engine. One function advances the world by a month; everything else is a player
// action that mutates state before that happens. The `fx` object is the only surface
// events are allowed to touch, which keeps all bookkeeping in one auditable place.

import { makeRng } from '../core/rng.js';
import { clamp, dateLabel, yearOf, money, END_MONTH, SQYD_PER_ACRE } from '../core/util.js';
import { TIMELINE, regimeAt } from '../data/history.js';
import { BY_ID, DEFECTS } from '../data/geo.js';
import { BUILD_TYPES, LAYOUT_TYPES, ROLES, LENDERS } from '../data/costs.js';
import { EVENTS } from '../data/events.js';
import { COMPETITORS, FIRST_NAMES, SURNAMES, newGame } from './state.js';
import {
  macroAt, landRate, rentRate, salePrice, capRate, costIndex, dutyRate, salaryIndex,
  makeLandOffer, makeDevAgreement, makeAssetOffer, runDueDiligence, marketView, farFor,
  plotPrice, plotAbsorption,
} from './market.js';
import { creditDecision, takeLoan, serviceDebt, totalDebt, availableLenders, offeredRate, distressedLoans,
  quotePrepayment, prepaymentPenaltyRate, remainingTenure, interestIfHeld } from './finance.js';
import { startProject, tickProject, tickPresales, tickInventory, estimateProject, maxBuildableSqFt,
  remainingCommitments, abandonProject, fundingSchedule, freeSqYd, landConsumedBy,
  estimateLayout, isLayout } from './build.js';
import { tickAsset, assetValue, portfolioNoiAnnual, propertyTax } from './assets.js';
import { balanceSheet, computeRatios, closeYear, landValue } from './accounting.js';

let parcelSeq = 0;
let staffSeq = 0;

// ------------------------------------------------------------------ new game

/**
 * Start a run. The deal desk is seeded immediately: a broker with three years in
 * Kukatpally does not wake up on 1 January with nothing to look at, and the opening
 * screen should present real choices rather than an empty page.
 */
export function startGame(seedText, opts = {}) {
  const s = newGame(seedText, opts);
  refresh(s);
  const rng = getRng(s);
  refreshOffers(s, rng);
  // One development agreement in the opening spread: it is the capital-light route and
  // the player should see it exists before they spend everything on a plot.
  if (!s.offers.some((o) => o.kind === 'devagreement')) {
    s.offers.push(makeDevAgreement(s.month, s, rng));
  }
  saveRng(s, rng);
  refresh(s);
  return s;
}

// ------------------------------------------------------------------ derived state

export function refresh(s) {
  s.macro = macroAt(s.month);
  if (s.demandOverride) s.macro.demand *= s.demandOverride;
  s.macro.demand *= clamp(s.bizConfidence, 0.7, 1.3);
  const bs = balanceSheet(s);
  s.bs = bs;
  s.netWorth = bs.netWorth;
  s.debt = bs.debt;
  s.assetValue = bs.assets;
  s.ratios = computeRatios(s, bs);
  s.avgQuality = s.projects.length || s.assets.length
    ? [...s.projects, ...s.assets].reduce((t, x) => t + (x.quality || 0.65), 0) / (s.projects.length + s.assets.length)
    : 0.65;
  return s;
}

// ------------------------------------------------------------------ player actions

export function buyLand(s, offer, opts = {}) {
  const duty = dutyRate(s.month);
  const price = offer.negotiatedPrice ?? offer.price;
  const dutyAmt = Math.round(price * duty);
  const legal = Math.round(Math.max(5000, price * 0.004));
  const total = price + dutyAmt + legal;
  if (s.cash < total) return { ok: false, msg: `You are short by ${money(total - s.cash)}. Registration and duty alone are ${money(dutyAmt + legal)}.` };

  s.cash -= total;
  const p = {
    id: `PL${++parcelSeq}`, owned: true,
    locality: offer.locality, areaSqYd: offer.areaSqYd,
    label: offer.label, purchased: s.month,
    price, duty: dutyAmt, legal, allInCost: total,
    defects: offer.defects.slice(), known: offer.known.slice(), resolved: [],
    ddConfidence: offer.ddConfidence || 0,
    devAgreement: offer.kind === 'devagreement' ? { ownerShare: offer.ownerShare } : null,
    seller: offer.seller,
  };
  s.parcels.push(p);
  s.stats.landBoughtSqYd += offer.areaSqYd;
  s.offers = s.offers.filter((o) => o.id !== offer.id);
  s.relations.landowners = clamp(s.relations.landowners + 2, 0, 100);
  s.ledger.push({ m: s.month, type: 'Land purchase', amount: -total, note: offer.label });
  s.news.push({
    m: s.month, tag: 'DEAL', head: `Registered: ${offer.label}`,
    body: `Bought from ${offer.seller} for ${money(price)}. Stamp duty, transfer duty and registration came to ${money(dutyAmt)} — ${Math.round(duty * 100)} per cent — and legal charges ${money(legal)}.`,
  });
  return { ok: true, parcel: p };
}

export function signDevAgreement(s, offer) {
  const advance = offer.advance || 0;
  if (s.cash < advance) return { ok: false, msg: 'You cannot fund the refundable advance.' };
  s.cash -= advance;
  const p = {
    id: `PL${++parcelSeq}`, owned: true, isDev: true,
    locality: offer.locality, areaSqYd: offer.areaSqYd,
    label: offer.label, purchased: s.month,
    price: 0, duty: 0, legal: 0, allInCost: advance,
    defects: offer.defects.slice(), known: offer.known.slice(), resolved: [],
    devAgreement: { ownerShare: offer.ownerShare, owner: offer.seller },
    seller: offer.seller,
  };
  s.parcels.push(p);
  s.offers = s.offers.filter((o) => o.id !== offer.id);
  s.news.push({
    m: s.month, tag: 'DEAL', head: `Development agreement signed at ${offer.localityName}`,
    body: `${offer.seller} keeps ${Math.round(offer.ownerShare * 100)} per cent of the built area. You fund one hundred per cent of the construction. No land cost, no land appreciation, and a partner who can stop the project.`,
  });
  return { ok: true, parcel: p };
}

export function buyAssetOffer(s, offer) {
  const duty = dutyRate(s.month);
  const price = offer.negotiatedPrice ?? offer.price;
  const total = Math.round(price * (1 + duty) + price * 0.004);
  if (s.cash < total) return { ok: false, msg: `Short by ${money(total - s.cash)} including ${Math.round(duty * 100)}% duty.` };
  s.cash -= total;
  s.assets.push({
    id: `A${Date.now() % 100000}`, name: offer.label, locality: offer.locality,
    use: offer.use, sqFt: offer.sqFt, rentPerSqFt: offer.rentPerSqFt,
    occupancy: offer.occupancy, targetOcc: 0.92, opexRatio: 0.24, quality: 0.6,
    bookCost: total, completed: s.month, deposit: Math.round(offer.noi / 12 * 3), rentHolidayLeft: 0,
    defects: offer.defects.slice(), known: offer.known.slice(),
  });
  s.offers = s.offers.filter((o) => o.id !== offer.id);
  s.ledger.push({ m: s.month, type: 'Asset purchase', amount: -total, note: offer.label });
  return { ok: true };
}

export function doDueDiligence(s, offer, level) {
  // Advocates' fees at period-appropriate rates: a thirty-year search cost a few
  // thousand rupees in 1995, not a few lakh. The floor rises with the price level.
  const ci = costIndex(s.month);
  const tiers = {
    quick: { cost: Math.round(Math.max(1500 * ci, offer.price * 0.0015)), months: 0, label: 'Encumbrance certificate and a look at the link documents' },
    standard: { cost: Math.round(Math.max(6000 * ci, offer.price * 0.004)), months: 1, label: 'Advocate’s search for thirty years, revenue records, physical survey' },
    deep: { cost: Math.round(Math.max(18000 * ci, offer.price * 0.010)), months: 2, label: 'Full title opinion, revenue and Wakf enquiry, litigation search, boundary survey' },
  };
  const t = tiers[level];
  if (s.cash < t.cost) return { ok: false, msg: 'You cannot afford that level of investigation.' };
  s.cash -= t.cost;
  const rng = getRng(s);
  const found = runDueDiligence(offer, t.cost, t.months, s, rng);
  saveRng(s, rng);
  offer.expiresAt += t.months;
  s.skills.legal = clamp(s.skills.legal + 0.4, 0, 100);
  s.ledger.push({ m: s.month, type: 'Due diligence', amount: -Math.round(t.cost), note: offer.label });
  return { ok: true, found, confidence: offer.ddConfidence, cost: t.cost, tier: t };
}

export function negotiate(s, offer, offerPrice) {
  const rng = getRng(s);
  const skill = s.skills.negotiation / 100;
  const rel = s.relations.landowners / 100;
  const floor = offer.floor * (1 - skill * 0.06 - rel * 0.04);
  let result;
  if (offerPrice >= offer.price) { offer.negotiatedPrice = offerPrice; result = { ok: true, msg: 'Accepted immediately, which should tell you something.' }; }
  else if (offerPrice >= floor) {
    offer.negotiatedPrice = offerPrice; offer.negotiated = true;
    s.skills.negotiation = clamp(s.skills.negotiation + 0.3, 0, 100);
    result = { ok: true, msg: `${offer.seller} accepted ${money(offerPrice)}.` };
  } else if (offerPrice >= floor * 0.9 && rng.f() < skill * 0.5 + rel * 0.2) {
    offer.negotiatedPrice = Math.round((offerPrice + floor) / 2); offer.negotiated = true;
    result = { ok: true, msg: `He would not go to ${money(offerPrice)}, but met you at ${money(offer.negotiatedPrice)}.` };
  } else {
    offer.rejections = (offer.rejections || 0) + 1;
    if (offer.rejections >= 2 && rng.chance(0.5)) {
      s.offers = s.offers.filter((o) => o.id !== offer.id);
      result = { ok: false, msg: `${offer.seller} has taken the property off the market. He was insulted.` };
    } else {
      result = { ok: false, msg: `${offer.seller} refused. "That is not a serious offer."` };
    }
  }
  saveRng(s, rng);
  return result;
}

/**
 * Broker a deal instead of buying it: introduce a buyer, take a commission, use no
 * capital. One to two per cent was the going rate in Hyderabad, which on a small plot
 * is a few thousand rupees — enough to cover the household and the scooter, not enough
 * to build anything. It is how you started and it is how a great many people in this
 * trade stayed alive between projects.
 *
 * It is also not free: deals fall through, and a broker who cannot close stops being
 * called. Every month spent broking is a month not spent building.
 */
export function brokerDeal(s, offerId) {
  const offer = s.offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, msg: 'That offer is gone.' };
  if (offer.kind === 'devagreement') return { ok: false, msg: 'There is no sale to broker — this is a development agreement.' };

  const rng = getRng(s);
  const price = offer.negotiatedPrice ?? offer.price;
  // Finding a buyer at all depends on knowing the market and knowing people.
  const chance = clamp(
    0.30 + s.skills.realestate / 260 + s.skills.negotiation / 400
    + s.relations.landowners / 500 + clamp(s.reputation, 0, 100) / 400
    + (s.macro.demand - 1) * 0.18,
    0.12, 0.88,
  );
  const closed = rng.f() < chance;
  // Full brokerage is 2%, usually split with whoever else touched the deal.
  const rate = closed ? rng.range(0.009, 0.02) : 0;
  const fee = Math.round(price * rate);

  s.offers = s.offers.filter((o) => o.id !== offerId);
  s.brokerage = (s.brokerage || 0) + fee;
  s.stats.dealsBrokered = (s.stats.dealsBrokered || 0) + (closed ? 1 : 0);
  s.stats.dealsAttempted = (s.stats.dealsAttempted || 0) + 1;
  saveRng(s, rng);

  if (!closed) {
    s.relations.landowners = clamp(s.relations.landowners - 2, 0, 100);
    s.news.push({
      m: s.month, tag: 'BROKERAGE', head: `No buyer for ${offer.label}`,
      body: `You showed it to three parties over five weeks. One was interested until his brother-in-law told him the road was too narrow. ${offer.seller} has given it to somebody else.`,
    });
    return { ok: true, closed: false, fee: 0 };
  }

  s.cash += fee;
  s.skills.realestate = clamp(s.skills.realestate + 0.5, 0, 100);
  s.skills.negotiation = clamp(s.skills.negotiation + 0.3, 0, 100);
  s.relations.landowners = clamp(s.relations.landowners + 4, 0, 100);
  s.relations.community = clamp(s.relations.community + 1, 0, 100);
  s.reputation = clamp(s.reputation + 0.4, 0, 100);
  s.revenueYTD += fee;
  s.ledger.push({ m: s.month, type: 'Brokerage', amount: fee, note: offer.label });
  s.news.push({
    m: s.month, tag: 'BROKERAGE', head: `Brokered ${offer.label} for ${money(fee)}`,
    body: `Registered last Tuesday. ${offer.seller} paid your commission in cash at the sub-registrar's office and asked whether you had anything else. No capital of yours went into it, and none of the upside is yours either.`,
  });
  return { ok: true, closed: true, fee };
}

export function launchProject(s, parcelId, typeId, sqFt, mode, name) {
  const parcel = s.parcels.find((p) => p.id === parcelId);
  if (!parcel || parcel.consumed || freeSqYd(parcel) < 100) return { ok: false, msg: 'There is no land left on that parcel.' };
  const fatal = parcel.known.filter((d) => DEFECTS[d].fatal && !(parcel.resolved || []).includes(d));
  if (fatal.length) return { ok: false, msg: `You cannot build on this: ${DEFECTS[fatal[0]].name}.` };
  const lt = LAYOUT_TYPES[typeId];
  if (lt) {
    // Layouts are measured in square yards of site, not square feet of building.
    const free = freeSqYd(parcel);
    if (sqFt > free) return { ok: false, msg: `Only ${free.toLocaleString('en-IN')} sq yd of this parcel is undeveloped.` };
    if (sqFt < lt.minAcres * SQYD_PER_ACRE) {
      return { ok: false, msg: `A ${lt.name.toLowerCase()} needs at least ${lt.minAcres} acre${lt.minAcres === 1 ? '' : 's'} (${Math.round(lt.minAcres * SQYD_PER_ACRE).toLocaleString('en-IN')} sq yd) to be worth laying out.` };
    }
  } else {
    const cap = maxBuildableSqFt(parcel, s);
    if (sqFt > cap) return { ok: false, msg: `Permissible floor area allows only ${cap.toLocaleString('en-IN')} sq ft here today.` };
    const bt = BUILD_TYPES[typeId];
    if (sqFt < bt.minSqFt) return { ok: false, msg: `${bt.name} is not viable below ${bt.minSqFt.toLocaleString('en-IN')} sq ft.` };
  }
  const est = estimateProject(parcel, typeId, sqFt, s);
  // You must be able to fund a serious share of the next twelve months of building,
  // across everything you already have running. Buyer advances cover the rest, if the
  // market cooperates. If it does not, the site simply stops.
  const committed = remainingCommitments(s);
  // Rule of thumb the trade actually used: put up roughly a third of the build cost and
  // fund the rest from buyer advances and borrowing. That is genuinely how Indian
  // residential development was financed — the buyers were the lender — and it is why
  // a builder with twenty-five lakh could run a project costing three times that.
  // Below a third you are not a developer, you are a man with a hole in the ground.
  const need = (committed + est.schedule.peak) * 0.32;
  if (s.cash < need) {
    return {
      ok: false,
      msg: `You cannot fund this. Total build cost ${money(est.budget)} over ${est.approvalMonths + est.months} months`
        + (committed > 0 ? `, on top of ${money(committed)} still to spend on projects already running` : '')
        + `. You should have roughly a third of that in hand — about ${money(need)} — and you have ${money(s.cash)}. `
        + `Build smaller, sell something, or raise money first.`,
    };
  }
  const p = startProject(s, parcel, typeId, sqFt, mode, name);
  s.news.push({
    m: s.month, tag: 'PROJECT', head: `Launched: ${p.name}`,
    body: `${sqFt.toLocaleString('en-IN')} sq ft, budget ${money(p.budget)}, ${p.approvalTotal} months for sanction then ${p.months} months to build. Intended for ${mode === 'hold' ? 'retention and lease' : 'sale'}.`,
  });
  return { ok: true, project: p };
}

export function applyForLoan(s, lenderId, amount, collateralIds) {
  const lender = LENDERS[lenderId];
  if (!lender || (lender.from ?? 0) > s.month) return { ok: false, msg: 'That lender is not available to you.' };
  let collateral = 0;
  for (const id of collateralIds || []) {
    const p = s.parcels.find((x) => x.id === id && x.owned && !x.pledged);
    if (p) collateral += landRate(p.locality, s.month, s) * p.areaSqYd;
    const a = s.assets.find((x) => x.id === id && !x.pledged);
    if (a) collateral += assetValue(a, s);
  }
  if (s.flags.shopPledged) collateral += 900000 * costIndex(s.month);
  const d = creditDecision(lender, amount, collateral, s);
  if (!d.approved) return { ok: false, decision: d, msg: 'Declined.' };
  takeLoan(s, lender, d.amount, d.rate, d.tenure, { collateral: collateralIds });
  for (const id of collateralIds || []) {
    const p = s.parcels.find((x) => x.id === id); if (p) p.pledged = true;
    const a = s.assets.find((x) => x.id === id); if (a) a.pledged = true;
  }
  s.relations.banks = clamp(s.relations.banks + 4, 0, 100);
  s.ledger.push({ m: s.month, type: 'Loan drawn', amount: d.amount, note: lender.name });
  s.news.push({
    m: s.month, tag: 'FINANCE', head: `${lender.name} sanctions ${money(d.amount)}`,
    body: `At ${(d.rate * 100).toFixed(2)} per cent for ${d.tenure} months. ${d.reasons.join(' ')}`,
  });
  return { ok: true, decision: d };
}

/**
 * Repay a loan early, in part or in full. Cash sitting idle earns nothing while a
 * sixteen-per-cent facility runs against it, so clearing debt is often the best
 * available use of surplus money — but it is also the money you will not have when
 * the next site needs paying for, and banks do not lend it back on demand.
 */
export function repayLoan(s, loanId, amount) {
  const loan = s.loans.find((l) => l.id === loanId);
  if (!loan) return { ok: false, msg: 'That facility is already closed.' };
  const q = quotePrepayment(loan, amount, s.month);
  if (q.principal < 1000) return { ok: false, msg: 'Repay at least ₹1,000.' };
  if (s.cash < q.cashRequired) {
    return { ok: false, msg: `You need ${money(q.cashRequired)} — ${money(q.principal)} of principal plus ${money(q.penalty)} of charges — and you have ${money(s.cash)}.` };
  }

  s.cash -= q.cashRequired;
  loan.outstanding -= q.principal;
  loan.prepaid = (loan.prepaid || 0) + q.principal;

  let released = [];
  if (q.full || loan.outstanding < 1) {
    s.loans = s.loans.filter((l) => l.id !== loanId);
    // Release security, unless another facility is also charged on it.
    for (const id of loan.collateral || []) {
      const stillPledged = s.loans.some((l) => (l.collateral || []).includes(id));
      if (stillPledged) continue;
      const parcel = s.parcels.find((x) => x.id === id);
      if (parcel) { parcel.pledged = false; released.push(parcel.label); }
      const asset = s.assets.find((x) => x.id === id);
      if (asset) { asset.pledged = false; released.push(asset.name); }
    }
    loan.missed = 0;
  }

  // Lenders remember who repaid them. So do private financiers, for different reasons.
  if (loan.kind === 'private') s.relations.financiers = clamp(s.relations.financiers + (q.full ? 10 : 4), 0, 100);
  else s.relations.banks = clamp(s.relations.banks + (q.full ? 9 : 3), 0, 100);
  if (q.full) s.reputation = clamp(s.reputation + 1, 0, 100);

  // The jewel loan is not an ordinary facility. Closing it puts the gold back.
  if (q.full && loan.secret) {
    s.flags.goldRedeemed = true;
    s.relations.family = clamp(s.relations.family + 15, 0, 100);
    s.stress = Math.max(0, s.stress - 6);
    s.news.push({
      m: s.month, tag: 'PERSONAL', head: 'Your mother’s gold is back in the locker',
      body: 'You collected it from Andhra Bank on a Thursday afternoon and put it back where it had been, and she has still never been told it left. You have, at least, stopped being a man who pledged his mother’s jewellery.',
    });
  }

  s.ledger.push({
    m: s.month, type: q.full ? 'Loan closed' : 'Loan prepayment',
    amount: -q.cashRequired,
    note: `${loan.lender}${q.penalty > 0 ? ` (incl. ${money(q.penalty)} charges)` : ''}`,
  });
  s.news.push({
    m: s.month, tag: 'FINANCE',
    head: q.full ? `${loan.lender} facility closed` : `Prepaid ${money(q.principal)} to ${loan.lender}`,
    body: q.full
      ? `Repaid in full at a cost of ${money(q.cashRequired)}${q.penalty > 0 ? `, including ${money(q.penalty)} of foreclosure charges` : ''}. `
        + `It saves roughly ${money(q.interestSaved)} of interest you would otherwise have paid over ${q.tenureBefore} months.`
        + (released.length ? ` Security released: ${released.join(', ')}.` : '')
      : `Outstanding down to ${money(loan.outstanding)}. On the same instalment the facility now closes in about `
        + `${q.tenureAfter} months rather than ${q.tenureBefore}, saving around ${money(q.interestSaved)} of interest.`,
  });
  return { ok: true, quote: q, released };
}

export function sellParcel(s, parcelId, factor = 1) {
  const p = s.parcels.find((x) => x.id === parcelId);
  if (!p) return { ok: false, msg: 'Not found.' };
  if ((p.usedSqYd || 0) > 0) return { ok: false, msg: 'Part of this parcel is under development. Finish or abandon the phase first.' };
  if (p.pledged) return { ok: false, msg: 'This land is pledged to a lender. Repay first.' };
  let gross = landRate(p.locality, s.month, s) * p.areaSqYd * factor;
  for (const d of p.known) {
    if ((p.resolved || []).includes(d)) continue;
    gross *= (d === 'ASSIGNED_LAND' ? 0.03 : d === 'WAKF_CLAIM' ? 0.3 : 0.72);
  }
  gross *= (p.stigma || 1);
  // A buyer runs his own search. Some of your hidden problems become his discount.
  const rng = getRng(s);
  const hidden = p.defects.filter((d) => !p.known.includes(d));
  for (const d of hidden) if (rng.chance(0.6)) gross *= 1 - DEFECTS[d].severity * 0.5;
  saveRng(s, rng);
  const net = Math.round(gross * 0.98);
  s.cash += net;
  p.owned = false; p.sold = s.month; p.soldFor = net;
  s.parcels = s.parcels.filter((x) => x.id !== parcelId);
  const gain = net - p.allInCost;
  s.revenueYTD += net; s.costYTD += p.allInCost;
  s.ledger.push({ m: s.month, type: 'Land sale', amount: net, note: `${p.label} (${gain >= 0 ? 'gain' : 'loss'} ${money(Math.abs(gain))})` });
  return { ok: true, net, gain };
}

export function sellAsset(s, assetId, factor = 1) {
  const a = s.assets.find((x) => x.id === assetId);
  if (!a) return { ok: false, msg: 'Not found.' };
  if (a.pledged) return { ok: false, msg: 'Pledged to a lender.' };
  const v = Math.round(assetValue(a, s) * factor * 0.97);
  s.cash += v;
  s.assets = s.assets.filter((x) => x.id !== assetId);
  s.revenueYTD += v; s.costYTD += a.bookCost;
  s.ledger.push({ m: s.month, type: 'Asset sale', amount: v, note: a.name });
  return { ok: true, net: v, gain: v - a.bookCost };
}

export function hire(s, roleKey) {
  const role = ROLES[roleKey];
  const rng = getRng(s);
  const salary = Math.round(role.base * salaryIndex(s.month) * rng.range(0.9, 1.2));
  const person = {
    id: `S${++staffSeq}`, role: roleKey, roleName: role.name, impact: role.impact,
    name: `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`,
    salary, skill: Math.round(clamp(rng.normal(role.skillCap * 0.75, 12), 20, role.skillCap)),
    loyalty: Math.round(rng.range(45, 75)), corruptionRisk: rng.range(0.02, 0.16),
    joined: s.month,
  };
  saveRng(s, rng);
  s.staff.push(person);
  s.news.push({ m: s.month, tag: 'PEOPLE', head: `${person.name} joins as ${role.name}`, body: `Salary ${money(salary)} a month.` });
  return person;
}

export function fire(s, id) {
  const p = s.staff.find((x) => x.id === id);
  if (!p) return;
  s.cash -= p.salary * 2;
  s.staff = s.staff.filter((x) => x.id !== id);
}

export function setAsk(s, invId, pricePerSqFt) {
  const inv = s.inventory.find((i) => i.id === invId);
  if (inv) inv.askPerSqFt = pricePerSqFt;
}

// ------------------------------------------------------------------ rng plumbing

function getRng(s) { const r = makeRng(s.seed); r.state = s.rngState; return r; }
function saveRng(s, r) { s.rngState = r.state; }

// ------------------------------------------------------------------ paying for things

/**
 * Pay a bill. You cannot spend money you do not have: anything beyond a small overdraft
 * becomes an unpaid creditor, which sits on the balance sheet, attracts interest and
 * eventually attracts a winding-up petition. This is what actually happens to builders
 * who run out of money, and it stops a single event from driving cash to minus sixteen
 * crore.
 */
/** Discretionary payment: you can only pay what you have. Never creates a creditor. */
export function pay(s, amount) {
  if (amount <= 0) return 0;
  const limit = Math.max(200000 * costIndex(s.month), (s.bs ? s.bs.assets : 0) * 0.03);
  const paid = Math.min(amount, Math.max(0, s.cash + limit));
  s.cash -= paid;
  return paid;
}

export function spend(s, amount) {
  if (amount <= 0) return 0;
  const limit = Math.max(400000 * costIndex(s.month), (s.bs ? s.bs.assets : 0) * 0.06);
  const paid = Math.min(amount, Math.max(0, s.cash + limit));
  s.cash -= paid;
  const unpaid = amount - paid;
  if (unpaid > 50000) {
    s.payables = (s.payables || 0) + unpaid;
    s.news.push({
      m: s.month, tag: 'FINANCE', head: `Unable to pay ${money(unpaid)}`,
      body: 'The bill has gone unpaid. It is now a creditor on your books, and creditors in this trade do not write polite reminders.',
    });
  }
  return paid;
}

// ------------------------------------------------------------------ the fx API

function buildFx(s, rng) {
  const fx = {
    scaled: (v) => Math.round(v * costIndex(s.month)),
    // Amounts that should track the size of the company, not just the price level:
    // nobody asks a one-project builder for the donation they ask a conglomerate for.
    byScale: (v) => Math.round(v * costIndex(s.month) * clamp(Math.max(s.netWorth, 0) / 3e7, 0.10, 25)),
    costIndex: () => costIndex(s.month),
    landRate: (loc) => landRate(loc, s.month, s),
    defectName: (d) => DEFECTS[d].name,
    defectDesc: (d) => DEFECTS[d].desc,

    cash(v) { if (v < 0) pay(s, -v); else s.cash += v; if (v !== 0) s.ledger.push({ m: s.month, type: v > 0 ? 'Receipt' : 'Payment', amount: Math.round(v), note: 'Event' }); },
    rep(v) { s.reputation = clamp(s.reputation + v, 0, 100); },
    rel(k, v) { if (s.relations[k] !== undefined) s.relations[k] = clamp(s.relations[k] + v, 0, 100); },
    skill(k, v) { s.skills[k] = clamp(s.skills[k] + v, 0, 100); },
    news(text) { s.news.push({ m: s.month, tag: 'NOTE', head: text, body: '' }); },

    privateLoan(amount, rate, tenure) {
      takeLoan(s, LENDERS.chalapathi, Math.round(amount), rate, tenure);
      s.ledger.push({ m: s.month, type: 'Private borrowing', amount: Math.round(amount), note: `at ${(rate * 100).toFixed(0)}% p.a.` });
    },
    penalise(extra) { for (const l of s.loans) l.rate += extra; },

    delay(pid, months) { const p = s.projects.find((x) => x.id === pid); if (p) { p.delay += months; p.riskDelay = Math.min(p.months * 0.5, (p.riskDelay || 0) + months); } },
    overrun(pid, pctv) { const p = s.projects.find((x) => x.id === pid); if (p) p.overrunPct = clamp(p.overrunPct + pctv, -0.1, 0.4); },
    quality(pid, v) { const p = s.projects.find((x) => x.id === pid); if (p) p.quality = clamp(p.quality + v, 0.2, 1); },
    speedApproval(pid, months) { const p = s.projects.find((x) => x.id === pid); if (p) p.approvalLeft = Math.max(0, p.approvalLeft - months); },
    delayApproval(pid, months) { const p = s.projects.find((x) => x.id === pid); if (p) p.approvalLeft += months; },
    shrinkPipeline(f) { for (const p of s.projects) if (!p.done) { p.sqFt = Math.round(p.sqFt * (1 - f)); p.presold = Math.min(p.presold || 0, p.sqFt); } },
    deviationFlag() { s.flags.deviationFlagged = true; },
    constructionCapability() {
      return clamp(0.2 + s.skills.construction / 220 + (s.staff.some((x) => x.impact === 'construction') ? 0.2 : 0), 0.15, 0.85);
    },

    bribe(pid, r) {
      s.stats.bribesTaken += 1;
      const caught = r.f() < 0.18 + s.stats.bribesTaken * 0.05 + (s.reputation > 55 ? 0.08 : 0);
      const amt = fx.scaled(120000);
      pay(s, amt);
      if (caught) {
        s.reputation = clamp(s.reputation - 22, 0, 100);
        s.relations.bureaucrats = clamp(s.relations.bureaucrats - 25, 0, 100);
        s.relations.journalists = clamp(s.relations.journalists - 10, 0, 100);
        s.relations.banks = clamp(s.relations.banks - 15, 0, 100);
        s.flags.underInvestigation = true;
        const p = s.projects.find((x) => x.id === pid); if (p) p.approvalLeft += r.int(6, 18);
        s.news.push({
          m: s.month, tag: 'CRISIS', head: 'Anti-corruption enquiry opened',
          body: 'The payment was recorded. The Anti-Corruption Bureau has registered a case and your file is now radioactive. Every bank and every buyer will hear about this.',
        });
      } else {
        const p = s.projects.find((x) => x.id === pid); if (p) p.approvalLeft = Math.max(0, p.approvalLeft - r.int(2, 5));
        s.relations.bureaucrats = clamp(s.relations.bureaucrats + 6, 0, 100);
        s.reputation = clamp(s.reputation - 2, 0, 100);
        s.news.push({ m: s.month, tag: 'NOTE', head: 'The file moved.', body: 'Nobody said anything. That is how it works, until it does not.' });
      }
    },

    resolveDefect(parcelId, d, how, r) {
      const p = s.parcels.find((x) => x.id === parcelId);
      if (!p) return;
      if (!p.known.includes(d)) p.known.push(d);
      p.resolved = p.resolved || [];
      s.stats.defectsHit += 1;
      const def = DEFECTS[d];
      const legalStrength = clamp(0.3 + s.skills.legal / 200 + (s.staff.some((x) => x.impact === 'legal') ? 0.2 : 0) + s.relations.politicians / 400, 0.2, 0.9);
      const value = landRate(p.locality, s.month, s) * p.areaSqYd;

      if (how === 'litigate') {
        const cost = Math.round(Math.min(Math.max(fx.scaled(150000), value * 0.03), Math.max(fx.scaled(200000), s.cash * 0.6 + fx.scaled(100000))));
        pay(s, cost);
        if (def.fatal) {
          s.news.push({ m: s.month, tag: 'CRISIS', head: `${p.label}: the suit is hopeless`, body: `${def.name}. No court can validate this transfer. The land, and the money you paid for it, are gone.` });
          p.stigma = 0.02;
        } else if (r.f() < legalStrength) {
          p.resolved.push(d);
          s.news.push({ m: s.month, tag: 'LEGAL', head: `${p.label}: you won`, body: `It took time and ${money(cost)}, but the claim was dismissed.` });
        } else {
          p.stigma = (p.stigma || 1) * 0.6;
          s.news.push({ m: s.month, tag: 'LEGAL', head: `${p.label}: injunction granted against you`, body: 'Nothing can be built or sold until this is decided. Budget years, not months.' });
          const proj = s.projects.find((x) => x.parcelId === p.id && !x.done);
          if (proj) proj.delay += r.int(8, 24);
        }
      } else if (how === 'settle') {
        const cost = Math.round(Math.min(value * def.severity * r.range(0.18, 0.42), Math.max(fx.scaled(200000), s.cash * 0.8)));
        pay(s, cost);
        if (def.fatal) {
          p.stigma = 0.05;
          s.news.push({ m: s.month, tag: 'CRISIS', head: `${p.label}: nothing to settle`, body: 'You cannot buy good title to assigned land. You paid a man to go away and another will come.' });
        } else {
          p.resolved.push(d);
          s.news.push({ m: s.month, tag: 'LEGAL', head: `${p.label}: settled for ${money(cost)}`, body: 'Registered release deed obtained. Expensive, quick, and final.' });
        }
      } else {
        if (r.f() < 0.35) {
          s.news.push({ m: s.month, tag: 'NOTE', head: `${p.label}: nothing happened`, body: 'He has not come back. Yet.' });
        } else {
          const proj = s.projects.find((x) => x.parcelId === p.id && !x.done);
          if (proj) proj.delay += r.int(3, 12);
          p.stigma = (p.stigma || 1) * (def.fatal ? 0.05 : 0.55);
          s.reputation = clamp(s.reputation - 5, 0, 100);
          s.news.push({ m: s.month, tag: 'CRISIS', head: `${p.label}: stop-work order`, body: `${def.name}. You built anyway. The order came, and buyers found out.` });
        }
      }
    },

    fireSale(factor) {
      let raised = 0;
      for (const inv of s.inventory) { raised += inv.remaining * inv.askPerSqFt * factor; inv.remaining = 0; }
      s.inventory = [];
      for (const p of s.parcels.filter((x) => x.owned && !x.usedBy && !x.pledged).slice(0, 2)) {
        const r = sellParcel(s, p.id, factor); if (r.ok) raised += 0;
      }
      s.cash += Math.round(raised);
      s.revenueYTD += Math.round(raised);
      s.ledger.push({ m: s.month, type: 'Distress sale', amount: Math.round(raised), note: `at ${Math.round(factor * 100)}% of asking` });
      s.news.push({ m: s.month, tag: 'FINANCE', head: `Sold inventory at ${Math.round((1 - factor) * 100)}% below asking`, body: `Raised ${money(raised)}. The market now knows your price.` });
    },
    pledgeLand() {
      const p = s.parcels.find((x) => x.owned && !x.pledged);
      if (p) { p.pledged = true; s.news.push({ m: s.month, tag: 'FINANCE', head: `${p.label} pledged`, body: 'Additional security lodged with the bank.' }); }
    },
    emergencyEquity(dilution) {
      const raise = Math.round(Math.max(s.debt * 0.35, s.netWorth * 0.2));
      s.cash += raise; s.equityPaidIn += raise;
      s.dilution = (s.dilution || 0) + dilution;
      s.news.push({
        m: s.month, tag: 'FINANCE', head: `Emergency equity: ${money(raise)} for ${Math.round(dilution * 100)}% of the company`,
        body: 'At this valuation it is not investment, it is rescue. You keep control on paper and very little else.',
      });
    },
    cutOverheads(f) {
      const n = Math.max(0, Math.floor(s.staff.length * f));
      const gone = s.staff.slice(-n);
      for (const p of gone) fire(s, p.id);
      s.news.push({ m: s.month, tag: 'PEOPLE', head: `${n} people let go`, body: 'Overheads cut. Capability cut with them.' });
    },
    loyaltyAll(v) { for (const p of s.staff) p.loyalty = clamp(p.loyalty + v, 0, 100); },
    raise(id, f) { const p = s.staff.find((x) => x.id === id); if (p) p.salary = Math.round(p.salary * (1 + f)); },
    loyalty(id, v) { const p = s.staff.find((x) => x.id === id); if (p) p.loyalty = clamp(p.loyalty + v, 0, 100); },
    quit(id) { s.staff = s.staff.filter((x) => x.id !== id); },
    fire: (id) => fire(s, id),
    hireRole: (r) => hire(s, r),

    rentCut(id, f, months) {
      const a = s.assets.find((x) => x.id === id);
      if (a) { a.rentPerSqFt *= 1 - f; a.rentHolidayLeft = months; }
    },
    vacate(id) { const a = s.assets.find((x) => x.id === id); if (a) a.occupancy = Math.max(0, a.occupancy - 0.45); },
    marketRents(f) { for (const a of s.assets) a.rentPerSqFt *= 1 + f; },
    fillVacancy(f) { for (const a of s.assets) a.occupancy = clamp(a.occupancy + (a.targetOcc - a.occupancy) * f, 0, 1); },
    upgradeAsset(id, f) { const a = s.assets.find((x) => x.id === id); if (a) { a.quality = clamp(a.quality + f, 0.2, 1); a.rentPerSqFt *= 1 + f * 0.8; a.targetOcc = clamp(a.targetOcc + f * 0.4, 0.5, 0.97); } },
    sellAsset: (id, f) => sellAsset(s, id, f),
    sellParcel: (id, f) => sellParcel(s, id, f),

    repriceInventory(f) { for (const i of s.inventory) i.askPerSqFt *= 1 + f; },
    absorption(v) { s.absorptionBoost = clamp((s.absorptionBoost || 0) + v, -0.6, 1.5); },
    stockSteel() { const c = Math.min(fx.scaled(400000), Math.max(0, s.cash * 0.4)); pay(s, c); for (const p of s.projects) if (!p.done) p.overrunPct -= 0.01; return c; },
    slowMonth(n) { for (const p of s.projects) if (!p.done) { p.delay += n; p.riskDelay = Math.min(p.months * 0.5, (p.riskDelay || 0) + n); } },
    suggestBuild(pid, type) { s.suggestion = { parcelId: pid, type }; },

    buyoutJV(id, mult) {
      const jv = s.jvs.find((x) => x.id === id);
      if (!jv) return;
      const cost = Math.round(jv.partnerCapital * mult);
      if (s.cash < cost) {
        s.news.push({
          m: s.month, tag: 'DEAL', head: `You cannot afford to buy out ${jv.partner}`,
          body: `He wants ${money(cost)} and you have ${money(s.cash)}. The project stays frozen and he now knows exactly how weak your position is.`,
        });
        jv.frozenUntil = s.month + 9;
        return;
      }
      pay(s, cost);
      s.jvs = s.jvs.filter((x) => x.id !== id);
      s.news.push({ m: s.month, tag: 'DEAL', head: `Bought out ${jv.partner}`, body: `Paid ${money(cost)}. The project is entirely yours, including the problems.` });
    },
    jvFreeze(id, months) {
      const jv = s.jvs.find((x) => x.id === id);
      if (!jv) return;
      jv.frozenUntil = s.month + months;
      for (const p of s.projects) if (p.jvId === id && !p.done) p.delay += months;
    },

    // ---- offer generators used by opportunity events
    landownerOffer(r) {
      const o = makeLandOffer(s.month, s, r, { big: r.chance(0.4) });
      o.expiresAt = s.month + r.int(2, 4);
      s.offers.push(o);
      return {
        head: 'A landowner has come looking for you',
        body: `${o.seller} owns ${o.label.replace(' at ', ' at ')}. He has heard your name. He is selling because of ${o.motive}, and he is asking ${money(o.price)} — about ₹${o.askRate.toLocaleString('en-IN')} a square yard.\n\nHe has not shown anybody else. He would like an answer.`,
        choices: [
          { label: 'Take it to the deal desk', hint: 'Adds the parcel to your live opportunities so you can investigate and negotiate.', do: () => { } },
          { label: 'Not interested', hint: 'He will remember.', do: ({ fx: f }) => { s.offers = s.offers.filter((x) => x.id !== o.id); f.rel('landowners', -4); } },
        ],
      };
    },
    distressOffer(r) {
      const o = makeLandOffer(s.month, s, r, { distress: true, big: r.chance(0.5) });
      o.expiresAt = s.month + r.int(1, 3);
      s.offers.push(o);
      return {
        head: 'Somebody needs to sell this week',
        body: `${o.seller} is under pressure — ${o.motive}. ${o.label}, at ${money(o.price)}, which is well under what it was quoted at last year.\n\nThere is a reason it is cheap. There is always a reason it is cheap. Whether the reason is his problem or yours depends entirely on how carefully you look.`,
        choices: [
          { label: 'Put it on the deal desk', hint: 'Investigate before you commit.', do: () => { } },
          { label: 'Pass', hint: '', do: ({ fx: f }) => { s.offers = s.offers.filter((x) => x.id !== o.id); } },
        ],
      };
    },
    anchorTenantOffer(r) {
      const a = r.pick(s.assets.filter((x) => x.use === 'office' && x.occupancy < 0.9));
      const sqFt = Math.min(a.sqFt * r.range(0.4, 0.9), a.sqFt * (1 - a.occupancy));
      const disc = r.range(0.82, 0.95);
      return {
        head: 'A multinational wants space',
        body: `Their real estate manager has walked ${a.name} twice. They want ${Math.round(sqFt).toLocaleString('en-IN')} square feet on a nine-year lease with a lock-in of three, escalation of fifteen per cent every three years, and a rent ${Math.round((1 - disc) * 100)} per cent below your asking.\n\nThey also want six months rent free for fit-out, and they will not negotiate on the lock-in.`,
        choices: [
          { label: 'Sign it', hint: 'Below-market rent, but a covenant a bank will lend against.',
            do: ({ fx: f }) => {
              a.occupancy = clamp(a.occupancy + sqFt / a.sqFt, 0, 1);
              a.rentPerSqFt *= disc; a.rentHolidayLeft = 6;
              a.deposit += Math.round(sqFt * a.rentPerSqFt * 6);
              s.cash += Math.round(sqFt * a.rentPerSqFt * 6);
              a.anchor = true; f.rep(6); f.rel('banks', 8); f.rel('investors', 8);
              f.news(`${a.name} anchored on a nine-year lease. That single document just made the building financeable.`);
            } },
          { label: 'Hold out for your asking rent', hint: 'They have four other buildings to look at.',
            do: ({ fx: f, rng: rr }) => {
              if (rr.chance(0.3)) { a.occupancy = clamp(a.occupancy + sqFt / a.sqFt, 0, 1); f.rep(4); f.news('They blinked and signed at your rent.'); }
              else { f.news('They took the building down the road. Your floors are still empty.'); f.rel('investors', -3); }
            } },
        ],
      };
    },
    jvOffer(r) {
      const partner = `${r.pick(FIRST_NAMES)} ${r.pick(SURNAMES)}`;
      const loc = r.pick(Object.keys(BY_ID));
      const areaSqYd = Math.round(r.range(2000, 9000));
      const value = Math.round(landRate(loc, s.month, s) * areaSqYd);
      const share = r.range(0.45, 0.62);
      return {
        head: `${partner} wants to put land into a joint venture`,
        body: `He owns ${areaSqYd.toLocaleString('en-IN')} square yards at ${BY_ID[loc].name}, worth roughly ${money(value)}. He has no ability to build and no intention of selling.\n\nHe proposes: he contributes the land, you contribute the entire construction cost and the management, and he takes ${Math.round(share * 100)} per cent of the revenue.`,
        choices: [
          { label: `Accept at ${Math.round(share * 100)}%`, hint: 'No land capital required. A partner who can freeze you.',
            do: ({ fx: f }) => {
              const p = { id: `PL${++parcelSeq}`, owned: true, isJv: true, locality: loc, areaSqYd, label: `JV land, ${BY_ID[loc].name}`, purchased: s.month, price: 0, duty: 0, legal: 0, allInCost: 0, defects: [], known: [], resolved: [], devAgreement: { ownerShare: share, owner: partner } };
              s.parcels.push(p);
              s.jvs.push({ id: `JV${s.jvs.length + 1}`, name: `JV at ${BY_ID[loc].name}`, partner, share, partnerCapital: value, parcelId: p.id });
              f.rel('landowners', 8);
            } },
          { label: 'Counter at a lower share', hint: 'Your negotiation skill decides this.',
            do: ({ fx: f, rng: rr }) => {
              if (rr.f() < s.skills.negotiation / 130) {
                const ns = share - 0.1;
                const p = { id: `PL${++parcelSeq}`, owned: true, isJv: true, locality: loc, areaSqYd, label: `JV land, ${BY_ID[loc].name}`, purchased: s.month, price: 0, duty: 0, legal: 0, allInCost: 0, defects: [], known: [], resolved: [], devAgreement: { ownerShare: ns, owner: partner } };
                s.parcels.push(p);
                s.jvs.push({ id: `JV${s.jvs.length + 1}`, name: `JV at ${BY_ID[loc].name}`, partner, share: ns, partnerCapital: value, parcelId: p.id });
                f.news(`Agreed at ${Math.round(ns * 100)} per cent.`);
              } else { f.news('He walked. Somebody else will take it at his number.'); f.rel('landowners', -3); }
            } },
          { label: 'Decline', hint: '', do: () => { } },
        ],
      };
    },
    institutionalOffer(r) {
      const raise = Math.round(s.netWorth * r.range(0.15, 0.35));
      const stake = r.range(0.12, 0.26);
      return {
        head: 'A private equity fund wants a stake in the rental portfolio',
        body: `They have looked at your leased assets, your rent rolls and your title files for four months. They will put ${money(raise)} into a platform holding the income assets, for ${Math.round(stake * 100)} per cent, with a board seat, audited accounts, a quarterly reporting pack and drag-along rights after seven years.\n\nThey are not interested in the development business. They have said so twice.`,
        choices: [
          { label: 'Take the money and the governance', hint: 'Dilution, discipline, and a cost of capital nobody else in Hyderabad has.',
            do: ({ fx: f }) => {
              s.cash += raise; s.equityPaidIn += raise; s.dilution = (s.dilution || 0) + stake;
              s.flags.institutional = true; s.flags.cleanBooks = true;
              f.rel('investors', 25); f.rel('banks', 15); f.rep(10);
              f.news('Institutional capital on the register. Your borrowing cost drops and your freedom of action drops with it.');
            } },
          { label: 'Take a smaller cheque without the board seat', hint: 'Less money, less interference. They may refuse.',
            do: ({ fx: f, rng: rr }) => {
              if (rr.chance(0.4)) { s.cash += raise * 0.5; s.equityPaidIn += raise * 0.5; s.dilution = (s.dilution || 0) + stake * 0.6; f.rel('investors', 10); }
              else { f.news('They declined. Funds do not write cheques without governance.'); f.rel('investors', -5); }
            } },
          { label: 'Stay private', hint: 'Full control, slower growth.', do: ({ fx: f }) => { f.rel('investors', -6); f.rep(2); } },
        ],
      };
    },
    diversifyOffer(r) {
      const sectors = [
        { id: 'warehouse', name: 'Logistics and warehousing', cost: 0.10, yield: 0.11, desc: 'Post-ORR, post-GST, national occupiers want large-format warehouses on ninety-nine-year leases. Low glamour, very high certainty.' },
        { id: 'datacentre', name: 'Data centres', cost: 0.14, yield: 0.13, desc: 'Power, fibre, cooling and covenants from companies with balance sheets larger than the state government. Capital-hungry and technical.' },
        { id: 'hospitality', name: 'Hotels', cost: 0.12, yield: 0.08, desc: 'An operating business dressed as real estate. Cyclical, staff-heavy, and it will teach you humility.' },
        { id: 'roads', name: 'Road and infrastructure contracting', cost: 0.16, yield: 0.10, desc: 'Government contracts, working capital that never comes back on time, and political exposure you cannot switch off.' },
        { id: 'retailops', name: 'Shopping centre operations', cost: 0.11, yield: 0.09, desc: 'Not building malls but running them: leasing, marketing, footfall. A genuinely different skill.' },
      ].filter((x) => !s.subsidiaries.some((y) => y.id === x.id));
      if (!sectors.length) return null;
      const sec = r.pick(sectors);
      const cost = Math.round(s.netWorth * sec.cost);
      return {
        head: `An opportunity to enter ${sec.name.toLowerCase()}`,
        body: `${sec.desc}\n\nEntry costs roughly ${money(cost)} of capital plus a management team you do not currently have. Stabilised return of about ${Math.round(sec.yield * 100)} per cent on capital employed, in three to five years, if it is run properly.\n\nYou cannot run it yourself. You are already stretched.`,
        choices: [
          { label: 'Enter it properly: capital plus a hired management team', hint: 'Expensive. The only version that works.',
            do: ({ fx: f }) => {
              if (s.cash < cost) { f.news(`You could not fund the entry into ${sec.name.toLowerCase()}.`); return; }
              pay(s, cost);
              s.subsidiaries.push({ id: sec.id, name: sec.name, capital: cost, value: cost, yield: sec.yield, quality: 0.8, started: s.month });
              hire(s, 'coo');
              f.rep(4);
              f.news(`${sec.name} arm established with ${money(cost)} of capital and a proper management team.`);
            } },
          { label: 'Enter it cheaply and manage it yourself', hint: 'Half the capital. Much worse odds.',
            do: ({ fx: f, rng: rr }) => {
              const c = Math.round(cost * 0.5);
              if (s.cash < c) { f.news('Not enough cash even for the cheap version.'); return; }
              pay(s, c);
              const ok = rr.f() < 0.4;
              s.subsidiaries.push({ id: sec.id, name: sec.name, capital: c, value: ok ? c : c * 0.5, yield: ok ? sec.yield * 0.8 : sec.yield * 0.3, quality: ok ? 0.6 : 0.3, started: s.month });
              s.stress += 12;
              f.news(ok ? `${sec.name} started lean. It is working, so far.` : `${sec.name} started lean. It is not working, and it is eating your attention.`);
            } },
          { label: 'Stay focused on real estate', hint: 'Focus is a strategy.', do: ({ fx: f }) => { f.rep(1); } },
        ],
      };
    },
    infraRumour(r) {
      const loc = r.pick(Object.values(BY_ID).filter((l) => l.zone !== 'core'));
      const real = r.chance(0.42);
      const kind = r.pick(['a four-lane road widening', 'a flyover', 'an IT park', 'a ring road interchange', 'a government medical college', 'a railway terminal', 'a special economic zone']);
      return {
        head: `Talk of ${kind} at ${loc.name}`,
        body: `Your broker says it is confirmed. A man at the Secretariat says the file exists. The local MLA has been photographed at the site. Land agents in ${loc.name} have raised quotes twenty per cent this month.\n\nNothing has been notified in the gazette. Nothing has been surveyed. Nothing is certain, and everybody is behaving as though it is.`,
        choices: [
          { label: `Buy in ${loc.name} now, before it is confirmed`, hint: 'The whole game, in one decision.',
            do: ({ fx: f, rng: rr }) => {
              const o = makeLandOffer(s.month, s, rr, { locality: loc.id, big: true });
              o.askRate = Math.round(o.askRate * 1.18);
              o.price = o.askRate * o.areaSqYd;
              o.expiresAt = s.month + 2;
              o.rumour = real;
              s.offers.push(o);
              f.news(`A parcel at ${loc.name} is on your deal desk at the new, higher quote.`);
            } },
          { label: 'Verify it first — pay a consultant to check the file', hint: `${money(fx.scaled(60000))}. Costs you the window.`,
            do: ({ fx: f }) => {
              f.cash(-fx.scaled(60000));
              if (real) f.news(`The file is genuine, though the timeline is anybody's guess. Prices at ${loc.name} have already moved another twelve per cent while you checked.`);
              else f.news(`There is no file. The rumour was started by three land agents who had already bought at ${loc.name}.`);
              s.flags[`rumour_${loc.id}`] = real ? 'true' : 'false';
            } },
          { label: 'Ignore it', hint: 'Most of these are nothing.', do: () => { } },
        ],
      };
    },
    discountedOffers(r, factor) {
      for (let i = 0; i < 3; i++) {
        const o = makeLandOffer(s.month, s, r, { distress: true });
        o.askRate = Math.round(o.askRate * factor);
        o.price = o.askRate * o.areaSqYd;
        o.floor = Math.round(o.price * 0.9);
        s.offers.push(o);
      }
    },
  };
  return fx;
}

// ------------------------------------------------------------------ events

function pickEvent(s, rng) {
  const fxProbe = buildFx(s, rng);
  const pool = [];
  for (const e of EVENTS) {
    const cd = s.eventCooldown[e.id] || -99;
    if (s.month - cd < (e.cooldown || 30)) continue;
    let ok = false;
    try { ok = e.when(s); } catch (err) { ok = false; }
    if (!ok) continue;
    let w = 0;
    try { w = e.weight(s); } catch (err) { w = 0; }
    if (w > 0) pool.push([e, w]);
  }
  if (!pool.length) return null;
  const e = rng.weighted(pool);
  let card = null;
  try { card = e.build(s, rng, fxProbe); } catch (err) { card = null; }
  if (!card) return null;
  s.eventCooldown[e.id] = s.month;
  card.id = e.id;
  card.cat = e.cat;
  return card;
}

export function resolveEvent(s, choiceIndex) {
  const card = s.pendingEvent;
  if (!card) return;
  const rng = getRng(s);
  const fx = buildFx(s, rng);
  const ch = card.choices[choiceIndex];
  try { ch.do({ s, rng, fx }); } catch (err) { console.error('event effect failed', card.id, err); }
  s.news.push({ m: s.month, tag: 'DECISION', head: card.head, body: `You chose: ${ch.label}` });
  saveRng(s, rng);
  s.pendingEvent = null;
  refresh(s);
}

// ------------------------------------------------------------------ competitors

function tickCompetitors(s, rng) {
  for (const c of COMPETITORS) {
    if (c.from === s.month && !s.competitors.some((x) => x.id === c.id)) {
      s.competitors.push({ ...c, scale: c.strength });
      s.news.push({ m: s.month, tag: 'MARKET', head: `${c.name} enters the market`, body: c.desc });
    }
  }
  for (const c of s.competitors) {
    const growth = (s.macro.demand - 0.95) * 0.02 * (c.style === 'aggressive' ? 1.8 : c.style === 'reckless' ? 2.2 : 1);
    c.scale = clamp(c.scale * (1 + growth) + rng.normal(0, 0.004), 0.02, 3);
    if (c.style === 'reckless' && s.macro.credit < 0.35 && rng.chance(0.06) && !c.dead) {
      c.dead = true; c.scale *= 0.2;
      s.news.push({
        m: s.month, tag: 'MARKET', head: `${c.name} has stopped work on all sites`,
        body: 'Buyers are outside the office. The financiers have taken the site keys. Somebody will buy those half-built projects cheap.',
      });
      s.offers.push(Object.assign(makeLandOffer(s.month, s, rng, { distress: true, big: true }), { seller: `${c.name} (liquidator)` }));
    }
  }
}

// ------------------------------------------------------------------ offers refresh

function refreshOffers(s, rng) {
  s.offers = s.offers.filter((o) => o.expiresAt > s.month);
  const target = 4 + Math.floor(clamp(s.reputation, 0, 100) / 25) + (s.macro.demand < 0.85 ? 2 : 0);
  let guard = 0;
  while (s.offers.length < target && guard++ < 12) {
    const kind = rng.weighted([
      ['land', 6],
      ['dev', s.month > 6 ? 2 : 0.5],
      ['asset', s.month > 36 && s.netWorth > 5e6 ? 1.6 : 0],
    ]);
    let o = null;
    if (kind === 'land') o = makeLandOffer(s.month, s, rng, { distress: s.macro.demand < 0.8 && rng.chance(0.4) });
    else if (kind === 'dev') o = makeDevAgreement(s.month, s, rng);
    else o = makeAssetOffer(s.month, s, rng);
    if (o) s.offers.push(o);
  }
}

// ------------------------------------------------------------------ the monthly tick

export function advanceMonth(s) {
  if (s.over || s.pendingEvent) return s;

  s.month += 1;
  s.tickCount += 1;
  refresh(s);

  const rng = getRng(s);

  // 1. History arrives.
  for (const t of TIMELINE) {
    if (t.m !== s.month) continue;
    s.news.push({ m: s.month, tag: t.tag, head: t.head, body: t.body, major: true });
    const e = t.effect || {};
    if (e.infraBudget) s.infraBudget = e.infraBudget;
    if (e.bizConfidence) s.bizConfidence = e.bizConfidence;
    if (e.approvalSpeed) s.approvalSpeedMod = e.approvalSpeed;
    if (e.materialSpike) { s.materialSpike = e.materialSpike; for (const p of s.projects) if (!p.done) p.overrunPct += 0.02; }
    if (e.unlock) s.flags[e.unlock] = true;
    if (e.crash) { s.crashActive = true; s.crashUntil = s.month + 18; }
    if (e.farRelax) s.flags.AIRPORT_LIVE = true;
    if (e.end) { s.flags.covid = true; }
  }
  if (s.crashActive && s.month > (s.crashUntil || 0)) s.crashActive = false;

  // 2. Projects.
  let projectSpend = 0, presaleCash = 0;
  for (const p of s.projects) {
    if (p.done) continue;
    // Deduct as we go: two projects must not both spend the same rupee.
    const spend = tickProject(p, s, rng);
    s.cash -= spend;
    projectSpend += spend;
    const adv = tickPresales(p, s, rng);
    s.cash += adv;
    presaleCash += adv;
  }
  s.costYTD += projectSpend;
  s.revenueYTD += presaleCash;

  for (const p of s.projects) {
    if (p.done || p.stalled < 9) continue;
    if (p.stalled % 6 === 0) {
      s.reputation = clamp(s.reputation - 2, 0, 100);
      s.relations.contractors = clamp(s.relations.contractors - 3, 0, 100);
      if (p.stalled === 12) {
        s.news.push({
          m: s.month, tag: 'PROJECT', head: `${p.name} has been idle for a year`,
          body: 'Shuttering is warping, the steel is rusting and the watchman has not been paid. You can abandon the site and recover part of what you have sunk, or find money from somewhere.',
        });
      }
    }
  }

  // 3. Completed stock sells.
  const sales = tickInventory(s, rng);
  s.cash += sales.revenue;
  s.revenueYTD += sales.revenue;
  s.costYTD += sales.cogs;
  s.absorptionBoost *= 0.9;

  // 4. Rental book.
  let noi = 0;
  for (const a of s.assets) { const r = tickAsset(a, s, rng); noi += r.noi; }
  const ptax = propertyTax(s);
  s.cash += noi;
  spend(s, ptax);
  s.noiYTD += noi;

  // 5. Subsidiaries.
  for (const sub of s.subsidiaries) {
    const income = sub.capital * (sub.yield / 12) * clamp(s.macro.demand, 0.4, 1.6) * sub.quality;
    s.cash += income;
    s.revenueYTD += income;
    sub.value = sub.value * (1 + (s.macro.gdp / 100) / 12) + income * 0.3;
  }

  // 6. People and overheads.
  const payroll = s.staff.reduce((t, p) => t + p.salary, 0);
  const officeCost = Math.round((3000 + s.staff.length * 2200) * costIndex(s.month));
  const personal = s.flags.founderSalaryZero ? 0 : Math.round(s.personalExpense * costIndex(s.month) * (1 + s.netWorth / 4e9));
  // Salaries and overheads are obligations, not choices: if you cannot pay them they
  // become creditors, and the people they are owed to stop turning up.
  spend(s, payroll + officeCost + personal);
  s.opexYTD += payroll + officeCost;

  for (const p of s.staff) {
    p.loyalty = clamp(p.loyalty + (s.cash > payroll * 3 ? 0.4 : -1.2), 0, 100);
    if (p.loyalty < 18 && rng.chance(0.12)) {
      s.news.push({ m: s.month, tag: 'PEOPLE', head: `${p.name} has resigned`, body: `Your ${p.roleName.toLowerCase()} has left.` });
      s.staff = s.staff.filter((x) => x.id !== p.id);
    }
  }

  // 6b. Unpaid creditors get paid out of any surplus, with a penalty for the delay.
  if (s.payables > 0) {
    s.payables *= 1 + 0.010;                      // creditors charge for waiting
    const pay = Math.min(s.payables, Math.max(0, s.cash));
    s.cash -= pay;
    s.payables -= pay;
    // Unpayable creditors do not compound forever; they file.
    if (s.payables > Math.max(500000, (s.bs.assets || 0) * 0.25)) {
      s.creditorMonths = (s.creditorMonths || 0) + 1;
    } else s.creditorMonths = 0;
    if (s.payables > (s.bs.assets || 1) * 0.15 && rng.chance(0.12)) {
      s.reputation = clamp(s.reputation - 4, 0, 100);
      s.relations.contractors = clamp(s.relations.contractors - 6, 0, 100);
      s.news.push({
        m: s.month, tag: 'CRISIS', head: 'Creditors are refusing to supply',
        body: `You owe ${money(s.payables)} to contractors and suppliers who have stopped delivering. Two of them have sent legal notices.`,
      });
    }
  }

  // 7. Debt service.
  const ds = serviceDebt(s);
  s.interestYTD += ds.interest;
  if (ds.missed > 0 && rng.chance(0.4)) {
    s.relations.banks = clamp(s.relations.banks - 4, 0, 100);
    s.news.push({
      m: s.month, tag: 'FINANCE', head: `${ds.missed} instalment${ds.missed === 1 ? '' : 's'} unpaid`,
      body: 'The interest has been added to your principal. This is the beginning of the spiral that ends companies.',
    });
  }
  for (const l of distressedLoans(s)) {
    if (l.kind === 'private' && rng.chance(0.35)) {
      const p = s.parcels.find((x) => x.owned && !x.consumed);
      if (p) {
        s.parcels = s.parcels.filter((x) => x.id !== p.id);
        l.outstanding *= 0.4; l.missed = 0;
        s.news.push({ m: s.month, tag: 'CRISIS', head: `${p.label} taken by the financier`, body: 'He presented the blank cheque, then the registered agreement you signed and did not read. The land is his.' });
      }
    } else if (rng.chance(0.2)) {
      s.flags.npa = true;
      s.relations.banks = clamp(s.relations.banks - 10, 0, 100);
      s.news.push({ m: s.month, tag: 'CRISIS', head: 'Account classified as non-performing', body: 'Recovery proceedings have started. Every other lender in the city will know within a fortnight.' });
    }
  }

  // 8. Stress and reputation drift.
  const load = s.projects.filter((p) => !p.done).length + s.assets.length * 0.3 + s.subsidiaries.length * 1.5;
  const relief = s.staff.filter((p) => ROLES[p.role]?.exec).length * 6 + (s.staff.length > 4 ? 3 : 0);
  s.stress = clamp(s.stress + load * 1.1 - relief - 2 + (s.cash < 0 ? 5 : 0), 0, 100);
  s.reputation = clamp(s.reputation + (s.stats.projectsDone > 0 ? 0.16 : 0.02) + (s.ratios.occupancy > 0.8 ? 0.08 : 0) - (s.flags.npa ? 0.25 : 0) - (s.payables > 0 ? 0.1 : 0), 0, 100);

  // 8b. Regularisation applications grind on.
  tickRegularisations(s, rng);

  // 9. Market and rivals.
  refreshOffers(s, rng);
  tickCompetitors(s, rng);

  // 10. An event, sometimes.
  const eventChance = clamp(0.19 + (s.crashActive ? 0.18 : 0) + s.projects.filter((p) => !p.done).length * 0.03, 0.10, 0.55);
  if (rng.f() < eventChance) {
    const card = pickEvent(s, rng);
    if (card) s.pendingEvent = card;
  }

  saveRng(s, rng);
  refresh(s);

  // 11. Year close.
  if (s.month % 12 === 0) closeYear(s, s.bs);

  // 12. Endings.
  checkEnd(s);
  return s;
}

function checkEnd(s) {
  if (s.month >= END_MONTH) {
    s.over = true;
    s.overReason = 'time';
    return;
  }
  if ((s.creditorMonths || 0) >= 6 && s.netWorth < 0) {
    s.over = true;
    s.overReason = 'insolvent';
    s.news.push({
      m: s.month, tag: 'CRISIS', head: 'Winding-up petition admitted',
      body: 'Creditors you could not pay have taken the company to court. The sites, the land and the unsold flats will be sold by an official liquidator, and there will not be enough.',
    });
    return;
  }
  if (s.netWorth < 0 && s.cash < 0 && s.debt > 0) {
    s.insolventMonths = (s.insolventMonths || 0) + 1;
    if (s.insolventMonths >= 7) {
      s.over = true;
      s.overReason = 'insolvent';
      s.news.push({
        m: s.month, tag: 'CRISIS', head: 'The company is insolvent',
        body: 'Liabilities exceed everything you own, the bank account is overdrawn and there is nothing left to sell that anyone will buy. The financiers have the land, the buyers have suits pending, and the staff left last month.',
      });
    }
  } else {
    s.insolventMonths = 0;
  }
  if ((s.flags.healthWarning || 0) >= 3 && s.stress > 85) {
    s.over = true;
    s.overReason = 'health';
  }
}

// ------------------------------------------------------------------ re-exports for UI

export {
  abandonProject, remainingCommitments, fundingSchedule, freeSqYd, landConsumedBy,
  estimateLayout, isLayout, plotPrice, plotAbsorption,
  quotePrepayment, prepaymentPenaltyRate, remainingTenure, interestIfHeld,
  marketView, landRate, rentRate, salePrice, capRate, costIndex, dutyRate, salaryIndex,
  farFor, estimateProject, maxBuildableSqFt, assetValue, portfolioNoiAnnual,
  balanceSheet, computeRatios, availableLenders, offeredRate, creditDecision, landValue,
};

// ------------------------------------------------------------------ regularisation

/**
 * Layout Regularisation Scheme windows. The state periodically threw open an amnesty:
 * unapproved layouts and deviated buildings could be regularised on payment of fees and
 * an open-space contribution, without the years of argument it normally took. Andhra
 * Pradesh ran LRS and BPS together in 2008; Telangana reopened LRS in 2015.
 *
 * Outside a window regularisation is still possible — it is simply slow, dear and far
 * from certain, because you are asking one officer to exercise discretion rather than
 * applying under a scheme. A player who buys unapproved land cheaply and sits on it
 * until an amnesty opens is doing something people genuinely did.
 */
export const LRS_WINDOWS = [
  { from: 156, to: 168, name: 'LRS / BPS 2008' },   // Jan 2008 - Dec 2008, Andhra Pradesh
  { from: 246, to: 258, name: 'LRS 2015' },         // Jul 2015 - Jun 2016, Telangana
];

export function lrsWindow(m) {
  return LRS_WINDOWS.find((w) => m >= w.from && m <= w.to) || null;
}

const REGULARISABLE = ['LAYOUT_UNAPPROVED', 'MUNICIPAL_DEVIATION', 'NO_ACCESS'];

/** What it would cost and how long it would take to regularise a given holding. */
export function regularisationQuote(s, target) {
  const win = lrsWindow(s.month);
  const isParcel = target.kind === 'parcel';
  const base = isParcel
    ? landRate(target.locality, s.month, s) * target.areaSqYd
    : target.remaining * target.askPerSqFt;

  // Relationships and a liaison man matter far more when there is no scheme to apply under.
  const pull = clamp(
    s.relations.bureaucrats / 200 + s.relations.politicians / 320
    + (s.staff.some((x) => x.impact === 'approvals') ? 0.14 : 0)
    + (s.staff.some((x) => x.impact === 'legal') ? 0.08 : 0),
    0, 0.5,
  );

  const feeRate = win ? 0.24 : 0.34;                       // fees plus open-space charges
  const cost = Math.round(base * feeRate);
  const months = win
    ? Math.max(3, Math.round(7 - pull * 6))
    : Math.max(8, Math.round(19 - pull * 14));
  const chance = clamp(win ? 0.88 + pull * 0.2 : 0.34 + pull * 0.9, 0.2, 0.97);

  return { window: win, cost, months, chance, feeRate, base };
}

/**
 * Apply to regularise. The money goes now; the outcome arrives months later, and
 * outside an amnesty window it may not arrive at all.
 */
export function applyForRegularisation(s, kind, id) {
  const target = kind === 'parcel'
    ? s.parcels.find((p) => p.id === id && p.owned)
    : s.inventory.find((i) => i.id === id);
  if (!target) return { ok: false, msg: 'Not found.' };
  if (target.regularising) return { ok: false, msg: 'An application is already pending on this.' };

  const defects = kind === 'parcel'
    ? (target.known || []).filter((d) => REGULARISABLE.includes(d) && !(target.resolved || []).includes(d))
    : (target.unapproved ? ['LAYOUT_UNAPPROVED'] : []);
  if (!defects.length) return { ok: false, msg: 'There is nothing here that regularisation would fix.' };

  const q = regularisationQuote(s, { kind, ...target });
  if (s.cash < q.cost) return { ok: false, msg: `The fees and open-space charges come to ${money(q.cost)} and you have ${money(s.cash)}.` };

  pay(s, q.cost);
  target.regularising = { kind, defects, monthsLeft: q.months, chance: q.chance, cost: q.cost, applied: s.month, window: q.window ? q.window.name : null };
  s.regularisations = s.regularisations || [];
  s.regularisations.push({ kind, id });
  s.ledger.push({ m: s.month, type: 'Regularisation fees', amount: -q.cost, note: target.label || target.name });
  s.news.push({
    m: s.month, tag: 'REGULATION', head: `Regularisation applied for: ${target.label || target.name}`,
    body: q.window
      ? `Filed under ${q.window.name}. Fees and open-space contribution of ${money(q.cost)} paid. Expect an answer in about ${q.months} months, and under a scheme the answer is usually yes.`
      : `No scheme is open, so this is an ordinary application asking an officer to exercise discretion. ${money(q.cost)} paid in charges and consultants' fees. Expect ${q.months} months and roughly a ${Math.round(q.chance * 100)} per cent chance of anything at all.`,
  });
  return { ok: true, quote: q };
}

/** Advance pending regularisation applications by one month. */
export function tickRegularisations(s, rng) {
  if (!s.regularisations || !s.regularisations.length) return;
  const still = [];
  for (const ref of s.regularisations) {
    const t = ref.kind === 'parcel'
      ? s.parcels.find((p) => p.id === ref.id)
      : s.inventory.find((i) => i.id === ref.id);
    if (!t || !t.regularising) continue;
    t.regularising.monthsLeft -= 1;
    if (t.regularising.monthsLeft > 0) { still.push(ref); continue; }

    const granted = rng.f() < t.regularising.chance;
    if (granted) {
      if (ref.kind === 'parcel') {
        t.resolved = t.resolved || [];
        for (const d of t.regularising.defects) if (!t.resolved.includes(d)) t.resolved.push(d);
      } else {
        // Plots that were selling as an unapproved venture are now sanctioned stock.
        const wasRate = t.askPerSqFt;
        t.unapproved = false;
        t.type = 'approved';
        t.askPerSqFt = plotPrice(t.locality, 'approved', s.month, s);
        s.news.push({
          m: s.month, tag: 'REGULATION', head: `${t.name} regularised`,
          body: `Sanctioned at last. The unsold plots re-rate from about ₹${Math.round(wasRate).toLocaleString('en-IN')} to ₹${Math.round(t.askPerSqFt).toLocaleString('en-IN')} a square yard, and buyers who would not touch it before will now take a loan against it.`,
        });
      }
      s.reputation = clamp(s.reputation + 2, 0, 100);
      s.relations.bureaucrats = clamp(s.relations.bureaucrats + 4, 0, 100);
      if (ref.kind === 'parcel') {
        s.news.push({
          m: s.month, tag: 'REGULATION', head: `${t.label} regularised`,
          body: 'The proceedings are issued and the defect is off the title. The land is now bankable, saleable and buildable.',
        });
      }
    } else {
      s.news.push({
        m: s.month, tag: 'REGULATION', head: `Regularisation refused: ${t.label || t.name}`,
        body: 'The application has been returned. The fees are not. You may apply again, and you will pay again.',
      });
      s.relations.bureaucrats = clamp(s.relations.bureaucrats - 2, 0, 100);
    }
    t.regularising = null;
  }
  s.regularisations = still;
}
