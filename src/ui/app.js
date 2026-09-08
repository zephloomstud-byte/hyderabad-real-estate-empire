// The interface. Plain DOM, one render pass per state change, event delegation for
// everything. No framework — the state object is the single source of truth and the
// screen is a pure function of it.

import { money, usd, pct, num, dateLabel, yearOf, round, clamp, SQYD_PER_ACRE, END_MONTH } from '../core/util.js';
import { saveGame, loadGame, clearSave, REL_KEYS, COMPETITORS } from '../sim/state.js';
import { ROLES, BUILD_TYPES, LAYOUT_TYPES, LENDERS, MATERIALS, WAGES } from '../data/costs.js';
import { BY_ID, DEFECTS } from '../data/geo.js';
import {
  refresh, advanceMonth, resolveEvent, buyLand, signDevAgreement, buyAssetOffer,
  doDueDiligence, negotiate, launchProject, applyForLoan, sellParcel, sellAsset,
  hire, fire, setAsk, marketView, landRate, rentRate, salePrice, capRate, costIndex,
  dutyRate, salaryIndex, farFor, estimateProject, maxBuildableSqFt, assetValue,
  portfolioNoiAnnual, availableLenders, offeredRate, creditDecision, landValue,
  abandonProject, remainingCommitments, freeSqYd,
  repayLoan, quotePrepayment, remainingTenure, interestIfHeld, brokerDeal, startGame,
  estimateLayout, isLayout, plotPrice,
} from '../sim/engine.js';
import { materialPrice, wage } from '../sim/market.js';

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const modalRoot = $('#modal-root');

let S = null;
let tab = 'dashboard';
let modal = null;
let toast = null;

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ------------------------------------------------------------------ boot

function boot() {
  const saved = loadGame();
  if (saved) { S = refresh(saved); render(); }
  else renderStart();
}

function renderStart() {
  app.innerHTML = `
  <main>
    <div class="start stack">
      <div>
        <div class="sub">A business simulation · 1 January 1995 – March 2020</div>
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
        <button class="btn" id="go">Begin — 1 January 1995</button>
        <span class="muted small">Autosaves to this browser after every month.</span>
      </div>
    </div>
  </main>`;

  $('#go').onclick = () => {
    S = startGame($('#f-seed').value || String(Date.now()), {
      cash: Math.max(100000, Number($('#f-cash').value) || 2500000),
      name: $('#f-name').value.trim() || 'You',
      firmName: $('#f-firm').value.trim() || null,
    });
    tab = 'deals';
    saveGame(S);
    render();
  };
}

// ------------------------------------------------------------------ chrome

