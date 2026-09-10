// Hyderabad geography. Every locality carries a 1995 base price in rupees per square
// yard and a multiplier track anchored to what actually happened there between 1995 and
// 2020. Tracks are deliberately non-monotonic: the 2001 technology bust, the 2008 credit
// freeze and the 2010-2013 Telangana agitation are all visible as flat or falling stretches.
//
// Land multiplies far harder than rent does. That asymmetry is the central strategic fact
// of this game: holding land beats building, building beats renting on raw return, but only
// rent produces the cash flow that lets you survive a crash and borrow against something.

const A = (pairs) => pairs.map(([year, v]) => ({ year, v }));

export const LOCALITIES = [
  {
    id: 'banjara', name: 'Banjara Hills', zone: 'core', base: 5200, far: 1.75, airportCap: false,
    tags: ['prime', 'ulc'], liquidity: 0.55, prestige: 0.95,
    desc: 'Ministers, film financiers and old Hyderabadi money. Almost nothing clean comes to market, and what does is tangled in urban land ceiling exemptions.',
    risk: { ULC_SURPLUS: 0.30, LITIGATION: 0.18, MISSING_HEIR: 0.12, TENANT_PROTECTED: 0.10 },
    rentBase: { res: 5.5, office: 16, retail: 30, industrial: null },
    track: A([[1995,1],[1997,1.15],[1999,1.5],[2000,1.9],[2001,2.0],[2003,2.3],[2004,3.0],[2005,4.2],[2006,6.0],[2007,7.5],[2008,7.0],[2009,6.0],[2010,6.8],[2011,6.6],[2012,7.2],[2013,8.0],[2014,10],[2015,13],[2016,16.5],[2017,20],[2018,24.5],[2019,29],[2020,32]]),
  },
  {
    id: 'jubilee', name: 'Jubilee Hills', zone: 'core', base: 3600, far: 1.75, airportCap: false,
    tags: ['prime', 'coop'], liquidity: 0.6, prestige: 0.9,
    desc: 'Co-operative society plots, half of them still bare rock behind compound walls. Society allotment conditions restrict transfer for years after allotment.',
    risk: { ULC_SURPLUS: 0.18, SOCIETY_LOCKIN: 0.25, LITIGATION: 0.12 },
    rentBase: { res: 4.8, office: 14, retail: 24, industrial: null },
    track: A([[1995,1],[1997,1.2],[1999,1.7],[2000,2.2],[2001,2.3],[2003,2.7],[2004,3.6],[2005,5.2],[2006,7.6],[2007,9.6],[2008,8.8],[2009,7.4],[2010,8.5],[2011,8.2],[2012,9.0],[2013,10.2],[2014,13],[2015,17],[2016,21.5],[2017,26],[2018,31],[2019,35.5],[2020,38]]),
  },
  {
    id: 'somajiguda', name: 'Somajiguda / Punjagutta', zone: 'core', base: 4300, far: 1.6, airportCap: true,
    tags: ['commercial'], liquidity: 0.65, prestige: 0.8,
    desc: 'The commercial spine. Best office rents in the city, and a height cap because of the Begumpet approach funnel.',
    risk: { ULC_SURPLUS: 0.22, LITIGATION: 0.16, MUNICIPAL_DEVIATION: 0.20 },
    rentBase: { res: 4.0, office: 15, retail: 34, industrial: null },
    track: A([[1995,1],[1997,1.15],[1999,1.45],[2000,1.8],[2001,1.9],[2003,2.1],[2004,2.7],[2005,3.6],[2006,5.0],[2007,6.2],[2008,5.8],[2009,5.0],[2010,5.8],[2011,5.6],[2012,6.2],[2013,7.0],[2014,8.6],[2015,11],[2016,13.5],[2017,16],[2018,18.8],[2019,21],[2020,22]]),
  },
  {
    id: 'begumpet', name: 'Begumpet', zone: 'core', base: 3600, far: 1.2, airportCap: true,
    tags: ['commercial', 'airport'], liquidity: 0.6, prestige: 0.75,
    desc: 'Airport funnel restrictions cap everything at four floors. When the airport moves, that cap moves with it.',
    risk: { ULC_SURPLUS: 0.20, LITIGATION: 0.14, MUNICIPAL_DEVIATION: 0.16, CANTONMENT: 0.10 },
    rentBase: { res: 4.2, office: 14, retail: 26, industrial: null },
    track: A([[1995,1],[1997,1.12],[1999,1.4],[2000,1.75],[2001,1.85],[2003,2.0],[2004,2.6],[2005,3.4],[2006,4.7],[2007,5.8],[2008,6.4],[2009,5.4],[2010,6.2],[2011,6.0],[2012,6.6],[2013,7.4],[2014,9.0],[2015,11.5],[2016,14],[2017,16.5],[2018,19],[2019,21],[2020,22]]),
  },
  {
    id: 'ameerpet', name: 'Ameerpet', zone: 'core', base: 2800, far: 1.5, airportCap: true,
    tags: ['commercial', 'congested'], liquidity: 0.72, prestige: 0.5,
    desc: 'Filthy, congested, no parking, and the highest footfall in the city. Every software training institute in Andhra Pradesh is on this one road.',
    risk: { MUNICIPAL_DEVIATION: 0.30, LITIGATION: 0.16, TENANT_PROTECTED: 0.18, ULC_SURPLUS: 0.12 },
    rentBase: { res: 3.4, office: 9, retail: 22, industrial: null },
    track: A([[1995,1],[1997,1.2],[1999,1.6],[2000,2.1],[2001,2.2],[2003,2.5],[2004,3.2],[2005,4.3],[2006,6.0],[2007,7.4],[2008,6.9],[2009,5.9],[2010,6.8],[2011,6.6],[2012,7.3],[2013,8.4],[2014,10.5],[2015,13.5],[2016,16.8],[2017,20],[2018,23.5],[2019,25.5],[2020,26]]),
  },
  {
    id: 'secunderabad', name: 'Secunderabad', zone: 'core', base: 3800, far: 1.5, airportCap: true,
    tags: ['commercial', 'cantonment'], liquidity: 0.6, prestige: 0.7,
    desc: 'Cantonment land rules, colonial-era titles and a trading economy that never sleeps. Half the documents in this market start with a 1948 court order.',
    risk: { CANTONMENT: 0.28, LITIGATION: 0.22, MISSING_HEIR: 0.16, MUNICIPAL_DEVIATION: 0.14 },
    rentBase: { res: 4.0, office: 12, retail: 32, industrial: 4 },
    track: A([[1995,1],[1997,1.14],[1999,1.42],[2000,1.75],[2001,1.85],[2003,2.05],[2004,2.6],[2005,3.4],[2006,4.6],[2007,5.7],[2008,5.4],[2009,4.7],[2010,5.4],[2011,5.3],[2012,5.8],[2013,6.6],[2014,8.2],[2015,10.4],[2016,12.8],[2017,15],[2018,17.5],[2019,19.2],[2020,20]]),
  },
  {
    id: 'himayatnagar', name: 'Himayatnagar / Narayanaguda', zone: 'core', base: 2700, far: 1.6, airportCap: false,
    tags: ['redevelopment'], liquidity: 0.62, prestige: 0.6,
    desc: 'Old bungalows on six hundred square yard plots, occupied by families who will not sell but might develop. The natural hunting ground for development agreements.',
    risk: { MISSING_HEIR: 0.28, LITIGATION: 0.18, TENANT_PROTECTED: 0.20, ULC_SURPLUS: 0.14 },
    rentBase: { res: 3.8, office: 9, retail: 20, industrial: null },
    track: A([[1995,1],[1997,1.16],[1999,1.5],[2000,1.9],[2001,2.0],[2003,2.25],[2004,2.9],[2005,3.8],[2006,5.2],[2007,6.4],[2008,6.0],[2009,5.2],[2010,6.0],[2011,5.8],[2012,6.4],[2013,7.3],[2014,9.2],[2015,11.8],[2016,14.6],[2017,17.5],[2018,20.5],[2019,22.8],[2020,24]]),
  },
  {
    id: 'kukatpally', name: 'Kukatpally / KPHB', zone: 'northwest', base: 850, far: 1.75, airportCap: false,
    tags: ['residential', 'mass'], liquidity: 0.85, prestige: 0.45,
    desc: 'BHEL, IDPL and Allwyn employees with provident funds and housing loans. Real, salaried, mortgage-eligible demand. This is where volume housing actually sells.',
    risk: { LAYOUT_UNAPPROVED: 0.20, LITIGATION: 0.10, MISSING_HEIR: 0.10 },
    rentBase: { res: 2.0, office: 5, retail: 11, industrial: 3 },
    track: A([[1995,1],[1997,1.2],[1999,1.7],[2000,2.2],[2001,2.3],[2003,2.8],[2004,3.8],[2005,5.5],[2006,8.5],[2007,11],[2008,10],[2009,8.5],[2010,10],[2011,9.6],[2012,10.8],[2013,12.5],[2014,16],[2015,22],[2016,28],[2017,35],[2018,43],[2019,50],[2020,55]]),
  },
  {
    id: 'miyapur', name: 'Miyapur', zone: 'northwest', base: 300, far: 1.75, airportCap: false,
    tags: ['residential', 'periphery'], liquidity: 0.6, prestige: 0.3,
    desc: 'Bombay Highway outskirts. Scrub, a few unapproved layouts and a bus depot. Nothing here yet.',
    risk: { LAYOUT_UNAPPROVED: 0.38, ASSIGNED_LAND: 0.12, LITIGATION: 0.12 },
    rentBase: { res: 1.4, office: null, retail: 6, industrial: 2.4 },
    track: A([[1995,1],[1997,1.15],[1999,1.8],[2000,2.6],[2001,2.8],[2003,3.4],[2004,5],[2005,8],[2006,14],[2007,20],[2008,18],[2009,14],[2010,17],[2011,16],[2012,19],[2013,23],[2014,32],[2015,46],[2016,60],[2017,78],[2018,95],[2019,108],[2020,115]]),
  },
  {
    id: 'madhapur', name: 'Madhapur', zone: 'west', base: 220, far: 1.75, airportCap: false,
    tags: ['emerging', 'rock'], liquidity: 0.35, prestige: 0.2,
    desc: 'Rock, thorn scrub and a quarry. No water table worth drilling, no drainage, a dirt approach from Jubilee Hills. Land here is cheap because nobody sane wants it.',
    risk: { LAYOUT_UNAPPROVED: 0.30, ASSIGNED_LAND: 0.16, NO_ACCESS: 0.24, LITIGATION: 0.12 },
    rentBase: { res: 1.5, office: 19, retail: 8, industrial: 2.6 },
    officeUnlock: 'HITEC_LIVE',
    track: A([[1995,1],[1996,1.05],[1997,1.3],[1998,2.2],[1999,4.0],[2000,6.5],[2001,7.0],[2002,6.6],[2003,8.0],[2004,14],[2005,26],[2006,48],[2007,70],[2008,62],[2009,48],[2010,55],[2011,52],[2012,58],[2013,66],[2014,88],[2015,130],[2016,180],[2017,240],[2018,310],[2019,390],[2020,430]]),
  },
  {
    id: 'kondapur', name: 'Kondapur', zone: 'west', base: 180, far: 1.75, airportCap: false,
    tags: ['emerging', 'village'], liquidity: 0.35, prestige: 0.2,
    desc: 'A village, a tank and farmland. Patta land held by cultivating families who have never sold to an outsider.',
    risk: { LAYOUT_UNAPPROVED: 0.34, ASSIGNED_LAND: 0.18, NO_ACCESS: 0.20, MISSING_HEIR: 0.16 },
    rentBase: { res: 1.4, office: 15, retail: 7, industrial: 2.4 },
    officeUnlock: 'HITEC_LIVE',
    track: A([[1995,1],[1997,1.1],[1998,1.7],[1999,3.0],[2000,5.0],[2001,5.5],[2002,5.1],[2003,6.4],[2004,11],[2005,21],[2006,42],[2007,64],[2008,56],[2009,42],[2010,50],[2011,47],[2012,53],[2013,62],[2014,84],[2015,124],[2016,172],[2017,228],[2018,296],[2019,364],[2020,400]]),
  },
  {
    id: 'gachibowli', name: 'Gachibowli', zone: 'west', base: 140, far: 1.75, airportCap: false,
    tags: ['emerging', 'village'], liquidity: 0.3, prestige: 0.18,
    desc: 'A village beside the Central University boundary. The approach road is single-lane and floods. Large government and institutional landholdings nearby.',
    risk: { LAYOUT_UNAPPROVED: 0.32, ASSIGNED_LAND: 0.22, NO_ACCESS: 0.28, GOVT_CLAIM: 0.14 },
    rentBase: { res: 1.3, office: 18, retail: 6.5, industrial: 2.2 },
    officeUnlock: 'HITEC_LIVE',
    track: A([[1995,1],[1997,1.1],[1998,1.6],[1999,3.2],[2000,5.5],[2001,6.0],[2002,5.6],[2003,7.0],[2004,13],[2005,26],[2006,52],[2007,80],[2008,70],[2009,52],[2010,62],[2011,58],[2012,66],[2013,78],[2014,105],[2015,155],[2016,215],[2017,285],[2018,370],[2019,455],[2020,500]]),
  },
  {
    id: 'nanakramguda', name: 'Nanakramguda', zone: 'west', base: 90, far: 1.75, airportCap: false,
    tags: ['emerging', 'village'], liquidity: 0.22, prestige: 0.15,
    desc: 'Fields and a temple. Twelve kilometres from Abids and a world away from anything.',
    risk: { ASSIGNED_LAND: 0.26, LAYOUT_UNAPPROVED: 0.36, NO_ACCESS: 0.32, GOVT_CLAIM: 0.16 },
    rentBase: { res: 1.1, office: 17, retail: 5, industrial: 2 },
    officeUnlock: 'SEZ',
    track: A([[1995,1],[1998,1.3],[1999,2.2],[2000,3.6],[2001,4.0],[2002,3.7],[2003,5.0],[2004,10],[2005,22],[2006,52],[2007,90],[2008,78],[2009,56],[2010,70],[2011,66],[2012,76],[2013,92],[2014,128],[2015,196],[2016,290],[2017,400],[2018,530],[2019,650],[2020,700]]),
  },
  {
    id: 'kokapet', name: 'Kokapet', zone: 'west', base: 70, far: 1.75, airportCap: false,
    tags: ['emerging', 'agri'], liquidity: 0.18, prestige: 0.12,
    desc: 'Dry farmland on the far side of the Osman Sagar catchment. Ask a broker in 1995 and he will tell you not to waste his petrol.',
    risk: { ASSIGNED_LAND: 0.30, CATCHMENT_ZONE: 0.34, NO_ACCESS: 0.36, LAYOUT_UNAPPROVED: 0.40 },
    rentBase: { res: 1.0, office: 16, retail: 4.5, industrial: 1.8 },
    officeUnlock: 'SEZ',
    track: A([[1995,1],[1999,1.5],[2001,1.9],[2003,2.2],[2004,5],[2005,14],[2006,45],[2007,95],[2008,70],[2009,48],[2010,60],[2011,55],[2012,62],[2013,75],[2014,110],[2015,180],[2016,280],[2017,420],[2018,600],[2019,790],[2020,900]]),
  },
  {
    id: 'manikonda', name: 'Manikonda', zone: 'west', base: 100, far: 1.75, airportCap: false,
    tags: ['emerging', 'wakf'], liquidity: 0.2, prestige: 0.15,
    desc: 'Cheap, close to Jubilee Hills, and encumbered. Large tracts here are claimed as Wakf property and the claims have been in court since the Nizam.',
    risk: { WAKF_CLAIM: 0.42, ASSIGNED_LAND: 0.18, LITIGATION: 0.30, LAYOUT_UNAPPROVED: 0.30 },
    rentBase: { res: 1.2, office: 13, retail: 5, industrial: 2 },
    officeUnlock: 'SEZ',
    track: A([[1995,1],[1999,1.6],[2000,2.4],[2003,3.2],[2004,6],[2005,12],[2006,26],[2007,42],[2008,36],[2009,26],[2010,32],[2011,29],[2012,34],[2013,42],[2014,60],[2015,95],[2016,140],[2017,200],[2018,290],[2019,400],[2020,500]]),
  },
  {
    id: 'narsingi', name: 'Narsingi', zone: 'west', base: 90, far: 1.75, airportCap: false,
    tags: ['emerging', 'agri'], liquidity: 0.2, prestige: 0.15,
    desc: 'Farmland on the Vikarabad road, past the last streetlight.',
    risk: { ASSIGNED_LAND: 0.28, CATCHMENT_ZONE: 0.22, NO_ACCESS: 0.30, LAYOUT_UNAPPROVED: 0.36 },
    rentBase: { res: 1.1, office: 14, retail: 4.5, industrial: 1.9 },
    officeUnlock: 'SEZ',
    track: A([[1995,1],[1999,1.5],[2001,1.9],[2003,2.4],[2004,4.5],[2005,10],[2006,24],[2007,40],[2008,34],[2009,25],[2010,31],[2011,29],[2012,34],[2013,42],[2014,62],[2015,100],[2016,150],[2017,215],[2018,310],[2019,420],[2020,500]]),
  },
  {
    id: 'uppal', name: 'Uppal', zone: 'east', base: 420, far: 1.75, airportCap: false,
    tags: ['residential', 'industrial'], liquidity: 0.55, prestige: 0.3,
    desc: 'Industrial estates, a bus depot and cheap plots on the Warangal highway. The east side of the city has always been the poor cousin.',
    risk: { LAYOUT_UNAPPROVED: 0.26, ASSIGNED_LAND: 0.14, LITIGATION: 0.12 },
    rentBase: { res: 1.5, office: 5, retail: 8, industrial: 3.2 },
    track: A([[1995,1],[1999,1.5],[2001,1.8],[2003,2.2],[2004,3.0],[2005,4.4],[2006,7],[2007,9.5],[2008,8.6],[2009,7.0],[2010,8.4],[2011,8.0],[2012,9.2],[2013,11],[2014,14.5],[2015,20],[2016,26],[2017,36],[2018,47],[2019,58],[2020,65]]),
  },
  {
    id: 'lbnagar', name: 'LB Nagar', zone: 'east', base: 500, far: 1.75, airportCap: false,
    tags: ['residential'], liquidity: 0.6, prestige: 0.32,
    desc: 'The southeastern gateway on the Vijayawada highway. Growing steadily on its own, without any government help.',
    risk: { LAYOUT_UNAPPROVED: 0.24, ASSIGNED_LAND: 0.12, LITIGATION: 0.12 },
    rentBase: { res: 1.6, office: 5.5, retail: 9, industrial: 3 },
    track: A([[1995,1],[1999,1.55],[2001,1.85],[2003,2.25],[2004,3.0],[2005,4.3],[2006,6.6],[2007,9.0],[2008,8.2],[2009,6.8],[2010,8.0],[2011,7.7],[2012,8.8],[2013,10.4],[2014,13.6],[2015,18.5],[2016,24],[2017,32],[2018,42],[2019,53],[2020,60]]),
  },
  {
    id: 'kompally', name: 'Kompally', zone: 'north', base: 130, far: 1.75, airportCap: false,
    tags: ['periphery', 'agri'], liquidity: 0.3, prestige: 0.2,
    desc: 'Poultry farms and dhabas on the Nagpur highway.',
    risk: { LAYOUT_UNAPPROVED: 0.34, ASSIGNED_LAND: 0.18, NO_ACCESS: 0.20 },
    rentBase: { res: 1.1, office: 6, retail: 4.5, industrial: 2.4 },
    track: A([[1995,1],[1999,1.4],[2001,1.8],[2003,2.2],[2004,3.2],[2005,5],[2006,9],[2007,14],[2008,12.5],[2009,9.5],[2010,11.5],[2011,11],[2012,12.5],[2013,15],[2014,20],[2015,29],[2016,40],[2017,55],[2018,80],[2019,110],[2020,130]]),
  },
  {
    id: 'shamshabad', name: 'Shamshabad', zone: 'south', base: 100, far: 1.75, airportCap: false,
    tags: ['agri', 'periphery'], liquidity: 0.25, prestige: 0.15,
    desc: 'Dry farmland on the Bangalore highway. Three crops fail in five years here and the families are willing to talk.',
    risk: { ASSIGNED_LAND: 0.34, LAYOUT_UNAPPROVED: 0.30, NO_ACCESS: 0.24, GOVT_CLAIM: 0.18 },
    rentBase: { res: 1.0, office: null, retail: 4, industrial: 2 },
    track: A([[1995,1],[1999,1.3],[2001,2.5],[2002,3.2],[2003,4.5],[2004,8],[2005,16],[2006,28],[2007,40],[2008,44],[2009,34],[2010,40],[2011,38],[2012,44],[2013,50],[2014,62],[2015,78],[2016,92],[2017,105],[2018,118],[2019,127],[2020,130]]),
  },
  {
    id: 'pocharam', name: 'Pocharam / Ghatkesar', zone: 'east', base: 90, far: 1.75, airportCap: false,
    tags: ['agri', 'periphery'], liquidity: 0.22, prestige: 0.12,
    desc: 'Farmland east of the city on the Warangal road. Cheap because it is nowhere.',
    risk: { ASSIGNED_LAND: 0.30, LAYOUT_UNAPPROVED: 0.34, NO_ACCESS: 0.28 },
    rentBase: { res: 0.9, office: 7, retail: 3.5, industrial: 2.1 },
    officeUnlock: 'SEZ',
    track: A([[1995,1],[1999,1.3],[2001,1.7],[2003,2.1],[2004,3.0],[2005,5],[2006,9.5],[2007,16],[2008,14],[2009,10.5],[2010,13],[2011,12],[2012,14],[2013,17],[2014,23],[2015,34],[2016,48],[2017,66],[2018,92],[2019,124],[2020,150]]),
  },
  {
    id: 'medchal', name: 'Medchal (agricultural)', zone: 'north', base: 55, far: 1.0, airportCap: false,
    tags: ['agri', 'far'], liquidity: 0.15, prestige: 0.08,
    desc: 'Thirty kilometres out on the Nagpur highway. Genuine agricultural land, sold by the acre, with all the conversion problems that implies.',
    risk: { ASSIGNED_LAND: 0.32, LAYOUT_UNAPPROVED: 0.55, NO_ACCESS: 0.30, MISSING_HEIR: 0.20 },
    rentBase: { res: 0.7, office: null, retail: 2.5, industrial: 1.7 },
    track: A([[1995,1],[2000,1.5],[2003,2.0],[2005,3.6],[2007,8],[2008,7],[2010,8],[2012,9.5],[2014,14],[2016,26],[2018,48],[2020,72]]),
  },
];

