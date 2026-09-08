// Construction economics 1995-2020. Materials, wages, salaries, duties and permitted
// floor area all move on their own historical tracks rather than on a single inflation
// number, because they genuinely did. Steel roughly triples in 2008 alone; white-collar
// salaries multiply twelvefold across the period while construction cost multiplies five.

const A = (pairs) => pairs.map(([year, v]) => ({ year, v }));

/**
 * All-in cost of construction, rupees per square foot of built-up area, January 1995.
 * "All-in" the way the trade quotes it: structure, finishes, services, design fees,
 * approval charges and marketing. Nothing is added on top of these numbers — an
 * earlier version charged a further 9% of soft costs over them, which double-counted
 * design and approvals and quietly destroyed roughly a third of every project margin.
 */
export const BUILD_TYPES = {
  godown: {
    id: 'godown', name: 'Warehouse / godown', cost: 130, months: 8, refSqFt: 20000, minMonths: 5, use: 'industrial',
    minSqFt: 8000, quality: 0.5, desc: 'Steel truss, AC sheet roof, murram floor. Fast, cheap, low rent, long leases.',
  },
  economy: {
    id: 'economy', name: 'Economy apartments', cost: 265, months: 18, refSqFt: 20000, minMonths: 10, use: 'res',
    minSqFt: 3000, quality: 0.45, desc: 'Load-bearing plus RCC, mosaic floors, no lift below four floors. Sells on price alone.',
  },
  standard: {
    id: 'standard', name: 'Standard apartments', cost: 340, months: 22, refSqFt: 25000, minMonths: 12, use: 'res',
    minSqFt: 4000, quality: 0.65, desc: 'RCC frame, Kota or ceramic flooring, one lift, covered parking. The mass market.',
  },
  premium: {
    id: 'premium', name: 'Premium apartments', cost: 520, months: 28, refSqFt: 40000, minMonths: 16, use: 'res',
    minSqFt: 8000, quality: 0.82, desc: 'Granite, two lifts, generator backup, landscaped setbacks. Needs a good address to work.',
  },
  villa: {
    id: 'villa', name: 'Villa community', cost: 680, months: 30, refSqFt: 60000, minMonths: 18, use: 'res',
    minSqFt: 15000, quality: 0.88, desc: 'Independent houses on a gated layout. Land-hungry, slow, and very profitable in the right corridor.',
  },
  officeShell: {
    id: 'officeShell', name: 'Office building (bare shell)', cost: 420, months: 24, refSqFt: 50000, minMonths: 14, use: 'office',
    minSqFt: 12000, quality: 0.6, desc: 'Structure, core, lifts, basic services. Tenant fits out. Lower cost, lower rent.',
  },
  officeA: {
    id: 'officeA', name: 'Grade A office campus', cost: 640, months: 32, refSqFt: 150000, minMonths: 20, use: 'office',
    minSqFt: 60000, quality: 0.88, desc: 'Central air conditioning, full power backup, structured parking. What multinationals will actually sign a nine-year lease on.',
  },
  retail: {
    id: 'retail', name: 'Retail / shopping centre', cost: 720, months: 30, refSqFt: 100000, minMonths: 18, use: 'retail',
    minSqFt: 30000, quality: 0.85, desc: 'Atrium, escalators, HVAC, anchor tenant. High capital, high rent, very sensitive to catchment.',
  },
  hotel: {
    id: 'hotel', name: 'Hotel', cost: 1300, months: 38, refSqFt: 120000, minMonths: 24, use: 'retail',
    minSqFt: 40000, quality: 0.9, desc: 'Rooms, kitchens, banquet. Operating business, not just an asset. Needs an operator.',
  },
};

/** Global construction cost multiplier vs January 1995. */
export const COST_TRACK = A([
  [1995, 1], [1997, 1.12], [1999, 1.22], [2000, 1.30], [2002, 1.35], [2004, 1.55],
  [2005, 1.72], [2006, 1.95], [2007, 2.25], [2008, 2.50], [2009, 2.40], [2010, 2.65],
  [2011, 2.90], [2012, 3.10], [2013, 3.30], [2014, 3.50], [2015, 3.60], [2016, 3.75],
  [2017, 4.00], [2018, 4.30], [2019, 4.60], [2020, 4.80],
]);