function render() {
  if (!S) return renderStart();
  const bs = S.bs;
  const nw = S.netWorth;
  const target = 100e9 * S.macro.usd;
  const pctToTarget = Math.max(0, nw) / target;

  app.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <div class="t">${esc(S.founder.firmName || 'Unnamed firm')}</div>
        <div class="d">${dateLabel(S.month).toUpperCase()}</div>
      </div>
      <div class="stats">
        ${stat('Cash', money(S.cash), S.cash < 0 ? 'neg' : '')}
        ${stat('Net worth', money(nw), nw < 0 ? 'neg' : '')}
        ${stat('In USD', usd(nw, S.macro.usd))}
        ${stat('Debt', money(S.debt))}
        ${stat('Debt / assets', pct(S.ratios.debtToAssets))}
        ${stat('Rental NOI', money(S.ratios.noi) + ' p.a.')}
        ${stat('Reputation', Math.round(S.reputation) + ' / 100')}
        ${stat('PLR', S.macro.plr.toFixed(2) + '%')}
      </div>
      <button class="advance" id="adv" ${S.over || S.pendingEvent ? 'disabled' : ''}>
        ${S.over ? 'Simulation ended' : 'Advance one month'}
        <small>${S.over ? '' : dateLabel(S.month + 1)}</small>
      </button>
    </div>
    <nav class="tabs">
      ${tabBtn('dashboard', 'Dashboard')}
      ${tabBtn('deals', 'Deal desk', S.offers.length)}
      ${tabBtn('land', 'Land bank', S.parcels.filter((p) => p.owned && !p.consumed).length)}
      ${tabBtn('projects', 'Projects', S.projects.filter((p) => !p.done).length)}
      ${tabBtn('portfolio', 'Portfolio')}
      ${tabBtn('finance', 'Finance')}
      ${tabBtn('people', 'People')}
      ${tabBtn('market', 'Market')}
      ${tabBtn('news', 'News')}
      ${tabBtn('books', 'Books')}
    </nav>
    <main id="view">${views[tab]()}</main>
    ${toast ? `<div style="position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:10px 16px;border-radius:3px;z-index:90;max-width:560px;box-shadow:var(--shadow)">${esc(toast)}</div>` : ''}
  `;

  $('#adv').onclick = () => {
    advanceMonth(S);
    saveGame(S);
    if (S.pendingEvent) showEvent();
    else if (S.over) showEnding();
    render();
  };
  app.querySelectorAll('.tab').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
  bindView();

  if (S.pendingEvent && !modal) showEvent();
  if (S.over && !modal) showEnding();
}

const stat = (k, v, cls = '') => `<div class="stat"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
const tabBtn = (id, label, count) =>
  `<button class="tab ${tab === id ? 'on' : ''}" data-tab="${id}">${label}${count ? `<span class="badge">${count}</span>` : ''}</button>`;

function say(msg) { toast = msg; render(); setTimeout(() => { toast = null; render(); }, 4200); }

// ------------------------------------------------------------------ views

const views = {};

views.dashboard = () => {
  const bs = S.bs;
  const y = S.yearbook;
  const alerts = buildAlerts();
  const recent = S.news.slice(-6).reverse();
  return `
  <div class="stack">
    <div class="grid g4">
      ${kpi('Net worth', money(S.netWorth), `${usd(S.netWorth, S.macro.usd)} · real ${money(S.netWorth / (S.macro.cpiIndex / 100))} in 1995 money`)}
      ${kpi('Cash', money(S.cash), `Burn ${money(monthlyBurn())}/mo`)}
      ${kpi('Land bank', num(S.parcels.filter((p) => p.owned && !p.consumed).reduce((t, p) => t + p.areaSqYd, 0)) + ' sq yd', money(bs.land) + ' at market')}
      ${S.assets.length || !S.brokerage
        ? kpi('Rental NOI', money(S.ratios.noi), `${pct(S.ratios.occupancy)} occupied · ${num(S.assets.reduce((t, a) => t + a.sqFt, 0))} sq ft`)
        : kpi('Brokerage earned', money(S.brokerage), `${S.stats.dealsBrokered || 0} of ${S.stats.dealsAttempted || 0} introductions closed`)}
    </div>

    ${alerts.length ? `<div class="card"><h3>Needs attention</h3>${alerts.map((a) => `<div class="row"><span class="l">${a.icon} ${a.text}</span><span class="r">${a.tag}</span></div>`).join('')}</div>` : ''}

    <div class="grid g2">
      <div class="card">
        <h3>Balance sheet — ${dateLabel(S.month)}</h3>
        ${row('Cash', money(bs.cash))}
        ${row('Land at market value', money(bs.land))}
        ${row('Work in progress', money(bs.wip))}
        ${row('Completed unsold stock', money(bs.inventory))}
        ${row('Investment property & subsidiaries', money(bs.investments))}
        ${row('Total assets', money(bs.assets), 'total')}
        <div style="height:10px"></div>
        ${row('Bank & institutional debt', money(S.loans.filter((l) => l.kind !== 'private').reduce((t, l) => t + l.outstanding, 0)))}
        ${row('Private financiers', money(S.loans.filter((l) => l.kind === 'private').reduce((t, l) => t + l.outstanding, 0)))}
        ${row('Advances from buyers', money(bs.advances || 0))}
        ${row('Unpaid creditors', money(bs.payables || 0))}
        ${row('Net worth', money(bs.netWorth), 'total')}
      </div>

      <div class="card">
        <h3>Ratios & standing</h3>
        ${row('Debt / assets', pct(S.ratios.debtToAssets))}
        ${row('Debt / EBITDA', S.ratios.debtToEbitda > 50 ? '—' : S.ratios.debtToEbitda.toFixed(2) + 'x')}
        ${row('Interest cover', S.ratios.interestCover.toFixed(2) + 'x')}
        ${row('Loan to value (land + assets)', pct(S.ratios.ltv))}
        ${row('Portfolio occupancy', pct(S.ratios.occupancy))}
        ${row('Yield on cost (rental)', pct(S.ratios.yieldOnCost))}
        ${row('Projects delivered', String(S.stats.projectsDone))}
        ${row('Built to date', num(S.stats.sqftBuilt) + ' sq ft')}
        <div style="height:12px"></div>
        <div class="row"><span class="l">Personal stress</span><span class="r">${Math.round(S.stress)}/100</span></div>
        <div class="bar"><i style="width:${S.stress}%; background:${S.stress > 70 ? 'var(--warn)' : 'var(--accent-2)'}"></i></div>
      </div>
    </div>

    <div class="grid g2">
      <div class="card">
        <h3>Relationships</h3>
        ${Object.entries(REL_KEYS).map(([k, label]) => {
          const v = Math.round(S.relations[k] || 0);
          return `<div class="rel-row"><span>${label}</span><span class="bar"><i style="width:${v}%;background:${v > 60 ? 'var(--good)' : v < 25 ? 'var(--warn)' : 'var(--gold)'}"></i></span><span class="n">${v}</span></div>`;
        }).join('')}
      </div>
      <div class="card">
        <h3>Personal capability</h3>
        ${Object.entries({ realestate: 'Real-estate judgement', construction: 'Construction', finance: 'Finance & accounting', legal: 'Legal & title', negotiation: 'Negotiation' }).map(([k, label]) => {
          const v = Math.round(S.skills[k]);
          return `<div class="rel-row"><span>${label}</span><span class="bar"><i style="width:${v}%"></i></span><span class="n">${v}</span></div>`;
        }).join('')}
        <div style="height:12px"></div>
        <div class="small muted">Government: ${esc(S.macro.regime.name)} — ${esc(S.macro.regime.focus)}.
        Credit conditions ${S.macro.credit > 0.7 ? 'easy' : S.macro.credit > 0.45 ? 'normal' : 'tight'}.
        Hyderabad demand index ${S.macro.demand.toFixed(2)}.</div>
      </div>
    </div>

    ${y.length > 1 ? `<div class="card"><h3>Net worth, ${y[0].year}–${y[y.length - 1].year}</h3>${spark(y.map((e) => e.netWorth))}
      <div class="small muted">Nominal rupees. Inflation-adjusted net worth in ${y[y.length - 1].year} money:
      ${money(y[y.length - 1].realNetWorth)} at 1995 purchasing power.</div></div>` : ''}

    <div class="card">
      <h3>Latest</h3>
      ${recent.map(newsItem).join('') || '<div class="muted small">Nothing yet.</div>'}
    </div>
  </div>`;
};

views.deals = () => {
  if (!S.offers.length) return emptyCard('No live opportunities this month. Advance the calendar — brokers will bring you something.');
  return `<div class="stack">
    <div class="card tight"><span class="small muted">You do not have to buy. <b>Broker it</b> introduces a buyer for one to two per cent of the price, uses none of your capital, and hands the upside to somebody else — which is how you have paid your bills for three years.<br>
    Stamp duty, transfer duty and registration today: <b>${pct(dutyRate(S.month))}</b> of consideration.
    Every rupee of land you buy costs ${pct(1 + dutyRate(S.month), 1)} of the price. Investigate before you commit — the cheap ones are cheap for a reason.</span></div>
    <div class="grid g2">
    ${S.offers.map((o) => {
      const fair = o.kind === 'land' || o.kind === 'devagreement' ? landRate(o.locality, S.month, S) * o.areaSqYd : o.price;
      const disc = o.kind === 'devagreement' ? null : 1 - (o.negotiatedPrice ?? o.price) / Math.max(1, fair);
      return `<div class="card">
        <div class="spread"><h3 style="border:0;padding:0;margin:0">${esc(o.localityName)}</h3>
          <span class="pill ${o.kind === 'devagreement' ? 'gold' : o.kind === 'asset' ? 'good' : ''}">${o.kind === 'devagreement' ? 'Development agreement' : o.kind === 'asset' ? 'Income asset' : 'Land'}</span></div>
        <div style="font-family:var(--serif);font-size:16px;margin:6px 0 4px">${esc(o.label)}</div>
        <div class="small muted">${esc(o.desc)}</div>
        <div style="height:8px"></div>
        ${o.kind === 'devagreement'
          ? row('Owner’s share of built area', pct(o.ownerShare, 0)) + row('Refundable advance', money(o.advance)) + row('Land cost to you', 'Nil')
          : row('Asking', money(o.negotiatedPrice ?? o.price)) + (o.askRate ? row('Rate', '₹' + num(o.askRate) + ' / sq yd') : '') +
            (disc !== null ? row('Versus market', (disc > 0 ? '−' : '+') + pct(Math.abs(disc)) + (disc > 0.15 ? ' — suspiciously cheap' : '')) : '')}
        ${o.kind === 'asset' ? row('In-place NOI', money(o.noi) + ' p.a.') + row('Occupancy', pct(o.occupancy)) : ''}
        ${row('Registration & duty', money(Math.round((o.negotiatedPrice ?? o.price) * dutyRate(S.month))))}
        ${row('Seller', esc(o.seller) + (o.motive ? ` · ${esc(o.motive)}` : ''))}
        ${row('Offer lapses', dateLabel(o.expiresAt))}
        ${o.known.length
          ? `<div style="margin-top:8px">${o.known.map((d) => `<span class="pill warn" title="${esc(DEFECTS[d].desc)}">${esc(DEFECTS[d].name)}</span> `).join('')}</div>`
          : o.ddDone ? `<div style="margin-top:8px"><span class="pill good">Nothing found — ${pct(o.ddConfidence || 0.3, 0)} confidence</span></div>` : ''}
        <div class="inline" style="margin-top:12px"><button class="btn sm" data-deal="${o.id}">Open</button>
          ${o.kind !== 'devagreement' ? `<button class="btn sm ghost" data-broker="${o.id}" title="Introduce a buyer and take a commission. No capital, no upside.">Broker it</button>` : ''}</div>
      </div>`;
    }).join('')}
    </div></div>`;
};

views.land = () => {
  const owned = S.parcels.filter((p) => p.owned && !p.consumed);
  if (!owned.length) return emptyCard('You own no land. The deal desk is where that changes.');
  return `<div class="card"><h3>Land bank</h3><table>
    <tr><th>Parcel</th><th class="n">Area</th><th class="n">Cost</th><th class="n">Market today</th><th class="n">Gain</th><th>Status</th><th></th></tr>
    ${owned.map((p) => {
      const mkt = landRate(p.locality, S.month, S) * p.areaSqYd;
      const gain = mkt - p.allInCost;
      const yrs = Math.max(0.1, (S.month - p.purchased) / 12);
      const cagr = p.allInCost > 0 ? Math.pow(mkt / p.allInCost, 1 / yrs) - 1 : 0;
      const flags = [];
      if (p.phases) flags.push(`<span class="pill">${p.phases} phase${p.phases === 1 ? '' : 's'} started</span>`);
      if (p.pledged) flags.push('<span class="pill warn">Pledged</span>');
      if (p.devAgreement) flags.push(`<span class="pill gold">Owner keeps ${pct(p.devAgreement.ownerShare, 0)}</span>`);
      for (const d of p.known) if (!(p.resolved || []).includes(d)) flags.push(`<span class="pill warn" title="${esc(DEFECTS[d].desc)}">${esc(DEFECTS[d].name)}</span>`);
      return `<tr>
        <td><b>${esc(p.label)}</b><div class="small muted">Bought ${dateLabel(p.purchased)} from ${esc(p.seller || '—')}</div></td>
        <td class="n">${num(p.areaSqYd)} sq yd<div class="small muted">${(p.areaSqYd / SQYD_PER_ACRE).toFixed(2)} ac${p.usedSqYd ? ` · ${num(freeSqYd(p))} sq yd free` : ''}</div></td>
        <td class="n">${money(p.allInCost)}</td>
        <td class="n">${money(mkt)}</td>
        <td class="n ${gain >= 0 ? 'pos' : 'neg'}">${money(gain, { sign: true })}<div class="small muted">${yrs >= 1 ? pct(cagr) + ' p.a.' : 'held ' + (S.month - p.purchased) + ' mo'}</div></td>
        <td>${flags.join(' ') || '<span class="pill good">Clear</span>'}</td>
        <td class="n">${maxBuildableSqFt(p, S) >= 3000 ? `<button class="btn sm" data-build="${p.id}">Build</button> ` : ''}${!p.usedSqYd ? `<button class="btn sm ghost" data-sellland="${p.id}">Sell</button>` : ''}</td>
      </tr>`;
    }).join('')}
  </table></div>`;
};

views.projects = () => {
  const live = S.projects.filter((p) => !p.done);
  const done = S.projects.filter((p) => p.done).slice(-8).reverse();
  return `<div class="stack">
    ${live.length ? `<div class="card"><h3>Under way</h3><table>
      <tr><th>Project</th><th>Stage</th><th class="n">Area</th><th class="n">Budget</th><th class="n">Spent</th><th class="n">Still to spend</th><th class="n">Overrun</th><th class="n">Late by</th><th>Progress</th></tr>
      ${live.map((p) => {
        const n = p.months + p.delay;
        const prog = p.stage === 'approval' ? 0 : p.elapsed / n;
        return `<tr>
          <td><b>${esc(p.name)}</b><div class="small muted">${BUILD_TYPES[p.type].name} · ${p.mode === 'hold' ? 'to be retained' : 'for sale'}${p.devAgreement ? ` · owner takes ${pct(p.devAgreement.ownerShare, 0)}` : ''}</div></td>
          <td>${p.stage === 'approval' ? `<span class="pill">Awaiting sanction (${p.approvalLeft} mo)</span>` : p.stalled ? '<span class="pill warn">Stopped — no money</span>' : '<span class="pill good">Building</span>'}</td>
          <td class="n">${num(p.sqFt)} sq ft</td>
          <td class="n">${money(p.budget * (1 + p.overrunPct))}</td>
          <td class="n">${money(p.spent)}</td>
          <td class="n">${money(Math.max(0, p.budget * (1 + p.overrunPct) - p.spent))}</td>
          <td class="n ${p.overrunPct > 0.03 ? 'neg' : ''}">${pct(p.overrunPct)}</td>
          <td class="n ${p.delay > 3 ? 'neg' : ''}">${Math.round(p.delay)} mo</td>
          <td style="min-width:135px"><div class="bar"><i style="width:${Math.round(prog * 100)}%"></i></div>
            <div class="small muted">${Math.round(prog * 100)}% built · quality ${Math.round(p.quality * 100)}${p.presold ? ` · ${Math.round((p.presold / p.sqFt) * 100)}% booked` : ''}</div>
            <button class="btn sm ghost" style="margin-top:6px" data-abandon="${p.id}">Abandon</button></td>
        </tr>`;
      }).join('')}
    </table></div>` : emptyCard('No projects under way. Buy land, then build on it — or hold the land and let the city come to you.')}

    ${done.length ? `<div class="card"><h3>Delivered</h3><table>
      <tr><th>Project</th><th class="n">Area</th><th class="n">Final cost</th><th class="n">Late</th><th class="n">Quality</th><th>Outcome</th></tr>
      ${done.map((p) => `<tr><td>${esc(p.name)}</td><td class="n">${num(p.sqFt)}</td><td class="n">${money(p.spent)}</td>
        <td class="n">${Math.round(p.delay)} mo</td><td class="n">${Math.round(p.quality * 100)}</td>
        <td>${p.mode === 'hold' ? 'Retained' : 'Sold down'}</td></tr>`).join('')}
    </table></div>` : ''}
  </div>`;
};

views.portfolio = () => `<div class="stack">
  ${S.assets.length ? `<div class="card"><h3>Income-producing assets</h3><table>
    <tr><th>Asset</th><th class="n">Area</th><th class="n">Rent</th><th class="n">Occupancy</th><th class="n">NOI p.a.</th><th class="n">Cap rate</th><th class="n">Value</th><th></th></tr>
    ${S.assets.map((a) => `<tr>
      <td><b>${esc(a.name)}</b><div class="small muted">${BY_ID[a.locality].name} · ${a.use} · completed ${dateLabel(a.completed)}${a.anchor ? ' · anchor tenant' : ''}${a.pledged ? ' · pledged' : ''}</div></td>
      <td class="n">${num(a.sqFt)}</td>
      <td class="n">₹${a.rentPerSqFt.toFixed(1)}</td>
      <td class="n ${a.occupancy < 0.6 ? 'neg' : ''}">${pct(a.occupancy)}</td>
      <td class="n">${money((a.lastNoi || 0) * 12)}</td>
      <td class="n">${pct(capRate(a.use, S.month, S))}</td>
      <td class="n">${money(assetValue(a, S))}</td>
      <td class="n"><button class="btn sm ghost" data-sellasset="${a.id}">Sell</button></td>
    </tr>`).join('')}
  </table>
  <div class="small muted" style="margin-top:8px">Total rental NOI ${money(portfolioNoiAnnual(S))} a year on a book cost of
  ${money(S.assets.reduce((t, a) => t + a.bookCost, 0))} — a yield on cost of ${pct(S.ratios.yieldOnCost)}.</div>
  </div>` : ''}

  ${S.inventory.length ? `<div class="card"><h3>Completed unsold stock</h3><table>
    <tr><th>Project</th><th class="n">Unsold</th><th class="n">Your ask</th><th class="n">Market</th><th class="n">Value</th><th>Reprice</th></tr>
    ${S.inventory.map((i) => {
      const unit = i.isLayout ? 'sq yd' : 'sq ft';
      const mkt = i.isLayout ? plotPrice(i.locality, i.type, S.month, S) : salePrice(i.locality, i.type, S.month, S);
      return `<tr><td><b>${esc(i.name)}</b><div class="small muted">Completed ${dateLabel(i.completed)} · ${Math.round((S.month - i.completed))} months old${i.unapproved ? ' · <span class="pill warn">Unapproved</span>' : ''}</div></td>
      <td class="n">${num(i.remaining)} / ${num(i.sqFt)} ${unit}</td>
      <td class="n">₹${Math.round(i.askPerSqFt)}</td>
      <td class="n">₹${Math.round(mkt)}</td>
      <td class="n">${money(i.remaining * i.askPerSqFt)}</td>
      <td><input type="range" min="60" max="140" value="${Math.round((i.askPerSqFt / mkt) * 100)}" data-ask="${i.id}" data-mkt="${mkt}">
        <div class="small muted">${Math.round((i.askPerSqFt / mkt) * 100)}% of market</div></td></tr>`;
    }).join('')}
  </table><div class="small muted" style="margin-top:8px">Pricing above market slows absorption sharply. Ageing stock loses pricing power on its own.</div></div>` : ''}

  ${S.subsidiaries.length ? `<div class="card"><h3>Other businesses</h3><table>
    <tr><th>Business</th><th class="n">Capital</th><th class="n">Value</th><th class="n">Return</th></tr>
    ${S.subsidiaries.map((x) => `<tr><td>${esc(x.name)}</td><td class="n">${money(x.capital)}</td><td class="n">${money(x.value)}</td><td class="n">${pct(x.yield * x.quality)}</td></tr>`).join('')}
  </table></div>` : ''}

  ${!S.assets.length && !S.inventory.length && !S.subsidiaries.length ? emptyCard('Nothing in the portfolio yet. Build something and choose to retain it, or buy a leased building off the deal desk.') : ''}
</div>`;

views.finance = () => {
  const lenders = availableLenders(S);
  return `<div class="stack">
    <div class="grid g4">
      ${kpi('Total debt', money(S.debt), `${S.loans.length} facilit${S.loans.length === 1 ? 'y' : 'ies'}`)}
      ${kpi('Annual interest', money(S.loans.reduce((t, l) => t + l.outstanding * l.rate, 0)), 'at current rates')}
      ${kpi('Prime lending rate', S.macro.plr.toFixed(2) + '%', `credit ${S.macro.credit > 0.7 ? 'easy' : S.macro.credit > 0.45 ? 'normal' : 'very tight'}`)}
      ${kpi('Interest cover', S.ratios.interestCover.toFixed(2) + 'x', S.ratios.interestCover < 1.5 ? 'below covenant' : 'comfortable')}
    </div>

    ${S.loans.length ? `<div class="card"><h3>Borrowings</h3><table>
      <tr><th>Lender</th><th class="n">Drawn</th><th class="n">Outstanding</th><th class="n">Rate</th><th class="n">Instalment</th><th class="n">Closes in</th><th class="n">Interest still to pay</th><th>Status</th><th></th></tr>
      ${S.loans.map((l) => {
        const left = remainingTenure(l);
        const owed = interestIfHeld(l);
        return `<tr>
        <td>${esc(l.lender)}${l.secret ? '<div class="small muted">Against your mother’s gold.</div>' : ''}${l.prepaid ? `<div class="small muted">${money(l.prepaid)} prepaid</div>` : ''}</td>
        <td class="n">${money(l.principal)}</td><td class="n">${money(l.outstanding)}</td>
        <td class="n ${l.rate > 0.2 ? 'neg' : ''}">${pct(l.rate, 2)}</td><td class="n">${money(l.emi)}</td>
        <td class="n">${Number.isFinite(left) ? left + ' mo' : 'never'}</td>
        <td class="n ${owed > l.outstanding ? 'neg' : ''}">${Number.isFinite(owed) ? money(owed) : '—'}</td>
        <td>${l.missed >= 3 ? '<span class="pill warn">In default</span>' : l.missed > 0 ? '<span class="pill warn">Overdue</span>' : '<span class="pill good">Regular</span>'}</td>
        <td class="n"><button class="btn sm" data-repay="${l.id}" ${S.cash < 1000 ? 'disabled' : ''}>Repay</button></td>
      </tr>`;
      }).join('')}
    </table>
    <div class="small muted" style="margin-top:8px">Idle cash earns nothing while these run against it, so clearing debt early is often the best use of surplus money. It is also the money you will not have when the next site needs paying for, and banks do not lend it back on demand.</div>
    </div>` : ''}

    <div class="card"><h3>Raise money</h3>
      <div class="grid g2">
      ${lenders.map((l) => {
        const r = offeredRate(l, S);
        return `<div class="card tight">
          <div class="spread"><b>${esc(l.name)}</b><span class="pill ${l.kind === 'private' ? 'warn' : l.kind === 'nbfc' ? 'gold' : ''}">${pct(r, 2)}</span></div>
          <div class="small muted" style="margin:6px 0">${esc(l.desc)}</div>
          <div class="small muted">Max ${pct(l.maxLtv, 0)} of security · up to ${l.maxTenure} months · needs ${l.minTrack} delivered project${l.minTrack === 1 ? '' : 's'}</div>
          <div style="margin-top:8px"><button class="btn sm" data-loan="${l.id}">Apply</button></div>
        </div>`;
      }).join('')}
      </div>
    </div>
  </div>`;
};

views.people = () => {
  const payroll = S.staff.reduce((t, p) => t + p.salary, 0);
  return `<div class="stack">
    <div class="grid g4">
      ${kpi('Headcount', String(S.staff.length), 'excluding site labour')}
      ${kpi('Monthly payroll', money(payroll), money(payroll * 12) + ' a year')}
      ${kpi('Your stress', Math.round(S.stress) + '/100', S.stress > 70 ? 'You cannot run this alone' : 'Manageable')}
      ${kpi('Governance', S.flags.internalAudit ? 'Internal audit in place' : 'No internal audit', S.flags.cleanBooks ? 'Audited, cheque-based books' : 'Books are, let us say, traditional')}
    </div>

    ${S.staff.length ? `<div class="card"><h3>Your people</h3><table>
      <tr><th>Name</th><th>Role</th><th class="n">Salary</th><th class="n">Skill</th><th class="n">Loyalty</th><th class="n">Years</th><th></th></tr>
      ${S.staff.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.roleName)}</td><td class="n">${money(p.salary)}</td>
        <td class="n">${p.skill}</td><td class="n ${p.loyalty < 30 ? 'neg' : ''}">${Math.round(p.loyalty)}</td>
        <td class="n">${((S.month - p.joined) / 12).toFixed(1)}</td>
        <td class="n"><button class="btn sm ghost" data-fire="${p.id}">Let go</button></td></tr>`).join('')}
    </table></div>` : emptyCard('You are the entire company. That works for one project. It does not work for four.')}

    <div class="card"><h3>Hire</h3><div class="grid g3">
      ${Object.entries(ROLES).map(([k, r]) => {
        const cost = Math.round(r.base * salaryIndex(S.month));
        const gated = r.exec && S.netWorth < 3e7;
        return `<div class="card tight">
          <div class="spread"><b>${esc(r.name)}</b>${r.exec ? '<span class="pill gold">Executive</span>' : ''}</div>
          <div class="small muted">${money(cost)} a month · improves ${esc(r.impact)}</div>
          <div style="margin-top:7px"><button class="btn sm" data-hire="${k}" ${gated ? 'disabled title="Your company is not big enough to carry this yet."' : ''}>Hire</button></div>
        </div>`;
      }).join('')}
    </div></div>
  </div>`;
};

views.market = () => {
  const mv = marketView(S.month, S);
  return `<div class="stack">
    <div class="card tight" class="small">
      <span class="small muted">
      Construction cost index ${costIndex(S.month).toFixed(2)}× 1995 ·
      cement ₹${Math.round(materialPrice('cement', S.month))}/bag ·
      steel ₹${num(Math.round(materialPrice('steel', S.month)))}/tonne ·
      mason ₹${Math.round(wage('mason', S.month))}/day ·
      duty ${pct(dutyRate(S.month))} ·
      USD ₹${S.macro.usd.toFixed(1)}
      </span>
    </div>

    <div class="card"><h3>Land and rent by locality — ${dateLabel(S.month)}</h3><table>
      <tr><th>Locality</th><th class="n">₹ / sq yd</th><th class="n">per acre</th><th class="n">12-mo</th><th class="n">Resi rent</th><th class="n">Office rent</th><th class="n">FAR</th><th>Character</th></tr>
      ${mv.sort((a, b) => b.rate - a.rate).map((l) => `<tr>
        <td><b>${esc(l.name)}</b>${l.obscure ? ' <span class="pill">Off the map</span>' : ''}</td>
        <td class="n">₹${num(l.rate)}</td>
        <td class="n">${money(l.perAcre)}</td>
        <td class="n ${l.yoy > 0 ? 'pos' : l.yoy < 0 ? 'neg' : ''}">${pct(l.yoy)}</td>
        <td class="n">${l.resRent ? '₹' + l.resRent.toFixed(1) : '—'}</td>
        <td class="n">${l.officeRent ? '₹' + l.officeRent.toFixed(1) : '—'}</td>
        <td class="n">${l.far.toFixed(2)}</td>
        <td class="small muted">${esc(l.desc)}</td>
      </tr>`).join('')}
    </table>
    <div class="small muted" style="margin-top:8px">Rents are per square foot per month. Floor area ratio is what you may build on a well-served plot today.
    Nothing on this page tells you where the city is going next. That is the job.</div>
    </div>

    <div class="card"><h3>The competition</h3><div class="grid g2">
      ${S.competitors.map((c) => `<div class="card tight">
        <div class="spread"><b>${esc(c.name)}</b><span class="pill ${c.dead ? 'warn' : c.scale > 0.6 ? 'gold' : ''}">${c.dead ? 'Collapsed' : 'Scale ' + c.scale.toFixed(2)}</span></div>
        <div class="small muted" style="margin-top:5px">${esc(c.desc)}</div>
      </div>`).join('')}
    </div></div>
  </div>`;
};

views.news = () => `<div class="card"><h3>The record</h3>${S.news.slice().reverse().slice(0, 140).map(newsItem).join('')}</div>`;

views.books = () => {
  const y = S.yearbook;
  return `<div class="stack">
    ${y.length ? `<div class="card"><h3>Year by year</h3><div style="overflow-x:auto"><table>
      <tr><th>Year</th><th class="n">Revenue</th><th class="n">EBITDA</th><th class="n">Interest</th><th class="n">PAT</th><th class="n">Rental NOI</th>
      <th class="n">Debt</th><th class="n">Assets</th><th class="n">Net worth</th><th class="n">Real (1995 ₹)</th><th class="n">USD</th></tr>
      ${y.map((e) => `<tr><td><b>${e.year}</b></td>
        <td class="n">${money(e.revenue)}</td><td class="n">${money(e.ebitda)}</td><td class="n">${money(e.interest)}</td>
        <td class="n ${e.pat < 0 ? 'neg' : 'pos'}">${money(e.pat)}</td><td class="n">${money(e.noi)}</td>
        <td class="n">${money(e.debt)}</td><td class="n">${money(e.assets)}</td>
        <td class="n"><b>${money(e.netWorth)}</b></td><td class="n">${money(e.realNetWorth)}</td><td class="n">${usd(e.netWorth, e.usdRate)}</td></tr>`).join('')}
    </table></div>
    <div class="small muted" style="margin-top:8px">Real net worth converts every year back to January 1995 purchasing power.
    The gap between the nominal and real columns is the part of your wealth that inflation created rather than you.</div>
    </div>` : emptyCard('The first annual accounts close in December 1995.')}

    <div class="card"><h3>Cash book</h3><table>
      <tr><th>Date</th><th>Entry</th><th>Note</th><th class="n">Amount</th></tr>
      ${S.ledger.slice().reverse().slice(0, 70).map((l) => `<tr><td class="mono small">${dateLabel(l.m)}</td><td>${esc(l.type)}</td>
        <td class="small muted">${esc(l.note || '')}</td><td class="n ${l.amount < 0 ? 'neg' : 'pos'}">${money(l.amount, { sign: true })}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Nothing yet.</td></tr>'}
    </table></div>

    <div class="card"><h3>Danger zone</h3>
      <div class="inline"><button class="btn ghost" id="export">Export save</button>
      <button class="btn danger" id="restart">Abandon and start again</button></div>
    </div>
  </div>`;
};

// ------------------------------------------------------------------ helpers

const kpi = (k, v, s) => `<div class="card kpi"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
const row = (l, r, cls = '') => `<div class="row ${cls}"><span class="l">${l}</span><span class="r">${r}</span></div>`;
const emptyCard = (t) => `<div class="card center muted" style="padding:36px 20px">${t}</div>`;
const newsItem = (n) => `<div class="news-item ${n.major ? 'major' : ''}">
  <div class="meta">${dateLabel(n.m)} · ${esc(n.tag)}</div><h4>${esc(n.head)}</h4>${n.body ? `<p>${esc(n.body)}</p>` : ''}</div>`;

function monthlyBurn() {
  const payroll = S.staff.reduce((t, p) => t + p.salary, 0);
  const office = Math.round((3000 + S.staff.length * 2200) * costIndex(S.month));
  const personal = Math.round(S.personalExpense * costIndex(S.month));
  const emi = S.loans.reduce((t, l) => t + l.emi, 0);
  return payroll + office + personal + emi;
}

function spark(vals) {
  if (vals.length < 2) return '';
  const w = 600, h = 90, pad = 4;
  const min = Math.min(0, ...vals), max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const yy = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return `${x.toFixed(1)},${yy.toFixed(1)}`;
  }).join(' ');
  return `<svg class="sparkwrap" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="var(--accent-2)" stroke-width="2"/></svg>`;
}

function buildAlerts() {
  const a = [];
  if (S.cash < 0) a.push({ icon: '▲', text: 'Bank account overdrawn. Nothing on site is being paid.', tag: 'Critical' });
  else if (S.cash < monthlyBurn() * 2) a.push({ icon: '▲', text: `Under two months of cash at current burn (${money(monthlyBurn())} a month).`, tag: 'Cash' });
  if (S.ratios.debtToAssets > 0.6) a.push({ icon: '▲', text: `Leverage at ${pct(S.ratios.debtToAssets)} of assets. Lenders start refusing above 60 per cent.`, tag: 'Leverage' });
  if (S.ratios.interestCover < 1.3 && S.debt > 0) a.push({ icon: '▲', text: `Interest cover ${S.ratios.interestCover.toFixed(2)}x — below every bank covenant.`, tag: 'Covenant' });
  for (const p of S.projects.filter((x) => !x.done && x.stalled > 0)) a.push({ icon: '■', text: `${p.name} has been stopped for ${p.stalled} month${p.stalled === 1 ? '' : 's'} for want of money.`, tag: 'Site' });
  for (const p of S.parcels.filter((x) => x.owned && x.known.some((d) => !(x.resolved || []).includes(d)))) {
    const d = p.known.find((k) => !(p.resolved || []).includes(k));
    a.push({ icon: '§', text: `${p.label}: unresolved ${DEFECTS[d].name.toLowerCase()}.`, tag: 'Title' });
  }
  if (S.stress > 78) a.push({ icon: '●', text: 'You are running everything yourself and it is showing. Hire, or something will break.', tag: 'Personal' });
  if (S.flags.npa) a.push({ icon: '▲', text: 'A bank account is classified non-performing. Fresh credit is effectively closed.', tag: 'Credit' });
  if (S.flags.underInvestigation) a.push({ icon: '▲', text: 'An Anti-Corruption Bureau case is open against the company.', tag: 'Legal' });
  return a.slice(0, 7);
}

// ------------------------------------------------------------------ view bindings

function bindView() {
  const v = $('#view');
  if (!v) return;
  v.querySelectorAll('[data-deal]').forEach((b) => { b.onclick = () => showDeal(b.dataset.deal); });
  v.querySelectorAll('[data-broker]').forEach((b) => { b.onclick = () => doBroker(b.dataset.broker); });
  v.querySelectorAll('[data-build]').forEach((b) => { b.onclick = () => showBuild(b.dataset.build); });
  v.querySelectorAll('[data-sellland]').forEach((b) => {
    b.onclick = () => { const r = sellParcel(S, b.dataset.sellland); say(r.ok ? `Sold for ${money(r.net)} — a ${r.gain >= 0 ? 'gain' : 'loss'} of ${money(Math.abs(r.gain))}.` : r.msg); refresh(S); saveGame(S); render(); };
  });
  v.querySelectorAll('[data-sellasset]').forEach((b) => {
    b.onclick = () => { const r = sellAsset(S, b.dataset.sellasset); say(r.ok ? `Sold for ${money(r.net)}.` : r.msg); refresh(S); saveGame(S); render(); };
  });
  v.querySelectorAll('[data-abandon]').forEach((b) => {
    b.onclick = () => {
      const p = S.projects.find((x) => x.id === b.dataset.abandon);
      if (!p) return;
      confirmModal({
        title: `Abandon ${p.name}?`,
        body: `You have spent ${money(p.spent)} on this site. Selling it on part-built will recover roughly `
          + `${money(p.spent * (p.stage === 'approval' ? 0.25 : 0.55))} — half-finished buildings fetch badly, because the buyer `
          + `inherits your contractor disputes and your deviations.`
          + (p.advances ? ` The ${money(p.advances)} of advances your buyers have paid becomes a creditor on your books, and they will come for it.` : '')
          + ` The land returns to your land bank. Brokers, buyers and your bank will all know you started something you could not finish.`,
        confirmLabel: 'Abandon the site',
        danger: true,
        onConfirm: () => {
          const r = abandonProject(S, b.dataset.abandon);
          say(r.ok ? `Site sold on. Recovered ${money(r.recovered)}.` : r.msg);
          refresh(S); saveGame(S); render();
        },
      });
    };
  });
  v.querySelectorAll('[data-loan]').forEach((b) => { b.onclick = () => showLoan(b.dataset.loan); });
  v.querySelectorAll('[data-repay]').forEach((b) => { b.onclick = () => showRepay(b.dataset.repay); });
  v.querySelectorAll('[data-hire]').forEach((b) => {
    b.onclick = () => { const p = hire(S, b.dataset.hire); say(`${p.name} hired at ${money(p.salary)} a month.`); refresh(S); saveGame(S); render(); };
  });
  v.querySelectorAll('[data-fire]').forEach((b) => {
    b.onclick = () => { fire(S, b.dataset.fire); refresh(S); saveGame(S); render(); };
  });
  v.querySelectorAll('[data-ask]').forEach((r) => {
    r.onchange = () => { setAsk(S, r.dataset.ask, (Number(r.value) / 100) * Number(r.dataset.mkt)); saveGame(S); render(); };
  });
  const ex = $('#export'); if (ex) ex.onclick = async () => {
    const json = JSON.stringify(S);
    // Try a download first, then the clipboard: embedded browser panes block
    // page-initiated downloads silently, so the button must not appear to do nothing.
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `hyderabad-${dateLabel(S.month).replace(' ', '-')}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      say('Save exported. If no file appeared, your browser blocked the download — the save has also been copied to your clipboard.');
    } catch (e) { say('Download blocked; copying the save to your clipboard instead.'); }
    try { await navigator.clipboard.writeText(json); } catch (e) { /* clipboard unavailable */ }
  };
  const rs = $('#restart'); if (rs) rs.onclick = () => confirmModal({
    title: 'Abandon this run and start again?',
    body: `You are in ${dateLabel(S.month)} with a net worth of ${money(S.netWorth)}. This deletes the saved game `
      + `permanently and returns you to January 1995. There is no way back to this run afterwards.`,
    confirmLabel: 'Delete and start again',
    danger: true,
    onConfirm: () => { clearSave(); S = null; modal = null; tab = 'dashboard'; renderStart(); },
  });
}

