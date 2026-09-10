// Historical macro-economic and political series for India / Andhra Pradesh / Telangana,
// 1995-2020. Values are real historical figures (annual averages), used to drive the
// simulation rather than decorate it: interest rates, inflation, credit availability and
// the Hyderabad demand cycle all originate here.

import { MACRO_2020S, SHOCKS_2020S, TIMELINE_2020S } from './history2020s.js';
import { MACRO_2050, SHOCKS_2050, TIMELINE_2050 } from './history2050.js';

export const MACRO = {
  //          cpi%   gdp%   plr%   usdinr  credit  hydDemand
  1995: { cpi: 10.2, gdp: 7.6, plr: 16.5, usd: 32.4, credit: 0.42, demand: 0.80 },
  1996: { cpi: 9.0, gdp: 7.6, plr: 16.0, usd: 35.4, credit: 0.38, demand: 0.85 },
  1997: { cpi: 7.2, gdp: 4.1, plr: 14.0, usd: 36.3, credit: 0.52, demand: 0.82 },
  1998: { cpi: 13.2, gdp: 6.2, plr: 13.5, usd: 41.3, credit: 0.48, demand: 0.90 },
  1999: { cpi: 4.7, gdp: 8.5, plr: 12.5, usd: 43.1, credit: 0.60, demand: 1.05 },
  2000: { cpi: 4.0, gdp: 4.0, plr: 12.0, usd: 44.9, credit: 0.62, demand: 1.15 },
  2001: { cpi: 3.8, gdp: 4.9, plr: 11.5, usd: 47.2, credit: 0.58, demand: 0.95 },
  2002: { cpi: 4.3, gdp: 3.9, plr: 11.0, usd: 48.6, credit: 0.66, demand: 0.95 },
  2003: { cpi: 3.8, gdp: 8.0, plr: 10.8, usd: 46.6, credit: 0.80, demand: 1.10 },
  2004: { cpi: 3.8, gdp: 7.1, plr: 10.3, usd: 45.3, credit: 0.86, demand: 1.35 },
  2005: { cpi: 4.2, gdp: 9.5, plr: 10.8, usd: 44.1, credit: 0.92, demand: 1.55 },
  2006: { cpi: 6.8, gdp: 9.6, plr: 11.5, usd: 45.3, credit: 0.95, demand: 1.70 },
  2007: { cpi: 6.4, gdp: 9.3, plr: 13.0, usd: 41.3, credit: 0.88, demand: 1.60 },
  2008: { cpi: 8.3, gdp: 3.9, plr: 13.5, usd: 43.5, credit: 0.42, demand: 0.90 },
  2009: { cpi: 10.9, gdp: 8.5, plr: 12.0, usd: 48.4, credit: 0.58, demand: 0.70 },
  2010: { cpi: 12.0, gdp: 10.3, plr: 11.5, usd: 45.7, credit: 0.78, demand: 0.65 },
  2011: { cpi: 8.9, gdp: 6.6, plr: 14.0, usd: 46.7, credit: 0.66, demand: 0.58 },
  2012: { cpi: 9.3, gdp: 5.5, plr: 14.0, usd: 53.4, credit: 0.58, demand: 0.68 },
  2013: { cpi: 10.9, gdp: 6.4, plr: 14.0, usd: 58.6, credit: 0.50, demand: 0.75 },
  2014: { cpi: 6.4, gdp: 7.4, plr: 13.5, usd: 61.0, credit: 0.60, demand: 0.95 },
  2015: { cpi: 4.9, gdp: 8.0, plr: 12.5, usd: 64.2, credit: 0.70, demand: 1.25 },
  2016: { cpi: 4.5, gdp: 8.2, plr: 11.5, usd: 67.2, credit: 0.62, demand: 1.30 },
  2017: { cpi: 3.6, gdp: 7.2, plr: 11.0, usd: 65.1, credit: 0.66, demand: 1.35 },
  2018: { cpi: 3.4, gdp: 6.8, plr: 11.5, usd: 68.4, credit: 0.46, demand: 1.45 },
  2019: { cpi: 4.8, gdp: 4.2, plr: 11.0, usd: 70.4, credit: 0.34, demand: 1.40 },
  2020: { cpi: 6.2, gdp: -6.6, plr: 10.0, usd: 74.1, credit: 0.40, demand: 0.60 },
  // The 2020s are appended so a player who chooses to carry on past March 2020 has real
  // ground to walk on. Everything above this line is the historical record.
  ...MACRO_2020S,
  // 2031 onward is invented outright. See history2050.js.
  ...MACRO_2050,
};

