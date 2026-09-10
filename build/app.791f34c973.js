(() => {
  // src/core/util.js
  var LAKH = 1e5;
  var CRORE = 1e7;
  var SQYD_PER_ACRE = 4840;
  var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  var lerp = (a, b, t) => a + (b - a) * t;
  var round = (v, n = 0) => {
    const p = 10 ** n;
    return Math.round(v * p) / p;
  };
  function indianGroup(n) {
    const neg = n < 0;
    let s = Math.abs(Math.round(n)).toString();
    if (s.length <= 3) return (neg ? "-" : "") + s;
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3);
    const parts = [];
    while (rest.length > 2) {
      parts.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) parts.unshift(rest);
    return (neg ? "-" : "") + parts.join(",") + "," + last3;
  }
  function money(n, opts = {}) {
    const { sign = false, precise = false } = opts;
    if (n === null || n === void 0 || Number.isNaN(n)) return "\u2014";
    const a = Math.abs(n);
    const s = n < 0 ? "-" : sign && n > 0 ? "+" : "";
    if (precise || a < LAKH) return s + "\u20B9" + indianGroup(a);
    if (a < CRORE) return s + "\u20B9" + round(a / LAKH, a / LAKH < 10 ? 2 : 1) + " L";
    if (a < 1e12) return s + "\u20B9" + round(a / CRORE, a / CRORE < 10 ? 2 : 1) + " Cr";
    return s + "\u20B9" + round(a / 1e12, 2) + " Lakh Cr";
  }
  function usd(n, rate) {
    const d = n / rate;
    const a = Math.abs(d);
    const s = d < 0 ? "-" : "";
    if (a < 1e3) return s + "$" + round(a);
    if (a < 1e6) return s + "$" + round(a / 1e3, 1) + "K";
    if (a < 1e9) return s + "$" + round(a / 1e6, 2) + "M";
    return s + "$" + round(a / 1e9, 3) + "B";
  }
  var pct = (v, n = 1) => v === null || Number.isNaN(v) ? "\u2014" : round(v * 100, n) + "%";
  var num = (v, n = 0) => indianGroup(round(v, n));
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var START_YEAR = 1995;
  var END_MONTH = (2020 - START_YEAR) * 12 + 2;
  var yearOf = (m) => START_YEAR + Math.floor(m / 12);
  var dateLabel = (m) => `${MONTHS[m % 12]} ${yearOf(m)}`;
  function anchorAt(anchors, absMonth) {
    const y = START_YEAR + absMonth / 12;
    if (y <= anchors[0].year) return anchors[0].v;
    const last = anchors[anchors.length - 1];
    if (y >= last.year) return last.v;
    for (let i = 1; i < anchors.length; i++) {
      if (y <= anchors[i].year) {
        const a = anchors[i - 1], b = anchors[i];
        const t = (y - a.year) / (b.year - a.year);
        const ts = t * t * (3 - 2 * t);
        return lerp(a.v, b.v, ts);
      }
    }
    return last.v;
  }

  // src/core/rng.js
  function makeRng(seed) {
    let s = seed >>> 0;
    const next = () => {
      s = s + 1831565813 >>> 0;
      let t = s;
      t = Math.imul(t ^ t >>> 15, 1 | t);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const api = {
      get state() {
        return s >>> 0;
      },
      set state(v) {
        s = v >>> 0;
      },
      f: next,
      // [0,1)
      range: (a, b) => a + next() * (b - a),
      int: (a, b) => Math.floor(a + next() * (b - a + 1)),
      // inclusive
      chance: (p) => next() < p,
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      // Box-Muller, clamped to +/-3 sigma so tails can't produce absurdities.
      normal: (mean = 0, sd = 1) => {
        const u = Math.max(1e-9, next()), v = next();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return mean + sd * Math.max(-3, Math.min(3, z));
      },
      // Weighted pick: items are [value, weight] pairs.
      weighted(pairs) {
        let total = 0;
        for (const p of pairs) total += p[1];
        if (total <= 0) return null;
        let r = next() * total;
        for (const p of pairs) {
          r -= p[1];
          if (r <= 0) return p[0];
        }
        return pairs[pairs.length - 1][0];
      },
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }
    };
    return api;
  }
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  // src/data/geo.js
  var A = (pairs) => pairs.map(([year, v]) => ({ year, v }));
  var LOCALITIES = [
    {
      id: "banjara",
      name: "Banjara Hills",
      zone: "core",
      base: 5200,
      far: 1.75,
      airportCap: false,
      tags: ["prime", "ulc"],
      liquidity: 0.55,
      prestige: 0.95,
      desc: "Ministers, film financiers and old Hyderabadi money. Almost nothing clean comes to market, and what does is tangled in urban land ceiling exemptions.",
      risk: { ULC_SURPLUS: 0.3, LITIGATION: 0.18, MISSING_HEIR: 0.12, TENANT_PROTECTED: 0.1 },
      rentBase: { res: 5.5, office: 16, retail: 30, industrial: null },
      track: A([[1995, 1], [1997, 1.15], [1999, 1.5], [2e3, 1.9], [2001, 2], [2003, 2.3], [2004, 3], [2005, 4.2], [2006, 6], [2007, 7.5], [2008, 7], [2009, 6], [2010, 6.8], [2011, 6.6], [2012, 7.2], [2013, 8], [2014, 10], [2015, 13], [2016, 16.5], [2017, 20], [2018, 24.5], [2019, 29], [2020, 32]])
    },
    {
      id: "jubilee",
      name: "Jubilee Hills",
      zone: "core",
      base: 3600,
      far: 1.75,
      airportCap: false,
      tags: ["prime", "coop"],
      liquidity: 0.6,
      prestige: 0.9,
      desc: "Co-operative society plots, half of them still bare rock behind compound walls. Society allotment conditions restrict transfer for years after allotment.",
      risk: { ULC_SURPLUS: 0.18, SOCIETY_LOCKIN: 0.25, LITIGATION: 0.12 },
      rentBase: { res: 4.8, office: 14, retail: 24, industrial: null },
      track: A([[1995, 1], [1997, 1.2], [1999, 1.7], [2e3, 2.2], [2001, 2.3], [2003, 2.7], [2004, 3.6], [2005, 5.2], [2006, 7.6], [2007, 9.6], [2008, 8.8], [2009, 7.4], [2010, 8.5], [2011, 8.2], [2012, 9], [2013, 10.2], [2014, 13], [2015, 17], [2016, 21.5], [2017, 26], [2018, 31], [2019, 35.5], [2020, 38]])
    },
    {
      id: "somajiguda",
      name: "Somajiguda / Punjagutta",
      zone: "core",
      base: 4300,
      far: 1.6,
      airportCap: true,
      tags: ["commercial"],
      liquidity: 0.65,
      prestige: 0.8,
      desc: "The commercial spine. Best office rents in the city, and a height cap because of the Begumpet approach funnel.",
      risk: { ULC_SURPLUS: 0.22, LITIGATION: 0.16, MUNICIPAL_DEVIATION: 0.2 },
      rentBase: { res: 4, office: 15, retail: 34, industrial: null },
      track: A([[1995, 1], [1997, 1.15], [1999, 1.45], [2e3, 1.8], [2001, 1.9], [2003, 2.1], [2004, 2.7], [2005, 3.6], [2006, 5], [2007, 6.2], [2008, 5.8], [2009, 5], [2010, 5.8], [2011, 5.6], [2012, 6.2], [2013, 7], [2014, 8.6], [2015, 11], [2016, 13.5], [2017, 16], [2018, 18.8], [2019, 21], [2020, 22]])
    },
    {
      id: "begumpet",
      name: "Begumpet",
      zone: "core",
      base: 3600,
      far: 1.2,
      airportCap: true,
      tags: ["commercial", "airport"],
      liquidity: 0.6,
      prestige: 0.75,
      desc: "Airport funnel restrictions cap everything at four floors. When the airport moves, that cap moves with it.",
      risk: { ULC_SURPLUS: 0.2, LITIGATION: 0.14, MUNICIPAL_DEVIATION: 0.16, CANTONMENT: 0.1 },
      rentBase: { res: 4.2, office: 14, retail: 26, industrial: null },
      track: A([[1995, 1], [1997, 1.12], [1999, 1.4], [2e3, 1.75], [2001, 1.85], [2003, 2], [2004, 2.6], [2005, 3.4], [2006, 4.7], [2007, 5.8], [2008, 6.4], [2009, 5.4], [2010, 6.2], [2011, 6], [2012, 6.6], [2013, 7.4], [2014, 9], [2015, 11.5], [2016, 14], [2017, 16.5], [2018, 19], [2019, 21], [2020, 22]])
    },
    {
      id: "ameerpet",
      name: "Ameerpet",
      zone: "core",
      base: 2800,
      far: 1.5,
      airportCap: true,
      tags: ["commercial", "congested"],
      liquidity: 0.72,
      prestige: 0.5,
      desc: "Filthy, congested, no parking, and the highest footfall in the city. Every software training institute in Andhra Pradesh is on this one road.",
      risk: { MUNICIPAL_DEVIATION: 0.3, LITIGATION: 0.16, TENANT_PROTECTED: 0.18, ULC_SURPLUS: 0.12 },
      rentBase: { res: 3.4, office: 9, retail: 22, industrial: null },
      track: A([[1995, 1], [1997, 1.2], [1999, 1.6], [2e3, 2.1], [2001, 2.2], [2003, 2.5], [2004, 3.2], [2005, 4.3], [2006, 6], [2007, 7.4], [2008, 6.9], [2009, 5.9], [2010, 6.8], [2011, 6.6], [2012, 7.3], [2013, 8.4], [2014, 10.5], [2015, 13.5], [2016, 16.8], [2017, 20], [2018, 23.5], [2019, 25.5], [2020, 26]])
    },
    {
      id: "secunderabad",
      name: "Secunderabad",
      zone: "core",
      base: 3800,
      far: 1.5,
      airportCap: true,
      tags: ["commercial", "cantonment"],
      liquidity: 0.6,
      prestige: 0.7,
      desc: "Cantonment land rules, colonial-era titles and a trading economy that never sleeps. Half the documents in this market start with a 1948 court order.",
      risk: { CANTONMENT: 0.28, LITIGATION: 0.22, MISSING_HEIR: 0.16, MUNICIPAL_DEVIATION: 0.14 },
      rentBase: { res: 4, office: 12, retail: 32, industrial: 4 },
      track: A([[1995, 1], [1997, 1.14], [1999, 1.42], [2e3, 1.75], [2001, 1.85], [2003, 2.05], [2004, 2.6], [2005, 3.4], [2006, 4.6], [2007, 5.7], [2008, 5.4], [2009, 4.7], [2010, 5.4], [2011, 5.3], [2012, 5.8], [2013, 6.6], [2014, 8.2], [2015, 10.4], [2016, 12.8], [2017, 15], [2018, 17.5], [2019, 19.2], [2020, 20]])
    },
    {
      id: "himayatnagar",
      name: "Himayatnagar / Narayanaguda",
      zone: "core",
      base: 2700,
      far: 1.6,
      airportCap: false,
      tags: ["redevelopment"],
      liquidity: 0.62,
      prestige: 0.6,
      desc: "Old bungalows on six hundred square yard plots, occupied by families who will not sell but might develop. The natural hunting ground for development agreements.",
      risk: { MISSING_HEIR: 0.28, LITIGATION: 0.18, TENANT_PROTECTED: 0.2, ULC_SURPLUS: 0.14 },
      rentBase: { res: 3.8, office: 9, retail: 20, industrial: null },
      track: A([[1995, 1], [1997, 1.16], [1999, 1.5], [2e3, 1.9], [2001, 2], [2003, 2.25], [2004, 2.9], [2005, 3.8], [2006, 5.2], [2007, 6.4], [2008, 6], [2009, 5.2], [2010, 6], [2011, 5.8], [2012, 6.4], [2013, 7.3], [2014, 9.2], [2015, 11.8], [2016, 14.6], [2017, 17.5], [2018, 20.5], [2019, 22.8], [2020, 24]])
    },
    {
      id: "kukatpally",
      name: "Kukatpally / KPHB",
      zone: "northwest",
      base: 850,
      far: 1.75,
      airportCap: false,
      tags: ["residential", "mass"],
      liquidity: 0.85,
      prestige: 0.45,
      desc: "BHEL, IDPL and Allwyn employees with provident funds and housing loans. Real, salaried, mortgage-eligible demand. This is where volume housing actually sells.",
      risk: { LAYOUT_UNAPPROVED: 0.2, LITIGATION: 0.1, MISSING_HEIR: 0.1 },
      rentBase: { res: 2, office: 5, retail: 11, industrial: 3 },
      track: A([[1995, 1], [1997, 1.2], [1999, 1.7], [2e3, 2.2], [2001, 2.3], [2003, 2.8], [2004, 3.8], [2005, 5.5], [2006, 8.5], [2007, 11], [2008, 10], [2009, 8.5], [2010, 10], [2011, 9.6], [2012, 10.8], [2013, 12.5], [2014, 16], [2015, 22], [2016, 28], [2017, 35], [2018, 43], [2019, 50], [2020, 55]])
    },
    {
      id: "miyapur",
      name: "Miyapur",
      zone: "northwest",
      base: 300,
      far: 1.75,
      airportCap: false,
      tags: ["residential", "periphery"],
      liquidity: 0.6,
      prestige: 0.3,
      desc: "Bombay Highway outskirts. Scrub, a few unapproved layouts and a bus depot. Nothing here yet.",
      risk: { LAYOUT_UNAPPROVED: 0.38, ASSIGNED_LAND: 0.12, LITIGATION: 0.12 },
      rentBase: { res: 1.4, office: null, retail: 6, industrial: 2.4 },
      track: A([[1995, 1], [1997, 1.15], [1999, 1.8], [2e3, 2.6], [2001, 2.8], [2003, 3.4], [2004, 5], [2005, 8], [2006, 14], [2007, 20], [2008, 18], [2009, 14], [2010, 17], [2011, 16], [2012, 19], [2013, 23], [2014, 32], [2015, 46], [2016, 60], [2017, 78], [2018, 95], [2019, 108], [2020, 115]])
    },
    {
      id: "madhapur",
      name: "Madhapur",
      zone: "west",
      base: 220,
      far: 1.75,
      airportCap: false,
      tags: ["emerging", "rock"],
      liquidity: 0.35,
      prestige: 0.2,
      desc: "Rock, thorn scrub and a quarry. No water table worth drilling, no drainage, a dirt approach from Jubilee Hills. Land here is cheap because nobody sane wants it.",
      risk: { LAYOUT_UNAPPROVED: 0.3, ASSIGNED_LAND: 0.16, NO_ACCESS: 0.24, LITIGATION: 0.12 },
      rentBase: { res: 1.5, office: 19, retail: 8, industrial: 2.6 },
      officeUnlock: "HITEC_LIVE",
      track: A([[1995, 1], [1996, 1.05], [1997, 1.3], [1998, 2.2], [1999, 4], [2e3, 6.5], [2001, 7], [2002, 6.6], [2003, 8], [2004, 14], [2005, 26], [2006, 48], [2007, 70], [2008, 62], [2009, 48], [2010, 55], [2011, 52], [2012, 58], [2013, 66], [2014, 88], [2015, 130], [2016, 180], [2017, 240], [2018, 310], [2019, 390], [2020, 430]])
    },
    {
      id: "kondapur",
      name: "Kondapur",
      zone: "west",
      base: 180,
      far: 1.75,
      airportCap: false,
      tags: ["emerging", "village"],
      liquidity: 0.35,
      prestige: 0.2,
      desc: "A village, a tank and farmland. Patta land held by cultivating families who have never sold to an outsider.",
      risk: { LAYOUT_UNAPPROVED: 0.34, ASSIGNED_LAND: 0.18, NO_ACCESS: 0.2, MISSING_HEIR: 0.16 },
      rentBase: { res: 1.4, office: 15, retail: 7, industrial: 2.4 },
      officeUnlock: "HITEC_LIVE",
      track: A([[1995, 1], [1997, 1.1], [1998, 1.7], [1999, 3], [2e3, 5], [2001, 5.5], [2002, 5.1], [2003, 6.4], [2004, 11], [2005, 21], [2006, 42], [2007, 64], [2008, 56], [2009, 42], [2010, 50], [2011, 47], [2012, 53], [2013, 62], [2014, 84], [2015, 124], [2016, 172], [2017, 228], [2018, 296], [2019, 364], [2020, 400]])
    },
    {
      id: "gachibowli",
      name: "Gachibowli",
      zone: "west",
      base: 140,
      far: 1.75,
      airportCap: false,
      tags: ["emerging", "village"],
      liquidity: 0.3,
      prestige: 0.18,
      desc: "A village beside the Central University boundary. The approach road is single-lane and floods. Large government and institutional landholdings nearby.",
      risk: { LAYOUT_UNAPPROVED: 0.32, ASSIGNED_LAND: 0.22, NO_ACCESS: 0.28, GOVT_CLAIM: 0.14 },
      rentBase: { res: 1.3, office: 18, retail: 6.5, industrial: 2.2 },
      officeUnlock: "HITEC_LIVE",
      track: A([[1995, 1], [1997, 1.1], [1998, 1.6], [1999, 3.2], [2e3, 5.5], [2001, 6], [2002, 5.6], [2003, 7], [2004, 13], [2005, 26], [2006, 52], [2007, 80], [2008, 70], [2009, 52], [2010, 62], [2011, 58], [2012, 66], [2013, 78], [2014, 105], [2015, 155], [2016, 215], [2017, 285], [2018, 370], [2019, 455], [2020, 500]])
    },
    {
      id: "nanakramguda",
      name: "Nanakramguda",
      zone: "west",
      base: 90,
      far: 1.75,
      airportCap: false,
      tags: ["emerging", "village"],
      liquidity: 0.22,
      prestige: 0.15,
      desc: "Fields and a temple. Twelve kilometres from Abids and a world away from anything.",
      risk: { ASSIGNED_LAND: 0.26, LAYOUT_UNAPPROVED: 0.36, NO_ACCESS: 0.32, GOVT_CLAIM: 0.16 },
      rentBase: { res: 1.1, office: 17, retail: 5, industrial: 2 },
      officeUnlock: "SEZ",
      track: A([[1995, 1], [1998, 1.3], [1999, 2.2], [2e3, 3.6], [2001, 4], [2002, 3.7], [2003, 5], [2004, 10], [2005, 22], [2006, 52], [2007, 90], [2008, 78], [2009, 56], [2010, 70], [2011, 66], [2012, 76], [2013, 92], [2014, 128], [2015, 196], [2016, 290], [2017, 400], [2018, 530], [2019, 650], [2020, 700]])
    },
    {
      id: "kokapet",
      name: "Kokapet",
      zone: "west",
      base: 70,
      far: 1.75,
      airportCap: false,
      tags: ["emerging", "agri"],
      liquidity: 0.18,
      prestige: 0.12,
      desc: "Dry farmland on the far side of the Osman Sagar catchment. Ask a broker in 1995 and he will tell you not to waste his petrol.",
      risk: { ASSIGNED_LAND: 0.3, CATCHMENT_ZONE: 0.34, NO_ACCESS: 0.36, LAYOUT_UNAPPROVED: 0.4 },
      rentBase: { res: 1, office: 16, retail: 4.5, industrial: 1.8 },
      officeUnlock: "SEZ",
      track: A([[1995, 1], [1999, 1.5], [2001, 1.9], [2003, 2.2], [2004, 5], [2005, 14], [2006, 45], [2007, 95], [2008, 70], [2009, 48], [2010, 60], [2011, 55], [2012, 62], [2013, 75], [2014, 110], [2015, 180], [2016, 280], [2017, 420], [2018, 600], [2019, 790], [2020, 900]])
    },
    {
      id: "manikonda",
      name: "Manikonda",
      zone: "west",
      base: 100,
      far: 1.75,
      airportCap: false,
      tags: ["emerging", "wakf"],
      liquidity: 0.2,
      prestige: 0.15,
      desc: "Cheap, close to Jubilee Hills, and encumbered. Large tracts here are claimed as Wakf property and the claims have been in court since the Nizam.",
      risk: { WAKF_CLAIM: 0.42, ASSIGNED_LAND: 0.18, LITIGATION: 0.3, LAYOUT_UNAPPROVED: 0.3 },
      rentBase: { res: 1.2, office: 13, retail: 5, industrial: 2 },
      officeUnlock: "SEZ",
      track: A([[1995, 1], [1999, 1.6], [2e3, 2.4], [2003, 3.2], [2004, 6], [2005, 12], [2006, 26], [2007, 42], [2008, 36], [2009, 26], [2010, 32], [2011, 29], [2012, 34], [2013, 42], [2014, 60], [2015, 95], [2016, 140], [2017, 200], [2018, 290], [2019, 400], [2020, 500]])
    },
    {
      id: "narsingi",
      name: "Narsingi",
      zone: "west",
      base: 90,
      far: 1.75,
      airportCap: false,
      tags: ["emerging", "agri"],
      liquidity: 0.2,
      prestige: 0.15,
      desc: "Farmland on the Vikarabad road, past the last streetlight.",
      risk: { ASSIGNED_LAND: 0.28, CATCHMENT_ZONE: 0.22, NO_ACCESS: 0.3, LAYOUT_UNAPPROVED: 0.36 },
      rentBase: { res: 1.1, office: 14, retail: 4.5, industrial: 1.9 },
      officeUnlock: "SEZ",
      track: A([[1995, 1], [1999, 1.5], [2001, 1.9], [2003, 2.4], [2004, 4.5], [2005, 10], [2006, 24], [2007, 40], [2008, 34], [2009, 25], [2010, 31], [2011, 29], [2012, 34], [2013, 42], [2014, 62], [2015, 100], [2016, 150], [2017, 215], [2018, 310], [2019, 420], [2020, 500]])
    },
    {
      id: "uppal",
      name: "Uppal",
      zone: "east",
      base: 420,
      far: 1.75,
      airportCap: false,
      tags: ["residential", "industrial"],
      liquidity: 0.55,
      prestige: 0.3,
      desc: "Industrial estates, a bus depot and cheap plots on the Warangal highway. The east side of the city has always been the poor cousin.",
      risk: { LAYOUT_UNAPPROVED: 0.26, ASSIGNED_LAND: 0.14, LITIGATION: 0.12 },
      rentBase: { res: 1.5, office: 5, retail: 8, industrial: 3.2 },
      track: A([[1995, 1], [1999, 1.5], [2001, 1.8], [2003, 2.2], [2004, 3], [2005, 4.4], [2006, 7], [2007, 9.5], [2008, 8.6], [2009, 7], [2010, 8.4], [2011, 8], [2012, 9.2], [2013, 11], [2014, 14.5], [2015, 20], [2016, 26], [2017, 36], [2018, 47], [2019, 58], [2020, 65]])
    },
    {
      id: "lbnagar",
      name: "LB Nagar",
      zone: "east",
      base: 500,
      far: 1.75,
      airportCap: false,
      tags: ["residential"],
      liquidity: 0.6,
      prestige: 0.32,
      desc: "The southeastern gateway on the Vijayawada highway. Growing steadily on its own, without any government help.",
      risk: { LAYOUT_UNAPPROVED: 0.24, ASSIGNED_LAND: 0.12, LITIGATION: 0.12 },
      rentBase: { res: 1.6, office: 5.5, retail: 9, industrial: 3 },
      track: A([[1995, 1], [1999, 1.55], [2001, 1.85], [2003, 2.25], [2004, 3], [2005, 4.3], [2006, 6.6], [2007, 9], [2008, 8.2], [2009, 6.8], [2010, 8], [2011, 7.7], [2012, 8.8], [2013, 10.4], [2014, 13.6], [2015, 18.5], [2016, 24], [2017, 32], [2018, 42], [2019, 53], [2020, 60]])
    },
    {
      id: "kompally",
      name: "Kompally",
      zone: "north",
      base: 130,
      far: 1.75,
      airportCap: false,
      tags: ["periphery", "agri"],
      liquidity: 0.3,
      prestige: 0.2,
      desc: "Poultry farms and dhabas on the Nagpur highway.",
      risk: { LAYOUT_UNAPPROVED: 0.34, ASSIGNED_LAND: 0.18, NO_ACCESS: 0.2 },
      rentBase: { res: 1.1, office: 6, retail: 4.5, industrial: 2.4 },
      track: A([[1995, 1], [1999, 1.4], [2001, 1.8], [2003, 2.2], [2004, 3.2], [2005, 5], [2006, 9], [2007, 14], [2008, 12.5], [2009, 9.5], [2010, 11.5], [2011, 11], [2012, 12.5], [2013, 15], [2014, 20], [2015, 29], [2016, 40], [2017, 55], [2018, 80], [2019, 110], [2020, 130]])
    },
    {
      id: "shamshabad",
      name: "Shamshabad",
      zone: "south",
      base: 100,
      far: 1.75,
      airportCap: false,
      tags: ["agri", "periphery"],
      liquidity: 0.25,
      prestige: 0.15,
      desc: "Dry farmland on the Bangalore highway. Three crops fail in five years here and the families are willing to talk.",
      risk: { ASSIGNED_LAND: 0.34, LAYOUT_UNAPPROVED: 0.3, NO_ACCESS: 0.24, GOVT_CLAIM: 0.18 },
      rentBase: { res: 1, office: null, retail: 4, industrial: 2 },
      track: A([[1995, 1], [1999, 1.3], [2001, 2.5], [2002, 3.2], [2003, 4.5], [2004, 8], [2005, 16], [2006, 28], [2007, 40], [2008, 44], [2009, 34], [2010, 40], [2011, 38], [2012, 44], [2013, 50], [2014, 62], [2015, 78], [2016, 92], [2017, 105], [2018, 118], [2019, 127], [2020, 130]])
    },
    {
      id: "pocharam",
      name: "Pocharam / Ghatkesar",
      zone: "east",
      base: 90,
      far: 1.75,
      airportCap: false,
      tags: ["agri", "periphery"],
      liquidity: 0.22,
      prestige: 0.12,
      desc: "Farmland east of the city on the Warangal road. Cheap because it is nowhere.",
      risk: { ASSIGNED_LAND: 0.3, LAYOUT_UNAPPROVED: 0.34, NO_ACCESS: 0.28 },
      rentBase: { res: 0.9, office: 7, retail: 3.5, industrial: 2.1 },
      officeUnlock: "SEZ",
      track: A([[1995, 1], [1999, 1.3], [2001, 1.7], [2003, 2.1], [2004, 3], [2005, 5], [2006, 9.5], [2007, 16], [2008, 14], [2009, 10.5], [2010, 13], [2011, 12], [2012, 14], [2013, 17], [2014, 23], [2015, 34], [2016, 48], [2017, 66], [2018, 92], [2019, 124], [2020, 150]])
    },
    {
      id: "medchal",
      name: "Medchal (agricultural)",
      zone: "north",
      base: 55,
      far: 1,
      airportCap: false,
      tags: ["agri", "far"],
      liquidity: 0.15,
      prestige: 0.08,
      desc: "Thirty kilometres out on the Nagpur highway. Genuine agricultural land, sold by the acre, with all the conversion problems that implies.",
      risk: { ASSIGNED_LAND: 0.32, LAYOUT_UNAPPROVED: 0.55, NO_ACCESS: 0.3, MISSING_HEIR: 0.2 },
      rentBase: { res: 0.7, office: null, retail: 2.5, industrial: 1.7 },
      track: A([[1995, 1], [2e3, 1.5], [2003, 2], [2005, 3.6], [2007, 8], [2008, 7], [2010, 8], [2012, 9.5], [2014, 14], [2016, 26], [2018, 48], [2020, 72]])
    }
  ];
  var BY_ID = Object.fromEntries(LOCALITIES.map((l) => [l.id, l]));
  var RENT_TRACK = {
    res: A([[1995, 1], [1998, 1.2], [2e3, 1.5], [2003, 1.7], [2005, 2.1], [2007, 2.8], [2008, 3], [2009, 2.9], [2011, 3.2], [2013, 3.8], [2015, 4.6], [2017, 5.4], [2019, 6.4], [2020, 6.6]]),
    office: A([[1995, 1], [1999, 1.15], [2001, 1.25], [2002, 1.1], [2004, 1.3], [2006, 1.75], [2008, 2], [2009, 1.7], [2011, 1.85], [2013, 2], [2015, 2.3], [2017, 2.7], [2019, 3.3], [2020, 3.4]]),
    retail: A([[1995, 1], [2e3, 1.4], [2003, 1.5], [2005, 1.8], [2007, 2.3], [2009, 2.2], [2011, 2.5], [2013, 2.9], [2015, 3.4], [2017, 3.9], [2019, 4.4], [2020, 4.5]]),
    industrial: A([[1995, 1], [2e3, 1.2], [2005, 1.5], [2008, 1.8], [2010, 2.2], [2013, 2.6], [2015, 3], [2017, 3.4], [2019, 4], [2020, 4.2]])
  };
  var DEFECTS = {
    ASSIGNED_LAND: {
      name: "Assigned land (POT Act 1977)",
      severity: 1,
      fatal: true,
      ddDifficulty: 0.45,
      desc: "Land assigned by government to landless poor. Transfer is void in law. No court will help you and no bank will lend against it."
    },
    WAKF_CLAIM: {
      name: "Wakf Board claim",
      severity: 0.85,
      fatal: false,
      ddDifficulty: 0.55,
      desc: "The Wakf Board has entered this survey number in its register. Litigation runs for decades and no institutional buyer will touch it."
    },
    ULC_SURPLUS: {
      name: "Urban Land Ceiling surplus",
      severity: 0.6,
      fatal: false,
      ddDifficulty: 0.4,
      desc: "Holdings above 1,000 square metres in the urban agglomeration vest with government under ULCRA 1976 unless exempted. Exemption applications take years."
    },
    MISSING_HEIR: {
      name: "Co-parcener has not signed",
      severity: 0.55,
      fatal: false,
      ddDifficulty: 0.3,
      desc: "A joint family member, usually one who lives abroad, has not executed the deed. Any sale is voidable at his instance."
    },
    LITIGATION: {
      name: "Pending civil suit",
      severity: 0.5,
      fatal: false,
      ddDifficulty: 0.25,
      desc: "A suit for specific performance or partition is pending. Injunctions can stop construction at any moment."
    },
    GOVT_CLAIM: {
      name: "Government / endowment claim",
      severity: 0.7,
      fatal: false,
      ddDifficulty: 0.5,
      desc: "Revenue records show the land as government poramboke or endowment property. Prohibitory order likely."
    },
    LAYOUT_UNAPPROVED: {
      name: "Unapproved layout",
      severity: 0.35,
      fatal: false,
      ddDifficulty: 0.15,
      desc: "No HUDA layout permission. Regularisation is possible but costs money, time and the surrender of open space."
    },
    NO_ACCESS: {
      name: "No legal access",
      severity: 0.45,
      fatal: false,
      ddDifficulty: 0.2,
      desc: "The approach is over a neighbouring survey number with no registered right of way. The neighbour knows this."
    },
    MUNICIPAL_DEVIATION: {
      name: "Sanctioned-plan deviation",
      severity: 0.3,
      fatal: false,
      ddDifficulty: 0.2,
      desc: "Existing construction violates setbacks or sanctioned floors. A demolition notice is outstanding."
    },
    TENANT_PROTECTED: {
      name: "Rent Control tenant in occupation",
      severity: 0.5,
      fatal: false,
      ddDifficulty: 0.12,
      desc: "A tenant protected by the AP Buildings (Lease, Rent and Eviction) Control Act is sitting in the property at 1970s rent. Eviction takes seven to twelve years."
    },
    SOCIETY_LOCKIN: {
      name: "Co-operative society transfer bar",
      severity: 0.3,
      fatal: false,
      ddDifficulty: 0.18,
      desc: "Society allotment conditions bar transfer for a period, and require the society to consent to any sale."
    },
    CANTONMENT: {
      name: "Cantonment / Class B land",
      severity: 0.65,
      fatal: false,
      ddDifficulty: 0.45,
      desc: "Old Grant or Class B bungalow land where the Defence Estates Officer asserts that only occupancy rights, not ownership, were ever transferred."
    },
    CATCHMENT_ZONE: {
      name: "Reservoir catchment restriction",
      severity: 0.6,
      fatal: false,
      ddDifficulty: 0.35,
      desc: "Falls in the Osman Sagar / Himayat Sagar catchment where construction is restricted by government order. Restrictions occasionally get relaxed. Occasionally."
    },
    DOUBLE_SALE: {
      name: "Prior agreement of sale",
      severity: 0.7,
      fatal: false,
      ddDifficulty: 0.4,
      desc: "The seller has already taken advance from someone else under an unregistered agreement. That person will surface the day construction starts."
    }
  };

  // src/sim/intel.js
  var INTEL_NONE = 0;
  var INTEL_HEARSAY = 1;
  var INTEL_KNOWN = 2;
  function initialIntel() {
    const intel = {};
    for (const l of LOCALITIES) {
      if (l.id === "kukatpally" || l.id === "miyapur") intel[l.id] = { level: INTEL_KNOWN, fresh: 999 };
      else if (l.zone === "core") intel[l.id] = { level: INTEL_KNOWN, fresh: 999 };
      else if (["uppal", "lbnagar", "kompally"].includes(l.id)) intel[l.id] = { level: INTEL_HEARSAY, fresh: 999 };
      else intel[l.id] = { level: INTEL_NONE, fresh: 0 };
    }
    return intel;
  }
  function surveyCost(s, locId) {
    const loc = BY_ID[locId];
    const era = 1 + s.month / 303 * 2.2;
    const obscurity = 1 + (1 - loc.liquidity) * 0.8;
    return Math.round(9e3 * era * obscurity);
  }
  function intelOf(s, locId) {
    if (!s.intel) s.intel = initialIntel();
    return s.intel[locId] || { level: INTEL_NONE, fresh: 0 };
  }
  function intelLevel(s, locId) {
    return intelOf(s, locId).level;
  }
  function buySurvey(s, locId) {
    const cost = surveyCost(s, locId);
    if (s.cash < cost) return { ok: false, msg: `A survey of ${BY_ID[locId].name} costs about ${cost} rupees and you cannot spare it.`, cost };
    s.cash -= cost;
    if (!s.intel) s.intel = initialIntel();
    s.intel[locId] = { level: INTEL_KNOWN, fresh: 24, bought: s.month };
    s.skills.realestate = clamp(s.skills.realestate + 0.6, 0, 100);
    s.ledger.push({ m: s.month, type: "Market survey", amount: -cost, note: BY_ID[locId].name });
    return { ok: true, cost };
  }
  function tickIntel(s, rng) {
    if (!s.intel) s.intel = initialIntel();
    for (const l of LOCALITIES) {
      const it = s.intel[l.id];
      const present = s.parcels.some((p) => p.owned && p.locality === l.id) || s.projects.some((p) => !p.done && p.locality === l.id) || s.assets.some((a) => a.locality === l.id) || s.inventory.some((i) => i.locality === l.id);
      if (present) {
        it.level = INTEL_KNOWN;
        it.fresh = Math.max(it.fresh, 12);
        continue;
      }
      if (it.fresh > 0) it.fresh -= 1;
      else if (it.level === INTEL_KNOWN && it.bought) it.level = INTEL_HEARSAY;
      if (it.level < INTEL_KNOWN) {
        const word = clamp(
          s.relations.landowners / 3200 + s.relations.associations / 4e3 + s.relations.journalists / 5e3 + s.skills.realestate / 9e3,
          0,
          0.05
        );
        if (rng.f() < word) {
          it.level = Math.min(INTEL_KNOWN, it.level + 1);
          it.fresh = Math.max(it.fresh, 10);
          if (it.level === INTEL_KNOWN) {
            s.news.push({
              m: s.month,
              tag: "MARKET",
              head: `Word from ${l.name}`,
              body: "One of your contacts has been out that way and came back with real numbers \u2014 what is registering, what is being asked, and who is buying. It is the sort of thing you only hear if people owe you a conversation."
            });
          }
        }
      }
      const famous = l.id === "madhapur" && s.flags.HITEC_LIVE || ["gachibowli", "kondapur", "nanakramguda"].includes(l.id) && s.flags.SEZ || l.id === "shamshabad" && s.flags.AIRPORT_BUILD || ["kokapet", "narsingi", "manikonda"].includes(l.id) && s.flags.ORR_LIVE;
      if (famous) it.level = INTEL_KNOWN;
    }
  }
  function fuzzRate(s, locId, trueRate) {
    const level = intelLevel(s, locId);
    if (level === INTEL_KNOWN) return { value: trueRate, band: 0, level };
    if (level === INTEL_NONE) return { value: null, band: null, level };
    const seed = (locId.length * 37 + yearOf(s.month) * 13) % 100;
    const skew = 1 + (seed / 100 - 0.5) * 0.48;
    return { value: trueRate * skew, band: 0.25, level };
  }

  // src/sim/state.js
  var SAVE_KEY = "ree_hyd_save_v1";
  var SAVE_VERSION = 1;
  var FIRST_NAMES = [
    "Venkat",
    "Ramesh",
    "Srinivas",
    "Prasad",
    "Narayana",
    "Krishna",
    "Satyanarayana",
    "Rajesh",
    "Anjaiah",
    "Balaraju",
    "Chandra",
    "Damodar",
    "Gopal",
    "Hanumantha",
    "Jagadish",
    "Kishore",
    "Lakshman",
    "Madhav",
    "Narsimha",
    "Prabhakar",
    "Raghavendra",
    "Sudhakar",
    "Tirumala",
    "Yadagiri",
    "Mohd Ghouse",
    "Mohd Iqbal",
    "Abdul Rahim",
    "Syed Ahmed",
    "Zafar",
    "Farooq"
  ];
  var SURNAMES = [
    "Reddy",
    "Rao",
    "Naidu",
    "Sharma",
    "Goud",
    "Yadav",
    "Chary",
    "Prasad",
    "Raju",
    "Murthy",
    "Shastri",
    "Varma",
    "Gupta",
    "Agarwal",
    "Jain",
    "Khan",
    "Ali",
    "Hussain",
    "Siddiqui"
  ];
  var COMPETITORS = [
    {
      id: "myhome",
      name: "My Home Group",
      real: true,
      from: 0,
      strength: 0.62,
      style: "disciplined",
      desc: "Founded 1981. Cement interests behind it, so their input costs are structurally lower than yours. Builds well, sells steadily, never over-leverages. The benchmark."
    },
    {
      id: "ncc",
      name: "Nagarjuna Construction Co.",
      real: true,
      from: 0,
      strength: 0.75,
      style: "contractor",
      desc: "Serious civil contractor since 1978. Government work, industrial plants, large infrastructure. Not really your competitor yet \u2014 but if you ever build a contracting arm, they are what you are up against."
    },
    {
      id: "ramky",
      name: "Ramky",
      real: true,
      from: 0,
      strength: 0.2,
      style: "aggressive",
      desc: "Founded last year, 1994. Tiny, hungry and run by an engineer your age who is not going to stay tiny."
    },
    {
      id: "srisai",
      name: "Sri Sai Constructions",
      real: false,
      from: 0,
      strength: 0.3,
      style: "reckless",
      desc: "Bandaru Prasad Rao. Fourteen buildings in Kukatpally. Cheap flats, thin slabs, sells fast, funds each project from the last one\u2019s advances. Generous, well-liked, and one bad quarter from collapse."
    },
    {
      id: "deccan",
      name: "Deccan Estates",
      real: false,
      from: 0,
      strength: 0.45,
      style: "connected",
      desc: "Old Hyderabadi family sitting on Banjara Hills and Shaikpet land, half of it in urban land ceiling and Wakf litigation. Slow, grand, and extremely well connected in the Secretariat."
    },
    {
      id: "sujatha",
      name: "Sujatha Housing",
      real: false,
      from: 0,
      strength: 0.28,
      style: "quality",
      desc: "A retired PWD engineer builds the best mid-market structures in the city and takes four years to finish a two-year building."
    },
    {
      id: "aparna",
      name: "Aparna Constructions",
      real: true,
      from: 18,
      strength: 0.35,
      style: "disciplined",
      desc: "Formed in 1996. Engineering-led, quality-obsessed, and about to spend twenty years compounding quietly."
    },
    {
      id: "lanco",
      name: "Lanco",
      real: true,
      from: 40,
      strength: 0.55,
      style: "aggressive",
      desc: "Infrastructure and power money moving into real estate. Deep pockets, political weight, and a taste for very large bets."
    },
    {
      id: "prestige",
      name: "Prestige (Bangalore)",
      real: true,
      from: 130,
      strength: 0.7,
      style: "institutional",
      desc: "Bangalore\u2019s biggest developer entering Hyderabad with institutional capital and a brand you cannot match on price."
    },
    {
      id: "phoenix",
      name: "Phoenix / institutional entrants",
      real: true,
      from: 150,
      strength: 0.72,
      style: "institutional",
      desc: "Foreign and domestic institutional money buying finished, leased office assets at cap rates that make development look like hard work."
    }
  ];
  var REL_KEYS = {
    banks: "Banks",
    financiers: "Private financiers",
    bureaucrats: "Bureaucrats (HUDA / MCH)",
    politicians: "Politicians",
    landowners: "Landowners & farmers",
    contractors: "Contractors & labour",
    investors: "Investors",
    journalists: "Journalists",
    associations: "Builders\u2019 associations",
    community: "Local communities",
    family: "Family"
  };
  function newGame(seedText = String(Date.now()), opts = {}) {
    const seed = hashSeed(seedText);
    const rng = makeRng(seed);
    const startCash = opts.cash ?? 25e5;
    const s = {
      version: SAVE_VERSION,
      seedText,
      seed,
      rngState: rng.state,
      month: 0,
      over: false,
      overReason: null,
      tickCount: 0,
      founder: {
        name: opts.name || "You",
        firmName: opts.firmName || null,
        age0: opts.age ?? 24,
        born: 1970
      },
      cash: startCash,
      equityPaidIn: startCash,
      retained: 0,
      personalExpense: 4200,
      stress: 20,
      reputation: 2,
      skills: { realestate: 55, construction: 25, finance: 40, legal: 20, negotiation: 50 },
      relations: {
        banks: 22,
        financiers: 10,
        bureaucrats: 8,
        politicians: 12,
        landowners: 35,
        contractors: 40,
        investors: 5,
        journalists: 3,
        associations: 10,
        community: 20,
        family: 70
      },
      parcels: [],
      // land held or under negotiation
      projects: [],
      // under approval / construction
      inventory: [],
      // completed unsold units
      assets: [],
      // completed and held for rent
      loans: [],
      staff: [],
      jvs: [],
      offers: [],
      // live market opportunities
      subsidiaries: [],
      // diversification arms
      news: [],
      ledger: [],
      yearbook: [],
      pendingEvent: null,
      eventCooldown: {},
      flags: {},
      intel: initialIntel(),
      stats: { projectsDone: 0, unitsSold: 0, sqftBuilt: 0, landBoughtSqYd: 0, defectsHit: 0, bribesTaken: 0 },
      soldUnits: 0,
      revenueYTD: 0,
      costYTD: 0,
      interestYTD: 0,
      opexYTD: 0,
      taxYTD: 0,
      noiYTD: 0,
      interestAnnual: 0,
      pendingRefund: 0,
      absorptionBoost: 0,
      materialSpike: 0,
      crashActive: false,
      safetySpend: false,
      infraBudget: 1,
      bizConfidence: 1,
      approvalSpeedMod: 1,
      competitors: COMPETITORS.filter((c) => c.from === 0).map((c) => ({ ...c, scale: c.strength })),
      // derived, recomputed each tick
      macro: {},
      ratios: {},
      netWorth: 0,
      debt: 0,
      assetValue: 0,
      avgQuality: 0.65
    };
    s.loans.push({
      id: "L0",
      lender: "Andhra Bank (jewel loan)",
      kind: "bank",
      principal: 2e5,
      outstanding: 2e5,
      rate: 0.16,
      tenure: 12,
      taken: -1,
      emi: emiFor(2e5, 0.16, 12),
      secret: true,
      note: "Against your mother\u2019s gold. She thinks it is in the locker."
    });
    s.news.push({
      m: 0,
      tag: "PERSONAL",
      head: "You begin",
      body: "Twenty-five lakh rupees, a Bajaj Chetak, a commerce degree and a father who trusts you with money that was not entirely yours to take. Hyderabad, January 1995."
    });
    return s;
  }
  function emiFor(principal, annualRate, months) {
    const r = annualRate / 12;
    if (r === 0) return principal / months;
    const f = Math.pow(1 + r, months);
    return principal * r * f / (f - 1);
  }
  function saveGame(s) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      return true;
    } catch (e) {
      return false;
    }
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.version !== SAVE_VERSION) return null;
      return s;
    } catch (e) {
      return null;
    }
  }
  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
    }
  }
  var ZONES = [...new Set(LOCALITIES.map((l) => l.zone))];
  function nextId(s, prefix) {
    if (!s.seq) s.seq = {};
    s.seq[prefix] = (s.seq[prefix] || 0) + 1;
    return `${prefix}${s.seq[prefix]}`;
  }
  function reseedIds(s) {
    if (!s.seq) s.seq = {};
    const bump = (prefix, list) => {
      let max = s.seq[prefix] || 0;
      for (const item of list || []) {
        const m = String(item && item.id || "").match(new RegExp(`^${prefix}(d+)$`));
        if (m) max = Math.max(max, Number(m[1]));
      }
      s.seq[prefix] = max;
    };
    bump("PL", s.parcels);
    bump("P", s.projects);
    bump("A", s.assets);
    bump("L", s.loans);
    bump("S", s.staff);
    bump("O", s.offers);
    bump("JV", s.jvs);
    return s;
  }
  function findDuplicateIds(s) {
    const dupes = [];
    for (const [name, list] of [
      ["parcels", s.parcels],
      ["projects", s.projects],
      ["assets", s.assets],
      ["loans", s.loans],
      ["staff", s.staff],
      ["offers", s.offers]
    ]) {
      const seen = /* @__PURE__ */ new Set();
      for (const item of list || []) {
        if (!item || !item.id) continue;
        if (seen.has(item.id)) dupes.push(`${name}:${item.id}`);
        seen.add(item.id);
      }
    }
    return dupes;
  }

  // src/data/costs.js
  var A2 = (pairs) => pairs.map(([year, v]) => ({ year, v }));
  var BUILD_TYPES = {
    godown: {
      id: "godown",
      name: "Warehouse / godown",
      cost: 130,
      months: 8,
      refSqFt: 2e4,
      minMonths: 5,
      use: "industrial",
      minSqFt: 8e3,
      quality: 0.5,
      desc: "Steel truss, AC sheet roof, murram floor. Fast, cheap, low rent, long leases."
    },
    economy: {
      id: "economy",
      name: "Economy apartments",
      cost: 265,
      months: 18,
      refSqFt: 2e4,
      minMonths: 10,
      use: "res",
      minSqFt: 3e3,
      quality: 0.45,
      desc: "Load-bearing plus RCC, mosaic floors, no lift below four floors. Sells on price alone."
    },
    standard: {
      id: "standard",
      name: "Standard apartments",
      cost: 340,
      months: 22,
      refSqFt: 25e3,
      minMonths: 12,
      use: "res",
      minSqFt: 4e3,
      quality: 0.65,
      desc: "RCC frame, Kota or ceramic flooring, one lift, covered parking. The mass market."
    },
    premium: {
      id: "premium",
      name: "Premium apartments",
      cost: 520,
      months: 28,
      refSqFt: 4e4,
      minMonths: 16,
      use: "res",
      minSqFt: 8e3,
      quality: 0.82,
      desc: "Granite, two lifts, generator backup, landscaped setbacks. Needs a good address to work."
    },
    villa: {
      id: "villa",
      name: "Villa community",
      cost: 680,
      months: 30,
      refSqFt: 6e4,
      minMonths: 18,
      use: "res",
      minSqFt: 15e3,
      quality: 0.88,
      desc: "Independent houses on a gated layout. Land-hungry, slow, and very profitable in the right corridor."
    },
    officeShell: {
      id: "officeShell",
      name: "Office building (bare shell)",
      cost: 420,
      months: 24,
      refSqFt: 5e4,
      minMonths: 14,
      use: "office",
      minSqFt: 12e3,
      quality: 0.6,
      desc: "Structure, core, lifts, basic services. Tenant fits out. Lower cost, lower rent."
    },
    officeA: {
      id: "officeA",
      name: "Grade A office campus",
      cost: 640,
      months: 32,
      refSqFt: 15e4,
      minMonths: 20,
      use: "office",
      minSqFt: 6e4,
      quality: 0.88,
      desc: "Central air conditioning, full power backup, structured parking. What multinationals will actually sign a nine-year lease on."
    },
    retail: {
      id: "retail",
      name: "Retail / shopping centre",
      cost: 720,
      months: 30,
      refSqFt: 1e5,
      minMonths: 18,
      use: "retail",
      minSqFt: 3e4,
      quality: 0.85,
      desc: "Atrium, escalators, HVAC, anchor tenant. High capital, high rent, very sensitive to catchment."
    },
    hotel: {
      id: "hotel",
      name: "Hotel",
      cost: 1300,
      months: 38,
      refSqFt: 12e4,
      minMonths: 24,
      use: "retail",
      minSqFt: 4e4,
      quality: 0.9,
      desc: "Rooms, kitchens, banquet. Operating business, not just an asset. Needs an operator."
    }
  };
  var COST_TRACK = A2([
    [1995, 1],
    [1997, 1.12],
    [1999, 1.22],
    [2e3, 1.3],
    [2002, 1.35],
    [2004, 1.55],
    [2005, 1.72],
    [2006, 1.95],
    [2007, 2.25],
    [2008, 2.5],
    [2009, 2.4],
    [2010, 2.65],
    [2011, 2.9],
    [2012, 3.1],
    [2013, 3.3],
    [2014, 3.5],
    [2015, 3.6],
    [2016, 3.75],
    [2017, 4],
    [2018, 4.3],
    [2019, 4.6],
    [2020, 4.8]
  ]);
  var MATERIALS = {
    cement: {
      name: "OPC cement",
      unit: "per 50 kg bag",
      base: 115,
      track: A2([[1995, 1], [1996, 1.05], [1998, 1], [2e3, 1.1], [2003, 1.3], [2005, 1.6], [2007, 2], [2008, 2.2], [2010, 2.3], [2012, 2.6], [2015, 2.7], [2018, 3], [2020, 3.2]])
    },
    steel: {
      name: "TMT reinforcement steel",
      unit: "per tonne",
      base: 14800,
      track: A2([[1995, 1], [1998, 0.92], [2e3, 0.95], [2003, 1.1], [2004, 1.6], [2005, 1.5], [2006, 1.7], [2007, 1.9], [2008, 2.9], [2009, 2], [2010, 2.3], [2011, 2.7], [2013, 2.7], [2015, 2.4], [2016, 2.4], [2018, 3.2], [2019, 3], [2020, 2.9]])
    },
    sand: {
      name: "River sand",
      unit: "per cubic metre",
      base: 430,
      track: A2([[1995, 1], [2e3, 1.2], [2004, 1.6], [2007, 2.4], [2010, 3.4], [2012, 4.6], [2014, 5.6], [2016, 6.4], [2018, 7.4], [2020, 8.2]])
    },
    brick: {
      name: "Country bricks",
      unit: "per thousand",
      base: 1300,
      track: A2([[1995, 1], [2e3, 1.25], [2005, 1.8], [2008, 2.4], [2012, 3.4], [2016, 4.4], [2020, 5.4]])
    }
  };
  var WAGES = {
    mason: 115,
    carpenter: 125,
    barbender: 130,
    unskilled: 52,
    electrician: 110,
    plumber: 105
  };
  var WAGE_TRACK = A2([
    [1995, 1],
    [1998, 1.15],
    [2e3, 1.3],
    [2003, 1.55],
    [2005, 1.9],
    [2008, 2.6],
    [2010, 3.2],
    [2013, 4.4],
    [2015, 5.2],
    [2017, 6],
    [2019, 7],
    [2020, 7.4]
  ]);
  var ROLES = {
    clerk: { name: "Clerk", base: 1200, skillCap: 25, impact: "admin" },
    accountant: { name: "Accountant", base: 2400, skillCap: 45, impact: "finance" },
    supervisor: { name: "Site supervisor", base: 2600, skillCap: 40, impact: "construction" },
    engineer: { name: "Site engineer", base: 4200, skillCap: 60, impact: "construction" },
    seniorEngineer: { name: "Project manager", base: 7500, skillCap: 78, impact: "construction" },
    architect: { name: "Architect (retained)", base: 9e3, skillCap: 82, impact: "design" },
    legal: { name: "Legal officer", base: 6e3, skillCap: 70, impact: "legal" },
    salesManager: { name: "Sales manager", base: 5e3, skillCap: 65, impact: "sales" },
    financeManager: { name: "Finance manager (CA)", base: 8e3, skillCap: 78, impact: "finance" },
    liaison: { name: "Liaison manager", base: 5500, skillCap: 72, impact: "approvals" },
    propertyManager: { name: "Property manager", base: 3500, skillCap: 60, impact: "rental" },
    cfo: { name: "Chief Financial Officer", base: 25e3, skillCap: 92, impact: "finance", exec: true },
    coo: { name: "Chief Operating Officer", base: 3e4, skillCap: 92, impact: "construction", exec: true },
    gc: { name: "General Counsel", base: 22e3, skillCap: 90, impact: "legal", exec: true },
    audit: { name: "Head of Internal Audit", base: 18e3, skillCap: 88, impact: "governance", exec: true }
  };
  var SALARY_TRACK = A2([
    [1995, 1],
    [1998, 1.35],
    [2e3, 1.6],
    [2003, 2],
    [2005, 2.6],
    [2007, 3.4],
    [2008, 3.8],
    [2010, 4.6],
    [2012, 5.6],
    [2014, 6.8],
    [2016, 8.2],
    [2018, 10],
    [2020, 12]
  ]);
  var DUTY_TRACK = A2([
    [1995, 0.145],
    [1999, 0.135],
    [2002, 0.125],
    [2005, 0.095],
    [2007, 0.07],
    [2010, 0.065],
    [2013, 0.06],
    [2020, 0.06]
  ]);
  var FAR_TRACK = A2([
    [1995, 1.75],
    [2002, 1.9],
    [2006, 2.5],
    [2009, 3],
    [2012, 3.5],
    [2016, 5],
    [2020, 5.5]
  ]);
  var FAR_AIRPORT = 1.2;
  var APPROVAL_BASE_MONTHS = 5;
  var TAX_TRACK = {
    corporate: A2([[1995, 0.46], [1997, 0.35], [2e3, 0.385], [2003, 0.365], [2005, 0.337], [2008, 0.339], [2012, 0.326], [2015, 0.348], [2018, 0.291], [2020, 0.252]]),
    ltcg: A2([[1995, 0.2], [2005, 0.2], [2020, 0.2]]),
    propertyTaxOfNOI: A2([[1995, 0.08], [2005, 0.1], [2015, 0.12], [2020, 0.12]])
  };
  var LENDERS = {
    sbh: {
      id: "sbh",
      name: "State Bank of Hyderabad",
      kind: "bank",
      spread: 0.5,
      maxLtv: 0.55,
      minTrack: 1,
      maxTenure: 84,
      patience: 0.8,
      desc: "Your father banks here. Conservative, slow, cheap, and they want personal guarantees plus collateral worth twice the loan."
    },
    andhra: {
      id: "andhra",
      name: "Andhra Bank",
      kind: "bank",
      spread: 1,
      maxLtv: 0.6,
      minTrack: 2,
      maxTenure: 84,
      patience: 0.75,
      desc: "Slightly hungrier for developer business. Still a public sector bank with a public sector credit committee."
    },
    hdfcL: {
      id: "hdfcL",
      name: "HDFC (construction finance)",
      kind: "bank",
      spread: 2,
      maxLtv: 0.65,
      minTrack: 3,
      maxTenure: 60,
      patience: 0.7,
      from: 24,
      desc: "The only lender in the country that genuinely understands residential development. They will also see through your numbers."
    },
    icici: {
      id: "icici",
      name: "ICICI",
      kind: "bank",
      spread: 2.5,
      maxLtv: 0.7,
      minTrack: 4,
      maxTenure: 84,
      patience: 0.55,
      from: 60,
      desc: "Aggressive, fast, expensive, and utterly ruthless when a cycle turns."
    },
    nbfc: {
      id: "nbfc",
      name: "Structured NBFC finance",
      kind: "nbfc",
      spread: 6,
      maxLtv: 0.75,
      minTrack: 4,
      maxTenure: 48,
      patience: 0.4,
      from: 132,
      desc: "Non-bank money against project cash flows. Quick, costly, and it disappears the moment its own funding line does."
    },
    chalapathi: {
      id: "chalapathi",
      name: "Chalapathi (private financier)",
      kind: "private",
      spread: 18,
      maxLtv: 0.45,
      minTrack: 0,
      maxTenure: 24,
      patience: 0.15,
      desc: "Two and a half to three per cent a month against blank cheques and your personal guarantee. Available when nobody else is. Takes the company if you miss."
    }
  };
  var LAYOUT_TYPES = {
    venture: {
      id: "venture",
      name: "Unapproved venture",
      cost: 22,
      saleable: 0.7,
      plotMult: 2.2,
      conversionMonths: 0,
      approvalMonths: 0,
      months: 6,
      minAcres: 0.5,
      unapproved: true,
      desc: "Murram roads, boundary stones, a painted arch and a broker with a map. No conversion, no sanction. Sells fast and cheap to buyers who are not asking questions, and every plot you sell carries a defect you have passed on to somebody else."
    },
    approved: {
      id: "approved",
      name: "Approved layout (HUDA / DTCP)",
      cost: 62,
      saleable: 0.58,
      plotMult: 4,
      conversionMonths: 5,
      approvalMonths: 7,
      months: 12,
      minAcres: 1,
      desc: "Land conversion out of agricultural use, sanctioned layout, black-top roads, storm drains, water lines, electricity and ten per cent surrendered as open space. Takes two years before a single plot is sold, and the sanction is most of what the buyer is paying for."
    },
    gated: {
      id: "gated",
      name: "Gated plotted community",
      cost: 160,
      saleable: 0.55,
      plotMult: 5.4,
      conversionMonths: 5,
      approvalMonths: 8,
      months: 18,
      minAcres: 3,
      desc: "Compound wall, gate and security cabin, concrete roads, underground utilities, avenue plantation and a clubhouse. Sells at a serious premium to buyers who want an address rather than an investment, and needs a corridor that has already arrived."
    }
  };
  var CONVERSION_COST_PER_SQYD = 9;

  // src/data/history.js
  var MACRO = {
    //          cpi%   gdp%   plr%   usdinr  credit  hydDemand
    1995: { cpi: 10.2, gdp: 7.6, plr: 16.5, usd: 32.4, credit: 0.42, demand: 0.8 },
    1996: { cpi: 9, gdp: 7.6, plr: 16, usd: 35.4, credit: 0.38, demand: 0.85 },
    1997: { cpi: 7.2, gdp: 4.1, plr: 14, usd: 36.3, credit: 0.52, demand: 0.82 },
    1998: { cpi: 13.2, gdp: 6.2, plr: 13.5, usd: 41.3, credit: 0.48, demand: 0.9 },
    1999: { cpi: 4.7, gdp: 8.5, plr: 12.5, usd: 43.1, credit: 0.6, demand: 1.05 },
    2e3: { cpi: 4, gdp: 4, plr: 12, usd: 44.9, credit: 0.62, demand: 1.15 },
    2001: { cpi: 3.8, gdp: 4.9, plr: 11.5, usd: 47.2, credit: 0.58, demand: 0.95 },
    2002: { cpi: 4.3, gdp: 3.9, plr: 11, usd: 48.6, credit: 0.66, demand: 0.95 },
    2003: { cpi: 3.8, gdp: 8, plr: 10.8, usd: 46.6, credit: 0.8, demand: 1.1 },
    2004: { cpi: 3.8, gdp: 7.1, plr: 10.3, usd: 45.3, credit: 0.86, demand: 1.35 },
    2005: { cpi: 4.2, gdp: 9.5, plr: 10.8, usd: 44.1, credit: 0.92, demand: 1.55 },
    2006: { cpi: 6.8, gdp: 9.6, plr: 11.5, usd: 45.3, credit: 0.95, demand: 1.7 },
    2007: { cpi: 6.4, gdp: 9.3, plr: 13, usd: 41.3, credit: 0.88, demand: 1.6 },
    2008: { cpi: 8.3, gdp: 3.9, plr: 13.5, usd: 43.5, credit: 0.42, demand: 0.9 },
    2009: { cpi: 10.9, gdp: 8.5, plr: 12, usd: 48.4, credit: 0.58, demand: 0.7 },
    2010: { cpi: 12, gdp: 10.3, plr: 11.5, usd: 45.7, credit: 0.78, demand: 0.65 },
    2011: { cpi: 8.9, gdp: 6.6, plr: 14, usd: 46.7, credit: 0.66, demand: 0.58 },
    2012: { cpi: 9.3, gdp: 5.5, plr: 14, usd: 53.4, credit: 0.58, demand: 0.68 },
    2013: { cpi: 10.9, gdp: 6.4, plr: 14, usd: 58.6, credit: 0.5, demand: 0.75 },
    2014: { cpi: 6.4, gdp: 7.4, plr: 13.5, usd: 61, credit: 0.6, demand: 0.95 },
    2015: { cpi: 4.9, gdp: 8, plr: 12.5, usd: 64.2, credit: 0.7, demand: 1.25 },
    2016: { cpi: 4.5, gdp: 8.2, plr: 11.5, usd: 67.2, credit: 0.62, demand: 1.3 },
    2017: { cpi: 3.6, gdp: 7.2, plr: 11, usd: 65.1, credit: 0.66, demand: 1.35 },
    2018: { cpi: 3.4, gdp: 6.8, plr: 11.5, usd: 68.4, credit: 0.46, demand: 1.45 },
    2019: { cpi: 4.8, gdp: 4.2, plr: 11, usd: 70.4, credit: 0.34, demand: 1.4 },
    2020: { cpi: 6.2, gdp: -6.6, plr: 10, usd: 74.1, credit: 0.4, demand: 0.6 }
  };
  var SHOCKS = {
    10: { credit: 0.22 },
    11: { credit: 0.24 },
    12: { credit: 0.28 },
    // Nov 1995 call-money crisis
    30: { credit: 0.4 },
    // Jul 1997 Asian crisis
    164: { credit: 0.25, demand: 0.7 },
    // Sep 2008 Lehman
    165: { credit: 0.2, demand: 0.62 },
    166: { credit: 0.2, demand: 0.58 },
    167: { credit: 0.24, demand: 0.58 },
    179: { demand: 0.55 },
    // Dec 2009 Telangana announcement
    180: { demand: 0.45 },
    181: { demand: 0.42 },
    182: { demand: 0.44 },
    201: { demand: 0.4 },
    202: { demand: 0.38 },
    // Sakala Janula Samme
    262: { credit: 0.3, demand: 0.55 },
    // Nov 2016 demonetisation
    263: { credit: 0.32, demand: 0.45 },
    264: { credit: 0.36, demand: 0.5 },
    265: { demand: 0.6 },
    270: { demand: 0.9 },
    // GST transition quarter
    284: { credit: 0.28 },
    285: { credit: 0.26 },
    // IL&FS default
    302: { demand: 0.35, credit: 0.3 }
  };
  var TIMELINE = [
    {
      m: 0,
      tag: "POLITICS",
      head: "NTR government imposes total prohibition in Andhra Pradesh",
      body: "From 16 January, liquor sale is banned statewide. The state forfeits roughly Rs 1,200 crore of annual excise revenue. Secretariat officials are privately warning that road, water and drainage budgets will be cut.",
      effect: { infraBudget: 0.55 }
    },
    {
      m: 3,
      tag: "ECONOMY",
      head: "Cement shortage across the Deccan pushes bag prices up",
      body: "Dealers in Secunderabad report OPC touching Rs 128 a bag. Builders are stockpiling and contractors are asking for price-escalation clauses.",
      effect: { materialSpike: 1.12 }
    },
    {
      m: 8,
      tag: "POLITICS",
      head: "Chandrababu Naidu replaces NTR as Chief Minister",
      body: "After a revolt by TDP legislators, N. Chandrababu Naidu is sworn in on 1 September. He is 45, speaks the language of business, and has told industry bodies that Hyderabad must compete with Bangalore.",
      effect: { regime: "naidu", infraBudget: 0.85, bizConfidence: 1.15 }
    },
    {
      m: 10,
      tag: "ECONOMY",
      head: "Money market seizes: call rates touch 35 per cent",
      body: "A severe liquidity squeeze hits the banking system. Banks stop fresh sanctions entirely. Private financiers are asking 4 per cent a month and getting it.",
      effect: {}
    },
    {
      m: 12,
      tag: "POLITICS",
      head: "N. T. Rama Rao dies",
      body: "The founder of the Telugu Desam Party dies on 18 January. Naidu consolidates control of the party and the government.",
      effect: {}
    },
    {
      m: 16,
      tag: "POLITICS",
      head: "Narasimha Rao loses power at the Centre",
      body: "The Congress is voted out. A United Front coalition takes office in Delhi. Continuity on liberalisation is suddenly uncertain.",
      effect: {}
    },
    {
      m: 22,
      tag: "INFRA",
      head: "State announces a software technology corridor west of the city",
      body: "The government says it will develop an information-technology park on rocky land near Madhapur village, off the Jubilee Hills road. Most established builders consider the location unserviceable: no water, no drainage, no approach road worth the name.",
      effect: { unlock: "HITEC_ANNOUNCE" }
    },
    {
      m: 30,
      tag: "ECONOMY",
      head: "Currency crisis spreads across East Asia",
      body: "Thailand devalues. Foreign investors pull back from emerging markets. Indian exporters are nervous and banks turn cautious on long-tenure lending.",
      effect: {}
    },
    {
      m: 38,
      tag: "POLITICS",
      head: "Vajpayee forms government at the Centre",
      body: "The BJP-led coalition takes office in March 1998. TDP supports from outside, giving Naidu unusual leverage in Delhi over central projects.",
      effect: { bizConfidence: 1.1 }
    },
    {
      m: 41,
      tag: "ECONOMY",
      head: "Sanctions after Pokhran-II; rupee slides past Rs 42",
      body: "Nuclear tests draw international sanctions. Import costs rise; steel, lifts and imported equipment get dearer.",
      effect: { materialSpike: 1.08 }
    },
    {
      m: 46,
      tag: "INFRA",
      head: "Cyber Towers inaugurated at HITEC City",
      body: "The first tower of the software park opens at Madhapur in November. A handful of multinationals sign up. Brokers who were selling Madhapur land at Rs 250 a yard eighteen months ago are now quoting Rs 700 and refusing to negotiate.",
      effect: { unlock: "HITEC_LIVE", bizConfidence: 1.2 }
    },
    {
      m: 57,
      tag: "POLITICS",
      head: "Naidu re-elected; Vajpayee returns with a stable majority",
      body: "The TDP retains Andhra Pradesh. Naidu doubles down on infrastructure, information technology and a rebuilt Hyderabad image.",
      effect: { infraBudget: 1.1 }
    },
    {
      m: 60,
      tag: "ECONOMY",
      head: "Y2K passes without incident, and Hyderabad has been paid for it",
      body: "Indian software firms billed the world to fix a date bug. Hyderabad now has thousands of engineers on dollar-linked salaries and nowhere decent to buy a flat.",
      effect: {}
    },
    {
      m: 70,
      tag: "INFRA",
      head: "Necklace Road and the Hussain Sagar lakefront open",
      body: "The state showcases a redeveloped city core. Land around the lake, Khairatabad and Punjagutta re-rates.",
      effect: {}
    },
    {
      m: 74,
      tag: "ECONOMY",
      head: "The technology bubble bursts",
      body: "Nasdaq collapses. Hiring freezes across software firms. Office demand in Madhapur stalls and several announced projects go quiet. The men who bought land there in 1999 are learning what illiquidity means.",
      effect: {}
    },
    {
      m: 96,
      tag: "INFRA",
      head: "State commissions a feasibility study for an Outer Ring Road",
      body: "A 150-kilometre orbital road around Hyderabad is proposed. No alignment has been published. Land agents are already selling ORR-touching plots in eleven different villages, most of which the road will never come near.",
      effect: { unlock: "ORR_STUDY" }
    },
    {
      m: 100,
      tag: "INFRA",
      head: "New international airport shortlisted for Shamshabad",
      body: "The Centre and state agree in principle on a greenfield airport south of the city. Farmers around Shamshabad, Satamrai and Mamidipally have stopped selling entirely.",
      effect: { unlock: "AIRPORT_ANNOUNCE" }
    },
    {
      m: 112,
      tag: "POLITICS",
      head: "Y. S. Rajasekhara Reddy sweeps Andhra Pradesh for Congress",
      body: "May 2004. Naidu is out after nine years. YSR campaigned on farmers and irrigation, not on information technology. The bureaucrats who built HITEC City are being transferred. But construction demand now runs on private employment rather than government showcasing, and it does not slow.",
      effect: { regime: "ysr", infraBudget: 1, bizConfidence: 1.05 }
    },
    {
      m: 122,
      tag: "INFRA",
      head: "Work begins on Rajiv Gandhi International Airport, Shamshabad",
      body: "March 2005. A GMR-led consortium breaks ground. An expressway from Mehdipatnam is planned. Land within ten kilometres has tripled in eighteen months.",
      effect: { unlock: "AIRPORT_BUILD" }
    },
    {
      m: 128,
      tag: "REGULATION",
      head: "Special Economic Zones Act notified",
      body: "Developers can now build tax-privileged office campuses. Applications pour in for Gachibowli, Nanakramguda and Pocharam. Institutional money starts looking at Indian office assets for the first time.",
      effect: { unlock: "SEZ" }
    },
    {
      m: 140,
      tag: "ECONOMY",
      head: "Hyderabad land enters open mania",
      body: "Government auction rates in Kokapet cross one crore an acre, then fourteen crore an acre. Every second businessman in the city is now a developer. Banks are lending against land at valuations nobody can defend.",
      effect: {}
    },
    {
      m: 158,
      tag: "INFRA",
      head: "Rajiv Gandhi International Airport opens at Shamshabad",
      body: "March 2008. Begumpet closes to commercial traffic. Height restrictions over Begumpet, Somajiguda, Ameerpet and parts of Secunderabad are relaxed. Those plots can finally go taller.",
      effect: { unlock: "AIRPORT_LIVE", farRelax: ["begumpet", "somajiguda", "ameerpet", "secunderabad"] }
    },
    {
      m: 156,
      tag: "REGULATION",
      head: "State opens LRS and BPS: an amnesty for unapproved layouts",
      body: "January 2008. The Layout Regularisation Scheme and the Building Penalisation Scheme open together. Unapproved layouts and deviated buildings can be regularised on payment of fees and an open-space contribution, without the years of argument it normally takes. Every venture developer in the state is queueing at the development authority.",
      effect: { unlock: "LRS_2008" }
    },
    {
      m: 246,
      tag: "REGULATION",
      head: "Telangana reopens the Layout Regularisation Scheme",
      body: "July 2015. The new state reopens LRS. Anything unapproved that has been sitting unsold since the last amnesty can be brought onto the record, and plots that no bank would lend against become mortgageable overnight.",
      effect: { unlock: "LRS_2015" }
    },
    {
      m: 164,
      tag: "ECONOMY",
      head: "Lehman Brothers collapses; global credit freezes",
      body: "September 2008. Indian banks stop disbursing to developers overnight. Buyers vanish. Several Hyderabad builders who bought land at 2007 prices on three-per-cent-a-month money are now insolvent and do not know it yet.",
      effect: { crash: true }
    },
    {
      m: 176,
      tag: "POLITICS",
      head: "Chief Minister Y. S. Rajasekhara Reddy dies in a helicopter crash",
      body: "September 2009. The state loses its dominant political figure with no succession plan. Government decision-making simply stops.",
      effect: { infraBudget: 0.6, regime: "drift" }
    },
    {
      m: 179,
      tag: "POLITICS",
      head: "Centre announces the process for Telangana statehood, then stalls",
      body: "On 9 December 2009 the Home Minister announces that the process for forming Telangana will be initiated. Within two weeks coastal Andhra erupts and the announcement is effectively withdrawn. Hyderabad, claimed by both sides, becomes the disputed prize.",
      effect: { unlock: "AGITATION", infraBudget: 0.45 }
    },
    {
      m: 189,
      tag: "INFRA",
      head: "Hyderabad Metro Rail concession signed with L&T",
      body: "Seventy-two kilometres of elevated metro on three corridors, on a public-private concession. Construction has not started. Nobody in the trade expects it on time.",
      effect: { unlock: "METRO_SIGNED" }
    },
    {
      m: 190,
      tag: "ECONOMY",
      head: "Hyderabad property market goes silent",
      body: "Bandhs, strikes and uncertainty over who will govern the capital have driven registrations to a decade low. Andhra investors are selling. Builders sit on unsold inventory and unpaid interest, waiting for a political answer.",
      effect: {}
    },
    {
      m: 201,
      tag: "POLITICS",
      head: "Sakala Janula Samme: a 42-day general strike paralyses the region",
      body: "Government employees, coal miners and transport workers strike for statehood. Nothing gets registered, approved, delivered or sold.",
      effect: {}
    },
    {
      m: 213,
      tag: "INFRA",
      head: "Outer Ring Road substantially complete",
      body: "The 158-kilometre orbital is largely open. Land along the radial roads and near the interchanges is genuinely accessible for the first time. Warehousing enquiries begin.",
      effect: { unlock: "ORR_LIVE" }
    },
    {
      m: 233,
      tag: "POLITICS",
      head: "Telangana is formed; K. Chandrashekar Rao becomes Chief Minister",
      body: "2 June 2014. Hyderabad is the capital of the new state, shared with Andhra Pradesh for ten years. Andhra investors are unsure whether to stay. The new government promises an aggressive industrial policy and a clean-up of building approvals.",
      effect: { regime: "kcr", infraBudget: 1.15, bizConfidence: 1.1, unlock: "TELANGANA" }
    },
    {
      m: 235,
      tag: "REGULATION",
      head: "TS-iPASS: single-window industrial clearance in fifteen days",
      body: "The new state legislates self-certification and deemed approval for industrial projects. Confidence among corporate occupiers rises sharply.",
      effect: { approvalSpeed: 1.35 }
    },
    {
      m: 262,
      tag: "ECONOMY",
      head: "Demonetisation: Rs 500 and Rs 1,000 notes withdrawn overnight",
      body: "8 November 2016. Cash components in land deals evaporate. Secondary transactions collapse. Labour on sites goes unpaid for weeks because contractors cannot draw cash. Primary sales by cheque, from organised developers, are hurt least.",
      effect: { unlock: "DEMONETISATION" }
    },
    {
      m: 268,
      tag: "REGULATION",
      head: "Real Estate (Regulation and Development) Act comes into force",
      body: "1 May 2017. Project registration, escrow of seventy per cent of buyer receipts, penalties for delay. Small builders who funded Project B out of Project A advances are finished.",
      effect: { unlock: "RERA" }
    },
    {
      m: 270,
      tag: "REGULATION",
      head: "GST replaces the indirect tax system",
      body: "1 July 2017. Input credits change project economics and the transition quarter is chaotic. Under-construction sales attract GST; completed units do not.",
      effect: { unlock: "GST" }
    },
    {
      m: 274,
      tag: "INFRA",
      head: "Hyderabad Metro opens: Nagole to Miyapur",
      body: "28 November 2017. Thirty kilometres running. Property along the corridor re-rates within weeks.",
      effect: { unlock: "METRO_LIVE" }
    },
    {
      m: 284,
      tag: "ECONOMY",
      head: "IL&FS defaults; the non-bank funding tap closes",
      body: "September 2018. Non-bank lenders had become the main financiers of Indian real estate. Their own funding cost spikes and refinancing stops. Highly leveraged developers begin selling assets at whatever they can get.",
      effect: {}
    },
    {
      m: 287,
      tag: "POLITICS",
      head: "KCR returns with a larger majority in Telangana",
      body: "December 2018. Continuity. Large infrastructure, the new Secretariat and the western corridor all proceed.",
      effect: {}
    },
    {
      m: 302,
      tag: "ECONOMY",
      head: "A respiratory virus is spreading out of China; markets are falling",
      body: "March 2020. Sites are emptying as migrant labour begins leaving the city. Nobody yet knows how long this lasts.",
      effect: { end: true }
    }
  ];
  var REGIMES = {
    ntr: { key: "ntr", name: "N. T. Rama Rao (TDP)", approvalSpeed: 0.85, pressure: 0.5, focus: "Welfare and prohibition" },
    naidu: { key: "naidu", name: "N. Chandrababu Naidu (TDP)", approvalSpeed: 1, pressure: 0.6, focus: "Urban infrastructure and IT" },
    ysr: { key: "ysr", name: "Y. S. Rajasekhara Reddy (INC)", approvalSpeed: 0.9, pressure: 0.8, focus: "Irrigation and rural welfare" },
    drift: { key: "drift", name: "Congress (post-YSR drift)", approvalSpeed: 0.55, pressure: 0.85, focus: "Paralysis" },
    kcr: { key: "kcr", name: "K. Chandrashekar Rao (TRS)", approvalSpeed: 1.25, pressure: 0.7, focus: "Hyderabad growth and western corridor" }
  };
  function regimeAt(m) {
    if (m >= 233) return REGIMES.kcr;
    if (m >= 176) return REGIMES.drift;
    if (m >= 112) return REGIMES.ysr;
    if (m >= 8) return REGIMES.naidu;
    return REGIMES.ntr;
  }
  var CPI_INDEX = (() => {
    const idx = {};
    let v = 100;
    for (let y = 1995; y <= 2020; y++) {
      idx[y] = v;
      v *= 1 + MACRO[y].cpi / 100;
    }
    return idx;
  })();

  // src/data/events.js
  var K = (n) => n * 1e5;
  var CR = (n) => n * 1e7;
  var anyProject = (s, stage) => s.projects.filter((p) => !p.done && (!stage || p.stage === stage));
  var ownedLand = (s) => s.parcels.filter((p) => p.owned && !p.usedBy);
  var leased = (s) => s.assets.filter((a) => a.sqFt > 0);
  var EVENTS = [
    // ---------------------------------------------------------------- capital & credit
    {
      id: "bank_cold",
      cat: "Capital shortage",
      tags: ["finance"],
      when: (s) => s.month < 60 && s.relations.banks < 40,
      weight: () => 6,
      build: (s, rng, fx) => ({
        head: "The bank manager will see you, briefly",
        body: `You have been waiting outside Mr Krishnamurthy's cabin at State Bank of Hyderabad since half past ten. When he finally calls you in he does not offer tea. He looks at your project papers for perhaps forty seconds.

"Your father is a good customer. But you are asking me to lend against a building that does not exist, to a firm that has never completed one. Bring me a completed project, or bring me collateral worth twice what you want."`,
        choices: [
          {
            label: "Accept it and leave politely",
            hint: "Costs nothing. He remembers manners.",
            do: ({ fx: fx2 }) => {
              fx2.rel("banks", 3);
              fx2.news("You left the bank without a sanction, but without burning it either.");
            }
          },
          {
            label: "Offer your father\u2019s shop as collateral",
            hint: "Raises borrowing power. Your father does not know yet.",
            do: ({ fx: fx2, s: s2 }) => {
              fx2.rel("banks", 10);
              s2.flags.shopPledged = true;
              fx2.rel("family", -14);
              fx2.news("You pledged the Sangeet Theatre Road shop. Your father has not been told.");
            }
          },
          {
            label: "Argue your projections at him",
            hint: "He has heard better projections from worse people.",
            do: ({ fx: fx2, rng: rng2 }) => {
              if (rng2.chance(0.3)) {
                fx2.rel("banks", 6);
                fx2.news("He was, unusually, impressed.");
              } else {
                fx2.rel("banks", -8);
                fx2.news("He was not impressed. Word travels between branch managers.");
              }
            }
          }
        ]
      })
    },
    {
      id: "private_money",
      cat: "High interest rates",
      tags: ["finance"],
      when: (s) => s.cash < K(6) && s.month > 4,
      weight: (s) => s.cash < K(2) ? 12 : 5,
      build: (s, rng, fx) => ({
        head: "Chalapathi garu has heard you are short",
        body: `He arrives at the site unannounced, in a white Ambassador, and stands looking at your slab for a long time before speaking.

"Money problem, I heard. Don't take tension. I will give you ${money(K(15))} tomorrow morning. Two and a half per cent per month. Simple. You give me post-dated cheques and one blank one, and your personal guarantee."

He says it the way a man offers water.`,
        choices: [
          {
            label: `Take ${money(K(15))} at 2.5% a month`,
            hint: "30% a year, compounding, no grace. It has killed better builders than you.",
            do: ({ fx: fx2 }) => {
              fx2.privateLoan(K(15), 0.3, 18);
              fx2.rel("financiers", 12);
              fx2.news("You borrowed from Chalapathi. The blank cheque is in his drawer.");
            }
          },
          {
            label: "Refuse, politely",
            hint: "You stay solvent and slow.",
            do: ({ fx: fx2 }) => {
              fx2.rel("financiers", -4);
              fx2.news("You refused private money. He smiled and said he would come again.");
            }
          },
          {
            label: "Negotiate him to 2%",
            hint: "He may respect it, or may withdraw the offer.",
            do: ({ fx: fx2, rng: rng2 }) => {
              if (rng2.chance(0.35)) {
                fx2.privateLoan(K(15), 0.24, 18);
                fx2.rel("financiers", 8);
                fx2.news("He came down to two per cent. He will remember that you asked.");
              } else {
                fx2.rel("financiers", -6);
                fx2.news("He laughed, got into the Ambassador and left.");
              }
            }
          }
        ]
      })
    },
    {
      id: "bank_recall",
      cat: "Liquidity crisis",
      tags: ["finance", "crisis"],
      when: (s) => s.loans.some((l) => l.outstanding > 0) && s.macro.credit < 0.45 && s.ratios.debtToAssets > 0.5,
      weight: (s) => 10 * (s.ratios.debtToAssets - 0.4),
      build: (s, rng, fx) => ({
        head: "The bank wants its money back",
        body: `A letter, delivered by hand. Your working capital limit is being reviewed downward with immediate effect, and the bank requires either additional security or a reduction of ${money(Math.max(K(8), s.debt * 0.2))} within ninety days.

This is not about you. Every developer in the city got the same letter this week. That does not make it survivable.`,
        choices: [
          {
            label: "Sell inventory at a discount to raise cash",
            hint: "Immediate cash, permanent margin damage.",
            do: ({ fx: fx2 }) => {
              fx2.fireSale(0.78);
              fx2.rel("banks", 6);
            }
          },
          {
            label: "Pledge more collateral",
            hint: "Needs unencumbered land. Increases what you can lose.",
            do: ({ fx: fx2, s: s2 }) => {
              if (ownedLand(s2).length) {
                fx2.pledgeLand();
                fx2.rel("banks", 8);
              } else {
                fx2.rel("banks", -12);
                fx2.news("You had nothing left to pledge. The bank noted it.");
              }
            }
          },
          {
            label: "Go to the private market to refinance",
            hint: "Solves ninety days. Creates a worse problem later.",
            do: ({ fx: fx2, s: s2 }) => {
              fx2.privateLoan(Math.max(K(10), s2.debt * 0.22), 0.34, 15);
              fx2.rel("banks", 4);
              fx2.rel("financiers", 8);
            }
          },
          {
            label: "Ask for time and hope",
            hint: "Free. Might work. Might not.",
            do: ({ fx: fx2, rng: rng2 }) => {
              if (rng2.chance(0.4)) {
                fx2.news("The manager extended you sixty days. He did not have to.");
                fx2.rel("banks", 2);
              } else {
                fx2.rel("banks", -16);
                fx2.penalise(0.02);
                fx2.news("The bank classified your account as irregular. Interest rate up two per cent.");
              }
            }
          }
        ]
      })
    },
    // ---------------------------------------------------------------- land & title
    {
      id: "title_surface",
      cat: "Land-title disputes",
      tags: ["legal"],
      when: (s) => s.parcels.some((p) => p.owned && p.defects.some((d) => !p.known.includes(d))),
      weight: () => 9,
      build: (s, rng, fx) => {
        const p = rng.pick(s.parcels.filter((x) => x.owned && x.defects.some((d2) => !x.known.includes(d2))));
        const d = rng.pick(p.defects.filter((x) => !p.known.includes(x)));
        return {
          head: "A problem surfaces on your land",
          body: `A man you have never met is standing at the gate of your ${p.label} with a file. Inside the file is ${fx.defectName(d).toLowerCase()}.

${fx.defectDesc(d)}

Your advocate reads it twice and does not look up.`,
          meta: { parcelId: p.id, defect: d },
          choices: [
            {
              label: "Fight it in court",
              hint: "Years, lawyers, and an injunction that may stop everything.",
              do: ({ fx: fx2, rng: rng2 }) => fx2.resolveDefect(p.id, d, "litigate", rng2)
            },
            {
              label: "Settle privately with the claimant",
              hint: "Expensive and immediate. Usually the cheapest option in the end.",
              do: ({ fx: fx2, rng: rng2 }) => fx2.resolveDefect(p.id, d, "settle", rng2)
            },
            {
              label: "Carry on building and deal with it later",
              hint: "Every builder in the city does this. Some of them get away with it.",
              do: ({ fx: fx2, rng: rng2 }) => fx2.resolveDefect(p.id, d, "ignore", rng2)
            }
          ]
        };
      }
    },
    {
      id: "landowner_approach",
      cat: "Opportunity",
      tags: ["land", "opportunity"],
      when: (s) => s.reputation > 12,
      weight: (s) => 5 + s.reputation / 12,
      build: (s, rng, fx) => fx.landownerOffer(rng)
    },
    {
      id: "encroach",
      cat: "Land-title disputes",
      tags: ["land"],
      when: (s) => ownedLand(s).length > 0,
      weight: (s) => 3 + ownedLand(s).length * 0.5,
      build: (s, rng, fx) => {
        const p = rng.pick(ownedLand(s));
        return {
          head: "Someone has built a wall on your land",
          body: `Your watchman telephones. Overnight, the neighbouring owner has run a compound wall roughly eleven feet inside your boundary at ${p.label}, taking in perhaps two hundred square yards. He says the survey is wrong and that his grandfather cultivated up to the neem tree.

If you leave it, in twelve years it is legally his.`,
          choices: [
            {
              label: "Demolish it the same night",
              hint: "Effective. Also a criminal complaint waiting to happen.",
              do: ({ fx: fx2, rng: rng2 }) => {
                if (rng2.chance(0.6)) {
                  fx2.news("The wall came down at three in the morning. Nothing further was said.");
                } else {
                  fx2.cash(-K(2));
                  fx2.rep(-2);
                  fx2.news("He filed a police complaint. It cost you money and a small amount of reputation to make it go away.");
                }
              }
            },
            {
              label: "File for injunction and survey",
              hint: "Slow, correct, costs money.",
              do: ({ fx: fx2 }) => {
                fx2.cash(-K(1.2));
                fx2.rel("bureaucrats", 2);
                fx2.news("Survey ordered. It will take eight months.");
              }
            },
            {
              label: "Buy the strip from him",
              hint: "He knows exactly how much leverage he has.",
              do: ({ fx: fx2, s: s2 }) => {
                const c = Math.round(200 * fx2.landRate(p.locality) * 1.6);
                fx2.cash(-c);
                fx2.news(`You paid ${money(c)} for land you already owned. It is now indisputably yours.`);
              }
            }
          ]
        };
      }
    },
    // ---------------------------------------------------------------- approvals & bureaucracy
    {
      id: "file_stuck",
      cat: "Government approvals",
      tags: ["approvals"],
      when: (s) => anyProject(s, "approval").length > 0,
      weight: (s) => 8,
      build: (s, rng, fx) => {
        const p = rng.pick(anyProject(s, "approval"));
        return {
          head: "Your file has not moved in four months",
          body: `The building permission file for ${p.name} is sitting with a section officer at the municipal office. It has been sitting there since March. Nobody will tell you why. Your liaison man says there is "some objection about the setback" but cannot produce anything in writing.

Every month it sits there, your interest clock runs.`,
          choices: [
            {
              label: "Engage a professional liaison consultant",
              hint: `${money(fx.scaled(K(1.5)))}. Legal, effective, and the standard practice.`,
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.cash(-fx2.scaled(K(1.5)));
                fx2.speedApproval(p.id, rng2.int(2, 5));
                fx2.rel("bureaucrats", 5);
              }
            },
            {
              label: "Escalate in writing to the Commissioner",
              hint: "Correct, slow, and it annoys the officer permanently.",
              do: ({ fx: fx2, rng: rng2 }) => {
                if (rng2.chance(0.45)) {
                  fx2.speedApproval(p.id, rng2.int(2, 4));
                  fx2.rel("bureaucrats", -6);
                  fx2.rep(2);
                } else {
                  fx2.delayApproval(p.id, rng2.int(1, 3));
                  fx2.rel("bureaucrats", -10);
                }
              }
            },
            {
              label: "Pay the officer to move the file",
              hint: "LEGAL RISK / CRIMINAL RISK / REPUTATIONAL RISK.",
              illegal: true,
              do: ({ fx: fx2, rng: rng2 }) => fx2.bribe(p.id, rng2)
            },
            {
              label: "Wait",
              hint: "Free. The clock is not.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.delayApproval(p.id, rng2.int(2, 6));
              }
            }
          ]
        };
      }
    },
    {
      id: "policy_shift",
      cat: "Regulatory changes",
      tags: ["approvals"],
      when: (s) => s.month > 24,
      weight: () => 3,
      build: (s, rng, fx) => ({
        head: "The building rules have changed again",
        body: `A government order, published on a Friday evening, revises setback and parking requirements for buildings above four floors. Files already submitted must be resubmitted on the new format. Nobody in the municipal office has seen the new format.

Your architect estimates it costs you six to nine per cent of saleable area on anything not yet sanctioned.`,
        choices: [
          {
            label: "Redesign to the new rules",
            hint: "Lose area, keep the sanction clean.",
            do: ({ fx: fx2 }) => {
              fx2.shrinkPipeline(0.07);
              fx2.news("Drawings revised. You lost seven per cent of saleable area across the pipeline.");
            }
          },
          {
            label: "Push the old drawings through before the cut-off",
            hint: "Faster, but a deviation you will live with.",
            do: ({ fx: fx2, rng: rng2 }) => {
              if (rng2.chance(0.55)) {
                fx2.news("Sanctioned on the old rules. You kept the area.");
              } else {
                fx2.deviationFlag();
                fx2.news("Rejected, and now flagged. Every future file from you gets extra scrutiny.");
                fx2.rel("bureaucrats", -8);
              }
            }
          },
          {
            label: "Fight it through the builders\u2019 association",
            hint: "Collective, slow, builds standing in the industry.",
            do: ({ fx: fx2, rng: rng2 }) => {
              fx2.cash(-fx2.scaled(K(2)));
              fx2.rel("associations", 12);
              if (rng2.chance(0.4)) {
                fx2.news("The association won a transition window. Everyone benefited; you paid for it.");
              } else {
                fx2.shrinkPipeline(0.07);
              }
            }
          }
        ]
      })
    },
    // ---------------------------------------------------------------- construction
    {
      id: "contractor_walks",
      cat: "Contractor failure",
      tags: ["construction"],
      when: (s) => anyProject(s, "construction").length > 0,
      weight: (s) => 7,
      build: (s, rng, fx) => {
        const p = rng.pick(anyProject(s, "construction"));
        return {
          head: "Your contractor has stopped work",
          body: `The site at ${p.name} is empty. The shuttering is up, the steel is tied, and there is nobody there. Your civil contractor has taken his men to another site where somebody is paying cash weekly.

He owes you eleven days of work and you have paid him for nineteen.`,
          choices: [
            {
              label: "Pay him what he is demanding to come back",
              hint: "Fast, costly, and he will do it again.",
              do: ({ fx: fx2 }) => {
                fx2.overrun(p.id, 0.04);
                fx2.delay(p.id, 1);
                fx2.rel("contractors", 4);
              }
            },
            {
              label: "Replace him with a new contractor",
              hint: "Remobilisation costs time. Quality risk on the joint.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.delay(p.id, rng2.int(2, 5));
                fx2.overrun(p.id, 0.04);
                fx2.quality(p.id, -0.06);
                fx2.rel("contractors", -6);
              }
            },
            {
              label: "Take the work departmental \u2014 run it yourself",
              hint: "Cheapest per unit if you can actually manage it.",
              do: ({ fx: fx2, rng: rng2, s: s2 }) => {
                const cap = fx2.constructionCapability();
                if (rng2.f() < cap) {
                  fx2.overrun(p.id, -0.03);
                  fx2.delay(p.id, 1);
                  fx2.skill("construction", 3);
                  fx2.news("You ran it departmentally and it worked. You also did not sleep for two months.");
                } else {
                  fx2.overrun(p.id, 0.12);
                  fx2.delay(p.id, rng2.int(3, 7));
                  fx2.quality(p.id, -0.1);
                  fx2.news("You ran it departmentally and it did not work. Wastage, rework, and a slab you are not happy about.");
                }
              }
            }
          ]
        };
      }
    },
    {
      id: "steel_spike",
      cat: "Construction cost overruns",
      tags: ["construction"],
      when: (s) => anyProject(s, "construction").length > 0,
      weight: (s) => s.materialSpike ? 12 : 4,
      build: (s, rng, fx) => ({
        head: "Steel prices jump without warning",
        body: `Your supplier calls to say the rate has gone up by a fifth since your last indent and he cannot honour the old quotation. You have three slabs left to cast.

Steel is roughly a sixth of your construction cost. This is not fatal. It is not nothing either.`,
        choices: [
          {
            label: "Buy the full requirement now and stock it",
            hint: "Locks the price. Ties up cash and invites theft.",
            do: ({ fx: fx2, rng: rng2, s: s2 }) => {
              const c = fx2.stockSteel();
              if (rng2.chance(0.15)) {
                fx2.cash(-c * 0.06);
                fx2.news("Some of the stocked steel walked off the site.");
              }
            }
          },
          {
            label: "Buy hand to mouth and absorb it",
            hint: "Preserves cash, accepts the overrun.",
            do: ({ fx: fx2, s: s2 }) => {
              for (const p of anyProject(s2, "construction")) fx2.overrun(p.id, 0.025);
            }
          },
          {
            label: "Slow the programme until prices settle",
            hint: "Saves material cost, adds interest and overheads.",
            do: ({ fx: fx2, s: s2, rng: rng2 }) => {
              for (const p of anyProject(s2, "construction")) {
                fx2.delay(p.id, rng2.int(1, 3));
                fx2.overrun(p.id, 0.01);
              }
            }
          }
        ]
      })
    },
    {
      id: "accident",
      cat: "Worker accidents",
      tags: ["construction", "reputation"],
      when: (s) => anyProject(s, "construction").length > 0,
      weight: (s) => 3 + (s.safetySpend ? 0 : 3),
      build: (s, rng, fx) => {
        const p = rng.pick(anyProject(s, "construction"));
        const fatal = rng.chance(0.35);
        return {
          head: fatal ? "A worker has died on your site" : "A worker has fallen from the third floor",
          body: fatal ? `A barbender from Odisha, twenty-six years old, fell from the fourth-floor edge at ${p.name} at about eleven this morning. There was no edge protection. He was dead before the ambulance came.

His family is in Ganjam district. The labour contractor says he has no papers for the man.` : `A mason fell from the third-floor shuttering at ${p.name}. He is in Gandhi Hospital with a fractured pelvis and will not work again this year. There was no safety net.

The labour inspector has been informed by somebody.`,
          choices: [
            {
              label: "Pay the family properly and above what is asked",
              hint: "Costs real money. Buys something you cannot buy any other way.",
              do: ({ fx: fx2 }) => {
                fx2.cash(-fx2.byScale(fatal ? K(6) : K(2)));
                fx2.rel("contractors", 12);
                fx2.rel("community", 8);
                fx2.rep(fatal ? -2 : 0);
                fx2.news("You paid the family without being asked twice. The site knows.");
              }
            },
            {
              label: "Pay the statutory minimum through the contractor",
              hint: "Cheap, legal, and the site notices.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.cash(-fx2.byScale(fatal ? K(1.5) : K(0.4)));
                fx2.rel("contractors", -10);
                fx2.rep(-3);
                if (rng2.chance(0.4)) {
                  fx2.news("The labour inspector filed a case. It will follow you.");
                  fx2.cash(-fx2.scaled(K(2)));
                }
              }
            },
            {
              label: "Invest in site safety across all projects",
              hint: "Ongoing cost. Reduces this event permanently.",
              do: ({ fx: fx2, s: s2 }) => {
                fx2.cash(-fx2.byScale(fatal ? K(6) : K(2)));
                s2.safetySpend = true;
                fx2.rel("contractors", 10);
                fx2.rep(3);
                fx2.news("You put nets, helmets and edge protection on every site. It costs about one per cent of build cost, forever.");
              }
            }
          ]
        };
      }
    },
    {
      id: "quality_defect",
      cat: "Poor construction quality",
      tags: ["construction", "reputation"],
      when: (s) => s.assets.length + s.soldUnits > 0,
      weight: (s) => 2 + (1 - s.avgQuality) * 10,
      build: (s, rng, fx) => ({
        head: "Seepage. Everywhere.",
        body: `Two monsoons after handover, buyers in one of your completed buildings have formed an association. Their letter lists forty-one defects. The serious ones are structural: honeycombing in two columns, and water entering through the terrace at every junction.

One of them is a journalist's brother-in-law.`,
        choices: [
          {
            label: "Repair everything at your cost, publicly",
            hint: "Expensive. The single best reputation purchase available.",
            do: ({ fx: fx2 }) => {
              fx2.cash(-fx2.byScale(K(9)));
              fx2.rep(8);
              fx2.news("You repaired every defect and paid for it yourself. Buyers noticed. So did the market.");
            }
          },
          {
            label: "Repair the structural items only",
            hint: "Reasonable. Half-satisfies everyone.",
            do: ({ fx: fx2 }) => {
              fx2.cash(-fx2.byScale(K(3.5)));
              fx2.rep(-1);
            }
          },
          {
            label: "Refer them to the contractor and stop replying",
            hint: "Free today.",
            do: ({ fx: fx2, rng: rng2 }) => {
              fx2.rep(-5);
              if (rng2.chance(0.4)) {
                fx2.news("The association went to the press. It ran on page three of the Deccan Chronicle.");
                fx2.rep(-3);
              }
            }
          }
        ]
      })
    },
    // ---------------------------------------------------------------- rental & tenants
    {
      id: "anchor_tenant",
      cat: "Opportunity",
      tags: ["rental", "opportunity"],
      when: (s) => s.month > 46 && s.assets.some((a) => a.use === "office" && a.occupancy < 0.9),
      weight: (s) => s.flags.HITEC_LIVE ? 8 : 2,
      build: (s, rng, fx) => fx.anchorTenantOffer(rng)
    },
    {
      id: "tenant_default",
      cat: "Tenant defaults",
      tags: ["rental"],
      when: (s) => leased(s).length > 0,
      weight: (s) => 3 + leased(s).length * 0.4 + (s.macro.demand < 0.8 ? 5 : 0),
      build: (s, rng, fx) => {
        const a = rng.pick(leased(s));
        return {
          head: "A tenant has stopped paying",
          body: `Your largest tenant at ${a.name} has not paid rent for three months. The company has run into trouble of its own. They want a six-month rent holiday and a twenty per cent reduction thereafter, and they point out, correctly, that finding a replacement in this market will take you longer than that.

They are still occupying.`,
          choices: [
            {
              label: "Renegotiate: holiday plus reduction",
              hint: "Keeps the building occupied and the valuation intact.",
              do: ({ fx: fx2 }) => {
                fx2.rentCut(a.id, 0.2, 6);
                fx2.news("Rent reset. Your net operating income takes the hit, but the space is not empty.");
              }
            },
            {
              label: "Enforce the lease and evict",
              hint: "Under the Rent Control Act this takes years, and the space sits idle meanwhile.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.vacate(a.id);
                fx2.cash(-fx2.byScale(K(2)));
                if (rng2.chance(0.5)) fx2.news("The eviction suit is admitted. It will be heard, at the earliest, in three years.");
              }
            },
            {
              label: "Encash the security deposit and wait",
              hint: "Buys a few months. Solves nothing.",
              do: ({ fx: fx2 }) => {
                fx2.cash(a.deposit * 0.5);
                fx2.rentCut(a.id, 0.1, 3);
              }
            }
          ]
        };
      }
    },
    {
      id: "vacancy",
      cat: "Vacancy",
      tags: ["rental"],
      when: (s) => s.assets.length > 0 && s.macro.demand < 0.95,
      weight: (s) => 4 + (1 - s.macro.demand) * 8,
      build: (s, rng, fx) => ({
        head: "Your buildings are emptying",
        body: `Two leases have expired without renewal and the enquiries have stopped. Brokers say occupiers are asking for nine months rent free and fit-out contributions. Somebody down the road is quoting fifteen per cent below your rate for better space.

An empty floor costs you maintenance, tax and interest every single month.`,
        choices: [
          {
            label: "Cut asking rents to market and fill the space",
            hint: "Lower income, better occupancy, lower valuation.",
            do: ({ fx: fx2 }) => {
              fx2.marketRents(-0.15);
              fx2.fillVacancy(0.5);
            }
          },
          {
            label: "Hold rents and wait for the cycle",
            hint: "Protects headline rent and your valuation. Bleeds cash.",
            do: ({ fx: fx2 }) => {
              fx2.news("You held your rents. The floors stayed empty.");
            }
          },
          {
            label: "Offer long rent-free periods instead of cutting rent",
            hint: "Keeps headline rent for the valuers. Everyone does it.",
            do: ({ fx: fx2 }) => {
              fx2.fillVacancy(0.35);
              fx2.cash(-fx2.byScale(K(3)));
            }
          }
        ]
      })
    },
    // ---------------------------------------------------------------- people & governance
    {
      id: "fraud",
      cat: "Employee fraud",
      tags: ["people", "governance"],
      when: (s) => s.staff.length >= 3 && !s.flags.internalAudit,
      weight: (s) => 2 + s.staff.length * 0.35,
      build: (s, rng, fx) => {
        const victim = rng.pick(s.staff);
        const amt = fx.byScale(K(rng.int(3, 14)));
        return {
          head: "The purchase numbers do not add up",
          body: `Your accountant flags it almost by accident. Cement consumption on two sites is running twenty-two per cent above theoretical. Deliveries are being signed for and not arriving.

The trail runs through ${victim.name}, your ${victim.roleName.toLowerCase()}, who has been with you for ${Math.max(1, Math.round((s.month - victim.joined) / 12))} years. Your best estimate of the loss is ${money(amt)}.`,
          choices: [
            {
              label: "Dismiss him and file a police complaint",
              hint: "Correct. Public. Everyone in the trade will know.",
              do: ({ fx: fx2 }) => {
                fx2.cash(-amt);
                fx2.fire(victim.id);
                fx2.rep(2);
                fx2.rel("associations", 4);
                fx2.news(`${victim.name} was dismissed and a complaint filed.`);
              }
            },
            {
              label: "Dismiss him quietly, recover what you can",
              hint: "Discreet. He will do it to someone else.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.cash(-amt * rng2.range(0.4, 0.8));
                fx2.fire(victim.id);
              }
            },
            {
              label: "Build an internal audit function",
              hint: "Costs a salary forever. Stops this class of loss permanently.",
              do: ({ fx: fx2, s: s2 }) => {
                fx2.cash(-amt);
                fx2.fire(victim.id);
                fx2.hireRole("audit");
                s2.flags.internalAudit = true;
                fx2.news("You hired a head of internal audit. It should have happened two years ago.");
              }
            }
          ]
        };
      }
    },
    {
      id: "poach",
      cat: "Competitor attacks",
      tags: ["people"],
      when: (s) => s.staff.some((x) => x.skill > 60),
      weight: (s) => 3 + s.reputation / 20,
      build: (s, rng, fx) => {
        const t = rng.pick(s.staff.filter((x) => x.skill > 60));
        const rival = rng.pick(s.competitors).name;
        return {
          head: `${rival} has made an offer to your project manager`,
          body: `${t.name} tells you himself, which is a good sign. ${rival} has offered him roughly forty per cent more, a car, and the title of General Manager.

He is running two of your live projects. He has been with you since they were drawings.`,
          choices: [
            {
              label: "Match the offer and give him equity in future projects",
              hint: "Expensive. Buys loyalty that money alone does not.",
              do: ({ fx: fx2 }) => {
                fx2.raise(t.id, 0.45);
                fx2.loyalty(t.id, 25);
                fx2.news(`${t.name} stayed. He will not be cheap again.`);
              }
            },
            {
              label: "Match the salary only",
              hint: "Adequate.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.raise(t.id, 0.4);
                fx2.loyalty(t.id, 8);
                if (rng2.chance(0.3)) {
                  fx2.quit(t.id);
                  fx2.news(`${t.name} left anyway, six weeks later.`);
                }
              }
            },
            {
              label: "Let him go",
              hint: "Saves money. Costs continuity, and he knows your costings.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.quit(t.id);
                for (const p of anyProject(s, "construction")) {
                  fx2.delay(p.id, rng2.int(1, 3));
                }
                fx2.news(`${t.name} joined ${rival}. He took your subcontractor rates with him.`);
              }
            }
          ]
        };
      }
    },
    {
      id: "partner_dispute",
      cat: "Partner disputes",
      tags: ["governance"],
      when: (s) => s.jvs.length > 0,
      weight: (s) => 4 + s.jvs.length * 2,
      build: (s, rng, fx) => {
        const jv = rng.pick(s.jvs);
        return {
          head: `Your partner in ${jv.name} wants out \u2014 on his terms`,
          body: `${jv.partner} has decided that the sharing ratio agreed three years ago no longer reflects what he contributed. He has stopped signing cheques on the project account and has written to the bank saying that disbursements need his counter-signature.

The project cannot proceed while this is unresolved.`,
          choices: [
            {
              label: "Buy him out at his price",
              hint: "Expensive, immediate, clean.",
              do: ({ fx: fx2 }) => {
                fx2.buyoutJV(jv.id, 1.35);
              }
            },
            {
              label: "Negotiate hard, accept delay",
              hint: "Cheaper. Costs months.",
              do: ({ fx: fx2, rng: rng2 }) => {
                if (rng2.chance(0.55)) {
                  fx2.buyoutJV(jv.id, 1.05);
                  fx2.news("He settled near book value.");
                } else {
                  fx2.jvFreeze(jv.id, rng2.int(4, 10));
                  fx2.news("Talks broke down. The project is frozen.");
                }
              }
            },
            {
              label: "Go to arbitration",
              hint: "Correct process. Two to four years.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.jvFreeze(jv.id, rng2.int(12, 30));
                fx2.cash(-fx2.byScale(K(6)));
                fx2.rep(-1);
              }
            }
          ]
        };
      }
    },
    // ---------------------------------------------------------------- politics, media, community
    {
      id: "political_donation",
      cat: "Political instability",
      tags: ["politics"],
      when: (s) => s.month > 30 && [46, 57, 112, 158, 233, 287].some((m) => Math.abs(s.month - m) < 8),
      weight: () => 7,
      build: (s, rng, fx) => ({
        head: "An invitation you cannot ignore",
        body: `A fundraising dinner. The invitation comes through the builders' association and the amount expected is not printed anywhere, but everybody at your level is contributing between ${money(fx.byScale(K(2)))} and ${money(fx.byScale(K(10)))}.

It is lawful. It is also unmistakably transactional, and it will be remembered either way.`,
        choices: [
          {
            label: `Contribute generously (${money(fx.byScale(K(10)))})`,
            hint: "Legal political contribution. Buys access, not outcomes.",
            do: ({ fx: fx2 }) => {
              fx2.cash(-fx2.byScale(K(10)));
              fx2.rel("politicians", 16);
              fx2.rel("bureaucrats", 5);
              fx2.rep(-1);
            }
          },
          {
            label: `Contribute modestly (${money(fx.byScale(K(2)))})`,
            hint: "Present without being conspicuous.",
            do: ({ fx: fx2 }) => {
              fx2.cash(-fx2.byScale(K(2)));
              fx2.rel("politicians", 6);
            }
          },
          {
            label: "Decline and stay out of it",
            hint: "Principled. Also noted.",
            do: ({ fx: fx2, rng: rng2 }) => {
              fx2.rel("politicians", -8);
              if (rng2.chance(0.3)) {
                fx2.rep(3);
                fx2.news("Your absence was noticed, and one journalist noticed it approvingly.");
              }
            }
          }
        ]
      })
    },
    {
      id: "community_protest",
      cat: "Public sentiment",
      tags: ["community"],
      when: (s) => anyProject(s).length > 0,
      weight: (s) => 3 + (s.reputation < 20 ? 3 : 0),
      build: (s, rng, fx) => {
        const p = rng.pick(anyProject(s));
        return {
          head: `Residents are blocking the gate at ${p.name}`,
          body: `Forty people from the colony behind the site, mostly women, are sitting at your gate. Their complaints are that your excavation has cracked two houses, that your tippers run at night through a lane where children play, and that nobody from your office has ever spoken to them.

A local corporator has arrived and is being photographed with them.`,
          choices: [
            {
              label: "Meet them, repair the houses, restrict night movements",
              hint: "Costs money and programme. Ends it properly.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.cash(-fx2.byScale(K(3)));
                fx2.delay(p.id, 1);
                fx2.rel("community", 18);
                fx2.rep(4);
              }
            },
            {
              label: "Get a police protection order and continue",
              hint: "Works now. Guarantees the next problem is worse.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.cash(-fx2.byScale(K(1)));
                fx2.rel("community", -20);
                fx2.rep(-3);
                if (rng2.chance(0.35)) {
                  fx2.delay(p.id, rng2.int(2, 5));
                  fx2.news("The corporator got a stop-work notice issued. It took months to lift.");
                }
              }
            },
            {
              label: "Route it through the corporator quietly",
              hint: "Pragmatic. He now has a hold on you.",
              do: ({ fx: fx2 }) => {
                fx2.cash(-fx2.byScale(K(2)));
                fx2.rel("politicians", 8);
                fx2.rel("community", 4);
                fx2.rep(-1);
              }
            }
          ]
        };
      }
    },
    {
      id: "press_story",
      cat: "Reputation crises",
      tags: ["media"],
      when: (s) => s.reputation > 25 || s.netWorth > CR(20),
      weight: (s) => 3 + (s.reputation < 30 ? 3 : 0) + (s.flags.deviationFlagged ? 4 : 0),
      build: (s, rng, fx) => ({
        head: "A reporter is asking questions",
        body: `A journalist from a Telugu daily has been to two of your sites and to the municipal office. She is writing about deviations from sanctioned plans across the city and your name is on her list, along with six others.

She would like a comment. Your liaison manager thinks you should not give one.`,
        choices: [
          {
            label: "Speak to her on the record, honestly",
            hint: "Risky. Journalists remember who took the call.",
            do: ({ fx: fx2, rng: rng2 }) => {
              if (rng2.chance(0.6)) {
                fx2.rel("journalists", 16);
                fx2.rep(4);
                fx2.news("The article ran. You came out of it better than the others, largely because you answered.");
              } else {
                fx2.rep(-2);
                fx2.rel("journalists", 6);
                fx2.news("The article ran and quoted you accurately, which was the problem.");
              }
            }
          },
          {
            label: "No comment",
            hint: "Safe. Guarantees the unflattering version.",
            do: ({ fx: fx2 }) => {
              fx2.rep(-2);
              fx2.rel("journalists", -4);
            }
          },
          {
            label: "Have the association issue a joint industry statement",
            hint: "Dilutes you into the crowd.",
            do: ({ fx: fx2 }) => {
              fx2.rel("associations", 8);
              fx2.rep(-1);
            }
          }
        ]
      })
    },
    // ---------------------------------------------------------------- opportunities
    {
      id: "distress_buy",
      cat: "Opportunity",
      tags: ["opportunity", "land"],
      when: (s) => s.macro.demand < 0.85 && s.cash > K(20),
      weight: (s) => 6 + (1 - s.macro.demand) * 10,
      build: (s, rng, fx) => fx.distressOffer(rng)
    },
    {
      id: "jv_offer",
      cat: "Opportunity",
      tags: ["opportunity"],
      when: (s) => s.reputation > 25 && s.month > 36,
      weight: (s) => 4 + s.reputation / 15,
      build: (s, rng, fx) => fx.jvOffer(rng)
    },
    {
      id: "institutional_capital",
      cat: "Opportunity",
      tags: ["finance", "opportunity"],
      when: (s) => s.month > 120 && s.netWorth > CR(60) && s.reputation > 45,
      weight: (s) => 5,
      build: (s, rng, fx) => fx.institutionalOffer(rng)
    },
    {
      id: "sector_entry",
      cat: "Opportunity",
      tags: ["diversify"],
      when: (s) => s.netWorth > CR(400) && s.month > 150,
      weight: () => 5,
      build: (s, rng, fx) => fx.diversifyOffer(rng)
    },
    // ---------------------------------------------------------------- personal
    {
      id: "sister_marriage",
      cat: "Personal",
      tags: ["family"],
      when: (s) => s.month >= 26 && !s.flags.padmaMarried,
      weight: (s) => s.month > 40 ? 14 : 6,
      build: (s, rng, fx) => {
        const ask = Math.max(fx.scaled(K(2)), fx.byScale(K(5)));
        return {
          head: "Padma\u2019s marriage has been fixed",
          body: `The family has settled on a boy from Nizamabad, an engineer at BHEL. The wedding is in four months.

Your father does not ask you for money. He simply mentions, twice, what the mandapam costs and what the boy's family is expecting in gold. The figure being discussed comes to about ${money(ask)}.

The money is in your business account, working.`,
          choices: [
            {
              label: "Pay in full",
              hint: "Takes the cash out of the business at the worst possible time.",
              do: ({ fx: fx2, s: s2 }) => {
                fx2.cash(-ask);
                s2.flags.padmaMarried = true;
                fx2.rel("family", 25);
                fx2.rep(3);
                fx2.news("You paid for the wedding in full. Your father did not say anything, which was how he said it.");
              }
            },
            {
              label: "Pay half now, half after the next sale",
              hint: "Sensible. Slightly humiliating for everyone.",
              do: ({ fx: fx2, s: s2 }) => {
                fx2.cash(-ask * 0.5);
                s2.flags.padmaMarried = true;
                s2.flags.familyDebt = ask * 0.5;
                fx2.rel("family", 6);
              }
            },
            {
              label: "Borrow for it rather than take money out of the business",
              hint: "Keeps working capital. Adds interest to a wedding.",
              do: ({ fx: fx2, s: s2 }) => {
                fx2.privateLoan(ask, 0.28, 24);
                s2.flags.padmaMarried = true;
                fx2.rel("family", 20);
              }
            }
          ]
        };
      }
    },
    {
      id: "father_finds_out",
      cat: "Personal",
      tags: ["family"],
      when: (s) => s.flags.shopPledged && !s.flags.fatherKnows,
      weight: () => 8,
      build: (s, rng, fx) => ({
        head: "Your father received a letter from the bank",
        body: `It is a routine annual confirmation of security held. He read it at the shop counter, in front of two customers.

He has not shouted. He has been quiet since Tuesday, which is considerably worse.`,
        choices: [
          {
            label: "Tell him everything, including the jewel loan",
            hint: "Painful. Ends the lying.",
            do: ({ fx: fx2, s: s2 }) => {
              s2.flags.fatherKnows = true;
              fx2.rel("family", 12);
              fx2.rep(1);
              fx2.news("You told him all of it. He said one sentence: repay your mother first.");
            }
          },
          {
            label: "Redeem the pledge immediately",
            hint: "Costs cash and borrowing capacity.",
            do: ({ fx: fx2, s: s2 }) => {
              s2.flags.shopPledged = false;
              s2.flags.fatherKnows = true;
              fx2.rel("banks", -10);
              fx2.rel("family", 18);
            }
          },
          {
            label: "Explain it as temporary and move on",
            hint: "It is not temporary.",
            do: ({ fx: fx2, s: s2 }) => {
              s2.flags.fatherKnows = true;
              fx2.rel("family", -10);
            }
          }
        ]
      })
    },
    {
      id: "health",
      cat: "Personal",
      tags: ["family"],
      when: (s) => s.month > 96 && s.stress > 60,
      weight: (s) => (s.stress - 55) / 6,
      build: (s, rng, fx) => ({
        head: "The doctor is not asking, he is telling",
        body: `Chest pain on a site visit in Kondapur. It was not a heart attack, but the cardiologist at Apollo says your blood pressure is 168 over 104 and that he has seen exactly this profile in exactly this trade for twenty years.

He wants you to take a month off and delegate.`,
        choices: [
          {
            label: "Take the month. Hand over to your senior people",
            hint: "Costs momentum. Buys years.",
            do: ({ fx: fx2, s: s2 }) => {
              s2.stress = Math.max(10, s2.stress - 40);
              fx2.slowMonth(1);
              fx2.news("You took a month off. The company did not collapse, which told you something.");
            }
          },
          {
            label: "Hire a Chief Operating Officer",
            hint: "Permanent salary. Permanent relief.",
            do: ({ fx: fx2, s: s2 }) => {
              fx2.hireRole("coo");
              s2.stress = Math.max(10, s2.stress - 30);
            }
          },
          {
            label: "Ignore it",
            hint: "It will come back.",
            do: ({ fx: fx2, s: s2 }) => {
              s2.stress += 10;
              s2.flags.healthWarning = (s2.flags.healthWarning || 0) + 1;
            }
          }
        ]
      })
    },
    // ---------------------------------------------------------------- crises
    {
      id: "crash_margin_call",
      cat: "Market crashes",
      tags: ["crisis"],
      when: (s) => s.crashActive && s.ratios.debtToAssets > 0.45,
      weight: () => 14,
      build: (s, rng, fx) => ({
        head: "Everything is for sale and nobody is buying",
        body: `Registrations across the city are down seventy per cent. Two developers you know have handed sites back to their financiers. Your unsold inventory is being valued by your own bank at figures you would not have accepted a year ago.

Your interest bill this year is ${money(s.interestAnnual)}. Your collections are a fraction of that.`,
        choices: [
          {
            label: "Sell assets fast at whatever they fetch",
            hint: "Survive. Destroy years of value.",
            do: ({ fx: fx2 }) => {
              fx2.fireSale(0.68);
              fx2.rep(-2);
            }
          },
          {
            label: "Bring in an equity partner at a punishing valuation",
            hint: "Dilution, but the company lives.",
            do: ({ fx: fx2 }) => {
              fx2.emergencyEquity(0.45);
            }
          },
          {
            label: "Stop all construction and preserve cash",
            hint: "Buyers who paid advances will sue. RERA does not exist yet, but civil courts do.",
            do: ({ fx: fx2, rng: rng2, s: s2 }) => {
              for (const p of anyProject(s2, "construction")) fx2.delay(p.id, rng2.int(6, 14));
              fx2.rep(-4);
              fx2.news("All sites stopped. You are now a defendant in several suits you have not yet been served with.");
            }
          },
          {
            label: "Borrow privately and trade through it",
            hint: "The bet that has ended more Indian developers than any other.",
            do: ({ fx: fx2, s: s2 }) => {
              fx2.privateLoan(Math.max(CR(1), s2.debt * 0.3), 0.4, 18);
            }
          }
        ]
      })
    },
    {
      id: "insurance_claim",
      cat: "Insurance claims",
      tags: ["construction"],
      when: (s) => anyProject(s, "construction").length > 0,
      weight: () => 2,
      build: (s, rng, fx) => {
        const p = rng.pick(anyProject(s, "construction"));
        return {
          head: "Fire in the material store",
          body: `A short circuit in the temporary wiring at ${p.name}. Shuttering plywood, three hundred bags of cement and the site office are gone. Nobody was hurt.

Whether you are covered depends on whether anybody bought a contractors all-risk policy, which you may or may not remember doing.`,
          choices: [
            {
              label: "File the claim and take insurance seriously from now on",
              hint: "Adds a small permanent cost. Removes a class of catastrophe.",
              do: ({ fx: fx2, s: s2, rng: rng2 }) => {
                const covered = s2.flags.insured || rng2.chance(0.35);
                fx2.overrun(p.id, covered ? 0.015 : 0.05);
                fx2.delay(p.id, 1);
                s2.flags.insured = true;
                fx2.news(covered ? "The claim was largely settled. You now insure everything." : "You were not covered. You now insure everything.");
              }
            },
            {
              label: "Absorb it and move on",
              hint: "Cheap today.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.overrun(p.id, 0.05);
                fx2.delay(p.id, rng2.int(1, 2));
              }
            }
          ]
        };
      }
    },
    {
      id: "labour_strike",
      cat: "Labour problems",
      tags: ["construction"],
      when: (s) => anyProject(s, "construction").length > 1,
      weight: (s) => 3 + (s.month > 200 ? 2 : 0),
      build: (s, rng, fx) => ({
        head: "The labour has downed tools across your sites",
        body: `Word came from the Odisha and Bihar gangs together, which almost never happens. They want a rate revision, weekly rather than fortnightly payment, and drinking water and toilets on site.

The last two are things you should already have provided.`,
        choices: [
          {
            label: "Concede the rate and fix the facilities",
            hint: "Costs a few per cent. Ends it in three days.",
            do: ({ fx: fx2, s: s2 }) => {
              for (const p of anyProject(s2, "construction")) fx2.overrun(p.id, 0.03);
              fx2.rel("contractors", 12);
              fx2.rep(2);
            }
          },
          {
            label: "Fix facilities, hold the rate",
            hint: "Partial. Might hold.",
            do: ({ fx: fx2, s: s2, rng: rng2 }) => {
              for (const p of anyProject(s2, "construction")) {
                fx2.overrun(p.id, 0.012);
                if (rng2.chance(0.45)) fx2.delay(p.id, rng2.int(1, 3));
              }
            }
          },
          {
            label: "Bring in a different labour contractor",
            hint: "Breaks the strike. Breaks trust with everyone.",
            do: ({ fx: fx2, s: s2, rng: rng2 }) => {
              for (const p of anyProject(s2, "construction")) {
                fx2.delay(p.id, rng2.int(1, 3));
                fx2.quality(p.id, -0.05);
              }
              fx2.rel("contractors", -18);
            }
          }
        ]
      })
    },
    {
      id: "env_objection",
      cat: "Environmental issues",
      tags: ["approvals"],
      when: (s) => anyProject(s).some((p) => p.sqFt > 8e4) || s.parcels.some((p) => p.owned && p.defects.includes("CATCHMENT_ZONE")),
      weight: (s) => s.month > 120 ? 5 : 2,
      build: (s, rng, fx) => {
        const p = anyProject(s).find((x) => x.sqFt > 8e4) || anyProject(s)[0];
        if (!p) return null;
        return {
          head: "Environmental clearance objection",
          body: `A petition has been filed objecting to ${p.name} on grounds of groundwater extraction, tree felling and the absence of a sewage treatment plant. Two of the three objections are substantially correct.

Work can continue, for now.`,
          choices: [
            {
              label: "Redesign with an STP, rainwater harvesting and tree transplantation",
              hint: "Real cost, real compliance, defensible forever.",
              do: ({ fx: fx2 }) => {
                fx2.overrun(p.id, 0.05);
                fx2.delay(p.id, 2);
                fx2.rep(5);
                fx2.rel("community", 10);
              }
            },
            {
              label: "Contest the petition",
              hint: "Legal fees and uncertainty.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.cash(-fx2.byScale(K(5)));
                if (rng2.chance(0.5)) {
                  fx2.news("Petition dismissed.");
                } else {
                  fx2.delay(p.id, rng2.int(4, 12));
                  fx2.rep(-2);
                }
              }
            }
          ]
        };
      }
    },
    {
      id: "vendor_fraud",
      cat: "Vendor fraud",
      tags: ["construction"],
      when: (s) => anyProject(s, "construction").length > 0 && !s.flags.internalAudit,
      weight: () => 3,
      build: (s, rng, fx) => {
        const amt = fx.byScale(K(rng.int(2, 9)));
        return {
          head: "The steel supplier took the advance and vanished",
          body: `You paid ${money(amt)} against a bulk order at a rate twelve per cent below the market. The godown in Balanagar is shuttered. The telephone is disconnected. Two other builders in Kukatpally have the same story and the same amount.

The rate should have told you.`,
          choices: [
            {
              label: "File a cheating case and write it off",
              hint: "You will not see the money.",
              do: ({ fx: fx2, rng: rng2 }) => {
                fx2.cash(-amt);
                fx2.skill("finance", 2);
                if (rng2.chance(0.15)) {
                  fx2.cash(amt * 0.3);
                  fx2.news("You recovered about a third, three years later.");
                }
              }
            },
            {
              label: "Institute a procurement policy: no advances without bank guarantee",
              hint: "Slower purchasing. This never happens again.",
              do: ({ fx: fx2, s: s2 }) => {
                fx2.cash(-amt);
                s2.flags.procurementPolicy = true;
                fx2.skill("finance", 4);
                fx2.news("Advances now require a bank guarantee. Your buying is slower and three per cent dearer.");
              }
            }
          ]
        };
      }
    },
    {
      id: "infra_announcement",
      cat: "Infrastructure delays",
      tags: ["land"],
      when: (s) => s.month > 18,
      weight: () => 5,
      build: (s, rng, fx) => fx.infraRumour(rng)
    },
    {
      id: "competitor_undercut",
      cat: "Competitor attacks",
      tags: ["competition"],
      when: (s) => s.inventory.length > 0,
      weight: (s) => 4 + s.inventory.length * 0.3,
      build: (s, rng, fx) => {
        const rival = rng.pick(s.competitors);
        return {
          head: `${rival.name} has launched next door at a lower price`,
          body: `Two hundred metres from your unsold building, ${rival.name} has launched at roughly eleven per cent below your rate, with a booking scheme of ten per cent down and nothing until possession.

Your site enquiries halved in a fortnight.`,
          choices: [
            {
              label: "Match the price",
              hint: "Moves inventory, costs margin.",
              do: ({ fx: fx2 }) => {
                fx2.repriceInventory(-0.1);
                fx2.absorption(0.5);
              }
            },
            {
              label: "Compete on specification and completion date instead",
              hint: "Costs money, protects price, works only if buyers believe you.",
              do: ({ fx: fx2, s: s2, rng: rng2 }) => {
                fx2.cash(-fx2.byScale(K(4)));
                if (s2.reputation > 40 || rng2.chance(0.4)) {
                  fx2.absorption(0.3);
                  fx2.rep(2);
                } else {
                  fx2.absorption(-0.1);
                }
              }
            },
            {
              label: "Hold price and wait him out",
              hint: "He may be funding this with buyer advances. He may also outlast you.",
              do: ({ fx: fx2, rng: rng2 }) => {
                if (rng2.chance(0.35)) {
                  fx2.news(`${rival.name} ran out of money and stopped work. His buyers came to you.`);
                  fx2.absorption(0.4);
                  fx2.rep(3);
                } else {
                  fx2.absorption(-0.25);
                }
              }
            }
          ]
        };
      }
    },
    {
      id: "tax_assessment",
      cat: "Taxation",
      tags: ["finance"],
      when: (s) => s.month > 48 && s.revenueYTD > K(50),
      weight: () => 4,
      build: (s, rng, fx) => {
        const demand = fx.byScale(K(rng.int(4, 20)));
        return {
          head: "Income tax assessment order",
          body: `The assessing officer has disallowed a portion of your project cost as unverifiable, added back cash payments above the permitted limit, and raised a demand of ${money(demand)} including interest.

Your chartered accountant says roughly sixty per cent of it will not survive appeal, and that the appeal will take four years.`,
          choices: [
            {
              label: "Pay under protest and appeal",
              hint: "Cash out now, likely refund much later.",
              do: ({ fx: fx2, s: s2 }) => {
                fx2.cash(-demand);
                s2.pendingRefund = (s2.pendingRefund || 0) + demand * 0.55;
              }
            },
            {
              label: "Appeal without paying, seek stay",
              hint: "Preserves cash. Risk of coercive recovery.",
              do: ({ fx: fx2, rng: rng2 }) => {
                if (rng2.chance(0.6)) {
                  fx2.cash(-demand * 0.2);
                  fx2.news("Stay granted on twenty per cent deposit.");
                } else {
                  fx2.cash(-demand);
                  fx2.rel("banks", -6);
                  fx2.news("The department attached your bank account for eleven days.");
                }
              }
            },
            {
              label: "Clean up the accounting entirely, going forward",
              hint: "Higher tax paid honestly. Bankable audited accounts. Institutional money becomes possible.",
              do: ({ fx: fx2, s: s2 }) => {
                fx2.cash(-demand);
                s2.flags.cleanBooks = true;
                fx2.rep(6);
                fx2.rel("banks", 12);
                fx2.news("You moved the business fully onto audited, cheque-only accounting. Your tax bill went up permanently and so did your borrowing capacity.");
              }
            }
          ]
        };
      }
    },
    {
      id: "recession_squeeze",
      cat: "Economic recessions",
      tags: ["crisis"],
      when: (s) => s.macro.gdp < 5 && s.month > 12,
      weight: () => 5,
      build: (s, rng, fx) => ({
        head: "The market has simply stopped",
        body: `No enquiries. Brokers are not returning calls because there is nothing to tell you. The buyers who were negotiating last quarter have decided to wait and see, and they are telling each other so.

Your carrying costs do not wait and see.`,
        choices: [
          {
            label: "Cut overheads hard",
            hint: "Sack staff, close the second office. Cheap survival, expensive rebuild.",
            do: ({ fx: fx2 }) => {
              fx2.cutOverheads(0.35);
              fx2.rep(-1);
            }
          },
          {
            label: "Keep the team, cut your own drawings to zero",
            hint: "Preserves capability. Burns your personal cash.",
            do: ({ fx: fx2, s: s2 }) => {
              s2.flags.founderSalaryZero = true;
              fx2.rel("associations", 4);
              fx2.loyaltyAll(12);
            }
          },
          {
            label: "Use the downturn to buy land cheap",
            hint: "The correct move, if you can fund it.",
            do: ({ fx: fx2, rng: rng2 }) => {
              fx2.discountedOffers(rng2, 0.7);
              fx2.news("You told your brokers you were buying, not selling. Word spread quickly.");
            }
          }
        ]
      })
    },
    {
      id: "bad_bet",
      cat: "Bad investment decisions",
      tags: ["land"],
      when: (s) => ownedLand(s).length > 2,
      weight: () => 3,
      build: (s, rng, fx) => {
        const p = rng.pick(ownedLand(s));
        return {
          head: `The road is not coming to ${p.label}`,
          body: `The alignment has been published. It runs three and a half kilometres north of your land, along a different set of survey numbers, through property belonging to people considerably better connected than you.

What you bought as a corridor play is now simply a field.`,
          choices: [
            {
              label: "Sell now and take the loss",
              hint: "Frees capital, admits the error.",
              do: ({ fx: fx2 }) => {
                fx2.sellParcel(p.id, 0.75);
                fx2.skill("realestate", 3);
              }
            },
            {
              label: "Hold it \u2014 the city will reach it eventually",
              hint: "It might. In eleven years.",
              do: ({ fx: fx2, s: s2 }) => {
                const par = s2.parcels.find((x) => x.id === p.id);
                if (par) par.stigma = 0.75;
              }
            },
            {
              label: "Put a low-value use on it now: godowns",
              hint: "Turns dead land into small income.",
              do: ({ fx: fx2 }) => {
                fx2.suggestBuild(p.id, "godown");
              }
            }
          ]
        };
      }
    },
    {
      id: "maintenance_wall",
      cat: "Maintenance expenses",
      tags: ["rental"],
      when: (s) => s.assets.some((a) => s.month - a.completed > 96),
      weight: () => 4,
      build: (s, rng, fx) => {
        const a = rng.pick(s.assets.filter((x) => s.month - x.completed > 96));
        const cost = Math.round(a.sqFt * fx.costIndex() * 55);
        return {
          head: `${a.name} needs serious money spent on it`,
          body: `Eight years in. Lifts at end of life, terrace waterproofing gone, the facade streaked, and the diesel generator running at half capacity. The building still lets, but at a discount to the newer stock down the road.

A proper refurbishment is about ${money(cost)}.`,
          choices: [
            {
              label: "Refurbish fully",
              hint: "Restores rent and value.",
              do: ({ fx: fx2 }) => {
                fx2.cash(-cost);
                fx2.upgradeAsset(a.id, 0.18);
              }
            },
            {
              label: "Patch the essentials only",
              hint: "Cheap. The building keeps sliding.",
              do: ({ fx: fx2 }) => {
                fx2.cash(-cost * 0.3);
                fx2.upgradeAsset(a.id, -0.05);
              }
            },
            {
              label: "Sell the building",
              hint: "Somebody else\u2019s problem, at a price that reflects it.",
              do: ({ fx: fx2 }) => {
                fx2.sellAsset(a.id, 0.88);
              }
            }
          ]
        };
      }
    }
  ];
  var EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

  // src/sim/market.js
  function macroAt(m) {
    const y = yearOf(m);
    const cur = MACRO[y] || MACRO[2020];
    const nxt = MACRO[y + 1] || cur;
    const t = m % 12 / 12;
    const blend = (k) => lerp(cur[k], nxt[k], t);
    const out = {
      year: y,
      cpi: cur.cpi,
      gdp: blend("gdp"),
      plr: blend("plr"),
      usd: blend("usd"),
      credit: blend("credit"),
      demand: blend("demand"),
      cpiIndex: lerp(CPI_INDEX[y], CPI_INDEX[y + 1] || CPI_INDEX[y] * 1.05, t),
      regime: regimeAt(m)
    };
    const shock = SHOCKS[m];
    if (shock) Object.assign(out, shock);
    return out;
  }
  var costIndex = (m) => anchorAt(COST_TRACK, m);
  var dutyRate = (m) => anchorAt(DUTY_TRACK, m);
  var salaryIndex = (m) => anchorAt(SALARY_TRACK, m);
  var wageIndex = (m) => anchorAt(WAGE_TRACK, m);
  function farFor(loc, m, flags) {
    const base = anchorAt(FAR_TRACK, m);
    if (loc.airportCap && !flags.AIRPORT_LIVE) return Math.min(base, FAR_AIRPORT);
    return base;
  }
  function landRate(locId, m, s) {
    const loc = BY_ID[locId];
    if (!loc) return 0;
    const base = loc.base * anchorAt(loc.track, m);
    const macro = s ? s.macro : macroAt(m);
    const yearAvgDemand = MACRO[yearOf(m)].demand;
    const cycle = clamp(1 + (macro.demand - yearAvgDemand) * 0.55, 0.6, 1.4);
    const wobble = s ? 1 + Math.sin((m + locId.length * 7) * 0.7) * 0.018 : 1;
    return base * cycle * wobble;
  }
  function rentRate(locId, use, m, flags = {}) {
    const loc = BY_ID[locId];
    if (!loc) return 0;
    const b = loc.rentBase[use];
    if (!b) return 0;
    if (use === "office" && loc.officeUnlock && !flags[loc.officeUnlock]) return 0;
    return b * anchorAt(RENT_TRACK[use], m);
  }
  function salePrice(locId, buildType, m, s) {
    const loc = BY_ID[locId];
    const bt = BUILD_TYPES[buildType];
    const land = landRate(locId, m, s);
    const far = farFor(loc, m, s ? s.flags : {});
    const landPerSqFt = land / (9 * far);
    const build = bt.cost * costIndex(m);
    const macro = s ? s.macro : macroAt(m);
    const margin = clamp(0.48 + (macro.demand - 1) * 0.5, -0.05, 0.95);
    const quality = 0.92 + bt.quality * 0.22;
    return (landPerSqFt + build) * (1 + margin) * quality;
  }
  function plotPrice(locId, layoutType, m, s) {
    const lt = LAYOUT_TYPES[layoutType];
    if (!lt) return 0;
    const raw = landRate(locId, m, s);
    const macro = s ? s.macro : macroAt(m);
    const speculative = clamp(0.55 + macro.demand * 0.55, 0.5, 1.75);
    const mult = lt.unapproved ? LAYOUT_TYPES.approved.plotMult * unapprovedPenalty(m).price : lt.plotMult;
    return raw * mult * speculative;
  }
  function plotAbsorption(locId, layoutType, askVsMarket, s) {
    const lt = LAYOUT_TYPES[layoutType];
    const loc = BY_ID[locId];
    const macro = s.macro;
    const base = 0.055 * (0.5 + loc.liquidity * 0.7);
    const cycle = Math.pow(clamp(macro.demand, 0.3, 2), 2);
    const price = Math.pow(clamp(1 / Math.max(0.5, askVsMarket), 0.3, 2.2), 1.9);
    const paper = lt.unapproved ? unapprovedPenalty(s.month).absorption : 1;
    const rep = 0.8 + clamp(s.reputation, 0, 100) / 170;
    const sales = s.staff.some((x) => x.impact === "sales") ? 1.25 : 1;
    return clamp(base * cycle * price * paper * rep * sales * (1 + s.absorptionBoost), 2e-3, 0.3);
  }
  function capRate(use, m, s) {
    const macro = s ? s.macro : macroAt(m);
    const base = anchorAt([
      { year: 1995, v: 0.135 },
      { year: 2e3, v: 0.125 },
      { year: 2004, v: 0.115 },
      { year: 2007, v: 0.095 },
      { year: 2009, v: 0.115 },
      { year: 2013, v: 0.105 },
      { year: 2016, v: 0.09 },
      { year: 2020, v: 0.078 }
    ], m);
    const useAdj = { office: 0, retail: 5e-3, res: 0.02, industrial: 0.012 }[use] || 0;
    const cyc = (1 - macro.demand) * 0.02;
    return clamp(base + useAdj + cyc, 0.055, 0.19);
  }
  function materialPrice(key, m) {
    const mat = MATERIALS[key];
    return mat.base * anchorAt(mat.track, m);
  }
  function wage(key, m) {
    return WAGES[key] * wageIndex(m);
  }
  function taxRate(kind, m) {
    return anchorAt(TAX_TRACK[kind], m);
  }
  function marketView(m, s) {
    return LOCALITIES.map((loc) => {
      const rate = landRate(loc.id, m, s);
      const prev = m >= 12 ? landRate(loc.id, m - 12, s) : rate;
      const level = intelLevel(s, loc.id);
      const shown = fuzzRate(s, loc.id, rate);
      const full = level === INTEL_KNOWN;
      return {
        id: loc.id,
        name: loc.name,
        zone: loc.zone,
        level,
        rate: shown.value,
        band: shown.band,
        trueRate: rate,
        yoy: full ? rate / prev - 1 : null,
        perAcre: shown.value === null ? null : shown.value * SQYD_PER_ACRE,
        resRent: full ? rentRate(loc.id, "res", m, s.flags) : null,
        officeRent: full ? rentRate(loc.id, "office", m, s.flags) : null,
        retailRent: full ? rentRate(loc.id, "retail", m, s.flags) : null,
        far: full ? farFor(loc, m, s.flags) : null,
        surveyCost: surveyCost(s, loc.id),
        liquidity: loc.liquidity,
        prestige: loc.prestige,
        desc: loc.desc,
        tags: loc.tags,
        obscure: level === INTEL_NONE
      };
    });
  }
  function personName(rng) {
    return `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`;
  }
  function rollDefects(loc, rng, discountPressure = 0) {
    const out = [];
    for (const [key, p] of Object.entries(loc.risk || {})) {
      if (rng.f() < p * (1 + discountPressure * 1.4)) out.push(key);
    }
    return out;
  }
  function makeLandOffer(m, s, rng, opts = {}) {
    const pool = opts.locality ? [BY_ID[opts.locality]] : LOCALITIES.filter((l) => {
      if (opts.zone && l.zone !== opts.zone) return false;
      if (l.tags.includes("far") && s.skills.realestate < 60 && rng.chance(0.6)) return false;
      return true;
    });
    const loc = rng.pick(pool);
    const rate = landRate(loc.id, m, s);
    const isAgri = loc.tags.includes("agri") || loc.tags.includes("far");
    let areaSqYd;
    if (isAgri) areaSqYd = Math.round(SQYD_PER_ACRE * rng.range(1, opts.big ? 24 : 6));
    else if (loc.zone === "core") areaSqYd = Math.round(rng.range(200, opts.big ? 3e3 : 900) / 10) * 10;
    else areaSqYd = Math.round(rng.range(300, opts.big ? 12e3 : 2400) / 10) * 10;
    const motive = rng.weighted([
      ["partition", 3],
      ["medical", 2],
      ["relocating", 2],
      ["court case", 2],
      ["daughter\u2019s marriage", 2],
      ["business loss", 2],
      ["no reason given", 3]
    ]);
    const urgency = rng.range(0, 1);
    const baseDiscount = opts.distress ? rng.range(0.2, 0.42) : rng.range(-0.12, 0.22) * (0.5 + urgency);
    const defects = rollDefects(loc, rng, Math.max(0, baseDiscount));
    const defectPressure = defects.reduce((a, d) => a + DEFECTS[d].severity, 0);
    const discount = clamp(baseDiscount + defectPressure * 0.1, -0.15, 0.62);
    const askRate = Math.round(rate * (1 - discount));
    const price = askRate * areaSqYd;
    return {
      id: nextId(s, "O"),
      kind: "land",
      locality: loc.id,
      localityName: loc.name,
      areaSqYd,
      askRate,
      price,
      seller: personName(rng),
      motive,
      createdAt: m,
      expiresAt: m + rng.int(2, 6),
      defects,
      known: [],
      ddDone: 0,
      ddSpend: 0,
      negotiated: false,
      floor: Math.round(price * rng.range(0.8, 0.96)),
      label: `${areaSqYd >= SQYD_PER_ACRE ? (areaSqYd / SQYD_PER_ACRE).toFixed(2) + " acres" : areaSqYd + " sq yd"} at ${loc.name}`,
      desc: loc.desc
    };
  }
  function makeDevAgreement(m, s, rng) {
    const pool = LOCALITIES.filter((l) => ["core", "northwest", "east"].includes(l.zone));
    const loc = rng.pick(pool);
    const areaSqYd = Math.round(rng.range(400, 2200) / 10) * 10;
    const ownerShare = rng.range(0.32, 0.48);
    const defects = rollDefects(loc, rng, 0.1);
    return {
      id: nextId(s, "O"),
      kind: "devagreement",
      locality: loc.id,
      localityName: loc.name,
      areaSqYd,
      ownerShare: Math.round(ownerShare * 100) / 100,
      price: 0,
      seller: personName(rng),
      createdAt: m,
      expiresAt: m + rng.int(2, 5),
      defects,
      known: [],
      ddDone: 0,
      ddSpend: 0,
      advance: Math.round(landRate(loc.id, m, s) * areaSqYd * rng.range(0.04, 0.14) / 1e3) * 1e3,
      label: `Development agreement, ${areaSqYd} sq yd at ${loc.name}`,
      desc: loc.desc
    };
  }
  function makeAssetOffer(m, s, rng) {
    const pool = LOCALITIES.filter((l) => l.rentBase.office || l.rentBase.retail);
    const loc = rng.pick(pool);
    const use = rng.weighted([["office", 3], ["retail", 2], ["res", 1], ["industrial", 2]]);
    const rate = rentRate(loc.id, use, m, s.flags);
    if (!rate) return null;
    const sqFt = Math.round(rng.range(4e3, 45e3) / 500) * 500;
    const occ = rng.range(0.45, 1);
    const noi = sqFt * rate * 12 * occ * 0.78;
    const cr = capRate(use, m, s) * rng.range(0.9, 1.3);
    const price = Math.round(noi / cr / 1e4) * 1e4;
    const defects = rollDefects(loc, rng, 0.05);
    return {
      id: nextId(s, "O"),
      kind: "asset",
      locality: loc.id,
      localityName: loc.name,
      use,
      sqFt,
      occupancy: occ,
      rentPerSqFt: rate,
      price,
      noi,
      seller: personName(rng),
      createdAt: m,
      expiresAt: m + rng.int(2, 5),
      defects,
      known: [],
      ddDone: 0,
      ddSpend: 0,
      label: `${sqFt.toLocaleString("en-IN")} sq ft ${use === "res" ? "residential" : use} building at ${loc.name}`,
      desc: loc.desc
    };
  }
  function runDueDiligence(offer, spend2, months, s, rng) {
    const legalSkill = s.skills.legal / 100;
    const staffBonus = s.staff.some((x) => x.impact === "legal") ? 0.18 : 0;
    const intensity = clamp(spend2 / (Math.max(offer.price, 2e5) * 0.012), 0, 3);
    const found = [];
    for (const d of offer.defects) {
      if (offer.known.includes(d)) continue;
      const dd = DEFECTS[d];
      const p = clamp(
        (0.3 + legalSkill * 0.45 + staffBonus + intensity * 0.22 + months * 0.06) * (1 - dd.ddDifficulty),
        0.05,
        0.95
      );
      if (rng.f() < p) {
        offer.known.push(d);
        found.push(d);
      }
    }
    offer.ddDone += months;
    offer.ddSpend += spend2;
    offer.ddConfidence = clamp(0.25 + legalSkill * 0.4 + staffBonus + intensity * 0.2 + months * 0.05, 0.2, 0.92);
    return found;
  }
  function absorptionRate(loc, buildType, askVsMarket, s) {
    const macro = s.macro;
    const bt = BUILD_TYPES[buildType];
    const base = 0.075 * (0.4 + BY_ID[loc].liquidity);
    const cycle = Math.pow(clamp(macro.demand, 0.3, 2), 1.6);
    const price = Math.pow(clamp(1 / Math.max(0.5, askVsMarket), 0.3, 2.2), 1.9);
    const rep = 0.82 + clamp(s.reputation, 0, 100) / 160;
    const sales = s.staff.some((x) => x.impact === "sales") ? 1.22 : 1;
    const q = 0.8 + bt.quality * 0.4;
    return clamp(base * cycle * price * rep * sales * q * (1 + s.absorptionBoost), 2e-3, 0.3);
  }
  var UNAPPROVED_PRICE = [
    { year: 1995, v: 0.78 },
    { year: 2e3, v: 0.74 },
    { year: 2003, v: 0.68 },
    { year: 2007, v: 0.58 },
    { year: 2010, v: 0.52 },
    { year: 2015, v: 0.46 },
    { year: 2020, v: 0.42 }
  ];
  var UNAPPROVED_ABSORPTION = [
    { year: 1995, v: 0.9 },
    { year: 2e3, v: 0.85 },
    { year: 2003, v: 0.78 },
    { year: 2007, v: 0.68 },
    { year: 2010, v: 0.6 },
    { year: 2015, v: 0.52 },
    { year: 2020, v: 0.46 }
  ];
  function unapprovedPenalty(m) {
    return {
      price: anchorAt(UNAPPROVED_PRICE, m),
      absorption: anchorAt(UNAPPROVED_ABSORPTION, m)
    };
  }

  // src/sim/finance.js
  function availableLenders(s) {
    return Object.values(LENDERS).filter((l) => (l.from ?? 0) <= s.month);
  }
  function offeredRate(lender, s) {
    const plr = s.macro.plr / 100;
    const risk = clamp(0.06 - s.stats.projectsDone * 8e-3 - s.relations.banks / 900, 0, 0.06);
    const cycle = (1 - s.macro.credit) * 0.035;
    const leverage = clamp((s.ratios.debtToAssets - 0.4) * 0.06, 0, 0.05);
    if (lender.kind === "private") return clamp(0.26 + cycle * 2 + leverage * 2, 0.24, 0.48);
    return clamp(plr + lender.spread / 100 + risk + cycle + leverage, 0.08, 0.34);
  }
  function creditDecision(lender, requested, collateralValue, s) {
    const reasons = [];
    let cap = collateralValue * lender.maxLtv;
    const track = s.stats.projectsDone;
    if (track < lender.minTrack) {
      reasons.push(`No completed track record. ${lender.name} requires at least ${lender.minTrack} delivered project${lender.minTrack === 1 ? "" : "s"}.`);
      cap *= 0.25;
    }
    const credAdj = clamp(s.macro.credit / 0.7, 0.25, 1.25);
    if (s.macro.credit < 0.45) {
      reasons.push("Credit conditions are tight; the bank is not adding developer exposure this quarter.");
    }
    cap *= credAdj;
    const relAdj = clamp(0.55 + s.relations.banks / 130, 0.4, 1.35);
    if (s.relations.banks < 25) reasons.push("The bank does not know you well enough to stretch.");
    cap *= relAdj;
    if (s.ratios.debtToAssets > 0.62) {
      reasons.push(`Existing leverage at ${Math.round(s.ratios.debtToAssets * 100)}% of assets is above the bank's comfort.`);
      cap *= 0.35;
    }
    if (s.ratios.interestCover < 1.4 && s.debt > 0) {
      reasons.push(`Interest cover of ${s.ratios.interestCover.toFixed(2)}x is below the 1.5x covenant.`);
      cap *= 0.4;
    }
    if (s.reputation < 15 && lender.kind !== "private") {
      reasons.push("Limited market standing.");
      cap *= 0.7;
    }
    if (s.flags.cleanBooks && lender.kind !== "private") {
      reasons.push("Audited, cheque-based accounts support a larger facility.");
      cap *= 1.35;
    }
    if (s.flags.deviationFlagged) {
      reasons.push("Sanctioned-plan deviations on record raise the risk weighting.");
      cap *= 0.75;
    }
    const amount = Math.floor(Math.min(requested, Math.max(0, cap)) / 1e4) * 1e4;
    const rate = offeredRate(lender, s);
    const tenure = Math.min(lender.maxTenure, s.month < 60 ? 60 : lender.maxTenure);
    if (amount < 5e4) {
      return { approved: false, amount: 0, rate, tenure, reasons: reasons.length ? reasons : ["The proposal does not meet the bank\u2019s lending norms."] };
    }
    if (amount < requested) {
      reasons.push(`Sanctioned at ${Math.round(amount / requested * 100)}% of the amount sought.`);
    }
    return { approved: true, amount, rate, tenure, reasons };
  }
  function takeLoan(s, lender, amount, rate, tenure, opts = {}) {
    const loan = {
      id: nextId(s, "L"),
      lender: lender.name,
      kind: lender.kind,
      lenderId: lender.id,
      principal: amount,
      outstanding: amount,
      rate,
      tenure,
      taken: s.month,
      emi: emiFor(amount, rate, tenure),
      collateral: opts.collateral || null,
      projectId: opts.projectId || null,
      missed: 0
    };
    s.loans.push(loan);
    s.cash += amount;
    return loan;
  }
  function serviceDebt(s) {
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
        l.outstanding += i;
        interest += i;
        missed++;
        l.missed++;
      }
    }
    s.loans = s.loans.filter((l) => l.outstanding > 1);
    return { interest, principal, missed };
  }
  function totalDebt(s) {
    return s.loans.reduce((a, l) => a + l.outstanding, 0);
  }
  function distressedLoans(s) {
    return s.loans.filter((l) => l.missed >= 3);
  }
  function prepaymentPenaltyRate(loan, month) {
    if (loan.kind === "private") return 0;
    if (loan.kind === "nbfc") return month >= 264 ? 0.02 : 0.03;
    return month >= 204 ? 0.01 : 0.02;
  }
  function remainingTenure(loan) {
    const r = loan.rate / 12;
    if (r <= 0) return Math.ceil(loan.outstanding / loan.emi);
    if (loan.emi <= loan.outstanding * r) return Infinity;
    return Math.ceil(-Math.log(1 - r * loan.outstanding / loan.emi) / Math.log(1 + r));
  }
  function interestIfHeld(loan) {
    const n = remainingTenure(loan);
    if (!Number.isFinite(n)) return Infinity;
    return Math.max(0, loan.emi * n - loan.outstanding);
  }
  function quotePrepayment(loan, amount, month) {
    const principal = Math.max(0, Math.min(amount, loan.outstanding));
    const penaltyRate = prepaymentPenaltyRate(loan, month);
    const minInterest = loan.kind === "private" ? Math.max(0, (6 - (month - loan.taken)) * principal * (loan.rate / 12)) : 0;
    const penalty = Math.round(principal * penaltyRate + minInterest);
    const cashRequired = principal + penalty;
    const full = principal >= loan.outstanding - 1;
    const before = interestIfHeld(loan);
    const after = full ? 0 : interestIfHeld({ ...loan, outstanding: loan.outstanding - principal });
    const saved = Number.isFinite(before) && Number.isFinite(after) ? Math.round(before - after) : Infinity;
    return {
      principal,
      penalty,
      penaltyRate,
      minInterest,
      cashRequired,
      full,
      interestSaved: saved,
      netBenefit: Number.isFinite(saved) ? saved - penalty : Infinity,
      tenureBefore: remainingTenure(loan),
      tenureAfter: full ? 0 : remainingTenure({ ...loan, outstanding: loan.outstanding - principal }),
      newOutstanding: loan.outstanding - principal
    };
  }
  function lrdAvailable(s) {
    return s.month >= 60;
  }
  function lrdQuote(s, asset, assetVal) {
    const proper = s.month >= 100;
    const occ = asset.occupancy;
    const noiAnnual = Math.max(0, (asset.lastNoi || 0) * 12);
    const reasons = [];
    if (asset.use === "res") reasons.push("Lenders will not discount residential rent: the yield is too thin and the tenants too easy to lose.");
    if (occ < 0.65) reasons.push(`Occupancy of ${Math.round(occ * 100)} per cent is below the 65 per cent the lender needs to see.`);
    if (noiAnnual <= 0) reasons.push("The building is not producing a net income to discount.");
    if (asset.pledged) reasons.push("Already charged to another facility.");
    if (!lrdAvailable(s)) reasons.push("No lender in Hyderabad is discounting lease rentals yet. The product does not exist.");
    const baseLtv = proper ? 0.7 : 0.55;
    const ltv = clamp(
      baseLtv * (0.7 + occ * 0.35) * (asset.anchor ? 1.08 : 1) * clamp(s.macro.credit / 0.7, 0.5, 1.15),
      0.2,
      0.78
    );
    const tenure = proper ? 144 : 84;
    const rate = clamp(
      s.macro.plr / 100 + (proper ? 5e-3 : 0.02) + (1 - s.macro.credit) * 0.02 - (asset.anchor ? 5e-3 : 0) - clamp(s.relations.banks / 1600, 0, 8e-3),
      0.075,
      0.2
    );
    const maxByCover = noiAnnual / 1.35 / 12 / (rate / 12 / (1 - Math.pow(1 + rate / 12, -tenure)));
    const amount = Math.floor(Math.min(assetVal * ltv, maxByCover) / 1e4) * 1e4;
    const emi = amount > 0 ? emiFor(amount, rate, tenure) : 0;
    return {
      eligible: reasons.length === 0 && amount >= 1e5,
      reasons,
      amount: Math.max(0, amount),
      rate,
      tenure,
      ltv,
      emi,
      dscr: emi > 0 ? noiAnnual / 12 / emi : 0,
      proper,
      noiAnnual
    };
  }

  // src/sim/build.js
  function sCurve(i, n) {
    const t0 = i / n, t1 = (i + 1) / n;
    const f = (t) => 1 / (1 + Math.exp(-9 * (t - 0.5)));
    const lo = f(0), hi = f(1);
    return (f(t1) - f(t0)) / (hi - lo);
  }
  function freeSqYd(parcel) {
    return Math.max(0, parcel.areaSqYd - (parcel.usedSqYd || 0));
  }
  function projectMonths(bt, sqFt) {
    const ref = bt.refSqFt || bt.minSqFt * 3;
    const scale = Math.pow(Math.max(0.2, sqFt / ref), 0.38);
    return Math.max(bt.minMonths || Math.round(bt.months * 0.5), Math.round(bt.months * scale));
  }
  function maxBuildableSqFt(parcel, s) {
    const loc = BY_ID[parcel.locality];
    const far = farFor(loc, s.month, s.flags);
    const efficiency = 0.92;
    return Math.floor(freeSqYd(parcel) * 9 * far * efficiency);
  }
  function landConsumedBy(parcel, sqFt, s) {
    const far = farFor(BY_ID[parcel.locality], s.month, s.flags);
    return Math.min(freeSqYd(parcel), Math.ceil(sqFt / (9 * far * 0.92)));
  }
  function fundingSchedule(budget, approvalMonths, months) {
    const soft = budget * 0.09, hard = budget * 0.91;
    const out = [];
    for (let i = 0; i < approvalMonths; i++) out.push(soft / approvalMonths);
    for (let i = 0; i < months; i++) out.push(hard * sCurve(i, months));
    let run = 0;
    const cum = out.map((v) => run += v);
    return { monthly: out, cumulative: cum, peak: run, firstYear: cum[Math.min(cum.length - 1, 11)] };
  }
  var isLayout = (typeId) => !!LAYOUT_TYPES[typeId];
  function estimateLayout(parcel, typeId, grossSqYd, s) {
    const lt = LAYOUT_TYPES[typeId];
    const ci = costIndex(s.month);
    const conversion = lt.unapproved ? 0 : Math.round(grossSqYd * CONVERSION_COST_PER_SQYD * ci);
    const works = Math.round(grossSqYd * lt.cost * ci);
    const budget = conversion + works;
    const speed = (2 - s.macro.regime.approvalSpeed) / (s.approvalSpeedMod || 1) * (1 - clamp(s.relations.bureaucrats, 0, 100) / 260) * (s.staff.some((x) => x.impact === "approvals") ? 0.72 : 1);
    const approvalMonths = lt.unapproved ? 0 : Math.max(2, Math.round((lt.conversionMonths + lt.approvalMonths) * speed));
    const months = Math.max(lt.months, Math.round(lt.months * Math.pow(Math.max(0.3, grossSqYd / (SQYD_PER_ACRE * 5)), 0.3)));
    const saleableSqYd = Math.floor(grossSqYd * lt.saleable);
    const rate = plotPrice(parcel.locality, typeId, s.month, s);
    const sched = fundingSchedule(budget, Math.max(1, approvalMonths), months);
    return {
      budget,
      approvalMonths,
      months,
      conversion,
      works,
      saleableSqYd,
      plotRate: rate,
      grossValue: Math.round(saleableSqYd * rate),
      costPerSqYd: budget / Math.max(1, grossSqYd),
      schedule: sched,
      firstYearCash: Math.round(sched.firstYear),
      isLayout: true
    };
  }
  function estimateProject(parcel, typeId, sqFt, s) {
    if (isLayout(typeId)) return estimateLayout(parcel, typeId, sqFt, s);
    const bt = BUILD_TYPES[typeId];
    const ci = costIndex(s.month);
    const budget = Math.round(sqFt * bt.cost * ci);
    const sizeFactor = clamp(0.62 + sqFt / 9e4, 0.62, 1.5);
    const approvalMonths = Math.max(2, Math.round(
      APPROVAL_BASE_MONTHS * sizeFactor * (2 - s.macro.regime.approvalSpeed) / (s.approvalSpeedMod || 1) * (1 - clamp(s.relations.bureaucrats, 0, 100) / 260) * (s.staff.some((x) => x.impact === "approvals") ? 0.72 : 1)
    ));
    const months = projectMonths(bt, sqFt);
    const price = salePrice(parcel.locality, typeId, s.month, s);
    const sched = fundingSchedule(budget, approvalMonths, months);
    return {
      budget,
      approvalMonths,
      months,
      grossValue: Math.round(sqFt * price),
      pricePerSqFt: price,
      costPerSqFt: budget / sqFt,
      schedule: sched,
      firstYearCash: Math.round(sched.firstYear),
      mobilisation: Math.round(sched.cumulative[Math.min(sched.cumulative.length - 1, approvalMonths + 5)])
    };
  }
  function startProject(s, parcel, typeId, sqFt, mode, name) {
    if (isLayout(typeId)) return startLayout(s, parcel, typeId, sqFt, name);
    const est = estimateProject(parcel, typeId, sqFt, s);
    const bt = BUILD_TYPES[typeId];
    const landUsed = landConsumedBy(parcel, sqFt, s);
    const landShare = Math.round((parcel.allInCost || 0) * (landUsed / Math.max(1, parcel.areaSqYd)));
    const p = {
      id: nextId(s, "P"),
      name: name || `${bt.name}, ${BY_ID[parcel.locality].name}`,
      parcelId: parcel.id,
      locality: parcel.locality,
      type: typeId,
      use: bt.use,
      sqFt,
      mode,
      budget: est.budget,
      spent: 0,
      overrunPct: 0,
      stage: "approval",
      approvalLeft: est.approvalMonths,
      approvalTotal: est.approvalMonths,
      months: est.months,
      elapsed: 0,
      delay: 0,
      stalled: 0,
      riskDelay: 0,
      quality: bt.quality,
      askPerSqFt: est.pricePerSqFt,
      devAgreement: parcel.devAgreement || null,
      started: s.month,
      done: false,
      landUsed,
      landShare,
      phase: (parcel.phases || 0) + 1
    };
    parcel.phases = (parcel.phases || 0) + 1;
    parcel.usedSqYd = (parcel.usedSqYd || 0) + landUsed;
    if (freeSqYd(parcel) < 100) parcel.usedBy = p.id;
    if (parcel.phases > 1) p.name = `${p.name} \u2014 phase ${parcel.phases}`;
    s.projects.push(p);
    return p;
  }
  function startLayout(s, parcel, typeId, grossSqYd, name) {
    const est = estimateLayout(parcel, typeId, grossSqYd, s);
    const lt = LAYOUT_TYPES[typeId];
    const landUsed = Math.min(freeSqYd(parcel), grossSqYd);
    const landShare = Math.round((parcel.allInCost || 0) * (landUsed / Math.max(1, parcel.areaSqYd)));
    const p = {
      id: nextId(s, "P"),
      name: name || `${lt.name}, ${BY_ID[parcel.locality].name}`,
      parcelId: parcel.id,
      locality: parcel.locality,
      type: typeId,
      use: "plots",
      isLayout: true,
      grossSqYd: landUsed,
      sqFt: est.saleableSqYd,
      mode: "sell",
      budget: est.budget,
      spent: 0,
      overrunPct: 0,
      stage: est.approvalMonths > 0 ? "approval" : "construction",
      approvalLeft: est.approvalMonths,
      approvalTotal: Math.max(1, est.approvalMonths),
      months: est.months,
      elapsed: 0,
      delay: 0,
      stalled: 0,
      riskDelay: 0,
      quality: lt.unapproved ? 0.35 : 0.7,
      askPerSqFt: est.plotRate,
      started: s.month,
      done: false,
      landUsed,
      landShare,
      phase: (parcel.phases || 0) + 1
    };
    parcel.phases = (parcel.phases || 0) + 1;
    parcel.usedSqYd = (parcel.usedSqYd || 0) + landUsed;
    if (freeSqYd(parcel) < 100) parcel.usedBy = p.id;
    if (parcel.phases > 1) p.name = `${p.name} \u2014 phase ${parcel.phases}`;
    if (lt.unapproved) {
      s.reputation = clamp(s.reputation - 1.5, 0, 100);
      p.unapproved = true;
    }
    s.projects.push(p);
    return p;
  }
  function tickProject(p, s, rng) {
    if (p.done) return 0;
    if (p.stage === "approval") {
      const softShare = p.isLayout ? 0.16 : 0.09;
      const soft = Math.round(p.budget * softShare / Math.max(1, p.approvalTotal));
      p.approvalLeft -= 1;
      p.spent += soft;
      if (p.approvalLeft <= 0) {
        p.stage = "construction";
        s.news.push({
          m: s.month,
          tag: "PROJECT",
          head: p.isLayout ? `Layout sanctioned: ${p.name}` : `Sanction received: ${p.name}`,
          body: p.isLayout ? `Conversion out of agricultural use and layout permission both through, after ${p.approvalTotal} months. Roads, drains and services can start, and the plots can now be sold as approved.` : `Building permission granted after ${p.approvalTotal} months. Construction can begin.`
        });
      }
      return soft;
    }
    if (p.stage !== "construction") return 0;
    const n = p.months + (p.riskDelay || 0);
    const share = sCurve(p.elapsed, n);
    const hard = p.budget * (p.isLayout ? 0.84 : 0.91);
    const cap = hard * (1 + p.overrunPct);
    const softSpent = p.budget * (p.isLayout ? 0.16 : 0.09);
    const hardSpent = Math.max(0, p.spent - softSpent);
    const want = Math.round(Math.min(hard * share * (1 + p.overrunPct), Math.max(0, cap - hardSpent)));
    if (want <= 0) {
      completeProject(p, s);
      return 0;
    }
    const avail = Math.max(0, s.cash);
    const pay2 = Math.min(want, avail);
    const frac = want > 0 ? pay2 / want : 1;
    if (frac < 0.2) {
      p.stalled += 1;
      p.delay += 1;
      if (p.stalled === 1 || p.stalled % 6 === 0) {
        s.news.push({
          m: s.month,
          tag: "PROJECT",
          head: `Work stopped at ${p.name}`,
          body: "There is no money to pay running bills. The contractor has pulled his men off site. Every idle month costs interest, credibility and a little more of the building."
        });
      }
      p.quality = clamp(p.quality - 8e-3, 0.25, 1);
      return 0;
    }
    p.spent += pay2;
    p.progressUnits = (p.progressUnits || 0) + frac;
    p.delay += 1 - frac;
    if (p.progressUnits >= 1) {
      p.progressUnits -= 1;
      p.elapsed += 1;
    }
    p.stalled = frac > 0.9 ? 0 : p.stalled + 1;
    if (frac < 0.75) p.quality = clamp(p.quality - 4e-3, 0.25, 1);
    const capability = clamp(
      0.7 + s.skills.construction / 320 + (s.staff.some((x) => x.impact === "construction" && x.skill > 55) ? 0.1 : 0) + (s.staff.some((x) => x.role === "coo") ? 0.07 : 0) + s.relations.contractors / 900,
      0.58,
      0.97
    );
    const maxRiskDelay = p.months * 0.6;
    if (rng.f() > capability) {
      if (rng.chance(0.55)) p.riskDelay = Math.min(maxRiskDelay, (p.riskDelay || 0) + 1);
      else p.overrunPct = Math.min(0.35, p.overrunPct + rng.range(4e-3, 0.018));
    }
    if (rng.chance(0.05)) p.quality = clamp(p.quality + rng.normal(0, 0.03), 0.25, 1);
    if (p.elapsed >= n) completeProject(p, s);
    return pay2;
  }
  function completeProject(p, s) {
    if (p.isLayout) return completeLayout(p, s);
    p.done = true;
    p.stage = "complete";
    p.completed = s.month;
    s.stats.projectsDone += 1;
    s.stats.sqftBuilt += p.sqFt;
    const onTime = p.delay <= p.months * 0.25;
    s.reputation = clamp(s.reputation + 3 + (p.quality - 0.6) * 12 + (onTime ? 2 : -1), 0, 100);
    const parcel = s.parcels.find((x) => x.id === p.parcelId);
    let ownSqFt = p.sqFt;
    if (p.devAgreement) ownSqFt = Math.round(p.sqFt * (1 - p.devAgreement.ownerShare));
    if (p.mode === "hold") {
      const use = p.use;
      const rate = rentRate(p.locality, use, s.month, s.flags) || rentRate(p.locality, "res", s.month, s.flags);
      s.assets.push({
        id: nextId(s, "A"),
        name: p.name,
        locality: p.locality,
        use,
        type: p.type,
        sqFt: ownSqFt,
        rentPerSqFt: rate * (0.85 + p.quality * 0.3),
        occupancy: 0,
        targetOcc: 0.9,
        opexRatio: 0.22,
        quality: p.quality,
        bookCost: Math.round(p.spent * (ownSqFt / p.sqFt)) + (p.landShare || 0),
        completed: s.month,
        deposit: 0,
        leaseEnds: null,
        rentHolidayLeft: 0
      });
      s.news.push({
        m: s.month,
        tag: "PROJECT",
        head: `${p.name} complete and held for rent`,
        body: `${ownSqFt.toLocaleString("en-IN")} sq ft added to the rental portfolio at an asking rent of about \u20B9${Math.round(rate)} per square foot. It is empty today. Filling it is the next job.`
      });
    } else {
      const ask = salePrice(p.locality, p.type, s.month, s);
      const presoldOwn = Math.min(ownSqFt, Math.round((p.presold || 0) * (ownSqFt / p.sqFt)));
      const balance = Math.round(presoldOwn * ask * 0.2);
      s.cash += balance;
      s.revenueYTD += balance;
      s.customerAdvances = Math.max(0, (s.customerAdvances || 0) - (p.advances || 0));
      s.inventory.push({
        id: `I${p.id}`,
        projectId: p.id,
        name: p.name,
        locality: p.locality,
        type: p.type,
        use: p.use,
        sqFt: ownSqFt,
        remaining: ownSqFt - presoldOwn,
        askPerSqFt: ask,
        quality: p.quality,
        completed: s.month,
        cost: Math.round(p.spent * (ownSqFt / p.sqFt)) + (p.landShare || 0)
      });
      s.news.push({
        m: s.month,
        tag: "PROJECT",
        head: `${p.name} complete`,
        body: `${ownSqFt.toLocaleString("en-IN")} sq ft delivered${p.devAgreement ? `, after handing ${Math.round(p.devAgreement.ownerShare * 100)}% of the built area to the landowner` : ""}. ${presoldOwn ? `${presoldOwn.toLocaleString("en-IN")} sq ft was booked during construction; ` : ""}${(ownSqFt - presoldOwn).toLocaleString("en-IN")} sq ft is unsold. Delivered ${p.delay} month${p.delay === 1 ? "" : "s"} late at ${Math.round(p.overrunPct * 100)}% over budget.`
      });
    }
    if (parcel) {
      parcel.builtCost = (parcel.builtCost || 0) + (p.landShare || 0);
      if (freeSqYd(parcel) < 100) parcel.consumed = true;
    }
  }
  function completeLayout(p, s) {
    p.done = true;
    p.stage = "complete";
    p.completed = s.month;
    s.stats.projectsDone += 1;
    s.stats.plotsDeveloped = (s.stats.plotsDeveloped || 0) + p.sqFt;
    const onTime = p.delay <= p.months * 0.25;
    s.reputation = clamp(s.reputation + (p.unapproved ? 1 : 3) + (onTime ? 1 : -1), 0, 100);
    const parcel = s.parcels.find((x) => x.id === p.parcelId);
    const rate = plotPrice(p.locality, p.type, s.month, s);
    const presold = Math.min(p.sqFt, Math.round(p.presold || 0));
    const balance = Math.round(presold * rate * 0.2);
    s.cash += balance;
    s.revenueYTD += balance;
    s.customerAdvances = Math.max(0, (s.customerAdvances || 0) - (p.advances || 0));
    s.inventory.push({
      id: `I${p.id}`,
      projectId: p.id,
      name: p.name,
      locality: p.locality,
      type: p.type,
      use: "plots",
      isLayout: true,
      unit: "sq yd",
      sqFt: p.sqFt,
      remaining: p.sqFt - presold,
      askPerSqFt: rate,
      quality: p.quality,
      completed: s.month,
      unapproved: !!p.unapproved,
      cost: Math.round(p.spent) + (p.landShare || 0)
    });
    s.news.push({
      m: s.month,
      tag: "PROJECT",
      head: `${p.name} ready for sale`,
      body: `${p.sqFt.toLocaleString("en-IN")} saleable square yards out of a ${Math.round(p.grossSqYd).toLocaleString("en-IN")} square yard site \u2014 the rest went to roads, drains and surrendered open space. Plots are quoted at \u20B9${Math.round(rate).toLocaleString("en-IN")} a square yard against a raw land rate of \u20B9${Math.round(landRate(p.locality, s.month, s)).toLocaleString("en-IN")}. ` + (p.unapproved ? "Unapproved, so the buyers are carrying a regularisation risk you have priced in and passed on." : "Sanctioned, serviced and registrable, which is most of what the buyer is paying for.")
    });
    if (parcel) {
      parcel.builtCost = (parcel.builtCost || 0) + (p.landShare || 0);
      if (freeSqYd(parcel) < 100) parcel.consumed = true;
    }
  }
  function remainingCommitments(s, months = Infinity) {
    let total = 0;
    for (const p of s.projects) {
      if (p.done) continue;
      const sched = fundingSchedule(p.budget * (1 + p.overrunPct), p.approvalTotal, p.months + p.delay);
      const pos = p.stage === "approval" ? p.approvalTotal - p.approvalLeft : p.approvalTotal + p.elapsed;
      const end = months === Infinity ? sched.monthly.length : Math.min(sched.monthly.length, pos + months);
      for (let i = pos; i < end; i++) total += sched.monthly[i];
    }
    return Math.max(0, total);
  }
  function abandonProject(s, projectId, marketFactor = 1) {
    const p = s.projects.find((x) => x.id === projectId && !x.done);
    if (!p) return { ok: false, msg: "Not found." };
    const parcel = s.parcels.find((x) => x.id === p.parcelId);
    const wipRecovery = p.spent * (p.stage === "approval" ? 0.25 : 0.55) * marketFactor;
    s.projects = s.projects.filter((x) => x.id !== projectId);
    if (parcel) {
      parcel.usedSqYd = Math.max(0, (parcel.usedSqYd || 0) - (p.landUsed || 0));
      parcel.phases = Math.max(0, (parcel.phases || 1) - 1);
      parcel.usedBy = null;
    }
    s.cash += Math.round(wipRecovery);
    s.revenueYTD += Math.round(wipRecovery);
    if (p.advances) {
      s.payables = (s.payables || 0) + p.advances;
      s.customerAdvances = Math.max(0, (s.customerAdvances || 0) - p.advances);
      s.reputation = Math.max(0, s.reputation - 8);
    }
    s.reputation = Math.max(0, s.reputation - 4);
    s.news.push({
      m: s.month,
      tag: "PROJECT",
      head: `${p.name} abandoned`,
      body: `Work in progress sold for ${Math.round(wipRecovery).toLocaleString("en-IN")} rupees against ${Math.round(p.spent).toLocaleString("en-IN")} spent. The land is back on your books. Buyers, brokers and your bank all now know that you started something you could not finish.`
    });
    return { ok: true, recovered: Math.round(wipRecovery) };
  }
  function tickPresales(p, s, rng) {
    if (p.mode !== "sell") return 0;
    if (p.stage !== "construction" && p.stage !== "approval") return 0;
    const reraDrag = s.flags.RERA ? 0.42 : 1;
    const preLaunch = p.stage === "approval";
    if (preLaunch && p.approvalTotal - p.approvalLeft < 1) return 0;
    const progress = preLaunch ? 0 : p.elapsed / Math.max(1, p.months + p.delay);
    if (!preLaunch && progress < 0.02) return 0;
    const disc = preLaunch ? 0.8 : 0.86 + progress * 0.12;
    const rate = (p.isLayout ? plotAbsorption(p.locality, p.type, disc, s) : absorptionRate(p.locality, p.type, disc, s)) * reraDrag * (preLaunch ? 0.45 : 1);
    const sqFtSold = Math.min((p.sqFt - (p.presold || 0)) * rate, p.sqFt * (preLaunch ? 0.04 : 0.08));
    if (sqFtSold < 1) return 0;
    p.presold = Math.min(p.sqFt, (p.presold || 0) + sqFtSold);
    const price = (p.isLayout ? plotPrice(p.locality, p.type, s.month, s) : salePrice(p.locality, p.type, s.month, s)) * disc;
    const collected = Math.round(sqFtSold * price * 0.78);
    s.customerAdvances = (s.customerAdvances || 0) + collected;
    p.advances = (p.advances || 0) + collected;
    s.stats.unitsSold += 0;
    return collected;
  }
  function tickInventory(s, rng) {
    let revenue = 0, cogs = 0;
    for (const inv of s.inventory) {
      if (inv.remaining <= 0) continue;
      const market = inv.isLayout ? plotPrice(inv.locality, inv.type, s.month, s) : salePrice(inv.locality, inv.type, s.month, s);
      const askVs = inv.askPerSqFt / market;
      const rate = inv.isLayout ? plotAbsorption(inv.locality, inv.type, askVs, s) : absorptionRate(inv.locality, inv.type, askVs, s);
      const sold = Math.min(inv.remaining, inv.sqFt * rate * rng.range(0.6, 1.4));
      if (sold < 1) continue;
      inv.remaining -= sold;
      revenue += sold * inv.askPerSqFt;
      cogs += sold / inv.sqFt * inv.cost;
      s.soldUnits += 1;
      if (s.month - inv.completed > 24) inv.askPerSqFt *= 0.997;
    }
    s.inventory = s.inventory.filter((i) => i.remaining > 1);
    return { revenue: Math.round(revenue), cogs: Math.round(cogs) };
  }

  // src/sim/assets.js
  function tickAsset(a, s, rng) {
    const market = rentRate(a.locality, a.use, s.month, s.flags);
    if (market > 0) {
      a.rentPerSqFt += (market * (0.85 + a.quality * 0.3) - a.rentPerSqFt) * 0.035;
    }
    const pull = clamp(
      0.055 * Math.pow(clamp(s.macro.demand, 0.3, 2), 1.5) * (0.75 + s.reputation / 180) * (0.8 + a.quality * 0.4) * (s.staff.some((x) => x.impact === "rental") ? 1.3 : 1),
      4e-3,
      0.22
    );
    if (a.occupancy < a.targetOcc) {
      a.occupancy = clamp(a.occupancy + pull * (a.targetOcc - a.occupancy) * 3.2, 0, a.targetOcc);
    }
    if (s.macro.demand < 0.85 && rng.chance(0.06)) {
      a.occupancy = clamp(a.occupancy - rng.range(0.05, 0.25), 0, 1);
    }
    const gross = a.sqFt * a.rentPerSqFt * a.occupancy;
    const holiday = a.rentHolidayLeft > 0;
    if (holiday) a.rentHolidayLeft -= 1;
    const collected = holiday ? 0 : gross * (1 - (a.defaultRate || 0.02));
    const opex = a.sqFt * a.rentPerSqFt * a.opexRatio * 0.55 + a.sqFt * 0.6;
    const noi = collected - opex;
    a.lastGross = gross;
    a.lastNoi = noi;
    return { collected, opex, noi };
  }
  function assetValue(a, s) {
    if (a.use === "res") {
      const psf = salePrice(a.locality, a.type || "standard", s.month, s);
      const tenanted = 0.9 + (1 - a.occupancy) * 0.06;
      return Math.round(a.sqFt * psf * tenanted * (0.9 + a.quality * 0.15));
    }
    const noiAnnual = Math.max(0, (a.lastNoi || 0) * 12);
    const cr = capRate(a.use, s.month, s);
    if (noiAnnual <= 0) {
      return Math.round(a.bookCost * 0.75);
    }
    const stabilised = a.sqFt * a.rentPerSqFt * Math.max(a.occupancy, 0.6) * 12 * (1 - a.opexRatio);
    return Math.round((noiAnnual * 0.4 + stabilised * 0.6) / cr);
  }
  function portfolioNoiAnnual(s) {
    return s.assets.reduce((t, a) => t + (a.lastNoi || 0) * 12, 0);
  }
  function propertyTax(s) {
    const gross = s.assets.reduce((t, a) => t + (a.lastGross || 0), 0);
    return gross * taxRate("propertyTaxOfNOI", s.month);
  }

  // src/sim/accounting.js
  function landValue(s) {
    return s.parcels.filter((p) => p.owned && !p.consumed).reduce((t, p) => {
      const gross = landRate(p.locality, s.month, s) * p.areaSqYd;
      let haircut = 1;
      for (const d of p.known) {
        if (p.resolved && p.resolved.includes(d)) continue;
        if (d === "ASSIGNED_LAND") haircut *= 0.02;
        else if (d === "WAKF_CLAIM") haircut *= 0.25;
        else if (d === "LAYOUT_UNAPPROVED") haircut *= 0.55 + unapprovedPenalty(s.month).price * 0.45;
        else haircut *= 0.7;
      }
      return t + gross * haircut * (p.stigma || 1);
    }, 0);
  }
  function wipValue(s) {
    return s.projects.filter((p) => !p.done).reduce((t, p) => t + p.spent, 0);
  }
  function inventoryValue(s) {
    return s.inventory.reduce((t, i) => t + Math.min(i.remaining * i.askPerSqFt * 0.92, i.remaining / i.sqFt * i.cost * 1.35), 0);
  }
  function investmentValue(s) {
    return s.assets.reduce((t, a) => t + assetValue(a, s), 0) + s.subsidiaries.reduce((t, x) => t + x.value, 0);
  }
  function balanceSheet(s) {
    const cash = s.cash;
    const land = landValue(s);
    const wip = wipValue(s);
    const inv = inventoryValue(s);
    const invest = investmentValue(s);
    const other = s.pendingRefund || 0;
    const assets = cash + land + wip + inv + invest + other;
    const debt = totalDebt(s);
    const payables = s.payables || 0;
    const advances = s.customerAdvances || 0;
    const liabilities = debt + payables + advances;
    return {
      cash,
      land,
      wip,
      inventory: inv,
      investments: invest,
      other,
      assets,
      debt,
      payables,
      advances,
      liabilities,
      netWorth: assets - liabilities,
      equityPaidIn: s.equityPaidIn,
      retained: assets - liabilities - s.equityPaidIn
    };
  }
  function computeRatios(s, bs) {
    const noi = portfolioNoiAnnual(s);
    const ytd = s.revenueYTD - s.costYTD - s.opexYTD + noi;
    const last = s.yearbook[s.yearbook.length - 1];
    const monthsIn = s.month % 12 || 12;
    const ebitda = monthsIn >= 6 || !last ? ytd : Math.max(ytd, last.ebitda);
    const interest = Math.max(1, s.interestAnnual || s.interestYTD * (12 / monthsIn));
    return {
      debtToAssets: bs.assets > 0 ? bs.debt / bs.assets : 0,
      debtToEbitda: ebitda > 0 ? bs.debt / ebitda : 99,
      interestCover: ebitda > 0 ? ebitda / interest : 0,
      ltv: bs.land + bs.investments > 0 ? bs.debt / (bs.land + bs.investments) : 0,
      dscr: interest > 0 ? (noi + Math.max(0, s.revenueYTD - s.costYTD)) / interest : 0,
      occupancy: s.assets.length ? s.assets.reduce((t, a) => t + a.occupancy * a.sqFt, 0) / Math.max(1, s.assets.reduce((t, a) => t + a.sqFt, 0)) : 0,
      noi,
      yieldOnCost: s.assets.length ? noi / Math.max(1, s.assets.reduce((t, a) => t + a.bookCost, 0)) : 0
    };
  }
  function closeYear(s, bs) {
    const y = yearOf(s.month);
    const noi = portfolioNoiAnnual(s);
    const grossProfit = s.revenueYTD - s.costYTD;
    const ebitda = grossProfit + noi - s.opexYTD;
    const pbt = ebitda - s.interestYTD;
    const rate = pbt > 0 ? (s.flags.cleanBooks ? 1 : 0.72) * taxOn(s) : 0;
    const tax = Math.max(0, pbt * rate);
    s.cash -= tax;
    s.taxYTD = tax;
    const entry = {
      year: y,
      netWorth: bs.netWorth,
      assets: bs.assets,
      debt: bs.debt,
      cash: bs.cash,
      land: bs.land,
      investments: bs.investments,
      inventory: bs.inventory,
      revenue: s.revenueYTD,
      ebitda,
      pbt,
      tax,
      pat: pbt - tax,
      noi,
      interest: s.interestYTD,
      usdRate: s.macro.usd,
      cpiIndex: s.macro.cpiIndex,
      realNetWorth: bs.netWorth / (s.macro.cpiIndex / 100),
      usdNetWorth: bs.netWorth / s.macro.usd,
      reputation: s.reputation,
      projects: s.stats.projectsDone,
      occupancy: s.ratios.occupancy,
      staff: s.staff.length
    };
    s.yearbook.push(entry);
    s.retained += pbt - tax;
    s.interestAnnual = s.interestYTD;
    s.revenueYTD = 0;
    s.costYTD = 0;
    s.interestYTD = 0;
    s.opexYTD = 0;
    s.noiYTD = 0;
    return entry;
  }
  function taxOn(s) {
    const y = yearOf(s.month);
    if (y < 1997) return 0.46;
    if (y < 2e3) return 0.35;
    if (y < 2005) return 0.37;
    if (y < 2012) return 0.335;
    if (y < 2018) return 0.335;
    return 0.27;
  }

  // src/sim/engine.js
  function startGame(seedText, opts = {}) {
    const s = newGame(seedText, opts);
    refresh(s);
    const rng = getRng(s);
    refreshOffers(s, rng);
    if (!s.offers.some((o) => o.kind === "devagreement")) {
      s.offers.push(makeDevAgreement(s.month, s, rng));
    }
    saveRng(s, rng);
    refresh(s);
    return s;
  }
  function refresh(s) {
    if (!s.intel) s.intel = initialIntel();
    if (!s.seq) {
      reseedIds(s);
      const dupes = findDuplicateIds(s);
      if (dupes.length) {
        s.news.push({
          m: s.month,
          tag: "NOTE",
          head: "Records reconciled",
          body: `A fault in an earlier version reused ${dupes.length} internal reference${dupes.length === 1 ? "" : "s"} after a page reload, which could make a button act on the wrong parcel or project. The numbering has been repaired and cannot recur. Anything already affected stays as it is; nothing has been lost.`
        });
      }
    }
    s.macro = macroAt(s.month);
    if (s.demandOverride) s.macro.demand *= s.demandOverride;
    s.macro.demand *= clamp(s.bizConfidence, 0.7, 1.3);
    const bs = balanceSheet(s);
    s.bs = bs;
    s.netWorth = bs.netWorth;
    s.debt = bs.debt;
    s.assetValue = bs.assets;
    s.ratios = computeRatios(s, bs);
    s.avgQuality = s.projects.length || s.assets.length ? [...s.projects, ...s.assets].reduce((t, x) => t + (x.quality || 0.65), 0) / (s.projects.length + s.assets.length) : 0.65;
    return s;
  }
  function buyLand(s, offer, opts = {}) {
    const duty = dutyRate(s.month);
    const price = offer.negotiatedPrice ?? offer.price;
    const dutyAmt = Math.round(price * duty);
    const legal = Math.round(Math.max(5e3, price * 4e-3));
    const total = price + dutyAmt + legal;
    if (s.cash < total) return { ok: false, msg: `You are short by ${money(total - s.cash)}. Registration and duty alone are ${money(dutyAmt + legal)}.` };
    s.cash -= total;
    const p = {
      id: nextId(s, "PL"),
      owned: true,
      locality: offer.locality,
      areaSqYd: offer.areaSqYd,
      label: offer.label,
      purchased: s.month,
      price,
      duty: dutyAmt,
      legal,
      allInCost: total,
      defects: offer.defects.slice(),
      known: offer.known.slice(),
      resolved: [],
      ddConfidence: offer.ddConfidence || 0,
      devAgreement: offer.kind === "devagreement" ? { ownerShare: offer.ownerShare } : null,
      seller: offer.seller
    };
    s.parcels.push(p);
    s.stats.landBoughtSqYd += offer.areaSqYd;
    s.offers = s.offers.filter((o) => o.id !== offer.id);
    s.relations.landowners = clamp(s.relations.landowners + 2, 0, 100);
    s.ledger.push({ m: s.month, type: "Land purchase", amount: -total, note: offer.label });
    s.news.push({
      m: s.month,
      tag: "DEAL",
      head: `Registered: ${offer.label}`,
      body: `Bought from ${offer.seller} for ${money(price)}. Stamp duty, transfer duty and registration came to ${money(dutyAmt)} \u2014 ${Math.round(duty * 100)} per cent \u2014 and legal charges ${money(legal)}.`
    });
    return { ok: true, parcel: p };
  }
  function signDevAgreement(s, offer) {
    const advance = offer.advance || 0;
    if (s.cash < advance) return { ok: false, msg: "You cannot fund the refundable advance." };
    s.cash -= advance;
    const p = {
      id: nextId(s, "PL"),
      owned: true,
      isDev: true,
      locality: offer.locality,
      areaSqYd: offer.areaSqYd,
      label: offer.label,
      purchased: s.month,
      price: 0,
      duty: 0,
      legal: 0,
      allInCost: advance,
      defects: offer.defects.slice(),
      known: offer.known.slice(),
      resolved: [],
      devAgreement: { ownerShare: offer.ownerShare, owner: offer.seller },
      seller: offer.seller
    };
    s.parcels.push(p);
    s.offers = s.offers.filter((o) => o.id !== offer.id);
    s.news.push({
      m: s.month,
      tag: "DEAL",
      head: `Development agreement signed at ${offer.localityName}`,
      body: `${offer.seller} keeps ${Math.round(offer.ownerShare * 100)} per cent of the built area. You fund one hundred per cent of the construction. No land cost, no land appreciation, and a partner who can stop the project.`
    });
    return { ok: true, parcel: p };
  }
  function buyAssetOffer(s, offer) {
    const duty = dutyRate(s.month);
    const price = offer.negotiatedPrice ?? offer.price;
    const total = Math.round(price * (1 + duty) + price * 4e-3);
    if (s.cash < total) return { ok: false, msg: `Short by ${money(total - s.cash)} including ${Math.round(duty * 100)}% duty.` };
    s.cash -= total;
    s.assets.push({
      id: nextId(s, "A"),
      name: offer.label,
      locality: offer.locality,
      use: offer.use,
      sqFt: offer.sqFt,
      rentPerSqFt: offer.rentPerSqFt,
      occupancy: offer.occupancy,
      targetOcc: 0.92,
      opexRatio: 0.24,
      quality: 0.6,
      bookCost: total,
      completed: s.month,
      deposit: Math.round(offer.noi / 12 * 3),
      rentHolidayLeft: 0,
      defects: offer.defects.slice(),
      known: offer.known.slice()
    });
    s.offers = s.offers.filter((o) => o.id !== offer.id);
    s.ledger.push({ m: s.month, type: "Asset purchase", amount: -total, note: offer.label });
    return { ok: true };
  }
  function doDueDiligence(s, offer, level) {
    const ci = costIndex(s.month);
    const tiers = {
      quick: { cost: Math.round(Math.max(1500 * ci, offer.price * 15e-4)), months: 0, label: "Encumbrance certificate and a look at the link documents" },
      standard: { cost: Math.round(Math.max(6e3 * ci, offer.price * 4e-3)), months: 1, label: "Advocate\u2019s search for thirty years, revenue records, physical survey" },
      deep: { cost: Math.round(Math.max(18e3 * ci, offer.price * 0.01)), months: 2, label: "Full title opinion, revenue and Wakf enquiry, litigation search, boundary survey" }
    };
    const t = tiers[level];
    if (s.cash < t.cost) return { ok: false, msg: "You cannot afford that level of investigation." };
    s.cash -= t.cost;
    const rng = getRng(s);
    const found = runDueDiligence(offer, t.cost, t.months, s, rng);
    saveRng(s, rng);
    offer.expiresAt += t.months;
    s.skills.legal = clamp(s.skills.legal + 0.4, 0, 100);
    s.ledger.push({ m: s.month, type: "Due diligence", amount: -Math.round(t.cost), note: offer.label });
    return { ok: true, found, confidence: offer.ddConfidence, cost: t.cost, tier: t };
  }
  function negotiate(s, offer, offerPrice) {
    const rng = getRng(s);
    const skill = s.skills.negotiation / 100;
    const rel = s.relations.landowners / 100;
    const floor = offer.floor * (1 - skill * 0.06 - rel * 0.04);
    let result;
    if (offerPrice >= offer.price) {
      offer.negotiatedPrice = offerPrice;
      result = { ok: true, msg: "Accepted immediately, which should tell you something." };
    } else if (offerPrice >= floor) {
      offer.negotiatedPrice = offerPrice;
      offer.negotiated = true;
      s.skills.negotiation = clamp(s.skills.negotiation + 0.3, 0, 100);
      result = { ok: true, msg: `${offer.seller} accepted ${money(offerPrice)}.` };
    } else if (offerPrice >= floor * 0.9 && rng.f() < skill * 0.5 + rel * 0.2) {
      offer.negotiatedPrice = Math.round((offerPrice + floor) / 2);
      offer.negotiated = true;
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
  var BRIEFS = {
    acreage: {
      label: "Acreage for a layout",
      hint: "Farmland and large holdings on the periphery, big enough to lay out and sell as plots.",
      fee: 6e3,
      count: 3
    },
    plot: {
      label: "A plot to build on",
      hint: "Serviced plots in developed localities, the size a building actually goes on.",
      fee: 4e3,
      count: 3
    },
    cheap: {
      label: "Anything distressed",
      hint: "Somebody who needs to sell this month. Cheap, and cheap for a reason.",
      fee: 5e3,
      count: 3
    }
  };
  function askBrokers(s, briefKey) {
    const brief = BRIEFS[briefKey];
    if (!brief) return { ok: false, msg: "No such brief." };
    const fee = Math.round(brief.fee * costIndex(s.month));
    if (s.cash < fee) return { ok: false, msg: `The retainer is ${money(fee)} and you cannot spare it.` };
    pay(s, fee);
    const rng = getRng(s);
    const found = [];
    for (let i = 0; i < brief.count; i++) {
      let o = null;
      if (briefKey === "acreage") {
        const agri = LOCALITIES.filter((l) => l.tags.includes("agri") || l.tags.includes("far") || l.tags.includes("periphery"));
        const loc = rng.pick(agri.length ? agri : LOCALITIES);
        o = makeLandOffer(s.month, s, rng, { locality: loc.id, big: true });
        if (o.areaSqYd < SQYD_PER_ACRE * 0.6) {
          o.areaSqYd = Math.round(SQYD_PER_ACRE * rng.range(0.7, 5));
          o.price = o.askRate * o.areaSqYd;
          o.floor = Math.round(o.price * 0.86);
          o.label = `${(o.areaSqYd / SQYD_PER_ACRE).toFixed(2)} acres at ${o.localityName}`;
        }
      } else if (briefKey === "cheap") {
        o = makeLandOffer(s.month, s, rng, { distress: true });
      } else {
        const built = LOCALITIES.filter((l) => ["core", "northwest", "east"].includes(l.zone));
        o = makeLandOffer(s.month, s, rng, { locality: rng.pick(built).id });
      }
      if (!o) continue;
      o.brief = briefKey;
      o.expiresAt = s.month + rng.int(2, 5);
      s.offers.push(o);
      found.push(o.label);
    }
    saveRng(s, rng);
    s.relations.landowners = clamp(s.relations.landowners + 1, 0, 100);
    s.ledger.push({ m: s.month, type: "Broker retainer", amount: -fee, note: brief.label });
    s.news.push({
      m: s.month,
      tag: "DEAL",
      head: `Put the word out: ${brief.label.toLowerCase()}`,
      body: `${money(fee)} between three brokers. Within a fortnight they came back with ${found.length === 1 ? "one thing" : found.length + " things"}: ${found.join("; ")}. Telling people what you want is most of this trade.`
    });
    return { ok: true, found, fee };
  }
  function brokerDeal(s, offerId) {
    const offer = s.offers.find((o) => o.id === offerId);
    if (!offer) return { ok: false, msg: "That offer is gone." };
    if (offer.kind === "devagreement") return { ok: false, msg: "There is no sale to broker \u2014 this is a development agreement." };
    const rng = getRng(s);
    const price = offer.negotiatedPrice ?? offer.price;
    const chance = clamp(
      0.3 + s.skills.realestate / 260 + s.skills.negotiation / 400 + s.relations.landowners / 500 + clamp(s.reputation, 0, 100) / 400 + (s.macro.demand - 1) * 0.18,
      0.12,
      0.88
    );
    const closed = rng.f() < chance;
    const rate = closed ? rng.range(9e-3, 0.02) : 0;
    const fee = Math.round(price * rate);
    s.offers = s.offers.filter((o) => o.id !== offerId);
    s.brokerage = (s.brokerage || 0) + fee;
    s.stats.dealsBrokered = (s.stats.dealsBrokered || 0) + (closed ? 1 : 0);
    s.stats.dealsAttempted = (s.stats.dealsAttempted || 0) + 1;
    saveRng(s, rng);
    if (!closed) {
      s.relations.landowners = clamp(s.relations.landowners - 2, 0, 100);
      s.news.push({
        m: s.month,
        tag: "BROKERAGE",
        head: `No buyer for ${offer.label}`,
        body: `You showed it to three parties over five weeks. One was interested until his brother-in-law told him the road was too narrow. ${offer.seller} has given it to somebody else.`
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
    s.ledger.push({ m: s.month, type: "Brokerage", amount: fee, note: offer.label });
    s.news.push({
      m: s.month,
      tag: "BROKERAGE",
      head: `Brokered ${offer.label} for ${money(fee)}`,
      body: `Registered last Tuesday. ${offer.seller} paid your commission in cash at the sub-registrar's office and asked whether you had anything else. No capital of yours went into it, and none of the upside is yours either.`
    });
    return { ok: true, closed: true, fee };
  }
  function launchProject(s, parcelId, typeId, sqFt, mode, name) {
    const parcel = s.parcels.find((p2) => p2.id === parcelId);
    if (!parcel || parcel.consumed || freeSqYd(parcel) < 100) return { ok: false, msg: "There is no land left on that parcel." };
    const fatal = parcel.known.filter((d) => DEFECTS[d].fatal && !(parcel.resolved || []).includes(d));
    if (fatal.length) return { ok: false, msg: `You cannot build on this: ${DEFECTS[fatal[0]].name}.` };
    const lt = LAYOUT_TYPES[typeId];
    if (lt) {
      const free = freeSqYd(parcel);
      if (sqFt > free) return { ok: false, msg: `Only ${free.toLocaleString("en-IN")} sq yd of this parcel is undeveloped.` };
      if (sqFt < lt.minAcres * SQYD_PER_ACRE) {
        return { ok: false, msg: `A ${lt.name.toLowerCase()} needs at least ${lt.minAcres} acre${lt.minAcres === 1 ? "" : "s"} (${Math.round(lt.minAcres * SQYD_PER_ACRE).toLocaleString("en-IN")} sq yd) to be worth laying out.` };
      }
    } else {
      const cap = maxBuildableSqFt(parcel, s);
      if (sqFt > cap) return { ok: false, msg: `Permissible floor area allows only ${cap.toLocaleString("en-IN")} sq ft here today.` };
      const bt = BUILD_TYPES[typeId];
      if (sqFt < bt.minSqFt) return { ok: false, msg: `${bt.name} is not viable below ${bt.minSqFt.toLocaleString("en-IN")} sq ft.` };
    }
    const est = estimateProject(parcel, typeId, sqFt, s);
    const committed = remainingCommitments(s);
    const need = (committed + est.schedule.peak) * 0.32;
    if (s.cash < need) {
      return {
        ok: false,
        msg: `You cannot fund this. Total build cost ${money(est.budget)} over ${est.approvalMonths + est.months} months` + (committed > 0 ? `, on top of ${money(committed)} still to spend on projects already running` : "") + `. You should have roughly a third of that in hand \u2014 about ${money(need)} \u2014 and you have ${money(s.cash)}. Build smaller, sell something, or raise money first.`
      };
    }
    const p = startProject(s, parcel, typeId, sqFt, mode, name);
    s.news.push({
      m: s.month,
      tag: "PROJECT",
      head: `Launched: ${p.name}`,
      body: `${sqFt.toLocaleString("en-IN")} sq ft, budget ${money(p.budget)}, ${p.approvalTotal} months for sanction then ${p.months} months to build. Intended for ${mode === "hold" ? "retention and lease" : "sale"}.`
    });
    return { ok: true, project: p };
  }
  function applyForLoan(s, lenderId, amount, collateralIds) {
    const lender = LENDERS[lenderId];
    if (!lender || (lender.from ?? 0) > s.month) return { ok: false, msg: "That lender is not available to you." };
    let collateral = 0;
    for (const id of collateralIds || []) {
      const p = s.parcels.find((x) => x.id === id && x.owned && !x.pledged);
      if (p) collateral += landRate(p.locality, s.month, s) * p.areaSqYd;
      const a = s.assets.find((x) => x.id === id && !x.pledged);
      if (a) collateral += assetValue(a, s);
    }
    if (s.flags.shopPledged) collateral += 9e5 * costIndex(s.month);
    const d = creditDecision(lender, amount, collateral, s);
    if (!d.approved) return { ok: false, decision: d, msg: "Declined." };
    takeLoan(s, lender, d.amount, d.rate, d.tenure, { collateral: collateralIds });
    for (const id of collateralIds || []) {
      const p = s.parcels.find((x) => x.id === id);
      if (p) p.pledged = true;
      const a = s.assets.find((x) => x.id === id);
      if (a) a.pledged = true;
    }
    s.relations.banks = clamp(s.relations.banks + 4, 0, 100);
    s.ledger.push({ m: s.month, type: "Loan drawn", amount: d.amount, note: lender.name });
    s.news.push({
      m: s.month,
      tag: "FINANCE",
      head: `${lender.name} sanctions ${money(d.amount)}`,
      body: `At ${(d.rate * 100).toFixed(2)} per cent for ${d.tenure} months. ${d.reasons.join(" ")}`
    });
    return { ok: true, decision: d };
  }
  function repayLoan(s, loanId, amount) {
    const loan = s.loans.find((l) => l.id === loanId);
    if (!loan) return { ok: false, msg: "That facility is already closed." };
    const q = quotePrepayment(loan, amount, s.month);
    if (q.principal < 1e3) return { ok: false, msg: "Repay at least \u20B91,000." };
    if (s.cash < q.cashRequired) {
      return { ok: false, msg: `You need ${money(q.cashRequired)} \u2014 ${money(q.principal)} of principal plus ${money(q.penalty)} of charges \u2014 and you have ${money(s.cash)}.` };
    }
    s.cash -= q.cashRequired;
    loan.outstanding -= q.principal;
    loan.prepaid = (loan.prepaid || 0) + q.principal;
    let released = [];
    if (q.full || loan.outstanding < 1) {
      s.loans = s.loans.filter((l) => l.id !== loanId);
      for (const id of loan.collateral || []) {
        const stillPledged = s.loans.some((l) => (l.collateral || []).includes(id));
        if (stillPledged) continue;
        const parcel = s.parcels.find((x) => x.id === id);
        if (parcel) {
          parcel.pledged = false;
          released.push(parcel.label);
        }
        const asset = s.assets.find((x) => x.id === id);
        if (asset) {
          asset.pledged = false;
          released.push(asset.name);
        }
      }
      loan.missed = 0;
    }
    if (loan.kind === "private") s.relations.financiers = clamp(s.relations.financiers + (q.full ? 10 : 4), 0, 100);
    else s.relations.banks = clamp(s.relations.banks + (q.full ? 9 : 3), 0, 100);
    if (q.full) s.reputation = clamp(s.reputation + 1, 0, 100);
    if (q.full && loan.secret) {
      s.flags.goldRedeemed = true;
      s.relations.family = clamp(s.relations.family + 15, 0, 100);
      s.stress = Math.max(0, s.stress - 6);
      s.news.push({
        m: s.month,
        tag: "PERSONAL",
        head: "Your mother\u2019s gold is back in the locker",
        body: "You collected it from Andhra Bank on a Thursday afternoon and put it back where it had been, and she has still never been told it left. You have, at least, stopped being a man who pledged his mother\u2019s jewellery."
      });
    }
    s.ledger.push({
      m: s.month,
      type: q.full ? "Loan closed" : "Loan prepayment",
      amount: -q.cashRequired,
      note: `${loan.lender}${q.penalty > 0 ? ` (incl. ${money(q.penalty)} charges)` : ""}`
    });
    s.news.push({
      m: s.month,
      tag: "FINANCE",
      head: q.full ? `${loan.lender} facility closed` : `Prepaid ${money(q.principal)} to ${loan.lender}`,
      body: q.full ? `Repaid in full at a cost of ${money(q.cashRequired)}${q.penalty > 0 ? `, including ${money(q.penalty)} of foreclosure charges` : ""}. It saves roughly ${money(q.interestSaved)} of interest you would otherwise have paid over ${q.tenureBefore} months.` + (released.length ? ` Security released: ${released.join(", ")}.` : "") : `Outstanding down to ${money(loan.outstanding)}. On the same instalment the facility now closes in about ${q.tenureAfter} months rather than ${q.tenureBefore}, saving around ${money(q.interestSaved)} of interest.`
    });
    return { ok: true, quote: q, released };
  }
  function commissionSurvey(s, locId) {
    const r = buySurvey(s, locId);
    if (r.ok) {
      s.news.push({
        m: s.month,
        tag: "MARKET",
        head: `Survey commissioned: ${BY_ID[locId].name}`,
        body: `${money(r.cost)} to a man who will walk the survey numbers, sit with the village revenue officer and find out what has actually registered rather than what is being asked. Good for about two years before it goes stale.`
      });
    }
    return r;
  }
  function quoteLRD(s, assetId) {
    const a = s.assets.find((x) => x.id === assetId);
    if (!a) return null;
    return lrdQuote(s, a, assetValue(a, s));
  }
  function takeLRD(s, assetId, amount) {
    const a = s.assets.find((x) => x.id === assetId);
    if (!a) return { ok: false, msg: "Not found." };
    const q = lrdQuote(s, a, assetValue(a, s));
    if (!q.eligible) return { ok: false, msg: q.reasons[0] || "Not eligible." };
    const draw = Math.min(Math.max(1e5, Math.floor(amount / 1e4) * 1e4), q.amount);
    const lender = {
      id: "lrd",
      name: q.proper ? "Lease rental discounting facility" : "Loan against property",
      kind: "bank",
      spread: 0
    };
    const loan = takeLoan(s, lender, draw, q.rate, q.tenure, { collateral: [assetId] });
    loan.lrd = true;
    loan.assetId = assetId;
    a.pledged = true;
    s.relations.banks = clamp(s.relations.banks + 5, 0, 100);
    s.relations.investors = clamp(s.relations.investors + 3, 0, 100);
    s.news.push({
      m: s.month,
      tag: "FINANCE",
      head: `${money(draw)} raised against the lease at ${a.name}`,
      body: `${(q.rate * 100).toFixed(2)} per cent over ${q.tenure} months \u2014 ${q.proper ? "two to three points inside what the same bank would charge you to build something" : "a crude loan against property, which is the best this market offers yet"}. The rent is assigned directly to the lender and the instalment is ${money(loan.emi)} a month whatever happens to the building. Cover today is ${q.dscr.toFixed(2)} times. You still own the asset, and the money buys the next one.`
    });
    return { ok: true, quote: q, amount: draw, loan };
  }
  function sellParcel(s, parcelId, factor = 1) {
    const p = s.parcels.find((x) => x.id === parcelId);
    if (!p) return { ok: false, msg: "Not found." };
    if ((p.usedSqYd || 0) > 0) return { ok: false, msg: "Part of this parcel is under development. Finish or abandon the phase first." };
    if (p.pledged) return { ok: false, msg: "This land is pledged to a lender. Repay first." };
    let gross = landRate(p.locality, s.month, s) * p.areaSqYd * factor;
    for (const d of p.known) {
      if ((p.resolved || []).includes(d)) continue;
      gross *= d === "ASSIGNED_LAND" ? 0.03 : d === "WAKF_CLAIM" ? 0.3 : 0.72;
    }
    gross *= p.stigma || 1;
    const rng = getRng(s);
    const hidden = p.defects.filter((d) => !p.known.includes(d));
    for (const d of hidden) if (rng.chance(0.6)) gross *= 1 - DEFECTS[d].severity * 0.5;
    saveRng(s, rng);
    const net = Math.round(gross * 0.98);
    s.cash += net;
    p.owned = false;
    p.sold = s.month;
    p.soldFor = net;
    s.parcels = s.parcels.filter((x) => x.id !== parcelId);
    const gain = net - p.allInCost;
    s.revenueYTD += net;
    s.costYTD += p.allInCost;
    s.ledger.push({ m: s.month, type: "Land sale", amount: net, note: `${p.label} (${gain >= 0 ? "gain" : "loss"} ${money(Math.abs(gain))})` });
    return { ok: true, net, gain };
  }
  function sellAsset(s, assetId, factor = 1) {
    const a = s.assets.find((x) => x.id === assetId);
    if (!a) return { ok: false, msg: "Not found." };
    if (a.pledged) {
      const l = s.loans.find((x) => x.assetId === assetId);
      return { ok: false, msg: l ? `This building secures ${money(l.outstanding)} of lease rental discounting. Repay that facility before you can sell it.` : "Pledged to a lender." };
    }
    const v = Math.round(assetValue(a, s) * factor * 0.97);
    s.cash += v;
    s.assets = s.assets.filter((x) => x.id !== assetId);
    s.revenueYTD += v;
    s.costYTD += a.bookCost;
    s.ledger.push({ m: s.month, type: "Asset sale", amount: v, note: a.name });
    return { ok: true, net: v, gain: v - a.bookCost };
  }
  function hire(s, roleKey) {
    const role = ROLES[roleKey];
    const rng = getRng(s);
    const salary = Math.round(role.base * salaryIndex(s.month) * rng.range(0.9, 1.2));
    const person = {
      id: nextId(s, "S"),
      role: roleKey,
      roleName: role.name,
      impact: role.impact,
      name: `${rng.pick(FIRST_NAMES)} ${rng.pick(SURNAMES)}`,
      salary,
      skill: Math.round(clamp(rng.normal(role.skillCap * 0.75, 12), 20, role.skillCap)),
      loyalty: Math.round(rng.range(45, 75)),
      corruptionRisk: rng.range(0.02, 0.16),
      joined: s.month
    };
    saveRng(s, rng);
    s.staff.push(person);
    s.news.push({ m: s.month, tag: "PEOPLE", head: `${person.name} joins as ${role.name}`, body: `Salary ${money(salary)} a month.` });
    return person;
  }
  function fire(s, id) {
    const p = s.staff.find((x) => x.id === id);
    if (!p) return;
    s.cash -= p.salary * 2;
    s.staff = s.staff.filter((x) => x.id !== id);
  }
  function setAsk(s, invId, pricePerSqFt) {
    const inv = s.inventory.find((i) => i.id === invId);
    if (inv) inv.askPerSqFt = pricePerSqFt;
  }
  function getRng(s) {
    const r = makeRng(s.seed);
    r.state = s.rngState;
    return r;
  }
  function saveRng(s, r) {
    s.rngState = r.state;
  }
  function pay(s, amount) {
    if (amount <= 0) return 0;
    const limit = Math.max(2e5 * costIndex(s.month), (s.bs ? s.bs.assets : 0) * 0.03);
    const paid = Math.min(amount, Math.max(0, s.cash + limit));
    s.cash -= paid;
    return paid;
  }
  function spend(s, amount) {
    if (amount <= 0) return 0;
    const limit = Math.max(4e5 * costIndex(s.month), (s.bs ? s.bs.assets : 0) * 0.06);
    const paid = Math.min(amount, Math.max(0, s.cash + limit));
    s.cash -= paid;
    const unpaid = amount - paid;
    if (unpaid > 5e4) {
      s.payables = (s.payables || 0) + unpaid;
      s.news.push({
        m: s.month,
        tag: "FINANCE",
        head: `Unable to pay ${money(unpaid)}`,
        body: "The bill has gone unpaid. It is now a creditor on your books, and creditors in this trade do not write polite reminders."
      });
    }
    return paid;
  }
  function buildFx(s, rng) {
    const fx = {
      scaled: (v) => Math.round(v * costIndex(s.month)),
      // Amounts that should track the size of the company, not just the price level:
      // nobody asks a one-project builder for the donation they ask a conglomerate for.
      byScale: (v) => Math.round(v * costIndex(s.month) * clamp(Math.max(s.netWorth, 0) / 3e7, 0.1, 25)),
      costIndex: () => costIndex(s.month),
      landRate: (loc) => landRate(loc, s.month, s),
      defectName: (d) => DEFECTS[d].name,
      defectDesc: (d) => DEFECTS[d].desc,
      cash(v) {
        if (v < 0) pay(s, -v);
        else s.cash += v;
        if (v !== 0) s.ledger.push({ m: s.month, type: v > 0 ? "Receipt" : "Payment", amount: Math.round(v), note: "Event" });
      },
      rep(v) {
        s.reputation = clamp(s.reputation + v, 0, 100);
      },
      rel(k, v) {
        if (s.relations[k] !== void 0) s.relations[k] = clamp(s.relations[k] + v, 0, 100);
      },
      skill(k, v) {
        s.skills[k] = clamp(s.skills[k] + v, 0, 100);
      },
      news(text) {
        s.news.push({ m: s.month, tag: "NOTE", head: text, body: "" });
      },
      privateLoan(amount, rate, tenure) {
        takeLoan(s, LENDERS.chalapathi, Math.round(amount), rate, tenure);
        s.ledger.push({ m: s.month, type: "Private borrowing", amount: Math.round(amount), note: `at ${(rate * 100).toFixed(0)}% p.a.` });
      },
      penalise(extra) {
        for (const l of s.loans) l.rate += extra;
      },
      delay(pid, months) {
        const p = s.projects.find((x) => x.id === pid);
        if (p) {
          p.delay += months;
          p.riskDelay = Math.min(p.months * 0.5, (p.riskDelay || 0) + months);
        }
      },
      overrun(pid, pctv) {
        const p = s.projects.find((x) => x.id === pid);
        if (p) p.overrunPct = clamp(p.overrunPct + pctv, -0.1, 0.4);
      },
      quality(pid, v) {
        const p = s.projects.find((x) => x.id === pid);
        if (p) p.quality = clamp(p.quality + v, 0.2, 1);
      },
      speedApproval(pid, months) {
        const p = s.projects.find((x) => x.id === pid);
        if (p) p.approvalLeft = Math.max(0, p.approvalLeft - months);
      },
      delayApproval(pid, months) {
        const p = s.projects.find((x) => x.id === pid);
        if (p) p.approvalLeft += months;
      },
      shrinkPipeline(f) {
        for (const p of s.projects) if (!p.done) {
          p.sqFt = Math.round(p.sqFt * (1 - f));
          p.presold = Math.min(p.presold || 0, p.sqFt);
        }
      },
      deviationFlag() {
        s.flags.deviationFlagged = true;
      },
      constructionCapability() {
        return clamp(0.2 + s.skills.construction / 220 + (s.staff.some((x) => x.impact === "construction") ? 0.2 : 0), 0.15, 0.85);
      },
      bribe(pid, r) {
        s.stats.bribesTaken += 1;
        const caught = r.f() < 0.18 + s.stats.bribesTaken * 0.05 + (s.reputation > 55 ? 0.08 : 0);
        const amt = fx.scaled(12e4);
        pay(s, amt);
        if (caught) {
          s.reputation = clamp(s.reputation - 22, 0, 100);
          s.relations.bureaucrats = clamp(s.relations.bureaucrats - 25, 0, 100);
          s.relations.journalists = clamp(s.relations.journalists - 10, 0, 100);
          s.relations.banks = clamp(s.relations.banks - 15, 0, 100);
          s.flags.underInvestigation = true;
          const p = s.projects.find((x) => x.id === pid);
          if (p) p.approvalLeft += r.int(6, 18);
          s.news.push({
            m: s.month,
            tag: "CRISIS",
            head: "Anti-corruption enquiry opened",
            body: "The payment was recorded. The Anti-Corruption Bureau has registered a case and your file is now radioactive. Every bank and every buyer will hear about this."
          });
        } else {
          const p = s.projects.find((x) => x.id === pid);
          if (p) p.approvalLeft = Math.max(0, p.approvalLeft - r.int(2, 5));
          s.relations.bureaucrats = clamp(s.relations.bureaucrats + 6, 0, 100);
          s.reputation = clamp(s.reputation - 2, 0, 100);
          s.news.push({ m: s.month, tag: "NOTE", head: "The file moved.", body: "Nobody said anything. That is how it works, until it does not." });
        }
      },
      resolveDefect(parcelId, d, how, r) {
        const p = s.parcels.find((x) => x.id === parcelId);
        if (!p) return;
        if (!p.known.includes(d)) p.known.push(d);
        p.resolved = p.resolved || [];
        s.stats.defectsHit += 1;
        const def = DEFECTS[d];
        const legalStrength = clamp(0.3 + s.skills.legal / 200 + (s.staff.some((x) => x.impact === "legal") ? 0.2 : 0) + s.relations.politicians / 400, 0.2, 0.9);
        const value = landRate(p.locality, s.month, s) * p.areaSqYd;
        if (how === "litigate") {
          const cost = Math.round(Math.min(Math.max(fx.scaled(15e4), value * 0.03), Math.max(fx.scaled(2e5), s.cash * 0.6 + fx.scaled(1e5))));
          pay(s, cost);
          if (def.fatal) {
            s.news.push({ m: s.month, tag: "CRISIS", head: `${p.label}: the suit is hopeless`, body: `${def.name}. No court can validate this transfer. The land, and the money you paid for it, are gone.` });
            p.stigma = 0.02;
          } else if (r.f() < legalStrength) {
            p.resolved.push(d);
            s.news.push({ m: s.month, tag: "LEGAL", head: `${p.label}: you won`, body: `It took time and ${money(cost)}, but the claim was dismissed.` });
          } else {
            p.stigma = (p.stigma || 1) * 0.6;
            s.news.push({ m: s.month, tag: "LEGAL", head: `${p.label}: injunction granted against you`, body: "Nothing can be built or sold until this is decided. Budget years, not months." });
            const proj = s.projects.find((x) => x.parcelId === p.id && !x.done);
            if (proj) proj.delay += r.int(8, 24);
          }
        } else if (how === "settle") {
          const cost = Math.round(Math.min(value * def.severity * r.range(0.18, 0.42), Math.max(fx.scaled(2e5), s.cash * 0.8)));
          pay(s, cost);
          if (def.fatal) {
            p.stigma = 0.05;
            s.news.push({ m: s.month, tag: "CRISIS", head: `${p.label}: nothing to settle`, body: "You cannot buy good title to assigned land. You paid a man to go away and another will come." });
          } else {
            p.resolved.push(d);
            s.news.push({ m: s.month, tag: "LEGAL", head: `${p.label}: settled for ${money(cost)}`, body: "Registered release deed obtained. Expensive, quick, and final." });
          }
        } else {
          if (r.f() < 0.35) {
            s.news.push({ m: s.month, tag: "NOTE", head: `${p.label}: nothing happened`, body: "He has not come back. Yet." });
          } else {
            const proj = s.projects.find((x) => x.parcelId === p.id && !x.done);
            if (proj) proj.delay += r.int(3, 12);
            p.stigma = (p.stigma || 1) * (def.fatal ? 0.05 : 0.55);
            s.reputation = clamp(s.reputation - 5, 0, 100);
            s.news.push({ m: s.month, tag: "CRISIS", head: `${p.label}: stop-work order`, body: `${def.name}. You built anyway. The order came, and buyers found out.` });
          }
        }
      },
      fireSale(factor) {
        let raised = 0;
        for (const inv of s.inventory) {
          raised += inv.remaining * inv.askPerSqFt * factor;
          inv.remaining = 0;
        }
        s.inventory = [];
        for (const p of s.parcels.filter((x) => x.owned && !x.usedBy && !x.pledged).slice(0, 2)) {
          const r = sellParcel(s, p.id, factor);
          if (r.ok) raised += 0;
        }
        s.cash += Math.round(raised);
        s.revenueYTD += Math.round(raised);
        s.ledger.push({ m: s.month, type: "Distress sale", amount: Math.round(raised), note: `at ${Math.round(factor * 100)}% of asking` });
        s.news.push({ m: s.month, tag: "FINANCE", head: `Sold inventory at ${Math.round((1 - factor) * 100)}% below asking`, body: `Raised ${money(raised)}. The market now knows your price.` });
      },
      pledgeLand() {
        const p = s.parcels.find((x) => x.owned && !x.pledged);
        if (p) {
          p.pledged = true;
          s.news.push({ m: s.month, tag: "FINANCE", head: `${p.label} pledged`, body: "Additional security lodged with the bank." });
        }
      },
      emergencyEquity(dilution) {
        const raise = Math.round(Math.max(s.debt * 0.35, s.netWorth * 0.2));
        s.cash += raise;
        s.equityPaidIn += raise;
        s.dilution = (s.dilution || 0) + dilution;
        s.news.push({
          m: s.month,
          tag: "FINANCE",
          head: `Emergency equity: ${money(raise)} for ${Math.round(dilution * 100)}% of the company`,
          body: "At this valuation it is not investment, it is rescue. You keep control on paper and very little else."
        });
      },
      cutOverheads(f) {
        const n = Math.max(0, Math.floor(s.staff.length * f));
        const gone = s.staff.slice(-n);
        for (const p of gone) fire(s, p.id);
        s.news.push({ m: s.month, tag: "PEOPLE", head: `${n} people let go`, body: "Overheads cut. Capability cut with them." });
      },
      loyaltyAll(v) {
        for (const p of s.staff) p.loyalty = clamp(p.loyalty + v, 0, 100);
      },
      raise(id, f) {
        const p = s.staff.find((x) => x.id === id);
        if (p) p.salary = Math.round(p.salary * (1 + f));
      },
      loyalty(id, v) {
        const p = s.staff.find((x) => x.id === id);
        if (p) p.loyalty = clamp(p.loyalty + v, 0, 100);
      },
      quit(id) {
        s.staff = s.staff.filter((x) => x.id !== id);
      },
      fire: (id) => fire(s, id),
      hireRole: (r) => hire(s, r),
      rentCut(id, f, months) {
        const a = s.assets.find((x) => x.id === id);
        if (a) {
          a.rentPerSqFt *= 1 - f;
          a.rentHolidayLeft = months;
        }
      },
      vacate(id) {
        const a = s.assets.find((x) => x.id === id);
        if (a) a.occupancy = Math.max(0, a.occupancy - 0.45);
      },
      marketRents(f) {
        for (const a of s.assets) a.rentPerSqFt *= 1 + f;
      },
      fillVacancy(f) {
        for (const a of s.assets) a.occupancy = clamp(a.occupancy + (a.targetOcc - a.occupancy) * f, 0, 1);
      },
      upgradeAsset(id, f) {
        const a = s.assets.find((x) => x.id === id);
        if (a) {
          a.quality = clamp(a.quality + f, 0.2, 1);
          a.rentPerSqFt *= 1 + f * 0.8;
          a.targetOcc = clamp(a.targetOcc + f * 0.4, 0.5, 0.97);
        }
      },
      sellAsset: (id, f) => sellAsset(s, id, f),
      sellParcel: (id, f) => sellParcel(s, id, f),
      repriceInventory(f) {
        for (const i of s.inventory) i.askPerSqFt *= 1 + f;
      },
      absorption(v) {
        s.absorptionBoost = clamp((s.absorptionBoost || 0) + v, -0.6, 1.5);
      },
      stockSteel() {
        const c = Math.min(fx.scaled(4e5), Math.max(0, s.cash * 0.4));
        pay(s, c);
        for (const p of s.projects) if (!p.done) p.overrunPct -= 0.01;
        return c;
      },
      slowMonth(n) {
        for (const p of s.projects) if (!p.done) {
          p.delay += n;
          p.riskDelay = Math.min(p.months * 0.5, (p.riskDelay || 0) + n);
        }
      },
      suggestBuild(pid, type) {
        s.suggestion = { parcelId: pid, type };
      },
      buyoutJV(id, mult) {
        const jv = s.jvs.find((x) => x.id === id);
        if (!jv) return;
        const cost = Math.round(jv.partnerCapital * mult);
        if (s.cash < cost) {
          s.news.push({
            m: s.month,
            tag: "DEAL",
            head: `You cannot afford to buy out ${jv.partner}`,
            body: `He wants ${money(cost)} and you have ${money(s.cash)}. The project stays frozen and he now knows exactly how weak your position is.`
          });
          jv.frozenUntil = s.month + 9;
          return;
        }
        pay(s, cost);
        s.jvs = s.jvs.filter((x) => x.id !== id);
        s.news.push({ m: s.month, tag: "DEAL", head: `Bought out ${jv.partner}`, body: `Paid ${money(cost)}. The project is entirely yours, including the problems.` });
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
          head: "A landowner has come looking for you",
          body: `${o.seller} owns ${o.label.replace(" at ", " at ")}. He has heard your name. He is selling because of ${o.motive}, and he is asking ${money(o.price)} \u2014 about \u20B9${o.askRate.toLocaleString("en-IN")} a square yard.

He has not shown anybody else. He would like an answer.`,
          choices: [
            { label: "Take it to the deal desk", hint: "Adds the parcel to your live opportunities so you can investigate and negotiate.", do: () => {
            } },
            { label: "Not interested", hint: "He will remember.", do: ({ fx: f }) => {
              s.offers = s.offers.filter((x) => x.id !== o.id);
              f.rel("landowners", -4);
            } }
          ]
        };
      },
      distressOffer(r) {
        const o = makeLandOffer(s.month, s, r, { distress: true, big: r.chance(0.5) });
        o.expiresAt = s.month + r.int(1, 3);
        s.offers.push(o);
        return {
          head: "Somebody needs to sell this week",
          body: `${o.seller} is under pressure \u2014 ${o.motive}. ${o.label}, at ${money(o.price)}, which is well under what it was quoted at last year.

There is a reason it is cheap. There is always a reason it is cheap. Whether the reason is his problem or yours depends entirely on how carefully you look.`,
          choices: [
            { label: "Put it on the deal desk", hint: "Investigate before you commit.", do: () => {
            } },
            { label: "Pass", hint: "", do: ({ fx: f }) => {
              s.offers = s.offers.filter((x) => x.id !== o.id);
            } }
          ]
        };
      },
      anchorTenantOffer(r) {
        const a = r.pick(s.assets.filter((x) => x.use === "office" && x.occupancy < 0.9));
        const sqFt = Math.min(a.sqFt * r.range(0.4, 0.9), a.sqFt * (1 - a.occupancy));
        const disc = r.range(0.82, 0.95);
        return {
          head: "A multinational wants space",
          body: `Their real estate manager has walked ${a.name} twice. They want ${Math.round(sqFt).toLocaleString("en-IN")} square feet on a nine-year lease with a lock-in of three, escalation of fifteen per cent every three years, and a rent ${Math.round((1 - disc) * 100)} per cent below your asking.

They also want six months rent free for fit-out, and they will not negotiate on the lock-in.`,
          choices: [
            {
              label: "Sign it",
              hint: "Below-market rent, but a covenant a bank will lend against.",
              do: ({ fx: f }) => {
                a.occupancy = clamp(a.occupancy + sqFt / a.sqFt, 0, 1);
                a.rentPerSqFt *= disc;
                a.rentHolidayLeft = 6;
                a.deposit += Math.round(sqFt * a.rentPerSqFt * 6);
                s.cash += Math.round(sqFt * a.rentPerSqFt * 6);
                a.anchor = true;
                f.rep(6);
                f.rel("banks", 8);
                f.rel("investors", 8);
                f.news(`${a.name} anchored on a nine-year lease. That single document just made the building financeable.`);
              }
            },
            {
              label: "Hold out for your asking rent",
              hint: "They have four other buildings to look at.",
              do: ({ fx: f, rng: rr }) => {
                if (rr.chance(0.3)) {
                  a.occupancy = clamp(a.occupancy + sqFt / a.sqFt, 0, 1);
                  f.rep(4);
                  f.news("They blinked and signed at your rent.");
                } else {
                  f.news("They took the building down the road. Your floors are still empty.");
                  f.rel("investors", -3);
                }
              }
            }
          ]
        };
      },
      jvOffer(r) {
        const partner = `${r.pick(FIRST_NAMES)} ${r.pick(SURNAMES)}`;
        const loc = r.pick(Object.keys(BY_ID));
        const areaSqYd = Math.round(r.range(2e3, 9e3));
        const value = Math.round(landRate(loc, s.month, s) * areaSqYd);
        const share = r.range(0.45, 0.62);
        return {
          head: `${partner} wants to put land into a joint venture`,
          body: `He owns ${areaSqYd.toLocaleString("en-IN")} square yards at ${BY_ID[loc].name}, worth roughly ${money(value)}. He has no ability to build and no intention of selling.

He proposes: he contributes the land, you contribute the entire construction cost and the management, and he takes ${Math.round(share * 100)} per cent of the revenue.`,
          choices: [
            {
              label: `Accept at ${Math.round(share * 100)}%`,
              hint: "No land capital required. A partner who can freeze you.",
              do: ({ fx: f }) => {
                const p = { id: nextId(s, "PL"), owned: true, isJv: true, locality: loc, areaSqYd, label: `JV land, ${BY_ID[loc].name}`, purchased: s.month, price: 0, duty: 0, legal: 0, allInCost: 0, defects: [], known: [], resolved: [], devAgreement: { ownerShare: share, owner: partner } };
                s.parcels.push(p);
                s.jvs.push({ id: nextId(s, "JV"), name: `JV at ${BY_ID[loc].name}`, partner, share, partnerCapital: value, parcelId: p.id });
                f.rel("landowners", 8);
              }
            },
            {
              label: "Counter at a lower share",
              hint: "Your negotiation skill decides this.",
              do: ({ fx: f, rng: rr }) => {
                if (rr.f() < s.skills.negotiation / 130) {
                  const ns = share - 0.1;
                  const p = { id: nextId(s, "PL"), owned: true, isJv: true, locality: loc, areaSqYd, label: `JV land, ${BY_ID[loc].name}`, purchased: s.month, price: 0, duty: 0, legal: 0, allInCost: 0, defects: [], known: [], resolved: [], devAgreement: { ownerShare: ns, owner: partner } };
                  s.parcels.push(p);
                  s.jvs.push({ id: nextId(s, "JV"), name: `JV at ${BY_ID[loc].name}`, partner, share: ns, partnerCapital: value, parcelId: p.id });
                  f.news(`Agreed at ${Math.round(ns * 100)} per cent.`);
                } else {
                  f.news("He walked. Somebody else will take it at his number.");
                  f.rel("landowners", -3);
                }
              }
            },
            { label: "Decline", hint: "", do: () => {
            } }
          ]
        };
      },
      institutionalOffer(r) {
        const raise = Math.round(s.netWorth * r.range(0.15, 0.35));
        const stake = r.range(0.12, 0.26);
        return {
          head: "A private equity fund wants a stake in the rental portfolio",
          body: `They have looked at your leased assets, your rent rolls and your title files for four months. They will put ${money(raise)} into a platform holding the income assets, for ${Math.round(stake * 100)} per cent, with a board seat, audited accounts, a quarterly reporting pack and drag-along rights after seven years.

They are not interested in the development business. They have said so twice.`,
          choices: [
            {
              label: "Take the money and the governance",
              hint: "Dilution, discipline, and a cost of capital nobody else in Hyderabad has.",
              do: ({ fx: f }) => {
                s.cash += raise;
                s.equityPaidIn += raise;
                s.dilution = (s.dilution || 0) + stake;
                s.flags.institutional = true;
                s.flags.cleanBooks = true;
                f.rel("investors", 25);
                f.rel("banks", 15);
                f.rep(10);
                f.news("Institutional capital on the register. Your borrowing cost drops and your freedom of action drops with it.");
              }
            },
            {
              label: "Take a smaller cheque without the board seat",
              hint: "Less money, less interference. They may refuse.",
              do: ({ fx: f, rng: rr }) => {
                if (rr.chance(0.4)) {
                  s.cash += raise * 0.5;
                  s.equityPaidIn += raise * 0.5;
                  s.dilution = (s.dilution || 0) + stake * 0.6;
                  f.rel("investors", 10);
                } else {
                  f.news("They declined. Funds do not write cheques without governance.");
                  f.rel("investors", -5);
                }
              }
            },
            { label: "Stay private", hint: "Full control, slower growth.", do: ({ fx: f }) => {
              f.rel("investors", -6);
              f.rep(2);
            } }
          ]
        };
      },
      diversifyOffer(r) {
        const sectors = [
          { id: "warehouse", name: "Logistics and warehousing", cost: 0.1, yield: 0.11, desc: "Post-ORR, post-GST, national occupiers want large-format warehouses on ninety-nine-year leases. Low glamour, very high certainty." },
          { id: "datacentre", name: "Data centres", cost: 0.14, yield: 0.13, desc: "Power, fibre, cooling and covenants from companies with balance sheets larger than the state government. Capital-hungry and technical." },
          { id: "hospitality", name: "Hotels", cost: 0.12, yield: 0.08, desc: "An operating business dressed as real estate. Cyclical, staff-heavy, and it will teach you humility." },
          { id: "roads", name: "Road and infrastructure contracting", cost: 0.16, yield: 0.1, desc: "Government contracts, working capital that never comes back on time, and political exposure you cannot switch off." },
          { id: "retailops", name: "Shopping centre operations", cost: 0.11, yield: 0.09, desc: "Not building malls but running them: leasing, marketing, footfall. A genuinely different skill." }
        ].filter((x) => !s.subsidiaries.some((y) => y.id === x.id));
        if (!sectors.length) return null;
        const sec = r.pick(sectors);
        const cost = Math.round(s.netWorth * sec.cost);
        return {
          head: `An opportunity to enter ${sec.name.toLowerCase()}`,
          body: `${sec.desc}

Entry costs roughly ${money(cost)} of capital plus a management team you do not currently have. Stabilised return of about ${Math.round(sec.yield * 100)} per cent on capital employed, in three to five years, if it is run properly.

You cannot run it yourself. You are already stretched.`,
          choices: [
            {
              label: "Enter it properly: capital plus a hired management team",
              hint: "Expensive. The only version that works.",
              do: ({ fx: f }) => {
                if (s.cash < cost) {
                  f.news(`You could not fund the entry into ${sec.name.toLowerCase()}.`);
                  return;
                }
                pay(s, cost);
                s.subsidiaries.push({ id: sec.id, name: sec.name, capital: cost, value: cost, yield: sec.yield, quality: 0.8, started: s.month });
                hire(s, "coo");
                f.rep(4);
                f.news(`${sec.name} arm established with ${money(cost)} of capital and a proper management team.`);
              }
            },
            {
              label: "Enter it cheaply and manage it yourself",
              hint: "Half the capital. Much worse odds.",
              do: ({ fx: f, rng: rr }) => {
                const c = Math.round(cost * 0.5);
                if (s.cash < c) {
                  f.news("Not enough cash even for the cheap version.");
                  return;
                }
                pay(s, c);
                const ok = rr.f() < 0.4;
                s.subsidiaries.push({ id: sec.id, name: sec.name, capital: c, value: ok ? c : c * 0.5, yield: ok ? sec.yield * 0.8 : sec.yield * 0.3, quality: ok ? 0.6 : 0.3, started: s.month });
                s.stress += 12;
                f.news(ok ? `${sec.name} started lean. It is working, so far.` : `${sec.name} started lean. It is not working, and it is eating your attention.`);
              }
            },
            { label: "Stay focused on real estate", hint: "Focus is a strategy.", do: ({ fx: f }) => {
              f.rep(1);
            } }
          ]
        };
      },
      infraRumour(r) {
        const loc = r.pick(Object.values(BY_ID).filter((l) => l.zone !== "core"));
        const real = r.chance(0.42);
        const kind = r.pick(["a four-lane road widening", "a flyover", "an IT park", "a ring road interchange", "a government medical college", "a railway terminal", "a special economic zone"]);
        return {
          head: `Talk of ${kind} at ${loc.name}`,
          body: `Your broker says it is confirmed. A man at the Secretariat says the file exists. The local MLA has been photographed at the site. Land agents in ${loc.name} have raised quotes twenty per cent this month.

Nothing has been notified in the gazette. Nothing has been surveyed. Nothing is certain, and everybody is behaving as though it is.`,
          choices: [
            {
              label: `Buy in ${loc.name} now, before it is confirmed`,
              hint: "The whole game, in one decision.",
              do: ({ fx: f, rng: rr }) => {
                const o = makeLandOffer(s.month, s, rr, { locality: loc.id, big: true });
                o.askRate = Math.round(o.askRate * 1.18);
                o.price = o.askRate * o.areaSqYd;
                o.expiresAt = s.month + 2;
                o.rumour = real;
                s.offers.push(o);
                f.news(`A parcel at ${loc.name} is on your deal desk at the new, higher quote.`);
              }
            },
            {
              label: "Verify it first \u2014 pay a consultant to check the file",
              hint: `${money(fx.scaled(6e4))}. Costs you the window.`,
              do: ({ fx: f }) => {
                f.cash(-fx.scaled(6e4));
                if (real) f.news(`The file is genuine, though the timeline is anybody's guess. Prices at ${loc.name} have already moved another twelve per cent while you checked.`);
                else f.news(`There is no file. The rumour was started by three land agents who had already bought at ${loc.name}.`);
                s.flags[`rumour_${loc.id}`] = real ? "true" : "false";
              }
            },
            { label: "Ignore it", hint: "Most of these are nothing.", do: () => {
            } }
          ]
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
      }
    };
    return fx;
  }
  function pickEvent(s, rng) {
    const fxProbe = buildFx(s, rng);
    const pool = [];
    for (const e2 of EVENTS) {
      const cd = s.eventCooldown[e2.id] || -99;
      if (s.month - cd < (e2.cooldown || 30)) continue;
      let ok = false;
      try {
        ok = e2.when(s);
      } catch (err) {
        ok = false;
      }
      if (!ok) continue;
      let w = 0;
      try {
        w = e2.weight(s);
      } catch (err) {
        w = 0;
      }
      if (w > 0) pool.push([e2, w]);
    }
    if (!pool.length) return null;
    const e = rng.weighted(pool);
    let card = null;
    try {
      card = e.build(s, rng, fxProbe);
    } catch (err) {
      card = null;
    }
    if (!card) return null;
    s.eventCooldown[e.id] = s.month;
    card.id = e.id;
    card.cat = e.cat;
    return card;
  }
  function resolveEvent(s, choiceIndex) {
    const card = s.pendingEvent;
    if (!card) return;
    const rng = getRng(s);
    const fx = buildFx(s, rng);
    const ch = card.choices[choiceIndex];
    try {
      ch.do({ s, rng, fx });
    } catch (err) {
      console.error("event effect failed", card.id, err);
    }
    s.news.push({ m: s.month, tag: "DECISION", head: card.head, body: `You chose: ${ch.label}` });
    saveRng(s, rng);
    s.pendingEvent = null;
    refresh(s);
  }
  function tickCompetitors(s, rng) {
    for (const c of COMPETITORS) {
      if (c.from === s.month && !s.competitors.some((x) => x.id === c.id)) {
        s.competitors.push({ ...c, scale: c.strength });
        s.news.push({ m: s.month, tag: "MARKET", head: `${c.name} enters the market`, body: c.desc });
      }
    }
    for (const c of s.competitors) {
      const growth = (s.macro.demand - 0.95) * 0.02 * (c.style === "aggressive" ? 1.8 : c.style === "reckless" ? 2.2 : 1);
      c.scale = clamp(c.scale * (1 + growth) + rng.normal(0, 4e-3), 0.02, 3);
      if (c.style === "reckless" && s.macro.credit < 0.35 && rng.chance(0.06) && !c.dead) {
        c.dead = true;
        c.scale *= 0.2;
        s.news.push({
          m: s.month,
          tag: "MARKET",
          head: `${c.name} has stopped work on all sites`,
          body: "Buyers are outside the office. The financiers have taken the site keys. Somebody will buy those half-built projects cheap."
        });
        s.offers.push(Object.assign(makeLandOffer(s.month, s, rng, { distress: true, big: true }), { seller: `${c.name} (liquidator)` }));
      }
    }
  }
  function refreshOffers(s, rng) {
    s.offers = s.offers.filter((o) => o.expiresAt > s.month);
    const target = 4 + Math.floor(clamp(s.reputation, 0, 100) / 25) + (s.macro.demand < 0.85 ? 2 : 0);
    let guard = 0;
    while (s.offers.length < target && guard++ < 12) {
      const kind = rng.weighted([
        ["land", 6],
        ["dev", s.month > 6 ? 2 : 0.5],
        ["asset", s.month > 36 && s.netWorth > 5e6 ? 1.6 : 0]
      ]);
      let o = null;
      if (kind === "land") o = makeLandOffer(s.month, s, rng, { distress: s.macro.demand < 0.8 && rng.chance(0.4) });
      else if (kind === "dev") o = makeDevAgreement(s.month, s, rng);
      else o = makeAssetOffer(s.month, s, rng);
      if (o) s.offers.push(o);
    }
  }
  function advanceMonth(s) {
    if (s.over || s.pendingEvent) return s;
    s.month += 1;
    s.tickCount += 1;
    refresh(s);
    const rng = getRng(s);
    for (const t of TIMELINE) {
      if (t.m !== s.month) continue;
      s.news.push({ m: s.month, tag: t.tag, head: t.head, body: t.body, major: true });
      const e = t.effect || {};
      if (e.infraBudget) s.infraBudget = e.infraBudget;
      if (e.bizConfidence) s.bizConfidence = e.bizConfidence;
      if (e.approvalSpeed) s.approvalSpeedMod = e.approvalSpeed;
      if (e.materialSpike) {
        s.materialSpike = e.materialSpike;
        for (const p of s.projects) if (!p.done) p.overrunPct += 0.02;
      }
      if (e.unlock) s.flags[e.unlock] = true;
      if (e.crash) {
        s.crashActive = true;
        s.crashUntil = s.month + 18;
      }
      if (e.farRelax) s.flags.AIRPORT_LIVE = true;
      if (e.end) {
        s.flags.covid = true;
      }
    }
    if (s.crashActive && s.month > (s.crashUntil || 0)) s.crashActive = false;
    let projectSpend = 0, presaleCash = 0;
    for (const p of s.projects) {
      if (p.done) continue;
      const spend2 = tickProject(p, s, rng);
      s.cash -= spend2;
      projectSpend += spend2;
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
            m: s.month,
            tag: "PROJECT",
            head: `${p.name} has been idle for a year`,
            body: "Shuttering is warping, the steel is rusting and the watchman has not been paid. You can abandon the site and recover part of what you have sunk, or find money from somewhere."
          });
        }
      }
    }
    const sales = tickInventory(s, rng);
    s.cash += sales.revenue;
    s.revenueYTD += sales.revenue;
    s.costYTD += sales.cogs;
    s.absorptionBoost *= 0.9;
    let noi = 0;
    for (const a of s.assets) {
      const r = tickAsset(a, s, rng);
      noi += r.noi;
    }
    const ptax = propertyTax(s);
    s.cash += noi;
    spend(s, ptax);
    s.noiYTD += noi;
    for (const sub of s.subsidiaries) {
      const income = sub.capital * (sub.yield / 12) * clamp(s.macro.demand, 0.4, 1.6) * sub.quality;
      s.cash += income;
      s.revenueYTD += income;
      sub.value = sub.value * (1 + s.macro.gdp / 100 / 12) + income * 0.3;
    }
    const payroll = s.staff.reduce((t, p) => t + p.salary, 0);
    const officeCost = Math.round((3e3 + s.staff.length * 2200) * costIndex(s.month));
    const personal = s.flags.founderSalaryZero ? 0 : Math.round(s.personalExpense * costIndex(s.month) * (1 + s.netWorth / 4e9));
    spend(s, payroll + officeCost + personal);
    s.opexYTD += payroll + officeCost;
    for (const p of s.staff) {
      p.loyalty = clamp(p.loyalty + (s.cash > payroll * 3 ? 0.4 : -1.2), 0, 100);
      if (p.loyalty < 18 && rng.chance(0.12)) {
        s.news.push({ m: s.month, tag: "PEOPLE", head: `${p.name} has resigned`, body: `Your ${p.roleName.toLowerCase()} has left.` });
        s.staff = s.staff.filter((x) => x.id !== p.id);
      }
    }
    if (s.payables > 0) {
      s.payables *= 1 + 0.01;
      const pay2 = Math.min(s.payables, Math.max(0, s.cash));
      s.cash -= pay2;
      s.payables -= pay2;
      if (s.payables > Math.max(5e5, (s.bs.assets || 0) * 0.25)) {
        s.creditorMonths = (s.creditorMonths || 0) + 1;
      } else s.creditorMonths = 0;
      if (s.payables > (s.bs.assets || 1) * 0.15 && rng.chance(0.12)) {
        s.reputation = clamp(s.reputation - 4, 0, 100);
        s.relations.contractors = clamp(s.relations.contractors - 6, 0, 100);
        s.news.push({
          m: s.month,
          tag: "CRISIS",
          head: "Creditors are refusing to supply",
          body: `You owe ${money(s.payables)} to contractors and suppliers who have stopped delivering. Two of them have sent legal notices.`
        });
      }
    }
    const ds = serviceDebt(s);
    s.interestYTD += ds.interest;
    if (ds.missed > 0 && rng.chance(0.4)) {
      s.relations.banks = clamp(s.relations.banks - 4, 0, 100);
      s.news.push({
        m: s.month,
        tag: "FINANCE",
        head: `${ds.missed} instalment${ds.missed === 1 ? "" : "s"} unpaid`,
        body: "The interest has been added to your principal. This is the beginning of the spiral that ends companies."
      });
    }
    for (const l of distressedLoans(s)) {
      if (l.kind === "private" && rng.chance(0.35)) {
        const p = s.parcels.find((x) => x.owned && !x.consumed);
        if (p) {
          s.parcels = s.parcels.filter((x) => x.id !== p.id);
          l.outstanding *= 0.4;
          l.missed = 0;
          s.news.push({ m: s.month, tag: "CRISIS", head: `${p.label} taken by the financier`, body: "He presented the blank cheque, then the registered agreement you signed and did not read. The land is his." });
        }
      } else if (rng.chance(0.2)) {
        s.flags.npa = true;
        s.relations.banks = clamp(s.relations.banks - 10, 0, 100);
        s.news.push({ m: s.month, tag: "CRISIS", head: "Account classified as non-performing", body: "Recovery proceedings have started. Every other lender in the city will know within a fortnight." });
      }
    }
    const load = s.projects.filter((p) => !p.done).length + s.assets.length * 0.3 + s.subsidiaries.length * 1.5;
    const relief = s.staff.filter((p) => ROLES[p.role]?.exec).length * 6 + (s.staff.length > 4 ? 3 : 0);
    s.stress = clamp(s.stress + load * 1.1 - relief - 2 + (s.cash < 0 ? 5 : 0), 0, 100);
    s.reputation = clamp(s.reputation + (s.stats.projectsDone > 0 ? 0.16 : 0.02) + (s.ratios.occupancy > 0.8 ? 0.08 : 0) - (s.flags.npa ? 0.25 : 0) - (s.payables > 0 ? 0.1 : 0), 0, 100);
    tickRegularisations(s, rng);
    tickIntel(s, rng);
    refreshOffers(s, rng);
    tickCompetitors(s, rng);
    const eventChance = clamp(0.19 + (s.crashActive ? 0.18 : 0) + s.projects.filter((p) => !p.done).length * 0.03, 0.1, 0.55);
    if (rng.f() < eventChance) {
      const card = pickEvent(s, rng);
      if (card) s.pendingEvent = card;
    }
    saveRng(s, rng);
    refresh(s);
    if (s.month % 12 === 0) closeYear(s, s.bs);
    checkEnd(s);
    return s;
  }
  function checkEnd(s) {
    if (s.month >= END_MONTH) {
      s.over = true;
      s.overReason = "time";
      return;
    }
    if ((s.creditorMonths || 0) >= 6 && s.netWorth < 0) {
      s.over = true;
      s.overReason = "insolvent";
      s.news.push({
        m: s.month,
        tag: "CRISIS",
        head: "Winding-up petition admitted",
        body: "Creditors you could not pay have taken the company to court. The sites, the land and the unsold flats will be sold by an official liquidator, and there will not be enough."
      });
      return;
    }
    if (s.netWorth < 0 && s.cash < 0 && s.debt > 0) {
      s.insolventMonths = (s.insolventMonths || 0) + 1;
      if (s.insolventMonths >= 7) {
        s.over = true;
        s.overReason = "insolvent";
        s.news.push({
          m: s.month,
          tag: "CRISIS",
          head: "The company is insolvent",
          body: "Liabilities exceed everything you own, the bank account is overdrawn and there is nothing left to sell that anyone will buy. The financiers have the land, the buyers have suits pending, and the staff left last month."
        });
      }
    } else {
      s.insolventMonths = 0;
    }
    if ((s.flags.healthWarning || 0) >= 3 && s.stress > 85) {
      s.over = true;
      s.overReason = "health";
    }
  }
  var LRS_WINDOWS = [
    { from: 156, to: 168, name: "LRS / BPS 2008" },
    // Jan 2008 - Dec 2008, Andhra Pradesh
    { from: 246, to: 258, name: "LRS 2015" }
    // Jul 2015 - Jun 2016, Telangana
  ];
  function lrsWindow(m) {
    return LRS_WINDOWS.find((w) => m >= w.from && m <= w.to) || null;
  }
  var REGULARISABLE = ["LAYOUT_UNAPPROVED", "MUNICIPAL_DEVIATION", "NO_ACCESS"];
  function regularisationQuote(s, target) {
    const win = lrsWindow(s.month);
    const isParcel = target.kind === "parcel";
    const base = isParcel ? landRate(target.locality, s.month, s) * target.areaSqYd : target.remaining * target.askPerSqFt;
    const pull = clamp(
      s.relations.bureaucrats / 200 + s.relations.politicians / 320 + (s.staff.some((x) => x.impact === "approvals") ? 0.14 : 0) + (s.staff.some((x) => x.impact === "legal") ? 0.08 : 0),
      0,
      0.5
    );
    const era = clamp(1 - Math.max(0, s.month - 96) / 260, 0.42, 1);
    const feeRate = win ? 0.24 : 0.34 - era * 0.1;
    const cost = Math.round(base * feeRate);
    const months = win ? Math.max(3, Math.round(7 - pull * 6)) : Math.max(6, Math.round((19 - pull * 14) * (1.25 - era * 0.4)));
    const chance = clamp(
      win ? 0.88 + pull * 0.2 : 0.28 + era * 0.34 + pull * 0.9,
      0.2,
      0.97
    );
    return { window: win, cost, months, chance, feeRate, base };
  }
  function applyForRegularisation(s, kind, id) {
    const target = kind === "parcel" ? s.parcels.find((p) => p.id === id && p.owned) : s.inventory.find((i) => i.id === id);
    if (!target) return { ok: false, msg: "Not found." };
    if (target.regularising) return { ok: false, msg: "An application is already pending on this." };
    const defects = kind === "parcel" ? (target.known || []).filter((d) => REGULARISABLE.includes(d) && !(target.resolved || []).includes(d)) : target.unapproved ? ["LAYOUT_UNAPPROVED"] : [];
    if (!defects.length) return { ok: false, msg: "There is nothing here that regularisation would fix." };
    const q = regularisationQuote(s, { kind, ...target });
    if (s.cash < q.cost) return { ok: false, msg: `The fees and open-space charges come to ${money(q.cost)} and you have ${money(s.cash)}.` };
    pay(s, q.cost);
    target.regularising = { kind, defects, monthsLeft: q.months, chance: q.chance, cost: q.cost, applied: s.month, window: q.window ? q.window.name : null };
    s.regularisations = s.regularisations || [];
    s.regularisations.push({ kind, id });
    s.ledger.push({ m: s.month, type: "Regularisation fees", amount: -q.cost, note: target.label || target.name });
    s.news.push({
      m: s.month,
      tag: "REGULATION",
      head: `Regularisation applied for: ${target.label || target.name}`,
      body: q.window ? `Filed under ${q.window.name}. Fees and open-space contribution of ${money(q.cost)} paid. Expect an answer in about ${q.months} months, and under a scheme the answer is usually yes.` : `No scheme is open, so this is an ordinary application asking an officer to exercise discretion. ${money(q.cost)} paid in charges and consultants' fees. Expect ${q.months} months and roughly a ${Math.round(q.chance * 100)} per cent chance of anything at all.`
    });
    return { ok: true, quote: q };
  }
  function tickRegularisations(s, rng) {
    if (!s.regularisations || !s.regularisations.length) return;
    const still = [];
    for (const ref of s.regularisations) {
      const t = ref.kind === "parcel" ? s.parcels.find((p) => p.id === ref.id) : s.inventory.find((i) => i.id === ref.id);
      if (!t || !t.regularising) continue;
      t.regularising.monthsLeft -= 1;
      if (t.regularising.monthsLeft > 0) {
        still.push(ref);
        continue;
      }
      const granted = rng.f() < t.regularising.chance;
      if (granted) {
        if (ref.kind === "parcel") {
          t.resolved = t.resolved || [];
          for (const d of t.regularising.defects) if (!t.resolved.includes(d)) t.resolved.push(d);
        } else {
          const wasRate = t.askPerSqFt;
          t.unapproved = false;
          t.type = "approved";
          t.askPerSqFt = plotPrice(t.locality, "approved", s.month, s);
          s.news.push({
            m: s.month,
            tag: "REGULATION",
            head: `${t.name} regularised`,
            body: `Sanctioned at last. The unsold plots re-rate from about \u20B9${Math.round(wasRate).toLocaleString("en-IN")} to \u20B9${Math.round(t.askPerSqFt).toLocaleString("en-IN")} a square yard, and buyers who would not touch it before will now take a loan against it.`
          });
        }
        s.reputation = clamp(s.reputation + 2, 0, 100);
        s.relations.bureaucrats = clamp(s.relations.bureaucrats + 4, 0, 100);
        if (ref.kind === "parcel") {
          s.news.push({
            m: s.month,
            tag: "REGULATION",
            head: `${t.label} regularised`,
            body: "The proceedings are issued and the defect is off the title. The land is now bankable, saleable and buildable."
          });
        }
      } else {
        s.news.push({
          m: s.month,
          tag: "REGULATION",
          head: `Regularisation refused: ${t.label || t.name}`,
          body: "The application has been returned. The fees are not. You may apply again, and you will pay again."
        });
        s.relations.bureaucrats = clamp(s.relations.bureaucrats - 2, 0, 100);
      }
      t.regularising = null;
    }
    s.regularisations = still;
  }

  // src/ui/app.js
  var $ = (sel, root = document) => root.querySelector(sel);
  var app = $("#app");
  var modalRoot = $("#modal-root");
  var S = null;
  var tab = "dashboard";
  var modal = null;
  var toast = null;
  var esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function boot() {
    const saved = loadGame();
    if (saved) {
      S = refresh(saved);
      render();
    } else renderStart();
  }
  function renderStart() {
    app.innerHTML = `
  <main>
    <div class="start stack">
      <div>
        <div class="sub">A business simulation \xB7 1 January 1995 \u2013 March 2020</div>
        <h1>Real Estate Empire<br>Hyderabad</h1>
      </div>
      <p class="lede">You are twenty-four. You have twenty-five lakh rupees, most of it your father's,
      a commerce degree, a Bajaj Chetak and three years of brokering plots in Kukatpally. Stamp duty is
      fourteen and a half per cent. The prime lending rate is sixteen and a half. The Urban Land Ceiling
      Act means you cannot legally assemble a large urban site. No bank will lend to you and nobody
      knows your name.<br><br>
      Twenty-five years, three hundred and three months, two crashes, a currency slide, a state split
      in half and roughly forty ways to go bankrupt lie between here and anything worth calling an empire.
      The engine knows what happened. Your character does not.</p>

      <div class="card">
        <h3>Set up</h3>
        <div class="grid g2">
          <label class="stack" style="gap:4px"><span class="small muted">Your name</span>
            <input id="f-name" type="text" value="" placeholder="e.g. Ravi Kumar"></label>
          <label class="stack" style="gap:4px"><span class="small muted">Firm name</span>
            <input id="f-firm" type="text" value="" placeholder="e.g. Sri Lakshmi Constructions"></label>
          <label class="stack" style="gap:4px"><span class="small muted">Starting capital (1995 rupees)</span>
            <input id="f-cash" type="number" value="2500000" step="100000" min="100000"></label>
          <label class="stack" style="gap:4px"><span class="small muted">Seed (same seed = same world)</span>
            <input id="f-seed" type="text" value="${Math.random().toString(36).slice(2, 9)}"></label>
        </div>
        <p class="small muted" style="margin:12px 0 0">Capital is not adjusted to make the game survivable.
        Twenty-five lakh in 1995 buys one four-hundred-yard plot in Kukatpally and a six-flat building on it,
        with nothing left over for the month the contractor walks off.</p>
      </div>

      <div class="inline">
        <button class="btn" id="go">Begin \u2014 1 January 1995</button>
        <span class="muted small">Autosaves to this browser after every month.</span>
      </div>
    </div>
  </main>`;
    $("#go").onclick = () => {
      S = startGame($("#f-seed").value || String(Date.now()), {
        cash: Math.max(1e5, Number($("#f-cash").value) || 25e5),
        name: $("#f-name").value.trim() || "You",
        firmName: $("#f-firm").value.trim() || null
      });
      tab = "deals";
      saveGame(S);
      render();
    };
  }
  function render() {
    if (!S) return renderStart();
    const bs = S.bs;
    const nw = S.netWorth;
    const target = 1e11 * S.macro.usd;
    const pctToTarget = Math.max(0, nw) / target;
    app.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <div class="t">${esc(S.founder.firmName || "Unnamed firm")}</div>
        <div class="d">${dateLabel(S.month).toUpperCase()}</div>
      </div>
      <div class="stats">
        ${stat("Cash", money(S.cash), S.cash < 0 ? "neg" : "")}
        ${stat("Net worth", money(nw), nw < 0 ? "neg" : "")}
        ${stat("In USD", usd(nw, S.macro.usd))}
        ${stat("Debt", money(S.debt))}
        ${stat("Debt / assets", pct(S.ratios.debtToAssets))}
        ${stat("Rental NOI", money(S.ratios.noi) + " p.a.")}
        ${stat("Reputation", Math.round(S.reputation) + " / 100")}
        ${stat("PLR", S.macro.plr.toFixed(2) + "%")}
      </div>
      <button class="advance" id="adv" ${S.over || S.pendingEvent ? "disabled" : ""}>
        ${S.over ? "Simulation ended" : "Advance one month"}
        <small>${S.over ? "" : dateLabel(S.month + 1)}</small>
      </button>
    </div>
    <nav class="tabs">
      ${tabBtn("dashboard", "Dashboard")}
      ${tabBtn("deals", "Deal desk", S.offers.length)}
      ${tabBtn("land", "Land bank", S.parcels.filter((p) => p.owned && !p.consumed).length)}
      ${tabBtn("projects", "Projects", S.projects.filter((p) => !p.done).length)}
      ${tabBtn("portfolio", "Portfolio")}
      ${tabBtn("finance", "Finance")}
      ${tabBtn("people", "People")}
      ${tabBtn("market", "Market")}
      ${tabBtn("news", "News")}
      ${tabBtn("books", "Books")}
    </nav>
    <main id="view">${renderTab()}</main>
    ${toast ? `<div style="position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:10px 16px;border-radius:3px;z-index:90;max-width:560px;box-shadow:var(--shadow)">${esc(toast)}</div>` : ""}
  `;
    $("#adv").onclick = () => {
      advanceMonth(S);
      saveGame(S);
      if (S.pendingEvent) showEvent();
      else if (S.over) showEnding();
      render();
    };
    app.querySelectorAll(".tab").forEach((b) => {
      b.onclick = () => {
        tab = b.dataset.tab;
        render();
      };
    });
    bindView();
    if (S.pendingEvent && !modal) showEvent();
    if (S.over && !modal) showEnding();
  }
  function renderTab() {
    try {
      return views[tab]();
    } catch (err) {
      console.error("view failed:", tab, err);
      return `<div class="card"><h3>This view could not be drawn</h3>
      <p class="small">Something in the ${esc(tab)} tab threw an error, so it has been skipped rather than
      taking the rest of the game down. Your save is intact and every other tab still works.</p>
      <pre class="small mono" style="white-space:pre-wrap;overflow-x:auto">${esc(String(err && err.stack || err))}</pre>
      <p class="small muted">Please report this with the text above at
      <a href="https://github.com/zephloomstud-byte/hyderabad-real-estate-empire/issues" target="_blank" rel="noopener">the issue tracker</a>.</p></div>`;
    }
  }
  var stat = (k, v, cls = "") => `<div class="stat"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
  var tabBtn = (id, label, count) => `<button class="tab ${tab === id ? "on" : ""}" data-tab="${id}">${label}${count ? `<span class="badge">${count}</span>` : ""}</button>`;
  function say(msg) {
    toast = msg;
    render();
    setTimeout(() => {
      toast = null;
      render();
    }, 4200);
  }
  var views = {};
  views.dashboard = () => {
    const bs = S.bs;
    const y = S.yearbook;
    const alerts = buildAlerts();
    const recent = S.news.slice(-6).reverse();
    return `
  <div class="stack">
    <div class="grid g4">
      ${kpi("Net worth", money(S.netWorth), `${usd(S.netWorth, S.macro.usd)} \xB7 real ${money(S.netWorth / (S.macro.cpiIndex / 100))} in 1995 money`)}
      ${kpi("Cash", money(S.cash), `Burn ${money(monthlyBurn())}/mo`)}
      ${kpi("Land bank", num(S.parcels.filter((p) => p.owned && !p.consumed).reduce((t, p) => t + p.areaSqYd, 0)) + " sq yd", money(bs.land) + " at market")}
      ${S.assets.length || !S.brokerage ? kpi("Rental NOI", money(S.ratios.noi), `${pct(S.ratios.occupancy)} occupied \xB7 ${num(S.assets.reduce((t, a) => t + a.sqFt, 0))} sq ft`) : kpi("Brokerage earned", money(S.brokerage), `${S.stats.dealsBrokered || 0} of ${S.stats.dealsAttempted || 0} introductions closed`)}
    </div>

    ${alerts.length ? `<div class="card"><h3>Needs attention</h3>${alerts.map((a) => `<div class="row"><span class="l">${a.icon} ${a.text}</span><span class="r">${a.tag}</span></div>`).join("")}</div>` : ""}

    <div class="grid g2">
      <div class="card">
        <h3>Balance sheet \u2014 ${dateLabel(S.month)}</h3>
        ${row("Cash", money(bs.cash))}
        ${row("Land at market value", money(bs.land))}
        ${row("Work in progress", money(bs.wip))}
        ${row("Completed unsold stock", money(bs.inventory))}
        ${row("Investment property & subsidiaries", money(bs.investments))}
        ${row("Total assets", money(bs.assets), "total")}
        <div style="height:10px"></div>
        ${row("Bank & institutional debt", money(S.loans.filter((l) => l.kind !== "private").reduce((t, l) => t + l.outstanding, 0)))}
        ${row("Private financiers", money(S.loans.filter((l) => l.kind === "private").reduce((t, l) => t + l.outstanding, 0)))}
        ${row("Advances from buyers", money(bs.advances || 0))}
        ${row("Unpaid creditors", money(bs.payables || 0))}
        ${row("Net worth", money(bs.netWorth), "total")}
      </div>

      <div class="card">
        <h3>Ratios & standing</h3>
        ${row("Debt / assets", pct(S.ratios.debtToAssets))}
        ${row("Debt / EBITDA", S.ratios.debtToEbitda > 50 ? "\u2014" : S.ratios.debtToEbitda.toFixed(2) + "x")}
        ${row("Interest cover", S.ratios.interestCover.toFixed(2) + "x")}
        ${row("Loan to value (land + assets)", pct(S.ratios.ltv))}
        ${row("Portfolio occupancy", pct(S.ratios.occupancy))}
        ${row("Yield on cost (rental)", pct(S.ratios.yieldOnCost))}
        ${row("Projects delivered", String(S.stats.projectsDone))}
        ${row("Built to date", num(S.stats.sqftBuilt) + " sq ft")}
        <div style="height:12px"></div>
        <div class="row"><span class="l">Personal stress</span><span class="r">${Math.round(S.stress)}/100</span></div>
        <div class="bar"><i style="width:${S.stress}%; background:${S.stress > 70 ? "var(--warn)" : "var(--accent-2)"}"></i></div>
      </div>
    </div>

    <div class="grid g2">
      <div class="card">
        <h3>Relationships</h3>
        ${Object.entries(REL_KEYS).map(([k, label]) => {
      const v = Math.round(S.relations[k] || 0);
      return `<div class="rel-row"><span>${label}</span><span class="bar"><i style="width:${v}%;background:${v > 60 ? "var(--good)" : v < 25 ? "var(--warn)" : "var(--gold)"}"></i></span><span class="n">${v}</span></div>`;
    }).join("")}
      </div>
      <div class="card">
        <h3>Personal capability</h3>
        ${Object.entries({ realestate: "Real-estate judgement", construction: "Construction", finance: "Finance & accounting", legal: "Legal & title", negotiation: "Negotiation" }).map(([k, label]) => {
      const v = Math.round(S.skills[k]);
      return `<div class="rel-row"><span>${label}</span><span class="bar"><i style="width:${v}%"></i></span><span class="n">${v}</span></div>`;
    }).join("")}
        <div style="height:12px"></div>
        <div class="small muted">Government: ${esc(S.macro.regime.name)} \u2014 ${esc(S.macro.regime.focus)}.
        Credit conditions ${S.macro.credit > 0.7 ? "easy" : S.macro.credit > 0.45 ? "normal" : "tight"}.
        Hyderabad demand index ${S.macro.demand.toFixed(2)}.</div>
      </div>
    </div>

    ${y.length > 1 ? `<div class="card"><h3>Net worth, ${y[0].year}\u2013${y[y.length - 1].year}</h3>${spark(y.map((e) => e.netWorth))}
      <div class="small muted">Nominal rupees. Inflation-adjusted net worth in ${y[y.length - 1].year} money:
      ${money(y[y.length - 1].realNetWorth)} at 1995 purchasing power.</div></div>` : ""}

    <div class="card">
      <h3>Latest</h3>
      ${recent.map(newsItem).join("") || '<div class="muted small">Nothing yet.</div>'}
    </div>
  </div>`;
  };
  views.deals = () => {
    if (!S.offers.length) return emptyCard("No live opportunities this month. Advance the calendar \u2014 brokers will bring you something.");
    return `<div class="stack">
    <div class="card"><h3>Put the word out</h3>
      <div class="grid g3">${Object.entries(BRIEFS).map(([k, b]) => {
      const fee = Math.round(b.fee * costIndex(S.month));
      return `<div class="card tight">
          <div class="spread"><b>${esc(b.label)}</b><span class="pill">${money(fee)}</span></div>
          <div class="small muted" style="margin:6px 0">${esc(b.hint)}</div>
          <button class="btn sm" data-brief="${k}" ${S.cash < fee ? "disabled" : ""}>Ask around</button>
        </div>`;
    }).join("")}</div>
      <div class="small muted" style="margin-top:10px">A broker does not wait to be shown things \u2014 he tells people what he is looking for.
      If you want to lay out plots you need land by the acre, and it will not turn up on its own.</div>
    </div>

    <div class="card tight"><span class="small muted">You do not have to buy. <b>Broker it</b> introduces a buyer for one to two per cent of the price, uses none of your capital, and hands the upside to somebody else \u2014 which is how you have paid your bills for three years.<br>
    Stamp duty, transfer duty and registration today: <b>${pct(dutyRate(S.month))}</b> of consideration.
    Every rupee of land you buy costs ${pct(1 + dutyRate(S.month), 1)} of the price. Investigate before you commit \u2014 the cheap ones are cheap for a reason.</span></div>
    <div class="grid g2">
    ${S.offers.map((o) => {
      const lvl = intelLevel(S, o.locality);
      const fair = o.kind === "land" || o.kind === "devagreement" ? landRate(o.locality, S.month, S) * o.areaSqYd : o.price;
      const disc = o.kind === "devagreement" || lvl !== INTEL_KNOWN ? null : 1 - (o.negotiatedPrice ?? o.price) / Math.max(1, fair);
      return `<div class="card">
        <div class="spread"><h3 style="border:0;padding:0;margin:0">${esc(o.localityName)}</h3>
          <span class="pill ${o.kind === "devagreement" ? "gold" : o.kind === "asset" ? "good" : ""}">${o.kind === "devagreement" ? "Development agreement" : o.kind === "asset" ? "Income asset" : "Land"}</span></div>
        <div style="font-family:var(--serif);font-size:16px;margin:6px 0 4px">${esc(o.label)}</div>
        <div class="small muted">${esc(o.desc)}</div>
        <div style="height:8px"></div>
        ${o.kind === "devagreement" ? row("Owner\u2019s share of built area", pct(o.ownerShare, 0)) + row("Refundable advance", money(o.advance)) + row("Land cost to you", "Nil") : row("Asking", money(o.negotiatedPrice ?? o.price)) + (o.askRate ? row("Rate", "\u20B9" + num(o.askRate) + " / sq yd") : "") + (disc !== null ? row("Versus market", (disc > 0 ? "\u2212" : "+") + pct(Math.abs(disc)) + (disc > 0.15 ? " \u2014 suspiciously cheap" : "")) : lvl === INTEL_HEARSAY ? row("Versus market", '<span class="muted">Only hearsay on this area</span>') : row("Versus market", '<span class="muted">You have never been here</span>'))}
        ${o.kind === "asset" ? row("In-place NOI", money(o.noi) + " p.a.") + row("Occupancy", pct(o.occupancy)) : ""}
        ${row("Registration & duty", money(Math.round((o.negotiatedPrice ?? o.price) * dutyRate(S.month))))}
        ${row("Seller", esc(o.seller) + (o.motive ? ` \xB7 ${esc(o.motive)}` : ""))}
        ${row("Offer lapses", dateLabel(o.expiresAt))}
        ${o.known.length ? `<div style="margin-top:8px">${o.known.map((d) => `<span class="pill warn" title="${esc(DEFECTS[d].desc)}">${esc(DEFECTS[d].name)}</span> `).join("")}</div>` : o.ddDone ? `<div style="margin-top:8px"><span class="pill good">Nothing found \u2014 ${pct(o.ddConfidence || 0.3, 0)} confidence</span></div>` : ""}
        <div class="inline" style="margin-top:12px"><button class="btn sm" data-deal="${o.id}">Open</button>
          ${o.kind !== "devagreement" ? `<button class="btn sm ghost" data-broker="${o.id}" title="Introduce a buyer and take a commission. No capital, no upside.">Broker it</button>` : ""}</div>
      </div>`;
    }).join("")}
    </div></div>`;
  };
  function lrsBanner() {
    const w = lrsWindow(S.month);
    if (!w) return "";
    return `<div class="card tight" style="border-left:3px solid var(--gold)"><span class="small">
    <b>${esc(w.name)} is open.</b> Unapproved layouts and sanctioned-plan deviations can be regularised on payment of fees and an
    open-space contribution \u2014 about ${pct(0.24, 0)} of value, in roughly seven months, and under a scheme the answer is usually yes.
    Outside a window the same application costs half again as much, takes eighteen months and fails more often than it succeeds.
    Windows do not stay open.</span></div>`;
  }
  views.land = () => {
    const owned = S.parcels.filter((p) => p.owned && !p.consumed);
    if (!owned.length) return lrsBanner() + emptyCard("You own no land. The deal desk is where that changes.");
    return lrsBanner() + `<div class="card" style="margin-top:14px"><h3>Land bank</h3><table>
    <tr><th>Parcel</th><th class="n">Area</th><th class="n">Cost</th><th class="n">Market today</th><th class="n">Gain</th><th>Status</th><th></th></tr>
    ${owned.map((p) => {
      const mkt = landRate(p.locality, S.month, S) * p.areaSqYd;
      const gain = mkt - p.allInCost;
      const yrs = Math.max(0.1, (S.month - p.purchased) / 12);
      const cagr = p.allInCost > 0 ? Math.pow(mkt / p.allInCost, 1 / yrs) - 1 : 0;
      const flags = [];
      if (p.phases) flags.push(`<span class="pill">${p.phases} phase${p.phases === 1 ? "" : "s"} started</span>`);
      if (p.pledged) flags.push('<span class="pill warn">Pledged</span>');
      if (p.devAgreement) flags.push(`<span class="pill gold">Owner keeps ${pct(p.devAgreement.ownerShare, 0)}</span>`);
      for (const d of p.known) if (!(p.resolved || []).includes(d)) flags.push(`<span class="pill warn" title="${esc(DEFECTS[d].desc)}">${esc(DEFECTS[d].name)}</span>`);
      if (p.regularising) flags.push(`<span class="pill gold">Regularisation pending \u2014 ${p.regularising.monthsLeft} mo</span>`);
      return `<tr>
        <td><b>${esc(p.label)}</b><div class="small muted">Bought ${dateLabel(p.purchased)} from ${esc(p.seller || "\u2014")}</div></td>
        <td class="n">${num(p.areaSqYd)} sq yd<div class="small muted">${(p.areaSqYd / SQYD_PER_ACRE).toFixed(2)} ac${p.usedSqYd ? ` \xB7 ${num(freeSqYd(p))} sq yd free` : ""}</div></td>
        <td class="n">${money(p.allInCost)}</td>
        <td class="n">${money(mkt)}</td>
        <td class="n ${gain >= 0 ? "pos" : "neg"}">${money(gain, { sign: true })}<div class="small muted">${yrs >= 1 ? pct(cagr) + " p.a." : "held " + (S.month - p.purchased) + " mo"}</div></td>
        <td>${flags.join(" ") || '<span class="pill good">Clear</span>'}</td>
        <td class="n">${maxBuildableSqFt(p, S) >= 3e3 ? `<button class="btn sm" data-build="${p.id}">Build</button> ` : ""}${!p.usedSqYd ? `<button class="btn sm ghost" data-sellland="${p.id}">Sell</button>` : ""}${canRegularise(p) ? ` <button class="btn sm ghost" data-reg="parcel:${p.id}">Regularise</button>` : ""}</td>
      </tr>`;
    }).join("")}
  </table></div>`;
  };
  function projectKind(p) {
    const t = BUILD_TYPES[p.type] || LAYOUT_TYPES[p.type];
    const layout = !!p.isLayout;
    return {
      name: t ? t.name : p.type || "Project",
      layout,
      unit: layout ? "sq yd" : "sq ft",
      areaLabel: layout ? `${num(p.sqFt)} sq yd saleable` : `${num(p.sqFt)} sq ft`,
      subLabel: layout ? `from ${num(Math.round(p.grossSqYd || 0))} sq yd of site` : null,
      stageWord: layout ? "developed" : "built",
      buildingWord: layout ? "Roads and services" : "Building",
      approvalWord: layout ? "Conversion & layout sanction" : "Awaiting sanction",
      disposal: layout ? "plots for sale" : p.mode === "hold" ? "to be retained" : "for sale"
    };
  }
  views.projects = () => {
    const live = S.projects.filter((p) => !p.done);
    const done = S.projects.filter((p) => p.done).slice(-8).reverse();
    return `<div class="stack">
    ${live.length ? `<div class="card"><h3>Under way</h3><table>
      <tr><th>Project</th><th>Stage</th><th class="n">Area</th><th class="n">Budget</th><th class="n">Spent</th><th class="n">Still to spend</th><th class="n">Overrun</th><th class="n">Late by</th><th>Progress</th></tr>
      ${live.map((p) => {
      const k = projectKind(p);
      const n = Math.max(1, p.months + (p.riskDelay || 0));
      const prog = p.stage === "approval" ? 0 : clamp(p.elapsed / n, 0, 1);
      return `<tr>
          <td><b>${esc(p.name)}</b><div class="small muted">${esc(k.name)} \xB7 ${k.disposal}${p.unapproved ? ' \xB7 <span class="pill warn">Unapproved</span>' : ""}${p.devAgreement ? ` \xB7 owner takes ${pct(p.devAgreement.ownerShare, 0)}` : ""}</div></td>
          <td>${p.stage === "approval" ? `<span class="pill">${k.approvalWord} (${p.approvalLeft} mo)</span>` : p.stalled ? '<span class="pill warn">Stopped \u2014 no money</span>' : `<span class="pill good">${k.buildingWord}</span>`}</td>
          <td class="n">${k.areaLabel}${k.subLabel ? `<div class="small muted">${k.subLabel}</div>` : ""}</td>
          <td class="n">${money(p.budget * (1 + p.overrunPct))}</td>
          <td class="n">${money(p.spent)}</td>
          <td class="n">${money(Math.max(0, p.budget * (1 + p.overrunPct) - p.spent))}</td>
          <td class="n ${p.overrunPct > 0.03 ? "neg" : ""}">${pct(p.overrunPct)}</td>
          <td class="n ${p.delay > 3 ? "neg" : ""}">${Math.round(p.delay)} mo</td>
          <td style="min-width:135px"><div class="bar"><i style="width:${Math.round(prog * 100)}%"></i></div>
            <div class="small muted">${Math.round(prog * 100)}% ${k.stageWord} \xB7 quality ${Math.round(p.quality * 100)}${p.presold ? ` \xB7 ${Math.round(clamp(p.presold / Math.max(1, p.sqFt), 0, 1) * 100)}% booked` : ""}</div>
            <button class="btn sm ghost" style="margin-top:6px" data-abandon="${p.id}">Abandon</button></td>
        </tr>`;
    }).join("")}
    </table></div>` : emptyCard("No projects under way. Buy land and build on it, lay it out and sell plots \u2014 or hold it and let the city come to you.")}

    ${done.length ? `<div class="card"><h3>Delivered</h3><table>
      <tr><th>Project</th><th class="n">Area</th><th class="n">Final cost</th><th class="n">Late</th><th class="n">Quality</th><th>Outcome</th></tr>
      ${done.map((p) => {
      const k = projectKind(p);
      return `<tr><td>${esc(p.name)}<div class="small muted">${esc(k.name)}</div></td>
        <td class="n">${num(p.sqFt)} ${k.unit}</td><td class="n">${money(p.spent)}</td>
        <td class="n">${Math.round(p.delay)} mo</td><td class="n">${Math.round(p.quality * 100)}</td>
        <td>${k.layout ? "Plots sold" : p.mode === "hold" ? "Retained" : "Sold down"}</td></tr>`;
    }).join("")}
    </table></div>` : ""}
  </div>`;
  };
  views.portfolio = () => `<div class="stack">
  ${S.inventory.some((i) => i.unapproved) ? lrsBanner() : ""}
  ${S.assets.length ? `<div class="card"><h3>Income-producing assets</h3><table>
    <tr><th>Asset</th><th class="n">Area</th><th class="n">Rent</th><th class="n">Occupancy</th><th class="n">NOI p.a.</th><th class="n">Cap rate</th><th class="n">Value</th><th></th></tr>
    ${S.assets.map((a) => `<tr>
      <td><b>${esc(a.name)}</b><div class="small muted">${BY_ID[a.locality].name} \xB7 ${a.use} \xB7 completed ${dateLabel(a.completed)}${a.anchor ? " \xB7 anchor tenant" : ""}${a.pledged ? " \xB7 pledged" : ""}</div></td>
      <td class="n">${num(a.sqFt)}</td>
      <td class="n">\u20B9${a.rentPerSqFt.toFixed(1)}</td>
      <td class="n ${a.occupancy < 0.6 ? "neg" : ""}">${pct(a.occupancy)}</td>
      <td class="n">${money((a.lastNoi || 0) * 12)}</td>
      <td class="n">${pct(capRate(a.use, S.month, S))}</td>
      <td class="n">${money(assetValue(a, S))}</td>
      <td class="n">${lrdAvailable(S) && !a.pledged && a.use !== "res" ? `<button class="btn sm" data-lrd="${a.id}">Borrow against lease</button> ` : ""}<button class="btn sm ghost" data-sellasset="${a.id}">Sell</button></td>
    </tr>`).join("")}
  </table>
  <div class="small muted" style="margin-top:8px">Total rental NOI ${money(portfolioNoiAnnual(S))} a year on a book cost of
  ${money(S.assets.reduce((t, a) => t + a.bookCost, 0))} \u2014 a yield on cost of ${pct(S.ratios.yieldOnCost)}.</div>
  </div>` : ""}

  ${S.inventory.length ? `<div class="card"><h3>Completed unsold stock</h3><table>
    <tr><th>Project</th><th class="n">Unsold</th><th class="n">Your ask</th><th class="n">Market</th><th class="n">Value</th><th>Reprice</th></tr>
    ${S.inventory.map((i) => {
    const unit = i.isLayout ? "sq yd" : "sq ft";
    const mkt = i.isLayout ? plotPrice(i.locality, i.type, S.month, S) : salePrice(i.locality, i.type, S.month, S);
    return `<tr><td><b>${esc(i.name)}</b><div class="small muted">Completed ${dateLabel(i.completed)} \xB7 ${Math.round(S.month - i.completed)} months old${i.unapproved ? ' \xB7 <span class="pill warn">Unapproved</span>' : ""}</div></td>
      <td class="n">${num(i.remaining)} / ${num(i.sqFt)} ${unit}</td>
      <td class="n">\u20B9${Math.round(i.askPerSqFt)}</td>
      <td class="n">\u20B9${Math.round(mkt)}</td>
      <td class="n">${money(i.remaining * i.askPerSqFt)}</td>
      <td><input type="range" min="60" max="140" value="${Math.round(i.askPerSqFt / mkt * 100)}" data-ask="${i.id}" data-mkt="${mkt}">
        <div class="small muted">${Math.round(i.askPerSqFt / mkt * 100)}% of market</div>
        ${i.regularising ? `<div class="small"><span class="pill gold">Regularisation pending \u2014 ${i.regularising.monthsLeft} mo</span></div>` : i.unapproved ? `<button class="btn sm ghost" style="margin-top:6px" data-reg="inventory:${i.id}">Regularise</button>` : ""}</td></tr>`;
  }).join("")}
  </table><div class="small muted" style="margin-top:8px">Pricing above market slows absorption sharply. Ageing stock loses pricing power on its own.</div></div>` : ""}

  ${S.subsidiaries.length ? `<div class="card"><h3>Other businesses</h3><table>
    <tr><th>Business</th><th class="n">Capital</th><th class="n">Value</th><th class="n">Return</th></tr>
    ${S.subsidiaries.map((x) => `<tr><td>${esc(x.name)}</td><td class="n">${money(x.capital)}</td><td class="n">${money(x.value)}</td><td class="n">${pct(x.yield * x.quality)}</td></tr>`).join("")}
  </table></div>` : ""}

  ${!S.assets.length && !S.inventory.length && !S.subsidiaries.length ? emptyCard("Nothing in the portfolio yet. Build something and choose to retain it, or buy a leased building off the deal desk.") : ""}
</div>`;
  views.finance = () => {
    const lenders = availableLenders(S);
    return `<div class="stack">
    <div class="grid g4">
      ${kpi("Total debt", money(S.debt), `${S.loans.length} facilit${S.loans.length === 1 ? "y" : "ies"}`)}
      ${kpi("Annual interest", money(S.loans.reduce((t, l) => t + l.outstanding * l.rate, 0)), "at current rates")}
      ${kpi("Prime lending rate", S.macro.plr.toFixed(2) + "%", `credit ${S.macro.credit > 0.7 ? "easy" : S.macro.credit > 0.45 ? "normal" : "very tight"}`)}
      ${kpi("Interest cover", S.ratios.interestCover.toFixed(2) + "x", S.ratios.interestCover < 1.5 ? "below covenant" : "comfortable")}
    </div>

    ${S.loans.length ? `<div class="card"><h3>Borrowings</h3><table>
      <tr><th>Lender</th><th class="n">Drawn</th><th class="n">Outstanding</th><th class="n">Rate</th><th class="n">Instalment</th><th class="n">Closes in</th><th class="n">Interest still to pay</th><th>Status</th><th></th></tr>
      ${S.loans.map((l) => {
      const left = remainingTenure(l);
      const owed = interestIfHeld(l);
      return `<tr>
        <td>${esc(l.lender)}${l.secret ? '<div class="small muted">Against your mother\u2019s gold.</div>' : ""}${l.lrd ? `<div class="small muted">Secured on the rent from ${esc((S.assets.find((a) => a.id === l.assetId) || {}).name || "a let building")}</div>` : ""}${l.prepaid ? `<div class="small muted">${money(l.prepaid)} prepaid</div>` : ""}</td>
        <td class="n">${money(l.principal)}</td><td class="n">${money(l.outstanding)}</td>
        <td class="n ${l.rate > 0.2 ? "neg" : ""}">${pct(l.rate, 2)}</td><td class="n">${money(l.emi)}</td>
        <td class="n">${Number.isFinite(left) ? left + " mo" : "never"}</td>
        <td class="n ${owed > l.outstanding ? "neg" : ""}">${Number.isFinite(owed) ? money(owed) : "\u2014"}</td>
        <td>${l.missed >= 3 ? '<span class="pill warn">In default</span>' : l.missed > 0 ? '<span class="pill warn">Overdue</span>' : '<span class="pill good">Regular</span>'}</td>
        <td class="n"><button class="btn sm" data-repay="${l.id}" ${S.cash < 1e3 ? "disabled" : ""}>Repay</button></td>
      </tr>`;
    }).join("")}
    </table>
    <div class="small muted" style="margin-top:8px">Idle cash earns nothing while these run against it, so clearing debt early is often the best use of surplus money. It is also the money you will not have when the next site needs paying for, and banks do not lend it back on demand.</div>
    </div>` : ""}

    <div class="card"><h3>Raise money</h3>
      <div class="grid g2">
      ${lenders.map((l) => {
      const r = offeredRate(l, S);
      return `<div class="card tight">
          <div class="spread"><b>${esc(l.name)}</b><span class="pill ${l.kind === "private" ? "warn" : l.kind === "nbfc" ? "gold" : ""}">${pct(r, 2)}</span></div>
          <div class="small muted" style="margin:6px 0">${esc(l.desc)}</div>
          <div class="small muted">Max ${pct(l.maxLtv, 0)} of security \xB7 up to ${l.maxTenure} months \xB7 needs ${l.minTrack} delivered project${l.minTrack === 1 ? "" : "s"}</div>
          <div style="margin-top:8px"><button class="btn sm" data-loan="${l.id}">Apply</button></div>
        </div>`;
    }).join("")}
      </div>
    </div>
  </div>`;
  };
  views.people = () => {
    const payroll = S.staff.reduce((t, p) => t + p.salary, 0);
    return `<div class="stack">
    <div class="grid g4">
      ${kpi("Headcount", String(S.staff.length), "excluding site labour")}
      ${kpi("Monthly payroll", money(payroll), money(payroll * 12) + " a year")}
      ${kpi("Your stress", Math.round(S.stress) + "/100", S.stress > 70 ? "You cannot run this alone" : "Manageable")}
      ${kpi("Governance", S.flags.internalAudit ? "Internal audit in place" : "No internal audit", S.flags.cleanBooks ? "Audited, cheque-based books" : "Books are, let us say, traditional")}
    </div>

    ${S.staff.length ? `<div class="card"><h3>Your people</h3><table>
      <tr><th>Name</th><th>Role</th><th class="n">Salary</th><th class="n">Skill</th><th class="n">Loyalty</th><th class="n">Years</th><th></th></tr>
      ${S.staff.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.roleName)}</td><td class="n">${money(p.salary)}</td>
        <td class="n">${p.skill}</td><td class="n ${p.loyalty < 30 ? "neg" : ""}">${Math.round(p.loyalty)}</td>
        <td class="n">${((S.month - p.joined) / 12).toFixed(1)}</td>
        <td class="n"><button class="btn sm ghost" data-fire="${p.id}">Let go</button></td></tr>`).join("")}
    </table></div>` : emptyCard("You are the entire company. That works for one project. It does not work for four.")}

    <div class="card"><h3>Hire</h3><div class="grid g3">
      ${Object.entries(ROLES).map(([k, r]) => {
      const cost = Math.round(r.base * salaryIndex(S.month));
      const gated = r.exec && S.netWorth < 3e7;
      return `<div class="card tight">
          <div class="spread"><b>${esc(r.name)}</b>${r.exec ? '<span class="pill gold">Executive</span>' : ""}</div>
          <div class="small muted">${money(cost)} a month \xB7 improves ${esc(r.impact)}</div>
          <div style="margin-top:7px"><button class="btn sm" data-hire="${k}" ${gated ? 'disabled title="Your company is not big enough to carry this yet."' : ""}>Hire</button></div>
        </div>`;
    }).join("")}
    </div></div>
  </div>`;
  };
  views.market = () => {
    const mv = marketView(S.month, S);
    return `<div class="stack">
    <div class="card tight" class="small">
      <span class="small muted">
      Construction cost index ${costIndex(S.month).toFixed(2)}\xD7 1995 \xB7
      cement \u20B9${Math.round(materialPrice("cement", S.month))}/bag \xB7
      steel \u20B9${num(Math.round(materialPrice("steel", S.month)))}/tonne \xB7
      mason \u20B9${Math.round(wage("mason", S.month))}/day \xB7
      duty ${pct(dutyRate(S.month))} \xB7
      USD \u20B9${S.macro.usd.toFixed(1)}
      </span>
    </div>

    <div class="card"><h3>Land and rent by locality \u2014 ${dateLabel(S.month)}</h3><table>
      <tr><th>Locality</th><th class="n">\u20B9 / sq yd</th><th class="n">per acre</th><th class="n">12-mo</th><th class="n">Resi rent</th><th class="n">Office rent</th><th class="n">FAR</th><th>What you know</th></tr>
      ${mv.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)).map((l) => `<tr>
        <td><b>${esc(l.name)}</b>
          <div class="small muted">${esc(l.desc)}</div></td>
        <td class="n">${l.rate === null ? '<span class="muted">\u2014</span>' : l.level === INTEL_HEARSAY ? `<span title="A broker's ballpark, and brokers are wrong">\u2248\u20B9${num(l.rate)}</span>` : "\u20B9" + num(l.rate)}</td>
        <td class="n">${l.perAcre === null ? '<span class="muted">\u2014</span>' : (l.level === INTEL_HEARSAY ? "\u2248" : "") + money(l.perAcre)}</td>
        <td class="n ${l.yoy > 0 ? "pos" : l.yoy < 0 ? "neg" : ""}">${l.yoy === null ? "\u2014" : pct(l.yoy)}</td>
        <td class="n">${l.resRent ? "\u20B9" + l.resRent.toFixed(1) : "\u2014"}</td>
        <td class="n">${l.officeRent ? "\u20B9" + l.officeRent.toFixed(1) : "\u2014"}</td>
        <td class="n">${l.far === null ? "\u2014" : l.far.toFixed(2)}</td>
        <td>${l.level === INTEL_KNOWN ? '<span class="pill good">Known</span>' : `<span class="pill ${l.level === INTEL_NONE ? "warn" : ""}">${l.level === INTEL_NONE ? "Never been" : "Hearsay \xB125%"}</span>
             <div style="margin-top:5px"><button class="btn sm ghost" data-survey="${l.id}" ${S.cash < l.surveyCost ? "disabled" : ""}>Survey \xB7 ${money(l.surveyCost)}</button></div>`}</td>
      </tr>`).join("")}
    </table>
    <div class="small muted" style="margin-top:8px">You know your own patch and the fashionable parts of the city. The villages to the west you have never been to,
    and a broker's ballpark on somewhere you have not walked is wrong by up to a quarter in either direction.
    A survey buys you two years of real numbers. Owning anything somewhere teaches you it for nothing, and word travels
    if the right people owe you a conversation.<br>
    Nothing on this page tells you where the city is going next. That is the job.</div>
    </div>

    <div class="card"><h3>The competition</h3><div class="grid g2">
      ${S.competitors.map((c) => `<div class="card tight">
        <div class="spread"><b>${esc(c.name)}</b><span class="pill ${c.dead ? "warn" : c.scale > 0.6 ? "gold" : ""}">${c.dead ? "Collapsed" : "Scale " + c.scale.toFixed(2)}</span></div>
        <div class="small muted" style="margin-top:5px">${esc(c.desc)}</div>
      </div>`).join("")}
    </div></div>
  </div>`;
  };
  views.news = () => `<div class="card"><h3>The record</h3>${S.news.slice().reverse().slice(0, 140).map(newsItem).join("")}</div>`;
  views.books = () => {
    const y = S.yearbook;
    return `<div class="stack">
    ${y.length ? `<div class="card"><h3>Year by year</h3><div style="overflow-x:auto"><table>
      <tr><th>Year</th><th class="n">Revenue</th><th class="n">EBITDA</th><th class="n">Interest</th><th class="n">PAT</th><th class="n">Rental NOI</th>
      <th class="n">Debt</th><th class="n">Assets</th><th class="n">Net worth</th><th class="n">Real (1995 \u20B9)</th><th class="n">USD</th></tr>
      ${y.map((e) => `<tr><td><b>${e.year}</b></td>
        <td class="n">${money(e.revenue)}</td><td class="n">${money(e.ebitda)}</td><td class="n">${money(e.interest)}</td>
        <td class="n ${e.pat < 0 ? "neg" : "pos"}">${money(e.pat)}</td><td class="n">${money(e.noi)}</td>
        <td class="n">${money(e.debt)}</td><td class="n">${money(e.assets)}</td>
        <td class="n"><b>${money(e.netWorth)}</b></td><td class="n">${money(e.realNetWorth)}</td><td class="n">${usd(e.netWorth, e.usdRate)}</td></tr>`).join("")}
    </table></div>
    <div class="small muted" style="margin-top:8px">Real net worth converts every year back to January 1995 purchasing power.
    The gap between the nominal and real columns is the part of your wealth that inflation created rather than you.</div>
    </div>` : emptyCard("The first annual accounts close in December 1995.")}

    <div class="card"><h3>Cash book</h3><table>
      <tr><th>Date</th><th>Entry</th><th>Note</th><th class="n">Amount</th></tr>
      ${S.ledger.slice().reverse().slice(0, 70).map((l) => `<tr><td class="mono small">${dateLabel(l.m)}</td><td>${esc(l.type)}</td>
        <td class="small muted">${esc(l.note || "")}</td><td class="n ${l.amount < 0 ? "neg" : "pos"}">${money(l.amount, { sign: true })}</td></tr>`).join("") || '<tr><td colspan="4" class="muted">Nothing yet.</td></tr>'}
    </table></div>

    <div class="card"><h3>Danger zone</h3>
      <div class="inline"><button class="btn ghost" id="export">Export save</button>
      <button class="btn danger" id="restart">Abandon and start again</button></div>
    </div>
  </div>`;
  };
  var kpi = (k, v, s) => `<div class="card kpi"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
  var row = (l, r, cls = "") => `<div class="row ${cls}"><span class="l">${l}</span><span class="r">${r}</span></div>`;
  var emptyCard = (t) => `<div class="card center muted" style="padding:36px 20px">${t}</div>`;
  var newsItem = (n) => `<div class="news-item ${n.major ? "major" : ""}">
  <div class="meta">${dateLabel(n.m)} \xB7 ${esc(n.tag)}</div><h4>${esc(n.head)}</h4>${n.body ? `<p>${esc(n.body)}</p>` : ""}</div>`;
  var REGULARISABLE_UI = ["LAYOUT_UNAPPROVED", "MUNICIPAL_DEVIATION", "NO_ACCESS"];
  function canRegularise(p) {
    if (p.regularising) return false;
    return (p.known || []).some((d) => REGULARISABLE_UI.includes(d) && !(p.resolved || []).includes(d));
  }
  function monthlyBurn() {
    const payroll = S.staff.reduce((t, p) => t + p.salary, 0);
    const office = Math.round((3e3 + S.staff.length * 2200) * costIndex(S.month));
    const personal = Math.round(S.personalExpense * costIndex(S.month));
    const emi = S.loans.reduce((t, l) => t + l.emi, 0);
    return payroll + office + personal + emi;
  }
  function spark(vals) {
    if (vals.length < 2) return "";
    const w = 600, h = 90, pad = 4;
    const min = Math.min(0, ...vals), max = Math.max(...vals, 1);
    const pts = vals.map((v, i) => {
      const x = pad + i / (vals.length - 1) * (w - pad * 2);
      const yy = h - pad - (v - min) / (max - min || 1) * (h - pad * 2);
      return `${x.toFixed(1)},${yy.toFixed(1)}`;
    }).join(" ");
    return `<svg class="sparkwrap" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="var(--accent-2)" stroke-width="2"/></svg>`;
  }
  function buildAlerts() {
    const a = [];
    if (S.cash < 0) a.push({ icon: "\u25B2", text: "Bank account overdrawn. Nothing on site is being paid.", tag: "Critical" });
    else if (S.cash < monthlyBurn() * 2) a.push({ icon: "\u25B2", text: `Under two months of cash at current burn (${money(monthlyBurn())} a month).`, tag: "Cash" });
    if (S.ratios.debtToAssets > 0.6) a.push({ icon: "\u25B2", text: `Leverage at ${pct(S.ratios.debtToAssets)} of assets. Lenders start refusing above 60 per cent.`, tag: "Leverage" });
    if (S.ratios.interestCover < 1.3 && S.debt > 0) a.push({ icon: "\u25B2", text: `Interest cover ${S.ratios.interestCover.toFixed(2)}x \u2014 below every bank covenant.`, tag: "Covenant" });
    for (const p of S.projects.filter((x) => !x.done && x.stalled > 0)) a.push({ icon: "\u25A0", text: `${p.name} has been stopped for ${p.stalled} month${p.stalled === 1 ? "" : "s"} for want of money.`, tag: "Site" });
    for (const p of S.parcels.filter((x) => x.owned && x.known.some((d) => !(x.resolved || []).includes(d)))) {
      const d = p.known.find((k) => !(p.resolved || []).includes(k));
      a.push({ icon: "\xA7", text: `${p.label}: unresolved ${DEFECTS[d].name.toLowerCase()}.`, tag: "Title" });
    }
    if (S.stress > 78) a.push({ icon: "\u25CF", text: "You are running everything yourself and it is showing. Hire, or something will break.", tag: "Personal" });
    if (S.flags.npa) a.push({ icon: "\u25B2", text: "A bank account is classified non-performing. Fresh credit is effectively closed.", tag: "Credit" });
    if (S.flags.underInvestigation) a.push({ icon: "\u25B2", text: "An Anti-Corruption Bureau case is open against the company.", tag: "Legal" });
    return a.slice(0, 7);
  }
  function bindView() {
    const v = $("#view");
    if (!v) return;
    v.querySelectorAll("[data-deal]").forEach((b) => {
      b.onclick = () => showDeal(b.dataset.deal);
    });
    v.querySelectorAll("[data-broker]").forEach((b) => {
      b.onclick = () => doBroker(b.dataset.broker);
    });
    v.querySelectorAll("[data-brief]").forEach((b) => {
      b.onclick = () => {
        const r = askBrokers(S, b.dataset.brief);
        say(r.ok ? `Word is out. ${r.found.length} parcel${r.found.length === 1 ? "" : "s"} on the desk: ${r.found.join("; ")}` : r.msg);
        refresh(S);
        saveGame(S);
        render();
      };
    });
    v.querySelectorAll("[data-build]").forEach((b) => {
      b.onclick = () => showBuild(b.dataset.build);
    });
    v.querySelectorAll("[data-sellland]").forEach((b) => {
      b.onclick = () => {
        const r = sellParcel(S, b.dataset.sellland);
        say(r.ok ? `Sold for ${money(r.net)} \u2014 a ${r.gain >= 0 ? "gain" : "loss"} of ${money(Math.abs(r.gain))}.` : r.msg);
        refresh(S);
        saveGame(S);
        render();
      };
    });
    v.querySelectorAll("[data-survey]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.survey;
        const r = commissionSurvey(S, id);
        say(r.ok ? `Survey commissioned. ${money(r.cost)}. Real numbers, good for about two years.` : r.msg);
        refresh(S);
        saveGame(S);
        render();
      };
    });
    v.querySelectorAll("[data-lrd]").forEach((b) => {
      b.onclick = () => showLRD(b.dataset.lrd);
    });
    v.querySelectorAll("[data-sellasset]").forEach((b) => {
      b.onclick = () => {
        const r = sellAsset(S, b.dataset.sellasset);
        say(r.ok ? `Sold for ${money(r.net)}.` : r.msg);
        refresh(S);
        saveGame(S);
        render();
      };
    });
    v.querySelectorAll("[data-reg]").forEach((b) => {
      b.onclick = () => {
        const [kind, id] = b.dataset.reg.split(":");
        const t = kind === "parcel" ? S.parcels.find((x) => x.id === id) : S.inventory.find((x) => x.id === id);
        if (!t) return;
        const q = regularisationQuote(S, { kind, ...t });
        confirmModal({
          title: `Apply to regularise ${t.label || t.name}?`,
          body: (q.window ? `${q.window.name} is open, which is the whole difference. Fees and open-space contribution come to ${money(q.cost)} \u2014 about ${pct(q.feeRate, 0)} of value \u2014 and an answer should come in roughly ${q.months} months. Under a scheme it is granted about ${pct(q.chance, 0)} of the time.` : `No scheme is open. This is an ordinary application asking an officer to exercise discretion, which costs ${money(q.cost)} in charges and consultants, takes about ${q.months} months, and succeeds roughly ${pct(q.chance, 0)} of the time. Waiting for the next amnesty would be cheaper and far more certain \u2014 if one comes, and if you can hold the land that long.`) + `

The money goes now either way. It is not refunded if the application fails.`,
          confirmLabel: `Pay ${money(q.cost)} and apply`,
          danger: !q.window,
          onConfirm: () => {
            const r = applyForRegularisation(S, kind, id);
            say(r.ok ? `Application filed. ${q.months} months for an answer.` : r.msg);
            refresh(S);
            saveGame(S);
            render();
          }
        });
      };
    });
    v.querySelectorAll("[data-abandon]").forEach((b) => {
      b.onclick = () => {
        const p = S.projects.find((x) => x.id === b.dataset.abandon);
        if (!p) return;
        confirmModal({
          title: `Abandon ${p.name}?`,
          body: `You have spent ${money(p.spent)} on this site. Selling it on part-built will recover roughly ${money(p.spent * (p.stage === "approval" ? 0.25 : 0.55))} \u2014 half-finished buildings fetch badly, because the buyer inherits your contractor disputes and your deviations.` + (p.advances ? ` The ${money(p.advances)} of advances your buyers have paid becomes a creditor on your books, and they will come for it.` : "") + ` The land returns to your land bank. Brokers, buyers and your bank will all know you started something you could not finish.`,
          confirmLabel: "Abandon the site",
          danger: true,
          onConfirm: () => {
            const r = abandonProject(S, b.dataset.abandon);
            say(r.ok ? `Site sold on. Recovered ${money(r.recovered)}.` : r.msg);
            refresh(S);
            saveGame(S);
            render();
          }
        });
      };
    });
    v.querySelectorAll("[data-loan]").forEach((b) => {
      b.onclick = () => showLoan(b.dataset.loan);
    });
    v.querySelectorAll("[data-repay]").forEach((b) => {
      b.onclick = () => showRepay(b.dataset.repay);
    });
    v.querySelectorAll("[data-hire]").forEach((b) => {
      b.onclick = () => {
        const p = hire(S, b.dataset.hire);
        say(`${p.name} hired at ${money(p.salary)} a month.`);
        refresh(S);
        saveGame(S);
        render();
      };
    });
    v.querySelectorAll("[data-fire]").forEach((b) => {
      b.onclick = () => {
        fire(S, b.dataset.fire);
        refresh(S);
        saveGame(S);
        render();
      };
    });
    v.querySelectorAll("[data-ask]").forEach((r) => {
      r.onchange = () => {
        setAsk(S, r.dataset.ask, Number(r.value) / 100 * Number(r.dataset.mkt));
        saveGame(S);
        render();
      };
    });
    const ex = $("#export");
    if (ex) ex.onclick = async () => {
      const json = JSON.stringify(S);
      try {
        const blob = new Blob([json], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `hyderabad-${dateLabel(S.month).replace(" ", "-")}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2e3);
        say("Save exported. If no file appeared, your browser blocked the download \u2014 the save has also been copied to your clipboard.");
      } catch (e) {
        say("Download blocked; copying the save to your clipboard instead.");
      }
      try {
        await navigator.clipboard.writeText(json);
      } catch (e) {
      }
    };
    const rs = $("#restart");
    if (rs) rs.onclick = () => confirmModal({
      title: "Abandon this run and start again?",
      body: `You are in ${dateLabel(S.month)} with a net worth of ${money(S.netWorth)}. This deletes the saved game permanently and returns you to January 1995. There is no way back to this run afterwards.`,
      confirmLabel: "Delete and start again",
      danger: true,
      onConfirm: () => {
        clearSave();
        S = null;
        modal = null;
        tab = "dashboard";
        renderStart();
      }
    });
  }
  function closeModal() {
    modal = null;
    modalRoot.innerHTML = "";
  }
  function confirmModal({ title, body, confirmLabel, danger = false, onConfirm }) {
    openModal(`<div class="modal" style="max-width:520px">
    <div class="head"><div class="cat">Confirm</div><h2>${esc(title)}</h2></div>
    <div class="body"><p>${esc(body)}</p></div>
    <div class="foot"><div class="inline">
      <button class="btn ${danger ? "danger" : ""}" id="ok">${esc(confirmLabel)}</button>
      <button class="btn ghost" id="cancel">Cancel</button>
    </div></div>
  </div>`, (rootEl) => {
      $("#cancel", rootEl).onclick = () => {
        closeModal();
        render();
      };
      $("#ok", rootEl).onclick = () => {
        closeModal();
        onConfirm();
      };
    });
  }
  function openModal(html, bind) {
    modal = true;
    modalRoot.innerHTML = `<div class="scrim">${html}</div>`;
    const scrim = $(".scrim", modalRoot);
    scrim.onclick = (e) => {
      if (e.target === scrim && !S.pendingEvent && !S.over) {
        closeModal();
        render();
      }
    };
    if (bind) bind(modalRoot);
  }
  function showEvent() {
    const c = S.pendingEvent;
    if (!c) return;
    openModal(`<div class="modal">
    <div class="head"><div class="cat">${esc(c.cat || "Event")} \xB7 ${dateLabel(S.month)}</div><h2>${esc(c.head)}</h2></div>
    <div class="body"><p>${esc(c.body)}</p></div>
    <div class="foot">${c.choices.map((ch, i) => `<button class="choice ${ch.illegal ? "illegal" : ""}" data-c="${i}">
      <div class="lab">${esc(ch.label)}</div>${ch.hint ? `<div class="hint">${esc(ch.hint)}</div>` : ""}</button>`).join("")}</div>
  </div>`, (rootEl) => {
      rootEl.querySelectorAll("[data-c]").forEach((b) => {
        b.onclick = () => {
          resolveEvent(S, Number(b.dataset.c));
          closeModal();
          saveGame(S);
          render();
        };
      });
    });
  }
  function marketRateLine(locId) {
    const lvl = intelLevel(S, locId);
    const truth = landRate(locId, S.month, S);
    if (lvl === INTEL_KNOWN) return "\u20B9" + num(Math.round(truth)) + " / sq yd";
    if (lvl === INTEL_HEARSAY) {
      const f = fuzzRate(S, locId, truth);
      return `<span class="muted">about \u20B9${num(Math.round(f.value))} \u2014 hearsay, could be a quarter out</span>`;
    }
    return '<span class="muted">You do not know. Nobody has walked this for you.</span>';
  }
  function doBroker(id) {
    const o = S.offers.find((x) => x.id === id);
    if (!o) return;
    const price = o.negotiatedPrice ?? o.price;
    confirmModal({
      title: `Broker ${o.label} rather than buy it?`,
      body: `You would introduce a buyer to ${o.seller} and take one to two per cent \u2014 somewhere around ${money(price * 9e-3)} to ${money(price * 0.02)} \u2014 without putting up a rupee. You also give up the property, and everything it might have been worth in ten years.

Not every introduction closes. Yours close more often the better you know the market and the people in it.`,
      confirmLabel: "Find a buyer for it",
      onConfirm: () => {
        const r = brokerDeal(S, id);
        say(r.closed ? `Brokered. ${money(r.fee)} commission, no capital employed.` : "The deal fell through. Five weeks, nothing to show for it.");
        refresh(S);
        saveGame(S);
        render();
      }
    });
  }
  function showDeal(id) {
    const o = S.offers.find((x) => x.id === id);
    if (!o) return;
    const price = o.negotiatedPrice ?? o.price;
    const duty = Math.round(price * dutyRate(S.month));
    const legal = Math.round(Math.max(5e3, price * 4e-3));
    const loc = BY_ID[o.locality];
    const fair = landRate(o.locality, S.month, S) * (o.areaSqYd || 0);
    const ci = costIndex(S.month);
    const ddTiers = [
      ["quick", "Encumbrance certificate only", Math.round(Math.max(1500 * ci, o.price * 15e-4)), "Same month"],
      ["standard", "Advocate\u2019s thirty-year search and site survey", Math.round(Math.max(6e3 * ci, o.price * 4e-3)), "One month"],
      ["deep", "Full title opinion, revenue, Wakf and litigation search", Math.round(Math.max(18e3 * ci, o.price * 0.01)), "Two months"]
    ];
    openModal(`<div class="modal">
    <div class="head"><div class="cat">${o.kind === "devagreement" ? "Development agreement" : o.kind === "asset" ? "Income asset" : "Land"} \xB7 ${esc(loc.name)}</div>
      <h2>${esc(o.label)}</h2></div>
    <div class="body">
      <p class="small muted">${esc(loc.desc)}</p>
      <div class="grid g2">
        <div class="card tight">
          ${o.kind === "devagreement" ? row("Owner keeps", pct(o.ownerShare, 0) + " of built area") + row("Refundable advance", money(o.advance)) + row("Land cost", "Nil") : row("Asking price", money(price)) + (o.askRate ? row("Rate", "\u20B9" + num(o.askRate) + " / sq yd") : "") + row("Market rate today", marketRateLine(o.locality)) + row("Stamp & registration", money(duty)) + row("Legal", money(legal)) + row("Total cash required", money(price + duty + legal), "total")}
          ${o.kind === "asset" ? row("In-place NOI", money(o.noi) + " p.a.") + row("Implied yield", pct(o.noi / Math.max(1, price))) + row("Occupancy", pct(o.occupancy)) : ""}
        </div>
        <div class="card tight">
          ${row("Permissible FAR here", farFor(loc, S.month, S.flags).toFixed(2))}
          ${o.areaSqYd ? row("Buildable area", num(Math.floor(o.areaSqYd * 9 * farFor(loc, S.month, S.flags) * 0.92)) + " sq ft") : ""}
          ${row("Residential rent", loc.rentBase.res ? "\u20B9" + rentRate(o.locality, "res", S.month, S.flags).toFixed(1) + " /sq ft" : "\u2014")}
          ${row("Office rent", rentRate(o.locality, "office", S.month, S.flags) ? "\u20B9" + rentRate(o.locality, "office", S.month, S.flags).toFixed(1) + " /sq ft" : "No office market here")}
          ${row("Liquidity", pct(loc.liquidity, 0))}
          ${row("Seller", esc(o.seller) + (o.motive ? ` \u2014 ${esc(o.motive)}` : ""))}
        </div>
      </div>

      <div class="card tight" style="margin-top:12px">
        <h3 style="margin-bottom:8px">Title investigation</h3>
        ${o.known.length ? o.known.map((d) => `<div class="row"><span class="l"><span class="pill warn">${esc(DEFECTS[d].name)}</span></span><span class="r small" style="max-width:60%;text-align:right">${esc(DEFECTS[d].desc)}</span></div>`).join("") : `<div class="small muted">${o.ddDone ? `Nothing found, on ${pct(o.ddConfidence || 0.3, 0)} confidence. A clean report is not proof of clean title \u2014 it means you did not find anything.` : "You have not looked. Never assume a seller has good title."}</div>`}
        <div class="inline" style="margin-top:10px">
          ${ddTiers.map(([k, label, cost, time]) => `<button class="btn sm ghost" data-dd="${k}" ${S.cash < cost ? "disabled" : ""}>${esc(label)} \u2014 ${money(cost)}, ${time}</button>`).join("")}
        </div>
      </div>

      ${o.kind !== "devagreement" ? `<div class="card tight" style="margin-top:12px">
        <h3 style="margin-bottom:8px">Negotiate</h3>
        <div class="inline"><input id="neg" type="number" value="${Math.round(price * 0.9)}" step="10000">
        <button class="btn sm ghost" id="negbtn">Make an offer</button>
        <span class="small muted">${o.negotiated ? "Already negotiated once." : "Push too hard and he walks."}</span></div>
      </div>` : ""}
    </div>
    <div class="foot">
      <div class="inline">
        ${o.kind !== "devagreement" ? `<button class="btn ghost" id="brokerit">Broker it instead \u2014 commission only</button>` : ""}
        <button class="btn" id="buy" ${S.cash < (o.kind === "devagreement" ? o.advance : price + duty + legal) ? "disabled" : ""}>
          ${o.kind === "devagreement" ? `Sign the agreement (${money(o.advance)} advance)` : `Buy and register \u2014 ${money(price + duty + legal)}`}
        </button>
        <button class="btn ghost" id="close">Leave it</button>
        ${S.cash < (o.kind === "devagreement" ? o.advance : price + duty + legal) ? `<span class="small neg">Short by ${money((o.kind === "devagreement" ? o.advance : price + duty + legal) - S.cash)}</span>` : ""}
      </div>
    </div>
  </div>`, (rootEl) => {
      rootEl.querySelectorAll("[data-dd]").forEach((b) => {
        b.onclick = () => {
          const r = doDueDiligence(S, o, b.dataset.dd);
          if (!r.ok) return say(r.msg);
          say(r.found.length ? `Investigation found: ${r.found.map((d) => DEFECTS[d].name).join(", ")}.` : `Nothing found, at ${pct(r.confidence, 0)} confidence. That is not the same as clean.`);
          saveGame(S);
          closeModal();
          showDeal(id);
        };
      });
      const nb = $("#negbtn", rootEl);
      if (nb) nb.onclick = () => {
        const r = negotiate(S, o, Number($("#neg", rootEl).value));
        say(r.msg);
        saveGame(S);
        closeModal();
        if (S.offers.find((x) => x.id === id)) showDeal(id);
        else render();
      };
      const bk = $("#brokerit", rootEl);
      if (bk) bk.onclick = () => {
        closeModal();
        doBroker(id);
      };
      $("#close", rootEl).onclick = () => {
        closeModal();
        render();
      };
      $("#buy", rootEl).onclick = () => {
        let r;
        if (o.kind === "devagreement") r = signDevAgreement(S, o);
        else if (o.kind === "asset") r = buyAssetOffer(S, o);
        else r = buyLand(S, o);
        if (!r.ok) return say(r.msg);
        say("Registered.");
        refresh(S);
        saveGame(S);
        closeModal();
        tab = "land";
        render();
      };
    });
  }
  function showBuild(parcelId) {
    const p = S.parcels.find((x) => x.id === parcelId);
    if (!p) return;
    const loc = BY_ID[p.locality];
    const cap = maxBuildableSqFt(p, S);
    const site = freeSqYd(p);
    const types = Object.values(BUILD_TYPES).filter((b) => b.minSqFt <= cap);
    const layouts = Object.values(LAYOUT_TYPES).filter((l) => l.minAcres * SQYD_PER_ACRE <= site);
    const allOptions = [...types.map((t) => ({ ...t, kind: "build" })), ...layouts.map((l) => ({ ...l, kind: "layout" }))];
    if (!allOptions.length) {
      const smallestLayout = Math.min(...Object.values(LAYOUT_TYPES).map((l) => l.minAcres)) * SQYD_PER_ACRE;
      return say(
        `This parcel has ${num(site)} sq yd left, which permits ${num(cap)} sq ft of building \u2014 below the ${num(3e3)} sq ft an apartment block needs, and below the ${num(Math.round(smallestLayout))} sq yd (${(smallestLayout / SQYD_PER_ACRE).toFixed(1)} acres) the smallest layout needs. Sell it, or buy something adjoining.`
      );
    }
    const committed = remainingCommitments(S);
    const fundableSize = (typeId) => {
      if (isLayout(typeId)) {
        const lt = LAYOUT_TYPES[typeId];
        const floor = lt.minAcres * SQYD_PER_ACRE;
        for (const want of [site, site * 0.75, site * 0.5, site * 0.35, site * 0.25, floor]) {
          const sq = Math.floor(Math.min(site, want));
          if (sq < floor) continue;
          const e = estimateLayout(p, typeId, sq, S);
          if ((committed + e.schedule.peak) * 0.32 <= S.cash) return sq;
        }
        return Math.floor(Math.min(site, floor));
      }
      const bt = BUILD_TYPES[typeId];
      for (const want of [cap, 2e5, 12e4, 6e4, 3e4, 18e3, 12e3, 8e3, 5e3, 3e3]) {
        const sq = Math.min(cap, want);
        if (sq < bt.minSqFt) continue;
        const e = estimateProject(p, typeId, sq, S);
        if ((committed + e.schedule.peak) * 0.32 <= S.cash) return sq;
      }
      return Math.max(bt.minSqFt, Math.min(cap, 3e3));
    };
    const initialSize = fundableSize(allOptions[0].id);
    const draw = () => {
      const typeId = $("#bt") ? $("#bt").value : allOptions[0].id;
      const sqFt = $("#bsf") ? Number($("#bsf").value) : initialSize;
      if (isLayout(typeId)) return drawLayout(typeId, sqFt);
      const est = estimateProject(p, typeId, sqFt, S);
      const bt = BUILD_TYPES[typeId];
      const rent = rentRate(p.locality, bt.use, S.month, S.flags);
      const holdNoi = rent * sqFt * 0.85 * 12 * 0.78;
      const cr = capRate(bt.use, S.month, S);
      const holdValue = holdNoi > 0 ? holdNoi / cr : 0;
      const own = p.devAgreement ? 1 - p.devAgreement.ownerShare : 1;
      const need = (committed + est.schedule.peak) * 0.32;
      const fundable = S.cash >= need;
      $("#estimate").innerHTML = `
      ${row("Buildable now (FAR " + farFor(loc, S.month, S.flags).toFixed(2) + ")", num(cap) + " sq ft")}
      ${row("Construction budget", money(est.budget))}
      ${row("Cost per sq ft", "\u20B9" + Math.round(est.costPerSqFt))}
      ${row("Sanction expected in", est.approvalMonths + " months")}
      ${row("Construction period", bt.months + " months (before delays)")}
      <div style="height:8px"></div>
      ${row("Peak funding required", money(est.schedule.peak))}
      ${row("Needed in the first twelve months", money(est.firstYearCash))}
      ${committed > 0 ? row("Already committed to live projects", money(committed)) : ""}
      ${row("Cash you should have in hand", money(need) + " vs your " + money(S.cash), fundable ? "" : "total")}
      ${fundable ? "" : '<div class="small neg" style="padding:6px 0">Not fundable at this size. Reduce the area and build it in phases.</div>'}
      ${p.devAgreement ? row("Your share of built area", pct(own, 0) + " \u2014 " + num(Math.round(sqFt * own)) + " sq ft") : ""}
      <div style="height:8px"></div>
      ${row("SELL: gross value at today\u2019s prices", money(est.grossValue * own), "total")}
      ${row("SELL: profit over cost + land", money(est.grossValue * own - est.budget - (p.allInCost || 0)))}
      <div style="height:8px"></div>
      ${row("HOLD: stabilised NOI", holdNoi > 0 ? money(holdNoi * own) + " a year" : "No rental market for this use here")}
      ${row("HOLD: value at " + pct(cr) + " cap rate", holdValue > 0 ? money(holdValue * own) : "\u2014", "total")}
      <div class="small muted" style="margin-top:8px">Selling gives you the money now and ends your exposure.
      Holding gives you an income that compounds for twenty-five years and an asset a bank will lend against \u2014
      but it takes years to let, and every empty month costs you.</div>`;
    };
    const drawLayout = (typeId, grossSqYd) => {
      const lt = LAYOUT_TYPES[typeId];
      const est = estimateLayout(p, typeId, grossSqYd, S);
      const need = (committed + est.schedule.peak) * 0.32;
      const fundable = S.cash >= need;
      const landCost = Math.round((p.allInCost || 0) * (grossSqYd / Math.max(1, p.areaSqYd)));
      const total = est.budget + landCost;
      $("#estimate").innerHTML = `
      ${row("Site area for this venture", num(grossSqYd) + " sq yd (" + (grossSqYd / SQYD_PER_ACRE).toFixed(2) + " acres)")}
      ${row("Saleable after roads and open space", num(est.saleableSqYd) + " sq yd \u2014 " + pct(lt.saleable, 0) + " of the site")}
      ${row("Conversion out of agricultural use", est.conversion ? money(est.conversion) : "Not applicable")}
      ${row("Roads, drains, water, power", money(est.works))}
      ${row("Land attributable to this venture", money(landCost))}
      ${row("Total cost", money(total), "total")}
      <div style="height:8px"></div>
      ${row("Sanction and conversion take", est.approvalMonths ? est.approvalMonths + " months" : "No sanction sought")}
      ${row("Development works take", est.months + " months")}
      ${row("Peak funding required", money(est.schedule.peak))}
      ${row("Cash you should have in hand", money(need) + " vs your " + money(S.cash), fundable ? "" : "total")}
      ${fundable ? "" : '<div class="small neg" style="padding:6px 0">Not fundable at this size. Lay out fewer acres now and do the rest as a second phase.</div>'}
      <div style="height:8px"></div>
      ${row("Raw land rate today", "\u20B9" + num(Math.round(landRate(p.locality, S.month, S))) + " / sq yd")}
      ${row("Developed plot rate", "\u20B9" + num(Math.round(est.plotRate)) + " / sq yd \u2014 " + (est.plotRate / Math.max(1, landRate(p.locality, S.month, S))).toFixed(1) + "\xD7 raw land")}
      ${row("Revenue if it all sells", money(est.grossValue), "total")}
      ${row("Profit over land and works", money(est.grossValue - total))}
      <div class="small muted" style="margin-top:8px">${esc(lt.desc)}</div>
      ${lt.unapproved ? '<div class="small neg" style="padding:6px 0">An unapproved venture sells faster and cheaper, costs you standing in the market, and hands every buyer a regularisation problem. Plenty of people did exactly this.</div>' : ""}`;
      $("#go-sell").disabled = !fundable;
      $("#go-hold").disabled = true;
      $("#go-hold").title = "A layout is sold as plots; there is nothing to retain and let.";
    };
    openModal(`<div class="modal">
    <div class="head"><div class="cat">Develop \xB7 ${esc(loc.name)}</div><h2>${esc(p.label)}</h2></div>
    <div class="body">
      <div class="grid g2">
        <label class="stack" style="gap:4px"><span class="small muted">What to do with it</span>
          <select id="bt">
            ${types.length ? `<optgroup label="Build">${types.map((b) => `<option value="${b.id}">${esc(b.name)} \u2014 \u20B9${Math.round(b.cost * costIndex(S.month))}/sq ft built</option>`).join("")}</optgroup>` : ""}
            ${layouts.length ? `<optgroup label="Lay out and sell plots">${layouts.map((l) => `<option value="${l.id}">${esc(l.name)} \u2014 \u20B9${Math.round(l.cost * costIndex(S.month))}/sq yd of site</option>`).join("")}</optgroup>` : ""}
          </select></label>
        <label class="stack" style="gap:4px"><span class="small muted" id="bsflabel">Built-up area for this phase (sq ft), max ${num(cap)}</span>
          <input id="bsf" type="number" value="${initialSize}" max="${cap}" step="500"></label>
      </div>
      ${!layouts.length ? `<div class="small muted" style="margin-top:10px">
        This parcel is ${num(site)} sq yd. Laying out plots needs at least
        ${num(Math.round(Math.min(...Object.values(LAYOUT_TYPES).map((l) => l.minAcres)) * SQYD_PER_ACRE))} sq yd \u2014
        about half an acre \u2014 so only building is available here. Ask your brokers for acreage on the deal desk.
      </div>` : ""}
      <div class="card tight" style="margin-top:12px" id="estimate"></div>
      <div class="small muted" style="margin-top:10px" id="btdesc"></div>
    </div>
    <div class="foot"><div class="inline">
      <button class="btn" id="go-sell">Build to sell</button>
      <button class="btn" id="go-hold">Build and retain for rent</button>
      <button class="btn ghost" id="close">Not now</button>
    </div></div>
  </div>`, (rootEl) => {
      const upd = () => {
        const t = $("#bt", rootEl).value;
        const lay = isLayout(t);
        $("#bsf", rootEl).max = lay ? site : cap;
        $("#bsf", rootEl).step = lay ? 100 : 500;
        $("#bsflabel", rootEl).textContent = lay ? `Site area to lay out (sq yd), up to ${num(site)} \u2014 ${(site / SQYD_PER_ACRE).toFixed(2)} acres available` : `Built-up area for this phase (sq ft), max ${num(cap)}`;
        $("#go-sell", rootEl).textContent = lay ? "Develop the layout and sell plots" : "Build to sell";
        $("#go-hold", rootEl).style.display = lay ? "none" : "";
        draw();
        $("#btdesc", rootEl).textContent = (BUILD_TYPES[t] || LAYOUT_TYPES[t]).desc;
      };
      $("#bt", rootEl).onchange = () => {
        $("#bsf", rootEl).value = fundableSize($("#bt", rootEl).value);
        upd();
      };
      $("#bsf", rootEl).oninput = upd;
      upd();
      $("#close", rootEl).onclick = () => {
        closeModal();
        render();
      };
      const launch = (mode) => {
        const r = launchProject(S, parcelId, $("#bt", rootEl).value, Number($("#bsf", rootEl).value), mode);
        if (!r.ok) return say(r.msg);
        refresh(S);
        saveGame(S);
        closeModal();
        tab = "projects";
        render();
      };
      $("#go-sell", rootEl).onclick = () => launch("sell");
      $("#go-hold", rootEl).onclick = () => launch("hold");
    });
  }
  function showLoan(lenderId) {
    const l = LENDERS[lenderId];
    const free = [
      ...S.parcels.filter((p) => p.owned && !p.pledged && !p.consumed).map((p) => ({ id: p.id, label: p.label, v: landRate(p.locality, S.month, S) * p.areaSqYd })),
      ...S.assets.filter((a) => !a.pledged).map((a) => ({ id: a.id, label: a.name, v: assetValue(a, S) }))
    ];
    openModal(`<div class="modal">
    <div class="head"><div class="cat">Credit application</div><h2>${esc(l.name)}</h2></div>
    <div class="body">
      <p class="small muted">${esc(l.desc)}</p>
      ${row("Rate they would offer you today", pct(offeredRate(l, S), 2))}
      ${row("Maximum against security", pct(l.maxLtv, 0))}
      ${row("Maximum tenure", l.maxTenure + " months")}
      ${row("Track record required", l.minTrack + " delivered project" + (l.minTrack === 1 ? "" : "s") + " (you have " + S.stats.projectsDone + ")")}
      <label class="stack" style="gap:4px;margin-top:14px"><span class="small muted">Amount sought</span>
        <input id="amt" type="number" value="1000000" step="100000"></label>
      <div style="margin-top:12px"><div class="small muted" style="margin-bottom:6px">Security offered</div>
        ${free.length ? free.map((f) => `<label class="row"><span class="l"><input type="checkbox" data-col="${f.id}"> ${esc(f.label)}</span><span class="r">${money(f.v)}</span></label>`).join("") : '<div class="small muted">You have nothing unencumbered to pledge. Unsecured lending to a small developer in this era does not exist.</div>'}
        ${S.flags.shopPledged ? row("Your father\u2019s shop (already pledged)", money(9e5 * costIndex(S.month))) : ""}
      </div>
      <div id="decision"></div>
    </div>
    <div class="foot"><div class="inline">
      <button class="btn" id="apply">Submit the application</button>
      <button class="btn ghost" id="close">Withdraw</button>
    </div></div>
  </div>`, (rootEl) => {
      $("#close", rootEl).onclick = () => {
        closeModal();
        render();
      };
      $("#apply", rootEl).onclick = () => {
        const ids = [...rootEl.querySelectorAll("[data-col]")].filter((c) => c.checked).map((c) => c.dataset.col);
        const r = applyForLoan(S, lenderId, Number($("#amt", rootEl).value), ids);
        const d = r.decision;
        $("#decision", rootEl).innerHTML = `<div class="card tight" style="margin-top:14px">
        <div class="spread"><b>${r.ok ? "Sanctioned" : "Declined"}</b><span class="pill ${r.ok ? "good" : "warn"}">${r.ok ? money(d.amount) + " at " + pct(d.rate, 2) : "No facility"}</span></div>
        <div class="small muted" style="margin-top:6px">${(d?.reasons || ["The proposal does not meet lending norms."]).map(esc).join(" ")}</div></div>`;
        refresh(S);
        saveGame(S);
        if (r.ok) setTimeout(() => {
          closeModal();
          render();
        }, 2600);
      };
    });
  }
  function showLRD(assetId) {
    const a = S.assets.find((x) => x.id === assetId);
    if (!a) return;
    const q = quoteLRD(S, assetId);
    if (!q.eligible) {
      return openModal(`<div class="modal" style="max-width:520px">
      <div class="head"><div class="cat">Lease rental discounting</div><h2>${esc(a.name)}</h2></div>
      <div class="body"><p>The lender will not discount this lease.</p>
      ${q.reasons.map((r) => `<div class="row"><span class="l">\u25B2 ${esc(r)}</span></div>`).join("")}</div>
      <div class="foot"><div class="inline"><button class="btn ghost" id="close">Understood</button></div></div>
    </div>`, (rootEl) => {
        $("#close", rootEl).onclick = () => {
          closeModal();
          render();
        };
      });
    }
    const draw = () => {
      const amt = Number($("#lamt").value) || 0;
      const capped = Math.min(amt, q.amount);
      const share = capped / Math.max(1, q.amount);
      const emi = q.emi * share;
      const cover = emi > 0 ? q.noiAnnual / 12 / emi : 0;
      $("#lquote").innerHTML = `
      ${row("Amount drawn", money(capped))}
      ${row("Monthly instalment", money(emi))}
      ${row("Rent this building produces", money(q.noiAnnual / 12) + " a month")}
      ${row("Cover on the instalment", cover.toFixed(2) + "x", cover < 1.2 ? "total" : "")}
      ${cover < 1.2 ? '<div class="small neg" style="padding:6px 0">Thin. One tenant leaving and you are paying this out of your own pocket.</div>' : ""}
      ${row("Cash afterwards", money(S.cash + capped), "total")}`;
    };
    openModal(`<div class="modal" style="max-width:600px">
    <div class="head"><div class="cat">${q.proper ? "Lease rental discounting" : "Loan against property"} \xB7 ${dateLabel(S.month)}</div><h2>${esc(a.name)}</h2></div>
    <div class="body">
      <p class="small muted">You are not borrowing against the building. You are borrowing against the rent your tenant has contracted to pay, and the lender takes that rent directly. Because the security is a covenant rather than concrete, it prices inside development finance and runs far longer.${q.proper ? "" : " The proper product does not exist yet; this is a crude loan against property on worse terms, which is what this market offers today."}</p>
      ${row("Asset value", money(assetValue(a, S)))}
      ${row("Occupancy", pct(a.occupancy) + (a.anchor ? " \xB7 anchor tenant on a long lease" : ""))}
      ${row("Net income", money(q.noiAnnual) + " a year")}
      ${row("Maximum the lender will advance", money(q.amount) + " \u2014 " + pct(q.ltv, 0) + " of value")}
      ${row("Rate", pct(q.rate, 2) + " for " + q.tenure + " months")}
      <label class="stack" style="gap:4px;margin-top:14px"><span class="small muted">Amount to draw</span>
        <input id="lamt" type="number" value="${q.amount}" min="100000" max="${q.amount}" step="100000"></label>
      <div class="card tight" style="margin-top:14px" id="lquote"></div>
      <p class="small muted" style="margin-top:12px">The instalment is fixed and the rent is not. If the tenant leaves you still owe the bank, and the building that was financing your growth starts consuming it. That is the whole risk, and it is how a great many landlords have been undone.</p>
    </div>
    <div class="foot"><div class="inline">
      <button class="btn" id="lgo">Draw the facility</button>
      <button class="btn ghost" id="lclose">Leave it unencumbered</button>
    </div></div>
  </div>`, (rootEl) => {
      $("#lamt", rootEl).oninput = draw;
      draw();
      $("#lclose", rootEl).onclick = () => {
        closeModal();
        render();
      };
      $("#lgo", rootEl).onclick = () => {
        const r = takeLRD(S, assetId, Number($("#lamt", rootEl).value));
        if (!r.ok) return say(r.msg);
        say(`${money(r.amount)} drawn against the lease. The building is now charged.`);
        refresh(S);
        saveGame(S);
        closeModal();
        render();
      };
    });
  }
  function showRepay(loanId) {
    const l = S.loans.find((x) => x.id === loanId);
    if (!l) return;
    const fullQuote = quotePrepayment(l, l.outstanding, S.month);
    const loading = 1 + fullQuote.penalty / Math.max(1, l.outstanding);
    const maxPrincipal = Math.max(0, Math.min(l.outstanding, Math.floor(S.cash / loading)));
    const draw = () => {
      const amt = Number($("#ramt").value) || 0;
      const q = quotePrepayment(l, amt, S.month);
      const afford = S.cash >= q.cashRequired;
      $("#rquote").innerHTML = `
      ${row("Principal repaid", money(q.principal))}
      ${row(
        q.minInterest > 0 ? "Charges and minimum interest" : "Foreclosure charge",
        money(q.penalty) + (q.penaltyRate ? ` (${pct(q.penaltyRate, 0)})` : "")
      )}
      ${row("Cash required now", money(q.cashRequired), "total")}
      <div style="height:8px"></div>
      ${row("Outstanding afterwards", money(q.newOutstanding))}
      ${row("Facility closes in", q.full ? "Closed outright" : Number.isFinite(q.tenureAfter) ? `${q.tenureAfter} months, down from ${q.tenureBefore}` : "\u2014")}
      ${row("Interest you avoid", Number.isFinite(q.interestSaved) ? money(q.interestSaved) : "\u2014")}
      ${row("Net gain over the life of the loan", Number.isFinite(q.netBenefit) ? money(q.netBenefit, { sign: true }) : "\u2014", "total")}
      ${row("Cash left afterwards", money(S.cash - q.cashRequired), afford ? "" : "total")}
      ${afford ? "" : '<div class="small neg" style="padding:6px 0">You cannot cover this. Reduce the amount.</div>'}
      ${q.full && (l.collateral || []).length ? '<div class="small pos" style="padding:6px 0">Closing this facility releases the security pledged against it.</div>' : ""}`;
      $("#rgo").disabled = !afford || q.principal < 1e3;
    };
    openModal(`<div class="modal" style="max-width:580px">
    <div class="head"><div class="cat">Prepayment \xB7 ${dateLabel(S.month)}</div><h2>${esc(l.lender)}</h2></div>
    <div class="body">
      ${row("Outstanding", money(l.outstanding))}
      ${row("Rate", pct(l.rate, 2))}
      ${row("Monthly instalment", money(l.emi))}
      ${row("Cash in hand", money(S.cash))}
      <label class="stack" style="gap:4px;margin-top:14px"><span class="small muted">Principal to repay</span>
        <input id="ramt" type="number" value="${Math.max(1e3, Math.min(maxPrincipal, Math.round(l.outstanding)))}" min="1000" max="${Math.round(l.outstanding)}" step="10000"></label>
      <div class="inline" style="margin-top:8px">
        <button class="btn sm ghost" data-quick="0.25">A quarter</button>
        <button class="btn sm ghost" data-quick="0.5">Half</button>
        <button class="btn sm ghost" data-quick="1">Everything outstanding</button>
        <button class="btn sm ghost" data-quick="max">All I can spare</button>
      </div>
      <div class="card tight" style="margin-top:14px" id="rquote"></div>
    </div>
    <div class="foot"><div class="inline">
      <button class="btn" id="rgo">Repay</button>
      <button class="btn ghost" id="rclose">Leave it running</button>
    </div></div>
  </div>`, (rootEl) => {
      const input = $("#ramt", rootEl);
      input.oninput = draw;
      rootEl.querySelectorAll("[data-quick]").forEach((b) => {
        b.onclick = () => {
          const k = b.dataset.quick;
          input.value = Math.round(k === "max" ? Math.min(l.outstanding, maxPrincipal) : l.outstanding * Number(k));
          draw();
        };
      });
      draw();
      $("#rclose", rootEl).onclick = () => {
        closeModal();
        render();
      };
      $("#rgo", rootEl).onclick = () => {
        const r = repayLoan(S, loanId, Number(input.value));
        if (!r.ok) return say(r.msg);
        say(r.quote.full ? `${l.lender} closed. ${money(r.quote.interestSaved)} of interest avoided.${r.released.length ? ` Security released: ${r.released.join(", ")}.` : ""}` : `Prepaid ${money(r.quote.principal)}. Around ${money(r.quote.interestSaved)} of interest avoided.`);
        refresh(S);
        saveGame(S);
        closeModal();
        render();
      };
    });
  }
  function showEnding() {
    const last = S.yearbook[S.yearbook.length - 1] || {};
    const nwUsd = S.netWorth / S.macro.usd;
    const reasons = {
      time: "March 2020. Twenty-five years and three months.",
      insolvent: "The company failed.",
      health: "Your body stopped before the company did."
    };
    const verdict = () => {
      if (S.overReason === "insolvent") return "You are one of the many. Most people who tried this in Hyderabad between 1995 and 2020 ended here, and most of them were not stupid \u2014 they were leveraged into a cycle that turned.";
      if (nwUsd > 1e11) return "One hundred billion dollars. This should not have been possible, and the fact that you did it means either extraordinary judgement or a run of luck the market will not give twice.";
      if (nwUsd > 1e10) return "Ten billion dollars and a diversified institution. You are among the largest business houses in the country. The hundred-billion mark stays out of reach \u2014 as it does for almost everyone.";
      if (nwUsd > 1e9) return "A billion dollars. You built one of the significant real-estate groups in India from twenty-five lakh rupees and a scooter. That is the realistic ceiling of a single lifetime in this business, and you reached it.";
      if (nwUsd > 1e8) return "A hundred million dollars \u2014 roughly seven hundred and fifty crore. A substantial, respected Hyderabad developer. Comfortable, established, and not a conglomerate.";
      if (nwUsd > 1e7) return "Ten million dollars. A solid mid-sized builder with a real business and real assets. Most people who start where you started do not get here.";
      return "You survived twenty-five years in Indian real estate without going bankrupt. Given the period, that is not nothing.";
    };
    openModal(`<div class="modal">
    <div class="head"><div class="cat">${esc(reasons[S.overReason] || "The end")}</div><h2>${esc(S.founder.firmName || "Your firm")}, 1995\u2013${yearOf(S.month)}</h2></div>
    <div class="body">
      <div class="grid g2">
        <div class="card tight">
          ${row("Final net worth", money(S.netWorth), "total")}
          ${row("In US dollars", usd(S.netWorth, S.macro.usd))}
          ${row("In 1995 purchasing power", money(S.netWorth / (S.macro.cpiIndex / 100)))}
          ${row("Total assets", money(S.bs.assets))}
          ${row("Total debt", money(S.debt))}
          ${row("Compound annual return", S.equityPaidIn > 0 && S.netWorth > 0 ? pct(Math.pow(S.netWorth / S.equityPaidIn, 12 / Math.max(1, S.month)) - 1) : "\u2014")}
        </div>
        <div class="card tight">
          ${row("Projects delivered", String(S.stats.projectsDone))}
          ${row("Built", num(S.stats.sqftBuilt) + " sq ft")}
          ${row("Land bought", num(S.stats.landBoughtSqYd) + " sq yd")}
          ${row("Rental NOI at the end", money(S.ratios.noi) + " a year")}
          ${row("Title problems encountered", String(S.stats.defectsHit))}
          ${row("Reputation", Math.round(S.reputation) + " / 100")}
        </div>
      </div>
      <p style="margin-top:14px">${esc(verdict())}</p>
      <p class="small muted">Target was one hundred billion dollars \u2014 ${money(1e11 * S.macro.usd)} at the closing exchange rate.
      You reached ${pct(Math.max(0, nwUsd) / 1e11, 4)} of it.</p>
    </div>
    <div class="foot"><div class="inline">
      <button class="btn ghost" id="close">Look through the books</button>
      <button class="btn" id="again">Start again</button>
    </div></div>
  </div>`, (rootEl) => {
      $("#close", rootEl).onclick = () => {
        closeModal();
        tab = "books";
        render();
      };
      $("#again", rootEl).onclick = () => {
        clearSave();
        S = null;
        closeModal();
        renderStart();
      };
    });
  }
  boot();
})();
