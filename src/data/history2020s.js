// The 2020s. Loaded only when a player chooses to carry on past March 2020.
//
// The base game stops where the brief said it should: at the point COVID begins to change
// the economy. Everything up to there is the historical record. What follows is partly
// record and partly projection, and the two are marked so nobody mistakes one for the other.
//
// 2020 to 2025 is drawn from what actually happened. From 2026 the numbers are a reasoned
// extrapolation and nothing more — a plausible continuation of the trend, not a forecast,
// and certainly not investment advice.

export const MACRO_2020S = {
  //          cpi%   gdp%   plr%   usdinr  credit  hydDemand
  2021: { cpi: 5.1, gdp: 9.1, plr: 9.3, usd: 74.2, credit: 0.72, demand: 1.35 },
  2022: { cpi: 6.7, gdp: 7.2, plr: 9.8, usd: 78.6, credit: 0.74, demand: 1.60 },
  2023: { cpi: 5.7, gdp: 8.2, plr: 10.5, usd: 82.6, credit: 0.70, demand: 1.55 },
  2024: { cpi: 4.9, gdp: 6.5, plr: 10.5, usd: 83.7, credit: 0.66, demand: 1.30 },
  2025: { cpi: 4.2, gdp: 6.5, plr: 9.8, usd: 86.0, credit: 0.70, demand: 1.35 },
  // Beyond here is extrapolation, not record.
  2026: { cpi: 4.5, gdp: 6.4, plr: 9.5, usd: 87.5, credit: 0.72, demand: 1.40 },
  2027: { cpi: 4.6, gdp: 6.3, plr: 9.6, usd: 89.0, credit: 0.70, demand: 1.42 },
  2028: { cpi: 4.8, gdp: 6.0, plr: 9.8, usd: 90.5, credit: 0.66, demand: 1.30 },
  2029: { cpi: 5.0, gdp: 5.6, plr: 10.2, usd: 92.0, credit: 0.58, demand: 1.10 },
  2030: { cpi: 4.7, gdp: 6.2, plr: 9.8, usd: 93.5, credit: 0.64, demand: 1.20 },
};

/** Month-keyed shocks, continuing the numbering from January 1995. */
export const SHOCKS_2020S = {
  303: { demand: 0.18, credit: 0.28 },   // Apr 2020 — the national lockdown
  304: { demand: 0.22, credit: 0.30 },
  305: { demand: 0.35, credit: 0.36 },
  306: { demand: 0.50, credit: 0.44 },
  307: { demand: 0.62, credit: 0.52 },
  310: { demand: 0.85 },                 // Nov 2020 — festive recovery, rates at record lows
  315: { demand: 0.70, credit: 0.55 },   // Apr 2021 — the second wave
  316: { demand: 0.65, credit: 0.55 },
  345: { demand: 1.20 },                 // Oct 2023 — pre-election pause
  347: { demand: 1.15, credit: 0.62 },   // Dec 2023 — change of government in Telangana
  356: { demand: 1.05 },                 // Sep 2024 — HYDRAA demolitions unsettle the market
};