/** The last year for which the series is defined. */
export const LAST_YEAR = Math.max(...Object.keys(MACRO).map(Number));

// Month-keyed overrides for sharp shocks an annual average would smear away.
// Key = absolute month index (0 = January 1995).
export const SHOCKS = {
  10: { credit: 0.22 }, 11: { credit: 0.24 }, 12: { credit: 0.28 },   // Nov 1995 call-money crisis
  30: { credit: 0.40 },                                                // Jul 1997 Asian crisis
  164: { credit: 0.25, demand: 0.70 },                                 // Sep 2008 Lehman
  165: { credit: 0.20, demand: 0.62 },
  166: { credit: 0.20, demand: 0.58 },
  167: { credit: 0.24, demand: 0.58 },
  179: { demand: 0.55 },                                               // Dec 2009 Telangana announcement
  180: { demand: 0.45 }, 181: { demand: 0.42 }, 182: { demand: 0.44 },
  201: { demand: 0.40 }, 202: { demand: 0.38 },                        // Sakala Janula Samme
  262: { credit: 0.30, demand: 0.55 },                                 // Nov 2016 demonetisation
  263: { credit: 0.32, demand: 0.45 },
  264: { credit: 0.36, demand: 0.50 }, 265: { demand: 0.60 },
  270: { demand: 0.90 },                                               // GST transition quarter
  284: { credit: 0.28 }, 285: { credit: 0.26 },                        // IL&FS default
  302: { demand: 0.35, credit: 0.30 },
  ...SHOCKS_2020S,
  ...SHOCKS_2050,
};