import { TRACK_2020S, RENT_2020S, UNAPPROVED_2020S } from './history2020s.js';

// Extend every track into the 2020s. Done here rather than inline above so the
// historical record and its continuation stay visibly separate.
for (const loc of LOCALITIES) {
  const ext = TRACK_2020S[loc.id];
  if (ext) loc.track = loc.track.concat(ext.map(([year, v]) => ({ year, v })));
}

export const BY_ID = Object.fromEntries(LOCALITIES.map((l) => [l.id, l]));

// Global rent multiplier tracks by use. Rents rise far more slowly than land does.
// This is why gross yields compress from roughly twelve per cent to under six across
// the period, and why anyone who bought for yield in 1995 and held made money on the
// asset rather than on the income.
export const RENT_TRACK = {
  res: A([[1995,1],[1998,1.2],[2000,1.5],[2003,1.7],[2005,2.1],[2007,2.8],[2008,3.0],[2009,2.9],[2011,3.2],[2013,3.8],[2015,4.6],[2017,5.4],[2019,6.4],[2020,6.6]]),
  office: A([[1995,1],[1999,1.15],[2001,1.25],[2002,1.1],[2004,1.3],[2006,1.75],[2008,2.0],[2009,1.7],[2011,1.85],[2013,2.0],[2015,2.3],[2017,2.7],[2019,3.3],[2020,3.4]]),
  retail: A([[1995,1],[2000,1.4],[2003,1.5],[2005,1.8],[2007,2.3],[2009,2.2],[2011,2.5],[2013,2.9],[2015,3.4],[2017,3.9],[2019,4.4],[2020,4.5]]),
  industrial: A([[1995,1],[2000,1.2],[2005,1.5],[2008,1.8],[2010,2.2],[2013,2.6],[2015,3.0],[2017,3.4],[2019,4.0],[2020,4.2]]),
};