// ------------------------------------------------------------------ modals

function closeModal() { modal = null; modalRoot.innerHTML = ''; }

/**
 * In-app confirmation. Never use window.confirm(): embedded browser panes suppress it
 * and it returns false silently, which makes destructive buttons look broken.
 */
function confirmModal({ title, body, confirmLabel, danger = false, onConfirm }) {
  openModal(`<div class="modal" style="max-width:520px">
    <div class="head"><div class="cat">Confirm</div><h2>${esc(title)}</h2></div>
    <div class="body"><p>${esc(body)}</p></div>
    <div class="foot"><div class="inline">
      <button class="btn ${danger ? 'danger' : ''}" id="ok">${esc(confirmLabel)}</button>
      <button class="btn ghost" id="cancel">Cancel</button>
    </div></div>
  </div>`, (rootEl) => {
    $('#cancel', rootEl).onclick = () => { closeModal(); render(); };
    $('#ok', rootEl).onclick = () => { closeModal(); onConfirm(); };
  });
}

function openModal(html, bind) {
  modal = true;
  modalRoot.innerHTML = `<div class="scrim">${html}</div>`;
  const scrim = $('.scrim', modalRoot);
  scrim.onclick = (e) => { if (e.target === scrim && !S.pendingEvent && !S.over) { closeModal(); render(); } };
  if (bind) bind(modalRoot);
}

