# Real Estate Empire — Hyderabad 1995–2020

A long-form business simulation. You start on 1 January 1995 as a twenty-four-year-old
with ₹25 lakh, most of it your father's, and three years of brokering plots in Kukatpally.
The target is a net worth of one hundred billion dollars. You will almost certainly not
get there, and the point of the game is finding out how far you do get.

**[Play it in your browser](#)** — or clone it and run:

```bash
node tools/serve.mjs
```

Then open <http://localhost:5173>. No build step, no dependencies, nothing to install.
The game saves to `localStorage` after every month and never sends anything anywhere.

`node tools/build.mjs` produces `dist/real-estate-empire.html` — the whole game as one
324 KB file you can double-click or host anywhere.

## What is actually simulated

Nothing here is decoration. Every number moves on a historical track.

| System | Behaviour |
|---|---|
| **Macro** | Real CPI, GDP, prime lending rate, USD/INR and credit availability for each year 1995–2020, with month-keyed shocks for the November 1995 call-money crisis, Lehman, demonetisation and the IL&FS default. |
| **Land** | Twenty-two Hyderabad localities, each with a 1995 base rate in ₹/sq yd and a multiplier track anchored to what actually happened there. Madhapur goes up 430×; Banjara Hills goes up 32×. The 2001 technology bust, the 2008 freeze and the 2010–13 Telangana agitation are all visible as flat or falling stretches. |
| **Rent** | Rises far more slowly than land, which is why gross yields compress from ~13% to under 6% and why anyone who bought for yield in 1995 made their money on the asset, not the income. |
| **Construction** | Cement, steel, sand, brick and site wages on separate tracks. Steel nearly triples in 2008 alone. Cost multiplies 4.8× over the period; white-collar salaries multiply 12×. |
| **Title** | Fourteen defect types — assigned land under the POT Act 1977, Wakf claims, ULC surplus, unsigned co-parceners, cantonment Class B land, catchment restrictions. Hidden until you pay an advocate to look, and a clean report is not proof of clean title. |
| **Projects** | Approval, then an S-curve of spending. If the money is not there the site slows down or stops; delay and overrun are bounded but real. Buyer advances fund most of construction, and they are carried as a liability until you deliver. |
| **Finance** | Six lenders with actual credit policies — track record, leverage, interest cover, collateral, and the credit cycle. In 1995 they will refuse you, correctly. Chalapathi will lend at 3% a month, and take the company if you miss. |
| **Events** | All thirty structural problems of Indian real estate, weighted by your actual state: leverage attracts credit events, big sites attract labour and safety events, weak governance attracts fraud, visibility attracts the press. |
| **Politics** | NTR, the 1995 coup, Naidu, YSR, the post-2009 drift, the agitation, Telangana, KCR. Approval speed, infrastructure budgets and business confidence all move with them. |
| **Regulation** | Stamp duty falls from 14.5% to 6%. Permissible FAR rises from 1.75 to 5.5. RERA, GST and demonetisation arrive when they actually arrived, and not before. |

## Information asymmetry

The engine knows what happened. Your character does not. In 1995 Madhapur is described as
rock and thorn scrub with no water and a dirt approach, because that is what it was. The
announcement of a software park arrives in month 22 as a news item most builders ignored.
Infrastructure rumours are correct about 42% of the time.

## Layout

```
src/core/     rng.js (seeded, deterministic), util.js (Indian numbering, money formatting)
src/data/     history.js (macro + timeline), geo.js (localities + defects),
              costs.js (materials, wages, duties, lenders), events.js (the event catalogue)
src/sim/      state.js, market.js, finance.js, build.js, assets.js, accounting.js, engine.js
src/ui/       app.js (plain DOM, no framework)
tools/        serve.mjs, simtest.mjs, diag.mjs, careful.mjs, cashflow.mjs, econ.mjs
```

`engine.js` owns the monthly tick and the `fx` API, which is the only surface events are
allowed to touch. Everything else is a player action that mutates state before the tick.

## Testing and balance

The simulation is deterministic given a seed, so balance can be measured rather than guessed.

```bash
node tools/simtest.mjs 8    # crash/invariant sweep with a reckless auto-player
node tools/careful.mjs 12   # survival rate for a deliberately conservative strategy
node tools/econ.mjs         # per-project unit economics across six eras
node tools/cashflow.mjs     # month-by-month cash trace of a single run
```

Current balance: a careful player survives to 2020 roughly two-thirds of the time, ending
somewhere between ₹5 crore and ₹120 crore — call it one to sixteen million dollars. A
reckless one is usually insolvent before 2005. Nobody has come close to $100 billion, which
is the intended result.

Unit economics are checked against the historical record: ₹613/sq ft sale against ₹486/sq ft
cost in Kukatpally in 1995, ₹1,618 in 2005, ₹3,380 in Gachibowli in 2006, ₹6,005 for Kokapet
villas in 2015.

## Privacy

There is no telemetry, no analytics and no network calls of any kind beyond the Google
Fonts stylesheet. Your saved game lives in your own browser's `localStorage` and goes
nowhere else. Export it from Books → Danger zone if you want a copy.

## Licence

MIT. Built by [Zephloom](https://github.com/) with [Claude Code](https://claude.com/claude-code).

Balance is not hand-waved: `tools/careful.mjs` plays full 25-year runs with a conservative
strategy and reports survival rates, `tools/econ.mjs` checks per-project unit economics
against historical prices, and `tools/simtest.mjs` sweeps for crashes and broken invariants.
