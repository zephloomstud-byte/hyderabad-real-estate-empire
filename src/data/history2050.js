// 2031 to 2050. Entirely invented, and the game says so.
//
// There is no record here to be faithful to, so the obligation changes: instead of
// matching what happened, this has to behave the way a property market behaves. That
// means cycles, not a trend line. A straight extrapolation of the 2020s to 2050 would
// make every decision the same decision — buy land, wait, sell — and the whole point of
// the simulation is that timing is a skill.
//
// So there are two real downturns in here: a cooling in 2032-33 as the 2020s boom
// unwinds, and a proper credit-driven correction in 2038-40 of the kind that comes along
// roughly once a generation. Land does not go up every year. It never has.
//
// The long-run shape assumes India's growth easing from six per cent to about four as
// the demographic dividend fades, inflation settling near four and a half, and the rupee
// giving up two to three per cent a year against the dollar. Those are conventional
// assumptions, not predictions, and nobody should treat any of it as forecasting.

export const MACRO_2050 = {
  //          cpi%   gdp%   plr%   usdinr  credit  demand
  2031: { cpi: 4.8, gdp: 6.0, plr: 10.0, usd: 95.5, credit: 0.62, demand: 1.15 },
  2032: { cpi: 5.4, gdp: 4.8, plr: 10.8, usd: 98.0, credit: 0.48, demand: 0.88 },
  2033: { cpi: 5.0, gdp: 4.4, plr: 10.5, usd: 101.0, credit: 0.42, demand: 0.72 },
  2034: { cpi: 4.4, gdp: 5.6, plr: 9.6, usd: 103.0, credit: 0.58, demand: 0.92 },
  2035: { cpi: 4.2, gdp: 6.2, plr: 9.2, usd: 105.0, credit: 0.70, demand: 1.18 },
  2036: { cpi: 4.5, gdp: 6.4, plr: 9.3, usd: 107.5, credit: 0.76, demand: 1.34 },
  2037: { cpi: 5.2, gdp: 6.1, plr: 10.0, usd: 110.0, credit: 0.74, demand: 1.42 },
  2038: { cpi: 6.1, gdp: 4.6, plr: 11.2, usd: 114.0, credit: 0.44, demand: 1.00 },
  2039: { cpi: 5.5, gdp: 3.2, plr: 11.0, usd: 118.5, credit: 0.28, demand: 0.66 },
  2040: { cpi: 4.6, gdp: 4.4, plr: 9.8, usd: 121.0, credit: 0.38, demand: 0.62 },
  2041: { cpi: 4.0, gdp: 5.8, plr: 8.9, usd: 123.0, credit: 0.58, demand: 0.86 },
  2042: { cpi: 4.1, gdp: 6.0, plr: 8.8, usd: 125.5, credit: 0.70, demand: 1.10 },
  2043: { cpi: 4.3, gdp: 5.8, plr: 9.0, usd: 128.0, credit: 0.74, demand: 1.28 },
  2044: { cpi: 4.5, gdp: 5.5, plr: 9.2, usd: 131.0, credit: 0.74, demand: 1.38 },
  2045: { cpi: 4.7, gdp: 5.2, plr: 9.5, usd: 134.0, credit: 0.68, demand: 1.40 },
  2046: { cpi: 4.9, gdp: 4.6, plr: 9.9, usd: 137.5, credit: 0.56, demand: 1.12 },
  2047: { cpi: 4.6, gdp: 4.4, plr: 9.6, usd: 140.5, credit: 0.58, demand: 0.98 },
  2048: { cpi: 4.4, gdp: 4.8, plr: 9.3, usd: 143.5, credit: 0.66, demand: 1.14 },
  2049: { cpi: 4.3, gdp: 4.6, plr: 9.2, usd: 146.5, credit: 0.68, demand: 1.22 },
  2050: { cpi: 4.2, gdp: 4.4, plr: 9.2, usd: 149.5, credit: 0.66, demand: 1.20 },
};

/** Sharp months an annual average would smear away. Month 0 is January 1995. */
export const SHOCKS_2050 = {
  452: { credit: 0.34, demand: 0.72 },   // Sep 2032 — the funding squeeze begins
  453: { credit: 0.30, demand: 0.66 },
  460: { demand: 0.58 },                 // Apr 2033 — the bottom
  521: { credit: 0.22, demand: 0.70 },   // May 2038 — a large lender fails
  522: { credit: 0.18, demand: 0.58 },
  523: { credit: 0.18, demand: 0.52 },
  535: { demand: 0.48 },                 // Jun 2039 — nothing is registering
  536: { demand: 0.50 },
};