// Title defect catalogue. Severity 0-1; `fatal` means the parcel can never be
// legally developed or sold and the money is simply gone.
for (const [use, ext] of Object.entries(RENT_2020S)) {
  RENT_TRACK[use] = RENT_TRACK[use].concat(ext.map(([year, v]) => ({ year, v })));
}

export const DEFECTS = {
  ASSIGNED_LAND: {
    name: 'Assigned land (POT Act 1977)', severity: 1.0, fatal: true, ddDifficulty: 0.45,
    desc: 'Land assigned by government to landless poor. Transfer is void in law. No court will help you and no bank will lend against it.',
  },
  WAKF_CLAIM: {
    name: 'Wakf Board claim', severity: 0.85, fatal: false, ddDifficulty: 0.55,
    desc: 'The Wakf Board has entered this survey number in its register. Litigation runs for decades and no institutional buyer will touch it.',
  },
  ULC_SURPLUS: {
    name: 'Urban Land Ceiling surplus', severity: 0.6, fatal: false, ddDifficulty: 0.4,
    desc: 'Holdings above 1,000 square metres in the urban agglomeration vest with government under ULCRA 1976 unless exempted. Exemption applications take years.',
  },
  MISSING_HEIR: {
    name: 'Co-parcener has not signed', severity: 0.55, fatal: false, ddDifficulty: 0.3,
    desc: 'A joint family member, usually one who lives abroad, has not executed the deed. Any sale is voidable at his instance.',
  },
  LITIGATION: {
    name: 'Pending civil suit', severity: 0.5, fatal: false, ddDifficulty: 0.25,
    desc: 'A suit for specific performance or partition is pending. Injunctions can stop construction at any moment.',
  },
  GOVT_CLAIM: {
    name: 'Government / endowment claim', severity: 0.7, fatal: false, ddDifficulty: 0.5,
    desc: 'Revenue records show the land as government poramboke or endowment property. Prohibitory order likely.',
  },
  LAYOUT_UNAPPROVED: {
    name: 'Unapproved layout', severity: 0.35, fatal: false, ddDifficulty: 0.15,
    desc: 'No HUDA layout permission. Regularisation is possible but costs money, time and the surrender of open space.',
  },
  NO_ACCESS: {
    name: 'No legal access', severity: 0.45, fatal: false, ddDifficulty: 0.2,
    desc: 'The approach is over a neighbouring survey number with no registered right of way. The neighbour knows this.',
  },
  MUNICIPAL_DEVIATION: {
    name: 'Sanctioned-plan deviation', severity: 0.3, fatal: false, ddDifficulty: 0.2,
    desc: 'Existing construction violates setbacks or sanctioned floors. A demolition notice is outstanding.',
  },
  TENANT_PROTECTED: {
    name: 'Rent Control tenant in occupation', severity: 0.5, fatal: false, ddDifficulty: 0.12,
    desc: 'A tenant protected by the AP Buildings (Lease, Rent and Eviction) Control Act is sitting in the property at 1970s rent. Eviction takes seven to twelve years.',
  },
  SOCIETY_LOCKIN: {
    name: 'Co-operative society transfer bar', severity: 0.3, fatal: false, ddDifficulty: 0.18,
    desc: 'Society allotment conditions bar transfer for a period, and require the society to consent to any sale.',
  },
  CANTONMENT: {
    name: 'Cantonment / Class B land', severity: 0.65, fatal: false, ddDifficulty: 0.45,
    desc: 'Old Grant or Class B bungalow land where the Defence Estates Officer asserts that only occupancy rights, not ownership, were ever transferred.',
  },
  CATCHMENT_ZONE: {
    name: 'Reservoir catchment restriction', severity: 0.6, fatal: false, ddDifficulty: 0.35,
    desc: 'Falls in the Osman Sagar / Himayat Sagar catchment where construction is restricted by government order. Restrictions occasionally get relaxed. Occasionally.',
  },
  DOUBLE_SALE: {
    name: 'Prior agreement of sale', severity: 0.7, fatal: false, ddDifficulty: 0.4,
    desc: 'The seller has already taken advance from someone else under an unregistered agreement. That person will surface the day construction starts.',
  },
};