/** Material price tracks. Steel is the volatile one and it wrecks fixed-price contracts. */
export const MATERIALS = {
  cement: {
    name: 'OPC cement', unit: 'per 50 kg bag', base: 115,
    track: A([[1995,1],[1996,1.05],[1998,1.0],[2000,1.10],[2003,1.30],[2005,1.60],[2007,2.00],[2008,2.20],[2010,2.30],[2012,2.60],[2015,2.70],[2018,3.00],[2020,3.20]]),
  },
  steel: {
    name: 'TMT reinforcement steel', unit: 'per tonne', base: 14800,
    track: A([[1995,1],[1998,0.92],[2000,0.95],[2003,1.10],[2004,1.60],[2005,1.50],[2006,1.70],[2007,1.90],[2008,2.90],[2009,2.00],[2010,2.30],[2011,2.70],[2013,2.70],[2015,2.40],[2016,2.40],[2018,3.20],[2019,3.00],[2020,2.90]]),
  },
  sand: {
    name: 'River sand', unit: 'per cubic metre', base: 430,
    track: A([[1995,1],[2000,1.2],[2004,1.6],[2007,2.4],[2010,3.4],[2012,4.6],[2014,5.6],[2016,6.4],[2018,7.4],[2020,8.2]]),
  },
  brick: {
    name: 'Country bricks', unit: 'per thousand', base: 1300,
    track: A([[1995,1],[2000,1.25],[2005,1.8],[2008,2.4],[2012,3.4],[2016,4.4],[2020,5.4]]),
  },
};

/** Site wages, rupees per day, January 1995 base. */
export const WAGES = {
  mason: 115, carpenter: 125, barbender: 130, unskilled: 52, electrician: 110, plumber: 105,
};
export const WAGE_TRACK = A([
  [1995,1],[1998,1.15],[2000,1.30],[2003,1.55],[2005,1.90],[2008,2.60],[2010,3.20],
  [2013,4.40],[2015,5.20],[2017,6.00],[2019,7.00],[2020,7.40],
]);

/** White-collar salaries, rupees per month, January 1995 base. */
export const ROLES = {
  clerk: { name: 'Clerk', base: 1200, skillCap: 25, impact: 'admin' },
  accountant: { name: 'Accountant', base: 2400, skillCap: 45, impact: 'finance' },
  supervisor: { name: 'Site supervisor', base: 2600, skillCap: 40, impact: 'construction' },
  engineer: { name: 'Site engineer', base: 4200, skillCap: 60, impact: 'construction' },
  seniorEngineer: { name: 'Project manager', base: 7500, skillCap: 78, impact: 'construction' },
  architect: { name: 'Architect (retained)', base: 9000, skillCap: 82, impact: 'design' },
  legal: { name: 'Legal officer', base: 6000, skillCap: 70, impact: 'legal' },
  salesManager: { name: 'Sales manager', base: 5000, skillCap: 65, impact: 'sales' },
  financeManager: { name: 'Finance manager (CA)', base: 8000, skillCap: 78, impact: 'finance' },
  liaison: { name: 'Liaison manager', base: 5500, skillCap: 72, impact: 'approvals' },
  propertyManager: { name: 'Property manager', base: 3500, skillCap: 60, impact: 'rental' },
  cfo: { name: 'Chief Financial Officer', base: 25000, skillCap: 92, impact: 'finance', exec: true },
  coo: { name: 'Chief Operating Officer', base: 30000, skillCap: 92, impact: 'construction', exec: true },
  gc: { name: 'General Counsel', base: 22000, skillCap: 90, impact: 'legal', exec: true },
  audit: { name: 'Head of Internal Audit', base: 18000, skillCap: 88, impact: 'governance', exec: true },
};
export const SALARY_TRACK = A([
  [1995,1],[1998,1.35],[2000,1.60],[2003,2.00],[2005,2.60],[2007,3.40],[2008,3.80],
  [2010,4.60],[2012,5.60],[2014,6.80],[2016,8.20],[2018,10.0],[2020,12.0],
]);

/**
 * Combined stamp duty, transfer duty and registration fee in Andhra Pradesh / Telangana.
 * Around 14.5 per cent in 1995, which is the single biggest reason cash components
 * existed in every land transaction of the period. Cut repeatedly through the 2000s.
 */
export const DUTY_TRACK = A([
  [1995, 0.145], [1999, 0.135], [2002, 0.125], [2005, 0.095], [2007, 0.070],
  [2010, 0.065], [2013, 0.060], [2020, 0.060],
]);

/** Maximum permissible floor area ratio on a well-served plot. */
export const FAR_TRACK = A([
  [1995, 1.75], [2002, 1.90], [2006, 2.50], [2009, 3.00], [2012, 3.50], [2016, 5.00], [2020, 5.50],
]);
/** Airport funnel restricted localities, until Begumpet closes in March 2008. */
export const FAR_AIRPORT = 1.20;

/** Base months for statutory approvals before construction can start. */
export const APPROVAL_BASE_MONTHS = 5;

/** Corporate and capital gains tax, simplified but period-accurate in direction. */
export const TAX_TRACK = {
  corporate: A([[1995,0.46],[1997,0.35],[2000,0.385],[2003,0.365],[2005,0.337],[2008,0.339],[2012,0.326],[2015,0.348],[2018,0.291],[2020,0.252]]),
  ltcg: A([[1995,0.20],[2005,0.20],[2020,0.20]]),
  propertyTaxOfNOI: A([[1995,0.08],[2005,0.10],[2015,0.12],[2020,0.12]]),
};