export const TIMELINE_2050 = [
  {
    m: 444, tag: 'INFRA', head: 'Regional Ring Road opens on the northern arc',
    body: 'January 2032. A second orbital, thirty kilometres beyond the first, through Toopran, Gajwel and Bhongir. Land that was farmland with a bus route is now farmland with an interchange. The pattern is the one the Outer Ring Road set twenty years ago, and everyone in the trade knows it — which is exactly why the price already moved.',
    effect: { unlock: 'RRR_LIVE' },
  },
  {
    m: 452, tag: 'ECONOMY', head: 'The money turns off',
    body: 'September 2032. Rates have been climbing for eighteen months and the non-bank lenders that financed most of the last cycle are refinancing at levels that do not work. Land transactions stop first, as they always do. Developers holding inventory discover what it is actually worth.',
    effect: { crash: true },
  },
  {
    m: 460, tag: 'ECONOMY', head: 'The bottom, for those who can tell at the time',
    body: 'April 2033. Registrations are at a nine-year low and three listed developers are selling assets to service debt. Anyone with cash is being offered land at prices that will look absurd in five years. Almost nobody has cash.',
    effect: {},
  },
  {
    m: 478, tag: 'INFRA', head: 'Future City reaches critical mass',
    body: 'October 2034. What was an announcement in 2024 is now a functioning district: pharmaceutical campuses, a university, and the first residential towers occupied rather than sold. The land south of the Outer Ring Road has done in a decade what Gachibowli did between 1998 and 2008.',
    effect: { unlock: 'FUTURE_LIVE' },
  },
  {
    m: 492, tag: 'ECONOMY', head: 'Data centres become the largest single source of office-grade demand',
    body: 'January 2036. Power, fibre and land, in that order. Hyderabad has all three and cheaper industrial tariffs than Mumbai. Occupiers sign twenty-year leases on shells nobody would have called real estate in 1995.',
    effect: { unlock: 'DATACENTRE' },
  },
  {
    m: 504, tag: 'REGULATION', head: 'Groundwater extraction restricted across the western corridor',
    body: 'January 2037. Two dry years and thirty years of building have done what everyone said they would. New projects above a threshold must demonstrate a water source that is not the aquifer. Costs rise; several sites become undevelopable at any price.',
    effect: { unlock: 'WATER_LIMIT' },
  },
  {
    m: 521, tag: 'ECONOMY', head: 'A large housing financier fails',
    body: 'May 2038. It had been lending against land at valuations its own auditors queried. The failure freezes construction finance nationally within a fortnight. This is the one that separates the firms with rent rolls from the firms with land banks.',
    effect: { crash: true },
  },
  {
    m: 535, tag: 'ECONOMY', head: 'Nothing is registering',
    body: 'June 2039. The sub-registrar offices are open and empty. Prices are not falling because nothing is transacting to fall. Everyone is waiting for somebody else to set the number.',
    effect: {},
  },
  {
    m: 553, tag: 'POLITICS', head: 'Hyderabad crosses eighteen million',
    body: 'December 2040. The metropolitan region is now among the ten largest urban areas on earth. Every remaining problem — water, transport, the Musi, the tanks — is a problem of that scale, and the political question for the next decade is whether the city can be governed as one thing.',
    effect: {},
  },
  {
    m: 576, tag: 'INFRA', head: 'Metro Phase III completes the orbital loop',
    body: 'November 2042. Rail now connects the airport, both ring roads and the western corridor. Land within a kilometre of a station commands a premium that did not exist a decade earlier, and land more than three kilometres from one has quietly stopped keeping up.',
    effect: { unlock: 'METRO_LOOP' },
  },
  {
    m: 612, tag: 'ECONOMY', head: 'Construction labour is the binding constraint',
    body: 'November 2045. The migration that built this city for fifty years has slowed to nothing — Bihar and Odisha have their own construction booms and better wages at home. Sites run on machines and a third of the men, and the ones who remain are paid accordingly.',
    effect: { materialSpike: 1.15 },
  },
  {
    m: 648, tag: 'NOTE', head: 'Fifty-five years',
    body: 'November 2048. You are seventy-eight. The firm has outlived the state it was founded in, two currencies worth of inflation, four crashes and every competitor that started when you did. Whatever happens in the last two years, the thing you built is no longer a thing you are building.',
    effect: {},
  },
];

/**
 * Locality tracks to 2050. Growth decelerates as areas mature — Madhapur cannot keep
 * compounding at twenty per cent forever, and the frontier moves outward. The 2032-33
 * and 2038-40 corrections are visible in every one of these as flat or falling stretches,
 * because a market where land only ever rises teaches the player nothing.
 */