function showEvent() {
  const c = S.pendingEvent;
  if (!c) return;
  openModal(`<div class="modal">
    <div class="head"><div class="cat">${esc(c.cat || 'Event')} · ${dateLabel(S.month)}</div><h2>${esc(c.head)}</h2></div>
    <div class="body"><p>${esc(c.body)}</p></div>
    <div class="foot">${c.choices.map((ch, i) => `<button class="choice ${ch.illegal ? 'illegal' : ''}" data-c="${i}">
      <div class="lab">${esc(ch.label)}</div>${ch.hint ? `<div class="hint">${esc(ch.hint)}</div>` : ''}</button>`).join('')}</div>
  </div>`, (rootEl) => {
    rootEl.querySelectorAll('[data-c]').forEach((b) => {
      b.onclick = () => { resolveEvent(S, Number(b.dataset.c)); closeModal(); saveGame(S); render(); };
    });
  });
}

function doBroker(id) {
  const o = S.offers.find((x) => x.id === id);
  if (!o) return;
  const price = o.negotiatedPrice ?? o.price;
  confirmModal({
    title: `Broker ${o.label} rather than buy it?`,
    body: `You would introduce a buyer to ${o.seller} and take one to two per cent — somewhere around `
      + `${money(price * 0.009)} to ${money(price * 0.02)} — without putting up a rupee. `
      + `You also give up the property, and everything it might have been worth in ten years.\n\n`
      + `Not every introduction closes. Yours close more often the better you know the market and the people in it.`,
    confirmLabel: 'Find a buyer for it',
    onConfirm: () => {
      const r = brokerDeal(S, id);
      say(r.closed ? `Brokered. ${money(r.fee)} commission, no capital employed.` : 'The deal fell through. Five weeks, nothing to show for it.');
      refresh(S); saveGame(S); render();
    },
  });
}