/** Lending spreads over prime, by borrower standing. */
export const LENDERS = {
  sbh: {
    id: 'sbh', name: 'State Bank of Hyderabad', kind: 'bank', spread: 0.5, maxLtv: 0.55,
    minTrack: 1, maxTenure: 84, patience: 0.8,
    desc: 'Your father banks here. Conservative, slow, cheap, and they want personal guarantees plus collateral worth twice the loan.',
  },
  andhra: {
    id: 'andhra', name: 'Andhra Bank', kind: 'bank', spread: 1.0, maxLtv: 0.60,
    minTrack: 2, maxTenure: 84, patience: 0.75,
    desc: 'Slightly hungrier for developer business. Still a public sector bank with a public sector credit committee.',
  },
  hdfcL: {
    id: 'hdfcL', name: 'HDFC (construction finance)', kind: 'bank', spread: 2.0, maxLtv: 0.65,
    minTrack: 3, maxTenure: 60, patience: 0.7, from: 24,
    desc: 'The only lender in the country that genuinely understands residential development. They will also see through your numbers.',
  },
  icici: {
    id: 'icici', name: 'ICICI', kind: 'bank', spread: 2.5, maxLtv: 0.70,
    minTrack: 4, maxTenure: 84, patience: 0.55, from: 60,
    desc: 'Aggressive, fast, expensive, and utterly ruthless when a cycle turns.',
  },
  nbfc: {
    id: 'nbfc', name: 'Structured NBFC finance', kind: 'nbfc', spread: 6.0, maxLtv: 0.75,
    minTrack: 4, maxTenure: 48, patience: 0.4, from: 132,
    desc: 'Non-bank money against project cash flows. Quick, costly, and it disappears the moment its own funding line does.',
  },
  chalapathi: {
    id: 'chalapathi', name: 'Chalapathi (private financier)', kind: 'private', spread: 18.0, maxLtv: 0.45,
    minTrack: 0, maxTenure: 24, patience: 0.15,
    desc: 'Two and a half to three per cent a month against blank cheques and your personal guarantee. Available when nobody else is. Takes the company if you miss.',
  },
};

/**
 * Plotted layouts — "ventures", in the local phrase. Buy agricultural land on the
 * periphery, get it converted out of agricultural use, get the layout sanctioned, put in
 * roads, drains, water and power, and sell it off as individual plots by the square yard.
 *
 * This was the dominant real-estate business in Andhra Pradesh and it is what most
 * people with a broker's knowledge and a few lakh rupees actually did. It needs no
 * contractor, no engineer and no construction expertise; the value comes from
 * conversion, sanction and infrastructure, not from building anything.
 *
 * The trade-off against apartments: far lower capital per acre and no construction risk,
 * but you sell to investors rather than occupiers, so it only works where somebody
 * believes the city is coming. Get the corridor wrong and you own a field with roads on it.
 *
 * `cost` is rupees per square yard of GROSS site area, January 1995.
 * `saleable` is the share left after roads, drains and the open space you must surrender.
 * `plotMult` is what a developed plot fetches against the raw land rate.
 */
export const LAYOUT_TYPES = {
  venture: {
    id: 'venture', name: 'Unapproved venture', cost: 22, saleable: 0.70, plotMult: 2.2,
    conversionMonths: 0, approvalMonths: 0, months: 6, minAcres: 1,
    unapproved: true,
    desc: 'Murram roads, boundary stones, a painted arch and a broker with a map. No conversion, no sanction. Sells fast and cheap to buyers who are not asking questions, and every plot you sell carries a defect you have passed on to somebody else.',
  },
  approved: {
    id: 'approved', name: 'Approved layout (HUDA / DTCP)', cost: 62, saleable: 0.58, plotMult: 4.0,
    conversionMonths: 5, approvalMonths: 7, months: 12, minAcres: 2,
    desc: 'Land conversion out of agricultural use, sanctioned layout, black-top roads, storm drains, water lines, electricity and ten per cent surrendered as open space. Takes two years before a single plot is sold, and the sanction is most of what the buyer is paying for.',
  },
  gated: {
    id: 'gated', name: 'Gated plotted community', cost: 160, saleable: 0.55, plotMult: 5.4,
    conversionMonths: 5, approvalMonths: 8, months: 18, minAcres: 5,
    desc: 'Compound wall, gate and security cabin, concrete roads, underground utilities, avenue plantation and a clubhouse. Sells at a serious premium to buyers who want an address rather than an investment, and needs a corridor that has already arrived.',
  },
};

/** Statutory cost of taking land out of agricultural use, per square yard. */
export const CONVERSION_COST_PER_SQYD = 9;