export const TRACK_2050 = {
  banjara: [[2032, 64], [2033, 60], [2035, 68], [2037, 80], [2039, 74], [2041, 82], [2044, 104], [2047, 122], [2050, 145]],
  jubilee: [[2032, 77], [2033, 72], [2035, 82], [2037, 97], [2039, 89], [2041, 99], [2044, 126], [2047, 148], [2050, 176]],
  somajiguda: [[2032, 42], [2033, 39], [2035, 45], [2037, 53], [2039, 49], [2041, 54], [2044, 69], [2047, 81], [2050, 96]],
  begumpet: [[2032, 42], [2033, 39], [2035, 45], [2037, 53], [2039, 49], [2041, 54], [2044, 69], [2047, 81], [2050, 96]],
  ameerpet: [[2032, 50], [2033, 47], [2035, 53], [2037, 63], [2039, 58], [2041, 64], [2044, 82], [2047, 96], [2050, 114]],
  secunderabad: [[2032, 40], [2033, 37], [2035, 43], [2037, 50], [2039, 46], [2041, 51], [2044, 65], [2047, 77], [2050, 91]],
  himayatnagar: [[2032, 48], [2033, 45], [2035, 51], [2037, 60], [2039, 56], [2041, 62], [2044, 79], [2047, 93], [2050, 110]],
  kukatpally: [[2032, 122], [2033, 113], [2035, 130], [2037, 154], [2039, 142], [2041, 158], [2044, 202], [2047, 238], [2050, 283]],
  miyapur: [[2032, 258], [2033, 239], [2035, 275], [2037, 326], [2039, 300], [2041, 334], [2044, 428], [2047, 504], [2050, 600]],
  madhapur: [[2032, 935], [2033, 865], [2035, 990], [2037, 1170], [2039, 1075], [2041, 1195], [2044, 1520], [2047, 1780], [2050, 2100]],
  kondapur: [[2032, 885], [2033, 818], [2035, 938], [2037, 1110], [2039, 1020], [2041, 1135], [2044, 1450], [2047, 1700], [2050, 2010]],
  gachibowli: [[2032, 1122], [2033, 1038], [2035, 1190], [2037, 1408], [2039, 1295], [2041, 1440], [2044, 1840], [2047, 2160], [2050, 2560]],
  nanakramguda: [[2032, 1565], [2033, 1448], [2035, 1660], [2037, 1965], [2039, 1806], [2041, 2010], [2044, 2570], [2047, 3020], [2050, 3580]],
  kokapet: [[2032, 2140], [2033, 1980], [2035, 2270], [2037, 2690], [2039, 2470], [2041, 2750], [2044, 3520], [2047, 4140], [2050, 4900]],
  manikonda: [[2032, 1100], [2033, 1018], [2035, 1168], [2037, 1382], [2039, 1270], [2041, 1414], [2044, 1808], [2047, 2125], [2050, 2520]],
  narsingi: [[2032, 1132], [2033, 1047], [2035, 1202], [2037, 1422], [2039, 1308], [2041, 1455], [2044, 1860], [2047, 2188], [2050, 2595]],
  uppal: [[2032, 143], [2033, 133], [2035, 153], [2037, 181], [2039, 167], [2041, 186], [2044, 238], [2047, 280], [2050, 333]],
  lbnagar: [[2032, 132], [2033, 122], [2035, 141], [2037, 167], [2039, 154], [2041, 171], [2044, 219], [2047, 258], [2050, 307]],
  // The outer belt is where the growth goes once the western corridor is built out.
  kompally: [[2032, 298], [2033, 278], [2035, 325], [2037, 395], [2039, 368], [2041, 420], [2044, 560], [2047, 680], [2050, 840]],
  shamshabad: [[2032, 292], [2033, 272], [2035, 320], [2037, 392], [2039, 366], [2041, 420], [2044, 565], [2047, 690], [2050, 855]],
  pocharam: [[2032, 340], [2033, 317], [2035, 372], [2037, 455], [2039, 424], [2041, 486], [2044, 652], [2047, 795], [2050, 985]],
  medchal: [[2032, 166], [2033, 155], [2035, 185], [2037, 232], [2039, 218], [2041, 254], [2044, 350], [2047, 435], [2050, 550]],
};

/**
 * Land that only becomes a market in the 2030s. These are the Gachibowli of the next
 * cycle: worthless, unheard of, and reachable only if the player is paying attention
 * when the road is announced rather than when it opens.
 *
 * `from` is the month they begin appearing on the deal desk at all.
 */