// The chronicle. These arrive as news and, where flagged, change the world.
export const TIMELINE = [
  {
    m: 0, tag: 'POLITICS', head: 'NTR government imposes total prohibition in Andhra Pradesh',
    body: 'From 16 January, liquor sale is banned statewide. The state forfeits roughly Rs 1,200 crore of annual excise revenue. Secretariat officials are privately warning that road, water and drainage budgets will be cut.',
    effect: { infraBudget: 0.55 },
  },
  {
    m: 3, tag: 'ECONOMY', head: 'Cement shortage across the Deccan pushes bag prices up',
    body: 'Dealers in Secunderabad report OPC touching Rs 128 a bag. Builders are stockpiling and contractors are asking for price-escalation clauses.',
    effect: { materialSpike: 1.12 },
  },
  {
    m: 8, tag: 'POLITICS', head: 'Chandrababu Naidu replaces NTR as Chief Minister',
    body: 'After a revolt by TDP legislators, N. Chandrababu Naidu is sworn in on 1 September. He is 45, speaks the language of business, and has told industry bodies that Hyderabad must compete with Bangalore.',
    effect: { regime: 'naidu', infraBudget: 0.85, bizConfidence: 1.15 },
  },
  {
    m: 10, tag: 'ECONOMY', head: 'Money market seizes: call rates touch 35 per cent',
    body: 'A severe liquidity squeeze hits the banking system. Banks stop fresh sanctions entirely. Private financiers are asking 4 per cent a month and getting it.',
    effect: {},
  },
  {
    m: 12, tag: 'POLITICS', head: 'N. T. Rama Rao dies',
    body: 'The founder of the Telugu Desam Party dies on 18 January. Naidu consolidates control of the party and the government.',
    effect: {},
  },
  {
    m: 16, tag: 'POLITICS', head: 'Narasimha Rao loses power at the Centre',
    body: 'The Congress is voted out. A United Front coalition takes office in Delhi. Continuity on liberalisation is suddenly uncertain.',
    effect: {},
  },
  {
    m: 22, tag: 'INFRA', head: 'State announces a software technology corridor west of the city',
    body: 'The government says it will develop an information-technology park on rocky land near Madhapur village, off the Jubilee Hills road. Most established builders consider the location unserviceable: no water, no drainage, no approach road worth the name.',
    effect: { unlock: 'HITEC_ANNOUNCE' },
  },
  {
    m: 30, tag: 'ECONOMY', head: 'Currency crisis spreads across East Asia',
    body: 'Thailand devalues. Foreign investors pull back from emerging markets. Indian exporters are nervous and banks turn cautious on long-tenure lending.',
    effect: {},
  },
  {
    m: 38, tag: 'POLITICS', head: 'Vajpayee forms government at the Centre',
    body: 'The BJP-led coalition takes office in March 1998. TDP supports from outside, giving Naidu unusual leverage in Delhi over central projects.',
    effect: { bizConfidence: 1.1 },
  },
  {
    m: 41, tag: 'ECONOMY', head: 'Sanctions after Pokhran-II; rupee slides past Rs 42',
    body: 'Nuclear tests draw international sanctions. Import costs rise; steel, lifts and imported equipment get dearer.',
    effect: { materialSpike: 1.08 },
  },
  {
    m: 46, tag: 'INFRA', head: 'Cyber Towers inaugurated at HITEC City',
    body: 'The first tower of the software park opens at Madhapur in November. A handful of multinationals sign up. Brokers who were selling Madhapur land at Rs 250 a yard eighteen months ago are now quoting Rs 700 and refusing to negotiate.',
    effect: { unlock: 'HITEC_LIVE', bizConfidence: 1.2 },
  },
  {
    m: 57, tag: 'POLITICS', head: 'Naidu re-elected; Vajpayee returns with a stable majority',
    body: 'The TDP retains Andhra Pradesh. Naidu doubles down on infrastructure, information technology and a rebuilt Hyderabad image.',
    effect: { infraBudget: 1.1 },
  },
  {
    m: 60, tag: 'ECONOMY', head: 'Y2K passes without incident, and Hyderabad has been paid for it',
    body: 'Indian software firms billed the world to fix a date bug. Hyderabad now has thousands of engineers on dollar-linked salaries and nowhere decent to buy a flat.',
    effect: {},
  },
  {
    m: 70, tag: 'INFRA', head: 'Necklace Road and the Hussain Sagar lakefront open',
    body: 'The state showcases a redeveloped city core. Land around the lake, Khairatabad and Punjagutta re-rates.',
    effect: {},
  },
  {
    m: 74, tag: 'ECONOMY', head: 'The technology bubble bursts',
    body: 'Nasdaq collapses. Hiring freezes across software firms. Office demand in Madhapur stalls and several announced projects go quiet. The men who bought land there in 1999 are learning what illiquidity means.',
    effect: {},
  },
  {
    m: 96, tag: 'INFRA', head: 'State commissions a feasibility study for an Outer Ring Road',
    body: 'A 150-kilometre orbital road around Hyderabad is proposed. No alignment has been published. Land agents are already selling ORR-touching plots in eleven different villages, most of which the road will never come near.',
    effect: { unlock: 'ORR_STUDY' },
  },
  {
    m: 100, tag: 'INFRA', head: 'New international airport shortlisted for Shamshabad',
    body: 'The Centre and state agree in principle on a greenfield airport south of the city. Farmers around Shamshabad, Satamrai and Mamidipally have stopped selling entirely.',
    effect: { unlock: 'AIRPORT_ANNOUNCE' },
  },
  {
    m: 112, tag: 'POLITICS', head: 'Y. S. Rajasekhara Reddy sweeps Andhra Pradesh for Congress',
    body: 'May 2004. Naidu is out after nine years. YSR campaigned on farmers and irrigation, not on information technology. The bureaucrats who built HITEC City are being transferred. But construction demand now runs on private employment rather than government showcasing, and it does not slow.',
    effect: { regime: 'ysr', infraBudget: 1.0, bizConfidence: 1.05 },
  },
  {
    m: 122, tag: 'INFRA', head: 'Work begins on Rajiv Gandhi International Airport, Shamshabad',
    body: 'March 2005. A GMR-led consortium breaks ground. An expressway from Mehdipatnam is planned. Land within ten kilometres has tripled in eighteen months.',
    effect: { unlock: 'AIRPORT_BUILD' },
  },
  {
    m: 128, tag: 'REGULATION', head: 'Special Economic Zones Act notified',
    body: 'Developers can now build tax-privileged office campuses. Applications pour in for Gachibowli, Nanakramguda and Pocharam. Institutional money starts looking at Indian office assets for the first time.',
    effect: { unlock: 'SEZ' },
  },
  {
    m: 140, tag: 'ECONOMY', head: 'Hyderabad land enters open mania',
    body: 'Government auction rates in Kokapet cross one crore an acre, then fourteen crore an acre. Every second businessman in the city is now a developer. Banks are lending against land at valuations nobody can defend.',
    effect: {},
  },
  {
    m: 158, tag: 'INFRA', head: 'Rajiv Gandhi International Airport opens at Shamshabad',
    body: 'March 2008. Begumpet closes to commercial traffic. Height restrictions over Begumpet, Somajiguda, Ameerpet and parts of Secunderabad are relaxed. Those plots can finally go taller.',
    effect: { unlock: 'AIRPORT_LIVE', farRelax: ['begumpet', 'somajiguda', 'ameerpet', 'secunderabad'] },
  },
  {
    m: 156, tag: 'REGULATION', head: 'State opens LRS and BPS: an amnesty for unapproved layouts',
    body: 'January 2008. The Layout Regularisation Scheme and the Building Penalisation Scheme open together. Unapproved layouts and deviated buildings can be regularised on payment of fees and an open-space contribution, without the years of argument it normally takes. Every venture developer in the state is queueing at the development authority.',
    effect: { unlock: 'LRS_2008' },
  },
  {
    m: 246, tag: 'REGULATION', head: 'Telangana reopens the Layout Regularisation Scheme',
    body: 'July 2015. The new state reopens LRS. Anything unapproved that has been sitting unsold since the last amnesty can be brought onto the record, and plots that no bank would lend against become mortgageable overnight.',
    effect: { unlock: 'LRS_2015' },
  },
  {
    m: 164, tag: 'ECONOMY', head: 'Lehman Brothers collapses; global credit freezes',
    body: 'September 2008. Indian banks stop disbursing to developers overnight. Buyers vanish. Several Hyderabad builders who bought land at 2007 prices on three-per-cent-a-month money are now insolvent and do not know it yet.',
    effect: { crash: true },
  },
  {
    m: 176, tag: 'POLITICS', head: 'Chief Minister Y. S. Rajasekhara Reddy dies in a helicopter crash',
    body: 'September 2009. The state loses its dominant political figure with no succession plan. Government decision-making simply stops.',
    effect: { infraBudget: 0.6, regime: 'drift' },
  },
  {
    m: 179, tag: 'POLITICS', head: 'Centre announces the process for Telangana statehood, then stalls',
    body: 'On 9 December 2009 the Home Minister announces that the process for forming Telangana will be initiated. Within two weeks coastal Andhra erupts and the announcement is effectively withdrawn. Hyderabad, claimed by both sides, becomes the disputed prize.',
    effect: { unlock: 'AGITATION', infraBudget: 0.45 },
  },
  {
    m: 189, tag: 'INFRA', head: 'Hyderabad Metro Rail concession signed with L&T',
    body: 'Seventy-two kilometres of elevated metro on three corridors, on a public-private concession. Construction has not started. Nobody in the trade expects it on time.',
    effect: { unlock: 'METRO_SIGNED' },
  },
  {
    m: 190, tag: 'ECONOMY', head: 'Hyderabad property market goes silent',
    body: 'Bandhs, strikes and uncertainty over who will govern the capital have driven registrations to a decade low. Andhra investors are selling. Builders sit on unsold inventory and unpaid interest, waiting for a political answer.',
    effect: {},
  },
  {
    m: 201, tag: 'POLITICS', head: 'Sakala Janula Samme: a 42-day general strike paralyses the region',
    body: 'Government employees, coal miners and transport workers strike for statehood. Nothing gets registered, approved, delivered or sold.',
    effect: {},
  },
  {
    m: 213, tag: 'INFRA', head: 'Outer Ring Road substantially complete',
    body: 'The 158-kilometre orbital is largely open. Land along the radial roads and near the interchanges is genuinely accessible for the first time. Warehousing enquiries begin.',
    effect: { unlock: 'ORR_LIVE' },
  },
  {
    m: 233, tag: 'POLITICS', head: 'Telangana is formed; K. Chandrashekar Rao becomes Chief Minister',
    body: '2 June 2014. Hyderabad is the capital of the new state, shared with Andhra Pradesh for ten years. Andhra investors are unsure whether to stay. The new government promises an aggressive industrial policy and a clean-up of building approvals.',
    effect: { regime: 'kcr', infraBudget: 1.15, bizConfidence: 1.1, unlock: 'TELANGANA' },
  },
  {
    m: 235, tag: 'REGULATION', head: 'TS-iPASS: single-window industrial clearance in fifteen days',
    body: 'The new state legislates self-certification and deemed approval for industrial projects. Confidence among corporate occupiers rises sharply.',
    effect: { approvalSpeed: 1.35 },
  },
  {
    m: 262, tag: 'ECONOMY', head: 'Demonetisation: Rs 500 and Rs 1,000 notes withdrawn overnight',
    body: '8 November 2016. Cash components in land deals evaporate. Secondary transactions collapse. Labour on sites goes unpaid for weeks because contractors cannot draw cash. Primary sales by cheque, from organised developers, are hurt least.',
    effect: { unlock: 'DEMONETISATION' },
  },
  {
    m: 268, tag: 'REGULATION', head: 'Real Estate (Regulation and Development) Act comes into force',
    body: '1 May 2017. Project registration, escrow of seventy per cent of buyer receipts, penalties for delay. Small builders who funded Project B out of Project A advances are finished.',
    effect: { unlock: 'RERA' },
  },
  {
    m: 270, tag: 'REGULATION', head: 'GST replaces the indirect tax system',
    body: '1 July 2017. Input credits change project economics and the transition quarter is chaotic. Under-construction sales attract GST; completed units do not.',
    effect: { unlock: 'GST' },
  },
  {
    m: 274, tag: 'INFRA', head: 'Hyderabad Metro opens: Nagole to Miyapur',
    body: '28 November 2017. Thirty kilometres running. Property along the corridor re-rates within weeks.',
    effect: { unlock: 'METRO_LIVE' },
  },
  {
    m: 284, tag: 'ECONOMY', head: 'IL&FS defaults; the non-bank funding tap closes',
    body: 'September 2018. Non-bank lenders had become the main financiers of Indian real estate. Their own funding cost spikes and refinancing stops. Highly leveraged developers begin selling assets at whatever they can get.',
    effect: {},
  },
  {
    m: 287, tag: 'POLITICS', head: 'KCR returns with a larger majority in Telangana',
    body: 'December 2018. Continuity. Large infrastructure, the new Secretariat and the western corridor all proceed.',
    effect: {},
  },
  {
    m: 302, tag: 'ECONOMY', head: 'A respiratory virus is spreading out of China; markets are falling',
    body: 'March 2020. Sites are emptying as migrant labour begins leaving the city. Nobody yet knows how long this lasts.',
    effect: { end: true },
  },
];