export const TIMELINE_2020S = [
  {
    m: 303, tag: 'ECONOMY', head: 'National lockdown: every site in the country stops',
    body: 'From 25 March 2020 nothing moves. Migrant labour walks home in its hundreds of thousands and will not all come back. Registration offices are shut, so nothing can be bought or sold even by those who want to. Nobody in the trade has seen anything like it.',
    effect: { crash: true },
  },
  {
    m: 308, tag: 'ECONOMY', head: 'Repo rate cut to four per cent, the lowest ever recorded',
    body: 'The Reserve Bank cuts hard to hold the economy up. Home loans reach the cheapest they have ever been in India, and the effect on housing demand over the next two years surprises everybody, including the people selling the houses.',
    effect: { unlock: 'CHEAP_MONEY' },
  },
  {
    m: 310, tag: 'ECONOMY', head: 'Housing comes back faster than anyone expected',
    body: 'Cheap money, a stamp-duty cut in some states, and a year spent indoors have changed what people want from a home. Larger flats sell first. Hyderabad, with more land and less congestion than Mumbai or Bangalore, does better than either.',
    effect: {},
  },
  {
    m: 315, tag: 'ECONOMY', head: 'The second wave',
    body: 'April and May 2021 are worse than 2020 in every way that matters except the economic one. Sites keep working. The market pauses rather than stops.',
    effect: {},
  },
  {
    m: 324, tag: 'ECONOMY', head: 'Prices are rising faster than at any time since 2007',
    body: 'Steel and cement have both jumped, labour has not fully returned, and yet buyers keep coming. Hyderabad residential prices are up a fifth in a year, and the western corridor is up more.',
    effect: { materialSpike: 1.18 },
  },
  {
    m: 330, tag: 'ECONOMY', head: 'Rates turn: the Reserve Bank begins tightening',
    body: 'Inflation forces the repo rate up from four per cent through 2022. The cheapest home loans in Indian history are over. Developers who assumed the cost of money would stay where it was are recalculating.',
    effect: {},
  },
  {
    m: 336, tag: 'INFRA', head: 'Hyderabad office stock passes every city but Bangalore',
    body: 'The western corridor has absorbed an extraordinary amount of Grade A space, and an extraordinary amount more is under construction. Occupiers have choices they did not have five years ago, and landlords are starting to compete on fit-out rather than rent.',
    effect: {},
  },
  {
    m: 347, tag: 'POLITICS', head: 'Congress wins Telangana; Revanth Reddy becomes Chief Minister',
    body: 'December 2023. Ten years of TRS end. Every large project associated with the previous government — the western corridor, the pharma city, the land monetisation programme — is now under review, and nobody in the trade knows which reviews are real.',
    effect: { regime: 'revanth', infraBudget: 0.85, unlock: 'TS_CHANGE' },
  },
  {
    m: 356, tag: 'REGULATION', head: 'HYDRAA begins demolishing construction on lake beds and buffer zones',
    body: 'A new agency starts pulling down buildings raised on tank beds and full-tank-level buffers, including several by well-known names. Anything with a defect in its approvals is suddenly worth what somebody will pay for the risk. Clean title has not been this valuable in thirty years.',
    effect: { unlock: 'HYDRAA' },
  },
  {
    m: 366, tag: 'INFRA', head: 'Future City and the Musi riverfront announced',
    body: 'The new government puts its own stamp on the map: a greenfield city to the south along the Srisailam highway, and a riverfront redevelopment through the middle of the old one. Land south of the Outer Ring Road moves on the announcement alone.',
    effect: { unlock: 'FUTURE_CITY' },
  },
  {
    m: 384, tag: 'ECONOMY', head: 'The market pauses for breath',
    body: 'After four years of near-continuous appreciation, absorption slows. Unsold inventory in the western corridor climbs to eighteen months of sales. This is the part of the cycle that separates the developers who kept some cash from the ones who did not.',
    effect: {},
  },
];