function showDeal(id) {
  const o = S.offers.find((x) => x.id === id);
  if (!o) return;
  const price = o.negotiatedPrice ?? o.price;
  const duty = Math.round(price * dutyRate(S.month));
  const legal = Math.round(Math.max(5000, price * 0.004));
  const loc = BY_ID[o.locality];
  const fair = landRate(o.locality, S.month, S) * (o.areaSqYd || 0);

  const ci = costIndex(S.month);
  const ddTiers = [
    ['quick', 'Encumbrance certificate only', Math.round(Math.max(1500 * ci, o.price * 0.0015)), 'Same month'],
    ['standard', 'Advocate’s thirty-year search and site survey', Math.round(Math.max(6000 * ci, o.price * 0.004)), 'One month'],
    ['deep', 'Full title opinion, revenue, Wakf and litigation search', Math.round(Math.max(18000 * ci, o.price * 0.010)), 'Two months'],
  ];

  openModal(`<div class="modal">
    <div class="head"><div class="cat">${o.kind === 'devagreement' ? 'Development agreement' : o.kind === 'asset' ? 'Income asset' : 'Land'} · ${esc(loc.name)}</div>
      <h2>${esc(o.label)}</h2></div>
    <div class="body">
      <p class="small muted">${esc(loc.desc)}</p>
      <div class="grid g2">
        <div class="card tight">
          ${o.kind === 'devagreement'
            ? row('Owner keeps', pct(o.ownerShare, 0) + ' of built area') + row('Refundable advance', money(o.advance)) + row('Land cost', 'Nil')
            : row('Asking price', money(price)) + (o.askRate ? row('Rate', '₹' + num(o.askRate) + ' / sq yd') : '') +
              row('Market rate today', '₹' + num(Math.round(landRate(o.locality, S.month, S))) + ' / sq yd') +
              row('Stamp & registration', money(duty)) + row('Legal', money(legal)) +
              row('Total cash required', money(price + duty + legal), 'total')}
          ${o.kind === 'asset' ? row('In-place NOI', money(o.noi) + ' p.a.') + row('Implied yield', pct(o.noi / Math.max(1, price))) + row('Occupancy', pct(o.occupancy)) : ''}
        </div>
        <div class="card tight">
          ${row('Permissible FAR here', farFor(loc, S.month, S.flags).toFixed(2))}
          ${o.areaSqYd ? row('Buildable area', num(Math.floor(o.areaSqYd * 9 * farFor(loc, S.month, S.flags) * 0.92)) + ' sq ft') : ''}
          ${row('Residential rent', loc.rentBase.res ? '₹' + rentRate(o.locality, 'res', S.month, S.flags).toFixed(1) + ' /sq ft' : '—')}
          ${row('Office rent', rentRate(o.locality, 'office', S.month, S.flags) ? '₹' + rentRate(o.locality, 'office', S.month, S.flags).toFixed(1) + ' /sq ft' : 'No office market here')}
          ${row('Liquidity', pct(loc.liquidity, 0))}
          ${row('Seller', esc(o.seller) + (o.motive ? ` — ${esc(o.motive)}` : ''))}
        </div>
      </div>

      <div class="card tight" style="margin-top:12px">
        <h3 style="margin-bottom:8px">Title investigation</h3>
        ${o.known.length
          ? o.known.map((d) => `<div class="row"><span class="l"><span class="pill warn">${esc(DEFECTS[d].name)}</span></span><span class="r small" style="max-width:60%;text-align:right">${esc(DEFECTS[d].desc)}</span></div>`).join('')
          : `<div class="small muted">${o.ddDone ? `Nothing found, on ${pct(o.ddConfidence || 0.3, 0)} confidence. A clean report is not proof of clean title — it means you did not find anything.` : 'You have not looked. Never assume a seller has good title.'}</div>`}
        <div class="inline" style="margin-top:10px">
          ${ddTiers.map(([k, label, cost, time]) => `<button class="btn sm ghost" data-dd="${k}" ${S.cash < cost ? 'disabled' : ''}>${esc(label)} — ${money(cost)}, ${time}</button>`).join('')}
        </div>
      </div>

      ${o.kind !== 'devagreement' ? `<div class="card tight" style="margin-top:12px">
        <h3 style="margin-bottom:8px">Negotiate</h3>
        <div class="inline"><input id="neg" type="number" value="${Math.round(price * 0.9)}" step="10000">
        <button class="btn sm ghost" id="negbtn">Make an offer</button>
        <span class="small muted">${o.negotiated ? 'Already negotiated once.' : 'Push too hard and he walks.'}</span></div>
      </div>` : ''}
    </div>
    <div class="foot">
      <div class="inline">
        ${o.kind !== 'devagreement' ? `<button class="btn ghost" id="brokerit">Broker it instead — commission only</button>` : ''}
        <button class="btn" id="buy" ${S.cash < (o.kind === 'devagreement' ? o.advance : price + duty + legal) ? 'disabled' : ''}>
          ${o.kind === 'devagreement' ? `Sign the agreement (${money(o.advance)} advance)` : `Buy and register — ${money(price + duty + legal)}`}
        </button>
        <button class="btn ghost" id="close">Leave it</button>
        ${S.cash < (o.kind === 'devagreement' ? o.advance : price + duty + legal) ? `<span class="small neg">Short by ${money((o.kind === 'devagreement' ? o.advance : price + duty + legal) - S.cash)}</span>` : ''}
      </div>
    </div>
  </div>`, (rootEl) => {
    rootEl.querySelectorAll('[data-dd]').forEach((b) => {
      b.onclick = () => {
        const r = doDueDiligence(S, o, b.dataset.dd);
        if (!r.ok) return say(r.msg);
        say(r.found.length
          ? `Investigation found: ${r.found.map((d) => DEFECTS[d].name).join(', ')}.`
          : `Nothing found, at ${pct(r.confidence, 0)} confidence. That is not the same as clean.`);
        saveGame(S); closeModal(); showDeal(id);
      };
    });
    const nb = $('#negbtn', rootEl);
    if (nb) nb.onclick = () => {
      const r = negotiate(S, o, Number($('#neg', rootEl).value));
      say(r.msg); saveGame(S); closeModal();
      if (S.offers.find((x) => x.id === id)) showDeal(id); else render();
    };
    const bk = $('#brokerit', rootEl);
    if (bk) bk.onclick = () => { closeModal(); doBroker(id); };
    $('#close', rootEl).onclick = () => { closeModal(); render(); };
    $('#buy', rootEl).onclick = () => {
      let r;
      if (o.kind === 'devagreement') r = signDevAgreement(S, o);
      else if (o.kind === 'asset') r = buyAssetOffer(S, o);
      else r = buyLand(S, o);
      if (!r.ok) return say(r.msg);
      say('Registered.'); refresh(S); saveGame(S); closeModal(); tab = 'land'; render();
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
  const allOptions = [...types.map((t) => ({ ...t, kind: 'build' })), ...layouts.map((l) => ({ ...l, kind: 'layout' }))];
  if (!allOptions.length) return say('There is nothing worth doing on this parcel at present.');

  const committed = remainingCommitments(S);
  // Default to the largest phase the player can actually fund, not the largest the plot
  // allows. The gap between those two numbers is what bankrupts developers.
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
    for (const want of [cap, 200000, 120000, 60000, 30000, 18000, 12000, 8000, 5000, 3000]) {
      const sq = Math.min(cap, want);
      if (sq < bt.minSqFt) continue;
      const e = estimateProject(p, typeId, sq, S);
      if ((committed + e.schedule.peak) * 0.32 <= S.cash) return sq;
    }
    return Math.max(bt.minSqFt, Math.min(cap, 3000));
  };
  const initialSize = fundableSize(allOptions[0].id);

  const draw = () => {
    const typeId = $('#bt') ? $('#bt').value : allOptions[0].id;
    const sqFt = $('#bsf') ? Number($('#bsf').value) : initialSize;
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
    $('#estimate').innerHTML = `
      ${row('Buildable now (FAR ' + farFor(loc, S.month, S.flags).toFixed(2) + ')', num(cap) + ' sq ft')}
      ${row('Construction budget', money(est.budget))}
      ${row('Cost per sq ft', '₹' + Math.round(est.costPerSqFt))}
      ${row('Sanction expected in', est.approvalMonths + ' months')}
      ${row('Construction period', bt.months + ' months (before delays)')}
      <div style="height:8px"></div>
      ${row('Peak funding required', money(est.schedule.peak))}
      ${row('Needed in the first twelve months', money(est.firstYearCash))}
      ${committed > 0 ? row('Already committed to live projects', money(committed)) : ''}
      ${row('Cash you should have in hand', money(need) + ' vs your ' + money(S.cash), fundable ? '' : 'total')}
      ${fundable ? '' : '<div class="small neg" style="padding:6px 0">Not fundable at this size. Reduce the area and build it in phases.</div>'}
      ${p.devAgreement ? row('Your share of built area', pct(own, 0) + ' — ' + num(Math.round(sqFt * own)) + ' sq ft') : ''}
      <div style="height:8px"></div>
      ${row('SELL: gross value at today’s prices', money(est.grossValue * own), 'total')}
      ${row('SELL: profit over cost + land', money(est.grossValue * own - est.budget - (p.allInCost || 0)))}
      <div style="height:8px"></div>
      ${row('HOLD: stabilised NOI', holdNoi > 0 ? money(holdNoi * own) + ' a year' : 'No rental market for this use here')}
      ${row('HOLD: value at ' + pct(cr) + ' cap rate', holdValue > 0 ? money(holdValue * own) : '—', 'total')}
      <div class="small muted" style="margin-top:8px">Selling gives you the money now and ends your exposure.
      Holding gives you an income that compounds for twenty-five years and an asset a bank will lend against —
      but it takes years to let, and every empty month costs you.</div>`;
  };

  const drawLayout = (typeId, grossSqYd) => {
    const lt = LAYOUT_TYPES[typeId];
    const est = estimateLayout(p, typeId, grossSqYd, S);
    const need = (committed + est.schedule.peak) * 0.32;
    const fundable = S.cash >= need;
    const landCost = Math.round((p.allInCost || 0) * (grossSqYd / Math.max(1, p.areaSqYd)));
    const total = est.budget + landCost;
    $('#estimate').innerHTML = `
      ${row('Site area for this venture', num(grossSqYd) + ' sq yd (' + (grossSqYd / SQYD_PER_ACRE).toFixed(2) + ' acres)')}
      ${row('Saleable after roads and open space', num(est.saleableSqYd) + ' sq yd — ' + pct(lt.saleable, 0) + ' of the site')}
      ${row('Conversion out of agricultural use', est.conversion ? money(est.conversion) : 'Not applicable')}
      ${row('Roads, drains, water, power', money(est.works))}
      ${row('Land attributable to this venture', money(landCost))}
      ${row('Total cost', money(total), 'total')}
      <div style="height:8px"></div>
      ${row('Sanction and conversion take', est.approvalMonths ? est.approvalMonths + ' months' : 'No sanction sought')}
      ${row('Development works take', est.months + ' months')}
      ${row('Peak funding required', money(est.schedule.peak))}
      ${row('Cash you should have in hand', money(need) + ' vs your ' + money(S.cash), fundable ? '' : 'total')}
      ${fundable ? '' : '<div class="small neg" style="padding:6px 0">Not fundable at this size. Lay out fewer acres now and do the rest as a second phase.</div>'}
      <div style="height:8px"></div>
      ${row('Raw land rate today', '₹' + num(Math.round(landRate(p.locality, S.month, S))) + ' / sq yd')}
      ${row('Developed plot rate', '₹' + num(Math.round(est.plotRate)) + ' / sq yd — ' + (est.plotRate / Math.max(1, landRate(p.locality, S.month, S))).toFixed(1) + '× raw land')}
      ${row('Revenue if it all sells', money(est.grossValue), 'total')}
      ${row('Profit over land and works', money(est.grossValue - total))}
      <div class="small muted" style="margin-top:8px">${esc(lt.desc)}</div>
      ${lt.unapproved ? '<div class="small neg" style="padding:6px 0">An unapproved venture sells faster and cheaper, costs you standing in the market, and hands every buyer a regularisation problem. Plenty of people did exactly this.</div>' : ''}`;
    $('#go-sell').disabled = !fundable;
    $('#go-hold').disabled = true;
    $('#go-hold').title = 'A layout is sold as plots; there is nothing to retain and let.';
  };

  openModal(`<div class="modal">
    <div class="head"><div class="cat">Develop · ${esc(loc.name)}</div><h2>${esc(p.label)}</h2></div>
    <div class="body">
      <div class="grid g2">
        <label class="stack" style="gap:4px"><span class="small muted">What to do with it</span>
          <select id="bt">
            ${types.length ? `<optgroup label="Build">${types.map((b) => `<option value="${b.id}">${esc(b.name)} — ₹${Math.round(b.cost * costIndex(S.month))}/sq ft built</option>`).join('')}</optgroup>` : ''}
            ${layouts.length ? `<optgroup label="Lay out and sell plots">${layouts.map((l) => `<option value="${l.id}">${esc(l.name)} — ₹${Math.round(l.cost * costIndex(S.month))}/sq yd of site</option>`).join('')}</optgroup>` : ''}
          </select></label>
        <label class="stack" style="gap:4px"><span class="small muted" id="bsflabel">Built-up area for this phase (sq ft), max ${num(cap)}</span>
          <input id="bsf" type="number" value="${initialSize}" max="${cap}" step="500"></label>
      </div>
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
      const t = $('#bt', rootEl).value;
      const lay = isLayout(t);
      $('#bsf', rootEl).max = lay ? site : cap;
      $('#bsf', rootEl).step = lay ? 100 : 500;
      $('#bsflabel', rootEl).textContent = lay
        ? `Site area to lay out (sq yd), up to ${num(site)} — ${(site / SQYD_PER_ACRE).toFixed(2)} acres available`
        : `Built-up area for this phase (sq ft), max ${num(cap)}`;
      $('#go-sell', rootEl).textContent = lay ? 'Develop the layout and sell plots' : 'Build to sell';
      $('#go-hold', rootEl).style.display = lay ? 'none' : '';
      draw();
      $('#btdesc', rootEl).textContent = (BUILD_TYPES[t] || LAYOUT_TYPES[t]).desc;
    };
    $('#bt', rootEl).onchange = () => { $('#bsf', rootEl).value = fundableSize($('#bt', rootEl).value); upd(); };
    $('#bsf', rootEl).oninput = upd;
    upd();
    $('#close', rootEl).onclick = () => { closeModal(); render(); };
    const launch = (mode) => {
      const r = launchProject(S, parcelId, $('#bt', rootEl).value, Number($('#bsf', rootEl).value), mode);
      if (!r.ok) return say(r.msg);
      refresh(S); saveGame(S); closeModal(); tab = 'projects'; render();
    };
    $('#go-sell', rootEl).onclick = () => launch('sell');
    $('#go-hold', rootEl).onclick = () => launch('hold');
  });
}

function showLoan(lenderId) {
  const l = LENDERS[lenderId];
  const free = [
    ...S.parcels.filter((p) => p.owned && !p.pledged && !p.consumed).map((p) => ({ id: p.id, label: p.label, v: landRate(p.locality, S.month, S) * p.areaSqYd })),
    ...S.assets.filter((a) => !a.pledged).map((a) => ({ id: a.id, label: a.name, v: assetValue(a, S) })),
  ];
  openModal(`<div class="modal">
    <div class="head"><div class="cat">Credit application</div><h2>${esc(l.name)}</h2></div>
    <div class="body">
      <p class="small muted">${esc(l.desc)}</p>
      ${row('Rate they would offer you today', pct(offeredRate(l, S), 2))}
      ${row('Maximum against security', pct(l.maxLtv, 0))}
      ${row('Maximum tenure', l.maxTenure + ' months')}
      ${row('Track record required', l.minTrack + ' delivered project' + (l.minTrack === 1 ? '' : 's') + ' (you have ' + S.stats.projectsDone + ')')}
      <label class="stack" style="gap:4px;margin-top:14px"><span class="small muted">Amount sought</span>
        <input id="amt" type="number" value="1000000" step="100000"></label>
      <div style="margin-top:12px"><div class="small muted" style="margin-bottom:6px">Security offered</div>
        ${free.length ? free.map((f) => `<label class="row"><span class="l"><input type="checkbox" data-col="${f.id}"> ${esc(f.label)}</span><span class="r">${money(f.v)}</span></label>`).join('')
          : '<div class="small muted">You have nothing unencumbered to pledge. Unsecured lending to a small developer in this era does not exist.</div>'}
        ${S.flags.shopPledged ? row('Your father’s shop (already pledged)', money(900000 * costIndex(S.month))) : ''}
      </div>
      <div id="decision"></div>
    </div>
    <div class="foot"><div class="inline">
      <button class="btn" id="apply">Submit the application</button>
      <button class="btn ghost" id="close">Withdraw</button>
    </div></div>
  </div>`, (rootEl) => {
    $('#close', rootEl).onclick = () => { closeModal(); render(); };
    $('#apply', rootEl).onclick = () => {
      const ids = [...rootEl.querySelectorAll('[data-col]')].filter((c) => c.checked).map((c) => c.dataset.col);
      const r = applyForLoan(S, lenderId, Number($('#amt', rootEl).value), ids);
      const d = r.decision;
      $('#decision', rootEl).innerHTML = `<div class="card tight" style="margin-top:14px">
        <div class="spread"><b>${r.ok ? 'Sanctioned' : 'Declined'}</b><span class="pill ${r.ok ? 'good' : 'warn'}">${r.ok ? money(d.amount) + ' at ' + pct(d.rate, 2) : 'No facility'}</span></div>
        <div class="small muted" style="margin-top:6px">${(d?.reasons || ['The proposal does not meet lending norms.']).map(esc).join(' ')}</div></div>`;
      refresh(S); saveGame(S);
      if (r.ok) setTimeout(() => { closeModal(); render(); }, 2600);
    };
  });
}

function showRepay(loanId) {
  const l = S.loans.find((x) => x.id === loanId);
  if (!l) return;
  // The most principal the player could clear if they spent every rupee they have.
  const fullQuote = quotePrepayment(l, l.outstanding, S.month);
  const loading = 1 + fullQuote.penalty / Math.max(1, l.outstanding);
  const maxPrincipal = Math.max(0, Math.min(l.outstanding, Math.floor(S.cash / loading)));

  const draw = () => {
    const amt = Number($('#ramt').value) || 0;
    const q = quotePrepayment(l, amt, S.month);
    const afford = S.cash >= q.cashRequired;
    $('#rquote').innerHTML = `
      ${row('Principal repaid', money(q.principal))}
      ${row(q.minInterest > 0 ? 'Charges and minimum interest' : 'Foreclosure charge',
        money(q.penalty) + (q.penaltyRate ? ` (${pct(q.penaltyRate, 0)})` : ''))}
      ${row('Cash required now', money(q.cashRequired), 'total')}
      <div style="height:8px"></div>
      ${row('Outstanding afterwards', money(q.newOutstanding))}
      ${row('Facility closes in', q.full ? 'Closed outright'
        : (Number.isFinite(q.tenureAfter) ? `${q.tenureAfter} months, down from ${q.tenureBefore}` : '—'))}
      ${row('Interest you avoid', Number.isFinite(q.interestSaved) ? money(q.interestSaved) : '—')}
      ${row('Net gain over the life of the loan', Number.isFinite(q.netBenefit) ? money(q.netBenefit, { sign: true }) : '—', 'total')}
      ${row('Cash left afterwards', money(S.cash - q.cashRequired), afford ? '' : 'total')}
      ${afford ? '' : '<div class="small neg" style="padding:6px 0">You cannot cover this. Reduce the amount.</div>'}
      ${q.full && (l.collateral || []).length ? '<div class="small pos" style="padding:6px 0">Closing this facility releases the security pledged against it.</div>' : ''}`;
    $('#rgo').disabled = !afford || q.principal < 1000;
  };

  openModal(`<div class="modal" style="max-width:580px">
    <div class="head"><div class="cat">Prepayment · ${dateLabel(S.month)}</div><h2>${esc(l.lender)}</h2></div>
    <div class="body">
      ${row('Outstanding', money(l.outstanding))}
      ${row('Rate', pct(l.rate, 2))}
      ${row('Monthly instalment', money(l.emi))}
      ${row('Cash in hand', money(S.cash))}
      <label class="stack" style="gap:4px;margin-top:14px"><span class="small muted">Principal to repay</span>
        <input id="ramt" type="number" value="${Math.max(1000, Math.min(maxPrincipal, Math.round(l.outstanding)))}" min="1000" max="${Math.round(l.outstanding)}" step="10000"></label>
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
    const input = $('#ramt', rootEl);
    input.oninput = draw;
    rootEl.querySelectorAll('[data-quick]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.quick;
        input.value = Math.round(k === 'max' ? Math.min(l.outstanding, maxPrincipal) : l.outstanding * Number(k));
        draw();
      };
    });
    draw();
    $('#rclose', rootEl).onclick = () => { closeModal(); render(); };
    $('#rgo', rootEl).onclick = () => {
      const r = repayLoan(S, loanId, Number(input.value));
      if (!r.ok) return say(r.msg);
      say(r.quote.full
        ? `${l.lender} closed. ${money(r.quote.interestSaved)} of interest avoided.${r.released.length ? ` Security released: ${r.released.join(', ')}.` : ''}`
        : `Prepaid ${money(r.quote.principal)}. Around ${money(r.quote.interestSaved)} of interest avoided.`);
      refresh(S); saveGame(S); closeModal(); render();
    };
  });
}

