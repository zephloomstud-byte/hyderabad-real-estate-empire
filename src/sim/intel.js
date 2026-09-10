// What you actually know about the market.
//
// The whole premise of the game is that you cannot see the future. But a market table
// listing every locality's exact rate, rent and permitted density is very nearly as good
// as seeing it — a player can simply scan for whatever looks cheap against its own track
// and buy it. That is not what deciding to buy Gachibowli in 1998 felt like.
//
// So knowledge is now a resource. You begin knowing your own patch cold, the fashionable
// parts of the city roughly, and the villages to the west not at all. Everything else has
// to be bought, walked, or learned from people who owe you a favour.

import { clamp, yearOf } from '../core/util.js';
import { LOCALITIES, BY_ID } from '../data/geo.js';

/**
 * 0 — Nothing. You know the name and roughly where it is. No rate, no rent.
 * 1 — Hearsay. A broker's ballpark, wide enough to be dangerous.
 * 2 — Known. Exact rates, rents, permitted density, and what moved in the last year.
 */
export const INTEL_NONE = 0;
export const INTEL_HEARSAY = 1;
export const INTEL_KNOWN = 2;

/** Where a broker who has worked Kukatpally for three years starts out. */
export function initialIntel() {
  const intel = {};
  for (const l of LOCALITIES) {
    if (l.from) { intel[l.id] = { level: INTEL_NONE, fresh: 0 }; continue; }
    if (l.id === 'kukatpally' || l.id === 'miyapur') intel[l.id] = { level: INTEL_KNOWN, fresh: 999 };
    else if (l.zone === 'core') intel[l.id] = { level: INTEL_KNOWN, fresh: 999 };
    else if (['uppal', 'lbnagar', 'kompally'].includes(l.id)) intel[l.id] = { level: INTEL_HEARSAY, fresh: 999 };
    else intel[l.id] = { level: INTEL_NONE, fresh: 0 };
  }
  return intel;
}

/** Cost of commissioning a proper survey of one locality. */
export function surveyCost(s, locId) {
  const loc = BY_ID[locId];
  const era = 1 + (s.month / 303) * 2.2;                  // fees rise with the price level
  const obscurity = 1 + (1 - loc.liquidity) * 0.8;        // nobody has data on a village
  return Math.round(9000 * era * obscurity);
}

export function intelOf(s, locId) {
  if (!s.intel) s.intel = initialIntel();
  return s.intel[locId] || { level: INTEL_NONE, fresh: 0 };
}

export function intelLevel(s, locId) {
  return intelOf(s, locId).level;
}

/**
 * Commission a survey: a man walks the survey numbers, talks to the village revenue
 * officer, checks what has actually registered, and comes back with real numbers. Good
 * for about two years before it goes stale.
 */
export function buySurvey(s, locId) {
  const cost = surveyCost(s, locId);
  if (s.cash < cost) return { ok: false, msg: `A survey of ${BY_ID[locId].name} costs about ${cost} rupees and you cannot spare it.`, cost };
  s.cash -= cost;
  if (!s.intel) s.intel = initialIntel();
  s.intel[locId] = { level: INTEL_KNOWN, fresh: 24, bought: s.month };
  s.skills.realestate = clamp(s.skills.realestate + 0.6, 0, 100);
  s.ledger.push({ m: s.month, type: 'Market survey', amount: -cost, note: BY_ID[locId].name });
  return { ok: true, cost };
}

/**
 * Knowledge decays, and it also arrives on its own. Owning land somewhere teaches you
 * that place. Relationships bring word of the next one. And once somewhere becomes
 * famous, everybody knows what it costs — which is precisely when knowing stops paying.
 */
export function tickIntel(s, rng) {
  if (!s.intel) s.intel = initialIntel();

  for (const l of LOCALITIES) {
    const it = s.intel[l.id];

    // Holding, building or letting somewhere teaches you it properly.
    const present = s.parcels.some((p) => p.owned && p.locality === l.id)
      || s.projects.some((p) => !p.done && p.locality === l.id)
      || s.assets.some((a) => a.locality === l.id)
      || s.inventory.some((i) => i.locality === l.id);
    if (present) { it.level = INTEL_KNOWN; it.fresh = Math.max(it.fresh, 12); continue; }

    if (it.fresh > 0) it.fresh -= 1;
    else if (it.level === INTEL_KNOWN && it.bought) it.level = INTEL_HEARSAY;

    // Word gets around, if you know people worth knowing.
    if (it.level < INTEL_KNOWN) {
      const word = clamp(
        (s.relations.landowners / 3200) + (s.relations.associations / 4000)
        + (s.relations.journalists / 5000) + (s.skills.realestate / 9000),
        0, 0.05,
      );
      if (rng.f() < word) {
        it.level = Math.min(INTEL_KNOWN, it.level + 1);
        it.fresh = Math.max(it.fresh, 10);
        if (it.level === INTEL_KNOWN) {
          s.news.push({
            m: s.month, tag: 'MARKET', head: `Word from ${l.name}`,
            body: 'One of your contacts has been out that way and came back with real numbers — what is registering, what is being asked, and who is buying. It is the sort of thing you only hear if people owe you a conversation.',
          });
        }
      }
    }

    // Once a place is on every front page, its price is common knowledge.
    const famous = (l.id === 'madhapur' && s.flags.HITEC_LIVE)
      || (['gachibowli', 'kondapur', 'nanakramguda'].includes(l.id) && s.flags.SEZ)
      || (l.id === 'shamshabad' && s.flags.AIRPORT_BUILD)
      || (['kokapet', 'narsingi', 'manikonda'].includes(l.id) && s.flags.ORR_LIVE);
    if (famous) it.level = INTEL_KNOWN;
  }
}

/**
 * What the player is shown. At hearsay level the number is deliberately wrong — a broker's
 * ballpark, off by up to a quarter either way, and stable so it does not shimmer between
 * renders. Acting on it is a real risk and that is the point.
 */
export function fuzzRate(s, locId, trueRate) {
  const level = intelLevel(s, locId);
  if (level === INTEL_KNOWN) return { value: trueRate, band: 0, level };
  if (level === INTEL_NONE) return { value: null, band: null, level };
  // Deterministic per locality and year, so it reads like one broker's standing opinion.
  const seed = (locId.length * 37 + yearOf(s.month) * 13) % 100;
  const skew = 1 + ((seed / 100) - 0.5) * 0.48;
  return { value: trueRate * skew, band: 0.25, level };
}
