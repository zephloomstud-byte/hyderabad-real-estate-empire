import { newGame } from '../src/sim/state.js';
import { refresh, advanceMonth, resolveEvent, launchProject, maxBuildableSqFt,
  estimateProject, remainingCommitments, landRate, buyLand, doDueDiligence } from '../src/sim/engine.js';
import { money, dateLabel } from '../src/core/util.js';
import { makeRng } from '../src/core/rng.js';
import { BUILD_TYPES } from '../src/data/costs.js';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const BAD = ['ASSIGNED_LAND','WAKF_CLAIM','GOVT_CLAIM','CATCHMENT_ZONE','CANTONMENT','DOUBLE_SALE'];
const s = newGame('careful-0', { cash: 2500000 });
refresh(s);
const rng = makeRng(500 + 'careful-0'.charCodeAt(9) * 13);
let prev = s.cash;
while (!s.over && s.month < 90) {
  if (s.pendingEvent) { const i=s.pendingEvent.choices.findIndex(c=>!c.illegal);
    const before=s.cash; const id=s.pendingEvent.id; const lab=s.pendingEvent.choices[i<0?0:i].label;
    resolveEvent(s,i<0?0:i);
    if (Math.abs(s.cash-before)>1000) console.log(`   ${dateLabel(s.month)} EVENT ${id} "${lab}" cash ${money(before)} -> ${money(s.cash)} (${money(s.cash-before,{sign:true})})`);
    continue; }
  const idle = s.parcels.filter(p=>p.owned&&!p.consumed&&maxBuildableSqFt(p,s)>=3000);
  const committed = remainingCommitments(s);
  const burn = s.staff.reduce((t,x)=>t+x.salary,0)+30000+s.loans.reduce((t,l)=>t+l.emi,0);
  const free = s.cash - committed*0.5 - burn*6;
  if (s.projects.filter(p=>!p.done).length < 1 && free>0) for (const p of idle) {
    if (p.known.some(d=>BAD.includes(d))) continue;
    const cap=maxBuildableSqFt(p,s); let best=null;
    for (const t of Object.values(BUILD_TYPES)) { if(t.minSqFt>cap) continue; if(t.use!=='res'&&t.use!=='industrial') continue;
      for (const want of [cap,100000,50000,25000,15000,9000,6000,3500]) { const sqFt=Math.min(cap,want); if(sqFt<t.minSqFt) continue;
        const est=estimateProject(p,t.id,sqFt,s); if(est.schedule.peak*0.65>free) continue;
        const roi=(est.grossValue-est.budget)/est.schedule.peak;
        if(roi>0.18&&(!best||roi>best.roi)) best={t,sqFt,roi,est}; break; } }
    if (best){ const r=launchProject(s,p.id,best.t.id,best.sqFt,'sell'); if(r.ok){console.log(`${dateLabel(s.month)} BUILD ${best.t.id} ${best.sqFt}sf`); break;} }
  }
  if (idle.length<2 && free>1500000 && rng.chance(0.4)) {
    const c=s.offers.filter(o=>o.kind==='land'&&o.price*1.16<free*0.5);
    if (c.length){ const o=c.map(x=>({x,v:landRate(x.locality,s.month,s)/x.askRate})).sort((a,b)=>b.v-a.v)[0].x;
      const before=s.cash; doDueDiligence(s,o,o.price>1500000?'deep':'standard');
      const bad=o.known.some(d=>BAD.includes(d));
      if(!bad) buyLand(s,o);
      console.log(`${dateLabel(s.month)} ${bad?'REJECT':'BUY   '} ${o.label} ask ${money(o.price)} dd ${money(before-s.cash)} known=${o.known.join(',')||'clean'}`); }
  }
  const b4 = s.cash;
  advanceMonth(s);
  const d = s.cash - b4;
  if (s.month % 6 === 0 || Math.abs(d) > 300000)
    console.log(`${dateLabel(s.month)} cash ${money(s.cash)} (${money(d,{sign:true})}) nw ${money(s.netWorth)} inv ${s.inventory.length} live ${s.projects.filter(p=>!p.done).length} pay ${money(s.payables||0)}`);
}
console.log('END', dateLabel(s.month), s.overReason, money(s.cash), 'done', s.stats.projectsDone);