export const LOCALITIES_2030S = [
  {
    id: 'futurecity', name: 'Future City (Srisailam corridor)', zone: 'south', base: 40, far: 1.75,
    airportCap: false, from: 366, tags: ['emerging', 'agri'], liquidity: 0.2, prestige: 0.2,
    desc: 'Dry land along the Srisailam highway, south of the Outer Ring Road, inside the boundary the state drew on a map in 2024. Whether that boundary means anything depends on a government that has not been elected yet.',
    risk: { ASSIGNED_LAND: 0.28, LAYOUT_UNAPPROVED: 0.34, NO_ACCESS: 0.30, GOVT_CLAIM: 0.22 },
    rentBase: { res: 0.9, office: 15, retail: 4, industrial: 2 },
    officeUnlock: 'FUTURE_LIVE',
    track: [[1995, 1], [2024, 1], [2026, 2.6], [2028, 5], [2030, 9], [2032, 13], [2033, 12],
      [2035, 20], [2037, 34], [2039, 31], [2041, 40], [2044, 62], [2047, 84], [2050, 112]],
  },
  {
    id: 'rrrnorth', name: 'Toopran / Gajwel (RRR north)', zone: 'north', base: 30, far: 1.75,
    airportCap: false, from: 400, tags: ['agri', 'far', 'periphery'], liquidity: 0.15, prestige: 0.1,
    desc: 'Farmland on the northern arc of the Regional Ring Road, forty kilometres out. Exactly what Kokapet looked like in 1998, with exactly the same argument attached to it.',
    risk: { ASSIGNED_LAND: 0.32, LAYOUT_UNAPPROVED: 0.42, NO_ACCESS: 0.34, MISSING_HEIR: 0.22 },
    rentBase: { res: 0.7, office: null, retail: 3, industrial: 2.2 },
    track: [[1995, 1], [2029, 1], [2031, 2.2], [2032, 3.4], [2033, 3.1], [2035, 6], [2037, 11],
      [2039, 10], [2041, 15], [2044, 26], [2047, 40], [2050, 58]],
  },
  {
    id: 'rrreast', name: 'Bhongir / Choutuppal (RRR east)', zone: 'east', base: 26, far: 1.75,
    airportCap: false, from: 400, tags: ['agri', 'far', 'periphery'], liquidity: 0.14, prestige: 0.1,
    desc: 'The eastern arc, on the Warangal side. Cheaper than the north because the north has the pharma city and this has a rock formation and a fort.',
    risk: { ASSIGNED_LAND: 0.30, LAYOUT_UNAPPROVED: 0.44, NO_ACCESS: 0.36, MISSING_HEIR: 0.20 },
    rentBase: { res: 0.65, office: null, retail: 2.8, industrial: 2.1 },
    track: [[1995, 1], [2029, 1], [2031, 2.0], [2032, 3.0], [2033, 2.8], [2035, 5.2], [2037, 9],
      [2039, 8.4], [2041, 12.5], [2044, 21], [2047, 33], [2050, 47]],
  },
];

export const RENT_2050 = {
  res: [[2033, 13.2], [2035, 14.6], [2037, 16.4], [2039, 17.2], [2041, 18.8], [2044, 22], [2047, 25.5], [2050, 29.5]],
  office: [[2033, 4.9], [2035, 5.2], [2037, 5.7], [2039, 5.6], [2041, 6.0], [2044, 6.8], [2047, 7.6], [2050, 8.6]],
  retail: [[2033, 7.7], [2035, 8.4], [2037, 9.4], [2039, 9.6], [2041, 10.4], [2044, 12.2], [2047, 14.1], [2050, 16.3]],
  industrial: [[2033, 8.4], [2035, 9.4], [2037, 10.8], [2039, 11.4], [2041, 12.6], [2044, 15], [2047, 17.6], [2050, 20.6]],
};

export const COST_2050 = [[2033, 8.7], [2035, 9.4], [2037, 10.3], [2039, 11.0], [2041, 11.8],
  [2044, 13.3], [2047, 15.0], [2050, 17.0]];
export const WAGE_2050 = [[2033, 14.2], [2035, 15.6], [2037, 17.3], [2039, 18.6], [2041, 20.2],
  [2044, 23.5], [2047, 27.5], [2050, 32]];
export const SALARY_2050 = [[2033, 24.8], [2035, 27.5], [2037, 30.8], [2039, 33.2], [2041, 36.4],
  [2044, 42.5], [2047, 49.5], [2050, 58]];
export const CAP_2050 = [[2033, 0.082], [2035, 0.078], [2037, 0.074], [2039, 0.086],
  [2041, 0.080], [2044, 0.074], [2047, 0.072], [2050, 0.070]];
export const MATERIAL_2050 = {
  cement: [[2033, 5.0], [2037, 5.8], [2041, 6.6], [2045, 7.6], [2050, 9.0]],
  steel: [[2033, 4.7], [2037, 5.4], [2041, 6.0], [2045, 7.0], [2050, 8.2]],
  sand: [[2033, 14.2], [2037, 16.8], [2041, 19.5], [2045, 23], [2050, 28]],
  brick: [[2033, 9.2], [2037, 10.8], [2041, 12.4], [2045, 14.5], [2050, 17.5]],
};

/** December 2050. */
export const FAR_HORIZON = (2050 - 1995) * 12 + 11;