function showEnding() {
  const last = S.yearbook[S.yearbook.length - 1] || {};
  const nwUsd = S.netWorth / S.macro.usd;
  const reasons = {
    time: 'March 2020. Twenty-five years and three months.',
    insolvent: 'The company failed.',
    health: 'Your body stopped before the company did.',
  };
  const verdict = () => {
    if (S.overReason === 'insolvent') return 'You are one of the many. Most people who tried this in Hyderabad between 1995 and 2020 ended here, and most of them were not stupid — they were leveraged into a cycle that turned.';
    if (nwUsd > 1e11) return 'One hundred billion dollars. This should not have been possible, and the fact that you did it means either extraordinary judgement or a run of luck the market will not give twice.';
    if (nwUsd > 1e10) return 'Ten billion dollars and a diversified institution. You are among the largest business houses in the country. The hundred-billion mark stays out of reach — as it does for almost everyone.';
    if (nwUsd > 1e9) return 'A billion dollars. You built one of the significant real-estate groups in India from twenty-five lakh rupees and a scooter. That is the realistic ceiling of a single lifetime in this business, and you reached it.';
    if (nwUsd > 1e8) return 'A hundred million dollars — roughly seven hundred and fifty crore. A substantial, respected Hyderabad developer. Comfortable, established, and not a conglomerate.';
    if (nwUsd > 1e7) return 'Ten million dollars. A solid mid-sized builder with a real business and real assets. Most people who start where you started do not get here.';
    return 'You survived twenty-five years in Indian real estate without going bankrupt. Given the period, that is not nothing.';
  };
  openModal(`<div class="modal">
    <div class="head"><div class="cat">${esc(reasons[S.overReason] || 'The end')}</div><h2>${esc(S.founder.firmName || 'Your firm')}, 1995–${yearOf(S.month)}</h2></div>
    <div class="body">
      <div class="grid g2">
        <div class="card tight">
          ${row('Final net worth', money(S.netWorth), 'total')}
          ${row('In US dollars', usd(S.netWorth, S.macro.usd))}
          ${row('In 1995 purchasing power', money(S.netWorth / (S.macro.cpiIndex / 100)))}
          ${row('Total assets', money(S.bs.assets))}
          ${row('Total debt', money(S.debt))}
          ${row('Compound annual return', S.equityPaidIn > 0 && S.netWorth > 0 ? pct(Math.pow(S.netWorth / S.equityPaidIn, 12 / Math.max(1, S.month)) - 1) : '—')}
        </div>
        <div class="card tight">
          ${row('Projects delivered', String(S.stats.projectsDone))}
          ${row('Built', num(S.stats.sqftBuilt) + ' sq ft')}
          ${row('Land bought', num(S.stats.landBoughtSqYd) + ' sq yd')}
          ${row('Rental NOI at the end', money(S.ratios.noi) + ' a year')}
          ${row('Title problems encountered', String(S.stats.defectsHit))}
          ${row('Reputation', Math.round(S.reputation) + ' / 100')}
        </div>
      </div>
      <p style="margin-top:14px">${esc(verdict())}</p>
      <p class="small muted">Target was one hundred billion dollars — ${money(100e9 * S.macro.usd)} at the closing exchange rate.
      You reached ${pct(Math.max(0, nwUsd) / 1e11, 4)} of it.</p>
    </div>
    <div class="foot"><div class="inline">
      <button class="btn ghost" id="close">Look through the books</button>
      <button class="btn" id="again">Start again</button>
    </div></div>
  </div>`, (rootEl) => {
    $('#close', rootEl).onclick = () => { closeModal(); tab = 'books'; render(); };
    $('#again', rootEl).onclick = () => { clearSave(); S = null; closeModal(); renderStart(); };
  });
}

boot();