// Governing regimes: how approvals behave and where the pressure comes from.
export const TIMELINE_FULL = [...TIMELINE, ...TIMELINE_2020S, ...TIMELINE_2050];

export const REGIMES = {
  ntr: { key: 'ntr', name: 'N. T. Rama Rao (TDP)', approvalSpeed: 0.85, pressure: 0.50, focus: 'Welfare and prohibition' },
  naidu: { key: 'naidu', name: 'N. Chandrababu Naidu (TDP)', approvalSpeed: 1.00, pressure: 0.60, focus: 'Urban infrastructure and IT' },
  ysr: { key: 'ysr', name: 'Y. S. Rajasekhara Reddy (INC)', approvalSpeed: 0.90, pressure: 0.80, focus: 'Irrigation and rural welfare' },
  drift: { key: 'drift', name: 'Congress (post-YSR drift)', approvalSpeed: 0.55, pressure: 0.85, focus: 'Paralysis' },
  kcr: { key: 'kcr', name: 'K. Chandrashekar Rao (TRS)', approvalSpeed: 1.25, pressure: 0.70, focus: 'Hyderabad growth and western corridor' },
  revanth: { key: 'revanth', name: 'A. Revanth Reddy (INC)', approvalSpeed: 0.95, pressure: 0.75, focus: 'Review, regularisation and the Musi' },
};

export function regimeAt(m) {
  if (m >= 347) return REGIMES.revanth;
  if (m >= 233) return REGIMES.kcr;
  if (m >= 176) return REGIMES.drift;
  if (m >= 112) return REGIMES.ysr;
  if (m >= 8) return REGIMES.naidu;
  return REGIMES.ntr;
}

/** CPI index, January 1995 = 100. Used for real (purchasing-power) conversions. */
export const CPI_INDEX = (() => {
  const idx = {};
  let v = 100;
  for (let y = 1995; y <= LAST_YEAR; y++) { idx[y] = v; v *= 1 + MACRO[y].cpi / 100; }
  return idx;
})();