/** Locality multiplier extensions, continuing each track past its 2020 anchor. */
export const TRACK_2020S = {
  banjara: [[2021, 34], [2022, 38], [2023, 42], [2025, 48], [2027, 54], [2030, 62]],
  jubilee: [[2021, 41], [2022, 46], [2023, 51], [2025, 58], [2027, 65], [2030, 75]],
  somajiguda: [[2021, 23.5], [2022, 26], [2023, 28], [2025, 32], [2027, 36], [2030, 41]],
  begumpet: [[2021, 23.5], [2022, 26], [2023, 28], [2025, 32], [2027, 36], [2030, 41]],
  ameerpet: [[2021, 28], [2022, 31], [2023, 34], [2025, 38], [2027, 43], [2030, 49]],
  secunderabad: [[2021, 21.5], [2022, 24], [2023, 26], [2025, 30], [2027, 34], [2030, 39]],
  himayatnagar: [[2021, 26], [2022, 29], [2023, 32], [2025, 36], [2027, 41], [2030, 47]],
  kukatpally: [[2021, 60], [2022, 69], [2023, 77], [2025, 88], [2027, 100], [2030, 118]],
  miyapur: [[2021, 126], [2022, 145], [2023, 162], [2025, 186], [2027, 212], [2030, 250]],
  madhapur: [[2021, 470], [2022, 545], [2023, 610], [2025, 690], [2027, 780], [2030, 910]],
  kondapur: [[2021, 440], [2022, 510], [2023, 572], [2025, 650], [2027, 735], [2030, 860]],
  gachibowli: [[2021, 550], [2022, 640], [2023, 720], [2025, 820], [2027, 930], [2030, 1090]],
  nanakramguda: [[2021, 775], [2022, 900], [2023, 1010], [2025, 1150], [2027, 1300], [2030, 1520]],
  kokapet: [[2021, 1010], [2022, 1200], [2023, 1360], [2025, 1560], [2027, 1770], [2030, 2080]],
  manikonda: [[2021, 550], [2022, 635], [2023, 710], [2025, 810], [2027, 915], [2030, 1070]],
  narsingi: [[2021, 555], [2022, 645], [2023, 725], [2025, 830], [2027, 940], [2030, 1100]],
  uppal: [[2021, 72], [2022, 82], [2023, 91], [2025, 104], [2027, 118], [2030, 139]],
  lbnagar: [[2021, 66], [2022, 75], [2023, 84], [2025, 96], [2027, 109], [2030, 128]],
  kompally: [[2021, 145], [2022, 168], [2023, 188], [2025, 215], [2027, 244], [2030, 287]],
  shamshabad: [[2021, 143], [2022, 164], [2023, 183], [2025, 210], [2027, 238], [2030, 280]],
  pocharam: [[2021, 166], [2022, 191], [2023, 214], [2025, 245], [2027, 278], [2030, 327]],
  medchal: [[2021, 80], [2022, 92], [2023, 103], [2025, 118], [2027, 134], [2030, 158]],
};

/** Rent, construction cost, duty and floor-area extensions. */
export const RENT_2020S = {
  res: [[2021, 6.9], [2022, 7.6], [2023, 8.4], [2025, 9.6], [2027, 10.9], [2030, 12.8]],
  office: [[2021, 3.45], [2022, 3.6], [2023, 3.75], [2025, 4.0], [2027, 4.3], [2030, 4.8]],
  retail: [[2021, 4.4], [2022, 4.8], [2023, 5.2], [2025, 5.8], [2027, 6.5], [2030, 7.5]],
  industrial: [[2021, 4.4], [2022, 4.8], [2023, 5.2], [2025, 6.0], [2027, 6.8], [2030, 8.0]],
};

export const COST_2020S = [[2021, 5.3], [2022, 5.9], [2023, 6.2], [2025, 6.7], [2027, 7.3], [2030, 8.3]];
export const DUTY_2020S = [[2030, 0.06]];
export const FAR_2020S = [[2030, 5.5]];
export const CAP_2020S = [[2021, 0.075], [2023, 0.080], [2025, 0.078], [2030, 0.076]];

export const MATERIAL_2020S = {
  cement: [[2021, 3.4], [2022, 3.7], [2023, 3.8], [2025, 4.0], [2030, 4.8]],
  steel: [[2021, 3.9], [2022, 4.3], [2023, 3.8], [2025, 3.9], [2030, 4.5]],
  sand: [[2021, 8.8], [2022, 9.6], [2023, 10.2], [2025, 11.4], [2030, 13.5]],
  brick: [[2021, 5.8], [2022, 6.3], [2023, 6.7], [2025, 7.4], [2030, 8.8]],
};

export const WAGE_2020S = [[2021, 7.8], [2022, 8.5], [2023, 9.1], [2025, 10.2], [2027, 11.5], [2030, 13.5]];
export const SALARY_2020S = [[2021, 12.8], [2022, 14.2], [2023, 15.4], [2025, 17.5], [2027, 19.8], [2030, 23.5]];
export const UNAPPROVED_2020S = {
  // HYDRAA makes a defective approval genuinely dangerous rather than merely awkward.
  price: [[2021, 0.42], [2024, 0.38], [2025, 0.30], [2030, 0.28]],
  absorption: [[2021, 0.46], [2024, 0.42], [2025, 0.32], [2030, 0.30]],
};

/** The last month playable in extended mode: December 2030. */
export const EXTENDED_END_MONTH = (2030 - 1995) * 12 + 11;
