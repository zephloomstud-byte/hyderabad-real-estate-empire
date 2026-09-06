// Event catalogue. Every one of the thirty structural problems of Indian real estate is
// represented here. Events are drawn probabilistically, weighted by the actual state of
// the company: leverage attracts credit events, big sites attract labour and safety
// events, weak governance attracts fraud, visibility attracts press and politics.
//
// Each event exposes `when` (eligibility) and `weight` (relative likelihood). `build`
// returns the presented card. Choices mutate state through the `fx` helper API so that
// all bookkeeping stays in one place.

import { money } from '../core/util.js';

const K = (n) => n * 1e5;   // lakh
const CR = (n) => n * 1e7;  // crore

const anyProject = (s, stage) => s.projects.filter((p) => !p.done && (!stage || p.stage === stage));
const ownedLand = (s) => s.parcels.filter((p) => p.owned && !p.usedBy);
const leased = (s) => s.assets.filter((a) => a.sqFt > 0);

export const EVENTS = [

  // ---------------------------------------------------------------- capital & credit
  {
    id: 'bank_cold', cat: 'Capital shortage', tags: ['finance'],
    when: (s) => s.month < 60 && s.relations.banks < 40,
    weight: () => 6,
    build: (s, rng, fx) => ({
      head: 'The bank manager will see you, briefly',
      body: `You have been waiting outside Mr Krishnamurthy's cabin at State Bank of Hyderabad since half past ten. When he finally calls you in he does not offer tea. He looks at your project papers for perhaps forty seconds.\n\n"Your father is a good customer. But you are asking me to lend against a building that does not exist, to a firm that has never completed one. Bring me a completed project, or bring me collateral worth twice what you want."`,
      choices: [
        { label: 'Accept it and leave politely', hint: 'Costs nothing. He remembers manners.',
          do: ({ fx }) => { fx.rel('banks', 3); fx.news('You left the bank without a sanction, but without burning it either.'); } },
        { label: 'Offer your father’s shop as collateral', hint: 'Raises borrowing power. Your father does not know yet.',
          do: ({ fx, s }) => { fx.rel('banks', 10); s.flags.shopPledged = true; fx.rel('family', -14); fx.news('You pledged the Sangeet Theatre Road shop. Your father has not been told.'); } },
        { label: 'Argue your projections at him', hint: 'He has heard better projections from worse people.',
          do: ({ fx, rng }) => { if (rng.chance(0.3)) { fx.rel('banks', 6); fx.news('He was, unusually, impressed.'); } else { fx.rel('banks', -8); fx.news('He was not impressed. Word travels between branch managers.'); } } },
      ],
    }),
  },
  {
    id: 'private_money', cat: 'High interest rates', tags: ['finance'],
    when: (s) => s.cash < K(6) && s.month > 4,
    weight: (s) => (s.cash < K(2) ? 12 : 5),
    build: (s, rng, fx) => ({
      head: 'Chalapathi garu has heard you are short',
      body: `He arrives at the site unannounced, in a white Ambassador, and stands looking at your slab for a long time before speaking.\n\n"Money problem, I heard. Don't take tension. I will give you ${money(K(15))} tomorrow morning. Two and a half per cent per month. Simple. You give me post-dated cheques and one blank one, and your personal guarantee."\n\nHe says it the way a man offers water.`,
      choices: [
        { label: `Take ${money(K(15))} at 2.5% a month`, hint: '30% a year, compounding, no grace. It has killed better builders than you.',
          do: ({ fx }) => { fx.privateLoan(K(15), 0.30, 18); fx.rel('financiers', 12); fx.news('You borrowed from Chalapathi. The blank cheque is in his drawer.'); } },
        { label: 'Refuse, politely', hint: 'You stay solvent and slow.',
          do: ({ fx }) => { fx.rel('financiers', -4); fx.news('You refused private money. He smiled and said he would come again.'); } },
        { label: 'Negotiate him to 2%', hint: 'He may respect it, or may withdraw the offer.',
          do: ({ fx, rng }) => {
            if (rng.chance(0.35)) { fx.privateLoan(K(15), 0.24, 18); fx.rel('financiers', 8); fx.news('He came down to two per cent. He will remember that you asked.'); }
            else { fx.rel('financiers', -6); fx.news('He laughed, got into the Ambassador and left.'); }
          } },
      ],
    }),
  },
  {
    id: 'bank_recall', cat: 'Liquidity crisis', tags: ['finance', 'crisis'],
    when: (s) => s.loans.some((l) => l.outstanding > 0) && s.macro.credit < 0.45 && s.ratios.debtToAssets > 0.5,
    weight: (s) => 10 * (s.ratios.debtToAssets - 0.4),
    build: (s, rng, fx) => ({
      head: 'The bank wants its money back',
      body: `A letter, delivered by hand. Your working capital limit is being reviewed downward with immediate effect, and the bank requires either additional security or a reduction of ${money(Math.max(K(8), s.debt * 0.2))} within ninety days.\n\nThis is not about you. Every developer in the city got the same letter this week. That does not make it survivable.`,
      choices: [
        { label: 'Sell inventory at a discount to raise cash', hint: 'Immediate cash, permanent margin damage.',
          do: ({ fx }) => { fx.fireSale(0.78); fx.rel('banks', 6); } },
        { label: 'Pledge more collateral', hint: 'Needs unencumbered land. Increases what you can lose.',
          do: ({ fx, s }) => { if (ownedLand(s).length) { fx.pledgeLand(); fx.rel('banks', 8); } else { fx.rel('banks', -12); fx.news('You had nothing left to pledge. The bank noted it.'); } } },
        { label: 'Go to the private market to refinance', hint: 'Solves ninety days. Creates a worse problem later.',
          do: ({ fx, s }) => { fx.privateLoan(Math.max(K(10), s.debt * 0.22), 0.34, 15); fx.rel('banks', 4); fx.rel('financiers', 8); } },
        { label: 'Ask for time and hope', hint: 'Free. Might work. Might not.',
          do: ({ fx, rng }) => { if (rng.chance(0.4)) { fx.news('The manager extended you sixty days. He did not have to.'); fx.rel('banks', 2); } else { fx.rel('banks', -16); fx.penalise(0.02); fx.news('The bank classified your account as irregular. Interest rate up two per cent.'); } } },
      ],
    }),
  },

  // ---------------------------------------------------------------- land & title
  {
    id: 'title_surface', cat: 'Land-title disputes', tags: ['legal'],
    when: (s) => s.parcels.some((p) => p.owned && p.defects.some((d) => !p.known.includes(d))),
    weight: () => 9,
    build: (s, rng, fx) => {
      const p = rng.pick(s.parcels.filter((x) => x.owned && x.defects.some((d) => !x.known.includes(d))));
      const d = rng.pick(p.defects.filter((x) => !p.known.includes(x)));
      return {
        head: 'A problem surfaces on your land',
        body: `A man you have never met is standing at the gate of your ${p.label} with a file. Inside the file is ${fx.defectName(d).toLowerCase()}.\n\n${fx.defectDesc(d)}\n\nYour advocate reads it twice and does not look up.`,
        meta: { parcelId: p.id, defect: d },
        choices: [
          { label: 'Fight it in court', hint: 'Years, lawyers, and an injunction that may stop everything.',
            do: ({ fx, rng }) => fx.resolveDefect(p.id, d, 'litigate', rng) },
          { label: 'Settle privately with the claimant', hint: 'Expensive and immediate. Usually the cheapest option in the end.',
            do: ({ fx, rng }) => fx.resolveDefect(p.id, d, 'settle', rng) },
          { label: 'Carry on building and deal with it later', hint: 'Every builder in the city does this. Some of them get away with it.',
            do: ({ fx, rng }) => fx.resolveDefect(p.id, d, 'ignore', rng) },
        ],
      };
    },
  },
  {
    id: 'landowner_approach', cat: 'Opportunity', tags: ['land', 'opportunity'],
    when: (s) => s.reputation > 12,
    weight: (s) => 5 + s.reputation / 12,
    build: (s, rng, fx) => fx.landownerOffer(rng),
  },
  {
    id: 'encroach', cat: 'Land-title disputes', tags: ['land'],
    when: (s) => ownedLand(s).length > 0,
    weight: (s) => 3 + ownedLand(s).length * 0.5,
    build: (s, rng, fx) => {
      const p = rng.pick(ownedLand(s));
      return {
        head: 'Someone has built a wall on your land',
        body: `Your watchman telephones. Overnight, the neighbouring owner has run a compound wall roughly eleven feet inside your boundary at ${p.label}, taking in perhaps two hundred square yards. He says the survey is wrong and that his grandfather cultivated up to the neem tree.\n\nIf you leave it, in twelve years it is legally his.`,
        choices: [
          { label: 'Demolish it the same night', hint: 'Effective. Also a criminal complaint waiting to happen.',
            do: ({ fx, rng }) => { if (rng.chance(0.6)) { fx.news('The wall came down at three in the morning. Nothing further was said.'); } else { fx.cash(-K(2)); fx.rep(-2); fx.news('He filed a police complaint. It cost you money and a small amount of reputation to make it go away.'); } } },
          { label: 'File for injunction and survey', hint: 'Slow, correct, costs money.',
            do: ({ fx }) => { fx.cash(-K(1.2)); fx.rel('bureaucrats', 2); fx.news('Survey ordered. It will take eight months.'); } },
          { label: 'Buy the strip from him', hint: 'He knows exactly how much leverage he has.',
            do: ({ fx, s }) => { const c = Math.round(200 * fx.landRate(p.locality) * 1.6); fx.cash(-c); fx.news(`You paid ${money(c)} for land you already owned. It is now indisputably yours.`); } },
        ],
      };
    },
  },

  // ---------------------------------------------------------------- approvals & bureaucracy
  {
    id: 'file_stuck', cat: 'Government approvals', tags: ['approvals'],
    when: (s) => anyProject(s, 'approval').length > 0,
    weight: (s) => 8,
    build: (s, rng, fx) => {
      const p = rng.pick(anyProject(s, 'approval'));
      return {
        head: 'Your file has not moved in four months',
        body: `The building permission file for ${p.name} is sitting with a section officer at the municipal office. It has been sitting there since March. Nobody will tell you why. Your liaison man says there is "some objection about the setback" but cannot produce anything in writing.\n\nEvery month it sits there, your interest clock runs.`,
        choices: [
          { label: 'Engage a professional liaison consultant', hint: `${money(fx.scaled(K(1.5)))}. Legal, effective, and the standard practice.`,
            do: ({ fx, rng }) => { fx.cash(-fx.scaled(K(1.5))); fx.speedApproval(p.id, rng.int(2, 5)); fx.rel('bureaucrats', 5); } },
          { label: 'Escalate in writing to the Commissioner', hint: 'Correct, slow, and it annoys the officer permanently.',
            do: ({ fx, rng }) => { if (rng.chance(0.45)) { fx.speedApproval(p.id, rng.int(2, 4)); fx.rel('bureaucrats', -6); fx.rep(2); } else { fx.delayApproval(p.id, rng.int(1, 3)); fx.rel('bureaucrats', -10); } } },
          { label: 'Pay the officer to move the file', hint: 'LEGAL RISK / CRIMINAL RISK / REPUTATIONAL RISK.', illegal: true,
            do: ({ fx, rng }) => fx.bribe(p.id, rng) },
          { label: 'Wait', hint: 'Free. The clock is not.',
            do: ({ fx, rng }) => { fx.delayApproval(p.id, rng.int(2, 6)); } },
        ],
      };
    },
  },
  {
    id: 'policy_shift', cat: 'Regulatory changes', tags: ['approvals'],
    when: (s) => s.month > 24,
    weight: () => 3,
    build: (s, rng, fx) => ({
      head: 'The building rules have changed again',
      body: `A government order, published on a Friday evening, revises setback and parking requirements for buildings above four floors. Files already submitted must be resubmitted on the new format. Nobody in the municipal office has seen the new format.\n\nYour architect estimates it costs you six to nine per cent of saleable area on anything not yet sanctioned.`,
      choices: [
        { label: 'Redesign to the new rules', hint: 'Lose area, keep the sanction clean.',
          do: ({ fx }) => { fx.shrinkPipeline(0.07); fx.news('Drawings revised. You lost seven per cent of saleable area across the pipeline.'); } },
        { label: 'Push the old drawings through before the cut-off', hint: 'Faster, but a deviation you will live with.',
          do: ({ fx, rng }) => { if (rng.chance(0.55)) { fx.news('Sanctioned on the old rules. You kept the area.'); } else { fx.deviationFlag(); fx.news('Rejected, and now flagged. Every future file from you gets extra scrutiny.'); fx.rel('bureaucrats', -8); } } },
        { label: 'Fight it through the builders’ association', hint: 'Collective, slow, builds standing in the industry.',
          do: ({ fx, rng }) => { fx.cash(-fx.scaled(K(2))); fx.rel('associations', 12); if (rng.chance(0.4)) { fx.news('The association won a transition window. Everyone benefited; you paid for it.'); } else { fx.shrinkPipeline(0.07); } } },
      ],
    }),
  },

  // ---------------------------------------------------------------- construction
  {
    id: 'contractor_walks', cat: 'Contractor failure', tags: ['construction'],
    when: (s) => anyProject(s, 'construction').length > 0,
    weight: (s) => 7,
    build: (s, rng, fx) => {
      const p = rng.pick(anyProject(s, 'construction'));
      return {
        head: 'Your contractor has stopped work',
        body: `The site at ${p.name} is empty. The shuttering is up, the steel is tied, and there is nobody there. Your civil contractor has taken his men to another site where somebody is paying cash weekly.\n\nHe owes you eleven days of work and you have paid him for nineteen.`,
        choices: [
          { label: 'Pay him what he is demanding to come back', hint: 'Fast, costly, and he will do it again.',
            do: ({ fx }) => { fx.overrun(p.id, 0.04); fx.delay(p.id, 1); fx.rel('contractors', 4); } },
          { label: 'Replace him with a new contractor', hint: 'Remobilisation costs time. Quality risk on the joint.',
            do: ({ fx, rng }) => { fx.delay(p.id, rng.int(2, 5)); fx.overrun(p.id, 0.04); fx.quality(p.id, -0.06); fx.rel('contractors', -6); } },
          { label: 'Take the work departmental — run it yourself', hint: 'Cheapest per unit if you can actually manage it.',
            do: ({ fx, rng, s }) => {
              const cap = fx.constructionCapability();
              if (rng.f() < cap) { fx.overrun(p.id, -0.03); fx.delay(p.id, 1); fx.skill('construction', 3); fx.news('You ran it departmentally and it worked. You also did not sleep for two months.'); }
              else { fx.overrun(p.id, 0.12); fx.delay(p.id, rng.int(3, 7)); fx.quality(p.id, -0.1); fx.news('You ran it departmentally and it did not work. Wastage, rework, and a slab you are not happy about.'); }
            } },
        ],
      };
    },
  },
  {
    id: 'steel_spike', cat: 'Construction cost overruns', tags: ['construction'],
    when: (s) => anyProject(s, 'construction').length > 0,
    weight: (s) => (s.materialSpike ? 12 : 4),
    build: (s, rng, fx) => ({
      head: 'Steel prices jump without warning',
      body: `Your supplier calls to say the rate has gone up by a fifth since your last indent and he cannot honour the old quotation. You have three slabs left to cast.\n\nSteel is roughly a sixth of your construction cost. This is not fatal. It is not nothing either.`,
      choices: [
        { label: 'Buy the full requirement now and stock it', hint: 'Locks the price. Ties up cash and invites theft.',
          do: ({ fx, rng, s }) => { const c = fx.stockSteel(); if (rng.chance(0.15)) { fx.cash(-c * 0.06); fx.news('Some of the stocked steel walked off the site.'); } } },
        { label: 'Buy hand to mouth and absorb it', hint: 'Preserves cash, accepts the overrun.',
          do: ({ fx, s }) => { for (const p of anyProject(s, 'construction')) fx.overrun(p.id, 0.025); } },
        { label: 'Slow the programme until prices settle', hint: 'Saves material cost, adds interest and overheads.',
          do: ({ fx, s, rng }) => { for (const p of anyProject(s, 'construction')) { fx.delay(p.id, rng.int(1, 3)); fx.overrun(p.id, 0.01); } } },
      ],
    }),
  },
  {
    id: 'accident', cat: 'Worker accidents', tags: ['construction', 'reputation'],
    when: (s) => anyProject(s, 'construction').length > 0,
    weight: (s) => 3 + (s.safetySpend ? 0 : 3),
    build: (s, rng, fx) => {
      const p = rng.pick(anyProject(s, 'construction'));
      const fatal = rng.chance(0.35);
      return {
        head: fatal ? 'A worker has died on your site' : 'A worker has fallen from the third floor',
        body: fatal
          ? `A barbender from Odisha, twenty-six years old, fell from the fourth-floor edge at ${p.name} at about eleven this morning. There was no edge protection. He was dead before the ambulance came.\n\nHis family is in Ganjam district. The labour contractor says he has no papers for the man.`
          : `A mason fell from the third-floor shuttering at ${p.name}. He is in Gandhi Hospital with a fractured pelvis and will not work again this year. There was no safety net.\n\nThe labour inspector has been informed by somebody.`,
        choices: [
          { label: 'Pay the family properly and above what is asked', hint: 'Costs real money. Buys something you cannot buy any other way.',
            do: ({ fx }) => { fx.cash(-fx.byScale(fatal ? K(6) : K(2))); fx.rel('contractors', 12); fx.rel('community', 8); fx.rep(fatal ? -2 : 0); fx.news('You paid the family without being asked twice. The site knows.'); } },
          { label: 'Pay the statutory minimum through the contractor', hint: 'Cheap, legal, and the site notices.',
            do: ({ fx, rng }) => { fx.cash(-fx.byScale(fatal ? K(1.5) : K(0.4))); fx.rel('contractors', -10); fx.rep(-3); if (rng.chance(0.4)) { fx.news('The labour inspector filed a case. It will follow you.'); fx.cash(-fx.scaled(K(2))); } } },
          { label: 'Invest in site safety across all projects', hint: 'Ongoing cost. Reduces this event permanently.',
            do: ({ fx, s }) => { fx.cash(-fx.byScale(fatal ? K(6) : K(2))); s.safetySpend = true; fx.rel('contractors', 10); fx.rep(3); fx.news('You put nets, helmets and edge protection on every site. It costs about one per cent of build cost, forever.'); } },
        ],
      };
    },
  },
  {
    id: 'quality_defect', cat: 'Poor construction quality', tags: ['construction', 'reputation'],
    when: (s) => s.assets.length + s.soldUnits > 0,
    weight: (s) => 2 + (1 - s.avgQuality) * 10,
    build: (s, rng, fx) => ({
      head: 'Seepage. Everywhere.',
      body: `Two monsoons after handover, buyers in one of your completed buildings have formed an association. Their letter lists forty-one defects. The serious ones are structural: honeycombing in two columns, and water entering through the terrace at every junction.\n\nOne of them is a journalist's brother-in-law.`,
      choices: [
        { label: 'Repair everything at your cost, publicly', hint: 'Expensive. The single best reputation purchase available.',
          do: ({ fx }) => { fx.cash(-fx.byScale(K(9))); fx.rep(8); fx.news('You repaired every defect and paid for it yourself. Buyers noticed. So did the market.'); } },
        { label: 'Repair the structural items only', hint: 'Reasonable. Half-satisfies everyone.',
          do: ({ fx }) => { fx.cash(-fx.byScale(K(3.5))); fx.rep(-1); } },
        { label: 'Refer them to the contractor and stop replying', hint: 'Free today.',
          do: ({ fx, rng }) => { fx.rep(-5); if (rng.chance(0.4)) { fx.news('The association went to the press. It ran on page three of the Deccan Chronicle.'); fx.rep(-3); } } },
      ],
    }),
  },

  // ---------------------------------------------------------------- rental & tenants
  {
    id: 'anchor_tenant', cat: 'Opportunity', tags: ['rental', 'opportunity'],
    when: (s) => s.month > 46 && s.assets.some((a) => a.use === 'office' && a.occupancy < 0.9),
    weight: (s) => (s.flags.HITEC_LIVE ? 8 : 2),
    build: (s, rng, fx) => fx.anchorTenantOffer(rng),
  },
  {
    id: 'tenant_default', cat: 'Tenant defaults', tags: ['rental'],
    when: (s) => leased(s).length > 0,
    weight: (s) => 3 + leased(s).length * 0.4 + (s.macro.demand < 0.8 ? 5 : 0),
    build: (s, rng, fx) => {
      const a = rng.pick(leased(s));
      return {
        head: 'A tenant has stopped paying',
        body: `Your largest tenant at ${a.name} has not paid rent for three months. The company has run into trouble of its own. They want a six-month rent holiday and a twenty per cent reduction thereafter, and they point out, correctly, that finding a replacement in this market will take you longer than that.\n\nThey are still occupying.`,
        choices: [
          { label: 'Renegotiate: holiday plus reduction', hint: 'Keeps the building occupied and the valuation intact.',
            do: ({ fx }) => { fx.rentCut(a.id, 0.2, 6); fx.news('Rent reset. Your net operating income takes the hit, but the space is not empty.'); } },
          { label: 'Enforce the lease and evict', hint: 'Under the Rent Control Act this takes years, and the space sits idle meanwhile.',
            do: ({ fx, rng }) => { fx.vacate(a.id); fx.cash(-fx.byScale(K(2))); if (rng.chance(0.5)) fx.news('The eviction suit is admitted. It will be heard, at the earliest, in three years.'); } },
          { label: 'Encash the security deposit and wait', hint: 'Buys a few months. Solves nothing.',
            do: ({ fx }) => { fx.cash(a.deposit * 0.5); fx.rentCut(a.id, 0.1, 3); } },
        ],
      };
    },
  },
  {
    id: 'vacancy', cat: 'Vacancy', tags: ['rental'],
    when: (s) => s.assets.length > 0 && s.macro.demand < 0.95,
    weight: (s) => 4 + (1 - s.macro.demand) * 8,
    build: (s, rng, fx) => ({
      head: 'Your buildings are emptying',
      body: `Two leases have expired without renewal and the enquiries have stopped. Brokers say occupiers are asking for nine months rent free and fit-out contributions. Somebody down the road is quoting fifteen per cent below your rate for better space.\n\nAn empty floor costs you maintenance, tax and interest every single month.`,
      choices: [
        { label: 'Cut asking rents to market and fill the space', hint: 'Lower income, better occupancy, lower valuation.',
          do: ({ fx }) => { fx.marketRents(-0.15); fx.fillVacancy(0.5); } },
        { label: 'Hold rents and wait for the cycle', hint: 'Protects headline rent and your valuation. Bleeds cash.',
          do: ({ fx }) => { fx.news('You held your rents. The floors stayed empty.'); } },
        { label: 'Offer long rent-free periods instead of cutting rent', hint: 'Keeps headline rent for the valuers. Everyone does it.',
          do: ({ fx }) => { fx.fillVacancy(0.35); fx.cash(-fx.byScale(K(3))); } },
      ],
    }),
  },

  // ---------------------------------------------------------------- people & governance
  {
    id: 'fraud', cat: 'Employee fraud', tags: ['people', 'governance'],
    when: (s) => s.staff.length >= 3 && !s.flags.internalAudit,
    weight: (s) => 2 + s.staff.length * 0.35,
    build: (s, rng, fx) => {
      const victim = rng.pick(s.staff);
      const amt = fx.byScale(K(rng.int(3, 14)));
      return {
        head: 'The purchase numbers do not add up',
        body: `Your accountant flags it almost by accident. Cement consumption on two sites is running twenty-two per cent above theoretical. Deliveries are being signed for and not arriving.\n\nThe trail runs through ${victim.name}, your ${victim.roleName.toLowerCase()}, who has been with you for ${Math.max(1, Math.round((s.month - victim.joined) / 12))} years. Your best estimate of the loss is ${money(amt)}.`,
        choices: [
          { label: 'Dismiss him and file a police complaint', hint: 'Correct. Public. Everyone in the trade will know.',
            do: ({ fx }) => { fx.cash(-amt); fx.fire(victim.id); fx.rep(2); fx.rel('associations', 4); fx.news(`${victim.name} was dismissed and a complaint filed.`); } },
          { label: 'Dismiss him quietly, recover what you can', hint: 'Discreet. He will do it to someone else.',
            do: ({ fx, rng }) => { fx.cash(-amt * rng.range(0.4, 0.8)); fx.fire(victim.id); } },
          { label: 'Build an internal audit function', hint: 'Costs a salary forever. Stops this class of loss permanently.',
            do: ({ fx, s }) => { fx.cash(-amt); fx.fire(victim.id); fx.hireRole('audit'); s.flags.internalAudit = true; fx.news('You hired a head of internal audit. It should have happened two years ago.'); } },
        ],
      };
    },
  },
  {
    id: 'poach', cat: 'Competitor attacks', tags: ['people'],
    when: (s) => s.staff.some((x) => x.skill > 60),
    weight: (s) => 3 + s.reputation / 20,
    build: (s, rng, fx) => {
      const t = rng.pick(s.staff.filter((x) => x.skill > 60));
      const rival = rng.pick(s.competitors).name;
      return {
        head: `${rival} has made an offer to your project manager`,
        body: `${t.name} tells you himself, which is a good sign. ${rival} has offered him roughly forty per cent more, a car, and the title of General Manager.\n\nHe is running two of your live projects. He has been with you since they were drawings.`,
        choices: [
          { label: 'Match the offer and give him equity in future projects', hint: 'Expensive. Buys loyalty that money alone does not.',
            do: ({ fx }) => { fx.raise(t.id, 0.45); fx.loyalty(t.id, 25); fx.news(`${t.name} stayed. He will not be cheap again.`); } },
          { label: 'Match the salary only', hint: 'Adequate.',
            do: ({ fx, rng }) => { fx.raise(t.id, 0.4); fx.loyalty(t.id, 8); if (rng.chance(0.3)) { fx.quit(t.id); fx.news(`${t.name} left anyway, six weeks later.`); } } },
          { label: 'Let him go', hint: 'Saves money. Costs continuity, and he knows your costings.',
            do: ({ fx, rng }) => { fx.quit(t.id); for (const p of anyProject(s, 'construction')) { fx.delay(p.id, rng.int(1, 3)); } fx.news(`${t.name} joined ${rival}. He took your subcontractor rates with him.`); } },
        ],
      };
    },
  },
  {
    id: 'partner_dispute', cat: 'Partner disputes', tags: ['governance'],
    when: (s) => s.jvs.length > 0,
    weight: (s) => 4 + s.jvs.length * 2,
    build: (s, rng, fx) => {
      const jv = rng.pick(s.jvs);
      return {
        head: `Your partner in ${jv.name} wants out — on his terms`,
        body: `${jv.partner} has decided that the sharing ratio agreed three years ago no longer reflects what he contributed. He has stopped signing cheques on the project account and has written to the bank saying that disbursements need his counter-signature.\n\nThe project cannot proceed while this is unresolved.`,
        choices: [
          { label: 'Buy him out at his price', hint: 'Expensive, immediate, clean.',
            do: ({ fx }) => { fx.buyoutJV(jv.id, 1.35); } },
          { label: 'Negotiate hard, accept delay', hint: 'Cheaper. Costs months.',
            do: ({ fx, rng }) => { if (rng.chance(0.55)) { fx.buyoutJV(jv.id, 1.05); fx.news('He settled near book value.'); } else { fx.jvFreeze(jv.id, rng.int(4, 10)); fx.news('Talks broke down. The project is frozen.'); } } },
          { label: 'Go to arbitration', hint: 'Correct process. Two to four years.',
            do: ({ fx, rng }) => { fx.jvFreeze(jv.id, rng.int(12, 30)); fx.cash(-fx.byScale(K(6))); fx.rep(-1); } },
        ],
      };
    },
  },

  // ---------------------------------------------------------------- politics, media, community
  {
    id: 'political_donation', cat: 'Political instability', tags: ['politics'],
    when: (s) => s.month > 30 && [46, 57, 112, 158, 233, 287].some((m) => Math.abs(s.month - m) < 8),
    weight: () => 7,
    build: (s, rng, fx) => ({
      head: 'An invitation you cannot ignore',
      body: `A fundraising dinner. The invitation comes through the builders' association and the amount expected is not printed anywhere, but everybody at your level is contributing between ${money(fx.byScale(K(2)))} and ${money(fx.byScale(K(10)))}.\n\nIt is lawful. It is also unmistakably transactional, and it will be remembered either way.`,
      choices: [
        { label: `Contribute generously (${money(fx.byScale(K(10)))})`, hint: 'Legal political contribution. Buys access, not outcomes.',
          do: ({ fx }) => { fx.cash(-fx.byScale(K(10))); fx.rel('politicians', 16); fx.rel('bureaucrats', 5); fx.rep(-1); } },
        { label: `Contribute modestly (${money(fx.byScale(K(2)))})`, hint: 'Present without being conspicuous.',
          do: ({ fx }) => { fx.cash(-fx.byScale(K(2))); fx.rel('politicians', 6); } },
        { label: 'Decline and stay out of it', hint: 'Principled. Also noted.',
          do: ({ fx, rng }) => { fx.rel('politicians', -8); if (rng.chance(0.3)) { fx.rep(3); fx.news('Your absence was noticed, and one journalist noticed it approvingly.'); } } },
      ],
    }),
  },
  {
    id: 'community_protest', cat: 'Public sentiment', tags: ['community'],
    when: (s) => anyProject(s).length > 0,
    weight: (s) => 3 + (s.reputation < 20 ? 3 : 0),
    build: (s, rng, fx) => {
      const p = rng.pick(anyProject(s));
      return {
        head: `Residents are blocking the gate at ${p.name}`,
        body: `Forty people from the colony behind the site, mostly women, are sitting at your gate. Their complaints are that your excavation has cracked two houses, that your tippers run at night through a lane where children play, and that nobody from your office has ever spoken to them.\n\nA local corporator has arrived and is being photographed with them.`,
        choices: [
          { label: 'Meet them, repair the houses, restrict night movements', hint: 'Costs money and programme. Ends it properly.',
            do: ({ fx, rng }) => { fx.cash(-fx.byScale(K(3))); fx.delay(p.id, 1); fx.rel('community', 18); fx.rep(4); } },
          { label: 'Get a police protection order and continue', hint: 'Works now. Guarantees the next problem is worse.',
            do: ({ fx, rng }) => { fx.cash(-fx.byScale(K(1))); fx.rel('community', -20); fx.rep(-3); if (rng.chance(0.35)) { fx.delay(p.id, rng.int(2, 5)); fx.news('The corporator got a stop-work notice issued. It took months to lift.'); } } },
          { label: 'Route it through the corporator quietly', hint: 'Pragmatic. He now has a hold on you.',
            do: ({ fx }) => { fx.cash(-fx.byScale(K(2))); fx.rel('politicians', 8); fx.rel('community', 4); fx.rep(-1); } },
        ],
      };
    },
  },
  {
    id: 'press_story', cat: 'Reputation crises', tags: ['media'],
    when: (s) => s.reputation > 25 || s.netWorth > CR(20),
    weight: (s) => 3 + (s.reputation < 30 ? 3 : 0) + (s.flags.deviationFlagged ? 4 : 0),
    build: (s, rng, fx) => ({
      head: 'A reporter is asking questions',
      body: `A journalist from a Telugu daily has been to two of your sites and to the municipal office. She is writing about deviations from sanctioned plans across the city and your name is on her list, along with six others.\n\nShe would like a comment. Your liaison manager thinks you should not give one.`,
      choices: [
        { label: 'Speak to her on the record, honestly', hint: 'Risky. Journalists remember who took the call.',
          do: ({ fx, rng }) => { if (rng.chance(0.6)) { fx.rel('journalists', 16); fx.rep(4); fx.news('The article ran. You came out of it better than the others, largely because you answered.'); } else { fx.rep(-2); fx.rel('journalists', 6); fx.news('The article ran and quoted you accurately, which was the problem.'); } } },
        { label: 'No comment', hint: 'Safe. Guarantees the unflattering version.',
          do: ({ fx }) => { fx.rep(-2); fx.rel('journalists', -4); } },
        { label: 'Have the association issue a joint industry statement', hint: 'Dilutes you into the crowd.',
          do: ({ fx }) => { fx.rel('associations', 8); fx.rep(-1); } },
      ],
    }),
  },

  // ---------------------------------------------------------------- opportunities
  {
    id: 'distress_buy', cat: 'Opportunity', tags: ['opportunity', 'land'],
    when: (s) => s.macro.demand < 0.85 && s.cash > K(20),
    weight: (s) => 6 + (1 - s.macro.demand) * 10,
    build: (s, rng, fx) => fx.distressOffer(rng),
  },
  {
    id: 'jv_offer', cat: 'Opportunity', tags: ['opportunity'],
    when: (s) => s.reputation > 25 && s.month > 36,
    weight: (s) => 4 + s.reputation / 15,
    build: (s, rng, fx) => fx.jvOffer(rng),
  },
  {
    id: 'institutional_capital', cat: 'Opportunity', tags: ['finance', 'opportunity'],
    when: (s) => s.month > 120 && s.netWorth > CR(60) && s.reputation > 45,
    weight: (s) => 5,
    build: (s, rng, fx) => fx.institutionalOffer(rng),
  },
  {
    id: 'sector_entry', cat: 'Opportunity', tags: ['diversify'],
    when: (s) => s.netWorth > CR(400) && s.month > 150,
    weight: () => 5,
    build: (s, rng, fx) => fx.diversifyOffer(rng),
  },

  // ---------------------------------------------------------------- personal
  {
    id: 'sister_marriage', cat: 'Personal', tags: ['family'],
    when: (s) => s.month >= 26 && !s.flags.padmaMarried,
    weight: (s) => (s.month > 40 ? 14 : 6),
    build: (s, rng, fx) => {
      const ask = Math.max(fx.scaled(K(2)), fx.byScale(K(5)));
      return {
        head: 'Padma’s marriage has been fixed',
        body: `The family has settled on a boy from Nizamabad, an engineer at BHEL. The wedding is in four months.\n\nYour father does not ask you for money. He simply mentions, twice, what the mandapam costs and what the boy's family is expecting in gold. The figure being discussed comes to about ${money(ask)}.\n\nThe money is in your business account, working.`,
        choices: [
          { label: 'Pay in full', hint: 'Takes the cash out of the business at the worst possible time.',
            do: ({ fx, s }) => { fx.cash(-ask); s.flags.padmaMarried = true; fx.rel('family', 25); fx.rep(3); fx.news('You paid for the wedding in full. Your father did not say anything, which was how he said it.'); } },
          { label: 'Pay half now, half after the next sale', hint: 'Sensible. Slightly humiliating for everyone.',
            do: ({ fx, s }) => { fx.cash(-ask * 0.5); s.flags.padmaMarried = true; s.flags.familyDebt = ask * 0.5; fx.rel('family', 6); } },
          { label: 'Borrow for it rather than take money out of the business', hint: 'Keeps working capital. Adds interest to a wedding.',
            do: ({ fx, s }) => { fx.privateLoan(ask, 0.28, 24); s.flags.padmaMarried = true; fx.rel('family', 20); } },
        ],
      };
    },
  },
  {
    id: 'father_finds_out', cat: 'Personal', tags: ['family'],
    when: (s) => s.flags.shopPledged && !s.flags.fatherKnows,
    weight: () => 8,
    build: (s, rng, fx) => ({
      head: 'Your father received a letter from the bank',
      body: `It is a routine annual confirmation of security held. He read it at the shop counter, in front of two customers.\n\nHe has not shouted. He has been quiet since Tuesday, which is considerably worse.`,
      choices: [
        { label: 'Tell him everything, including the jewel loan', hint: 'Painful. Ends the lying.',
          do: ({ fx, s }) => { s.flags.fatherKnows = true; fx.rel('family', 12); fx.rep(1); fx.news('You told him all of it. He said one sentence: repay your mother first.'); } },
        { label: 'Redeem the pledge immediately', hint: 'Costs cash and borrowing capacity.',
          do: ({ fx, s }) => { s.flags.shopPledged = false; s.flags.fatherKnows = true; fx.rel('banks', -10); fx.rel('family', 18); } },
        { label: 'Explain it as temporary and move on', hint: 'It is not temporary.',
          do: ({ fx, s }) => { s.flags.fatherKnows = true; fx.rel('family', -10); } },
      ],
    }),
  },
  {
    id: 'health', cat: 'Personal', tags: ['family'],
    when: (s) => s.month > 96 && s.stress > 60,
    weight: (s) => (s.stress - 55) / 6,
    build: (s, rng, fx) => ({
      head: 'The doctor is not asking, he is telling',
      body: `Chest pain on a site visit in Kondapur. It was not a heart attack, but the cardiologist at Apollo says your blood pressure is 168 over 104 and that he has seen exactly this profile in exactly this trade for twenty years.\n\nHe wants you to take a month off and delegate.`,
      choices: [
        { label: 'Take the month. Hand over to your senior people', hint: 'Costs momentum. Buys years.',
          do: ({ fx, s }) => { s.stress = Math.max(10, s.stress - 40); fx.slowMonth(1); fx.news('You took a month off. The company did not collapse, which told you something.'); } },
        { label: 'Hire a Chief Operating Officer', hint: 'Permanent salary. Permanent relief.',
          do: ({ fx, s }) => { fx.hireRole('coo'); s.stress = Math.max(10, s.stress - 30); } },
        { label: 'Ignore it', hint: 'It will come back.',
          do: ({ fx, s }) => { s.stress += 10; s.flags.healthWarning = (s.flags.healthWarning || 0) + 1; } },
      ],
    }),
  },

  // ---------------------------------------------------------------- crises
  {
    id: 'crash_margin_call', cat: 'Market crashes', tags: ['crisis'],
    when: (s) => s.crashActive && s.ratios.debtToAssets > 0.45,
    weight: () => 14,
    build: (s, rng, fx) => ({
      head: 'Everything is for sale and nobody is buying',
      body: `Registrations across the city are down seventy per cent. Two developers you know have handed sites back to their financiers. Your unsold inventory is being valued by your own bank at figures you would not have accepted a year ago.\n\nYour interest bill this year is ${money(s.interestAnnual)}. Your collections are a fraction of that.`,
      choices: [
        { label: 'Sell assets fast at whatever they fetch', hint: 'Survive. Destroy years of value.',
          do: ({ fx }) => { fx.fireSale(0.68); fx.rep(-2); } },
        { label: 'Bring in an equity partner at a punishing valuation', hint: 'Dilution, but the company lives.',
          do: ({ fx }) => { fx.emergencyEquity(0.45); } },
        { label: 'Stop all construction and preserve cash', hint: 'Buyers who paid advances will sue. RERA does not exist yet, but civil courts do.',
          do: ({ fx, rng, s }) => { for (const p of anyProject(s, 'construction')) fx.delay(p.id, rng.int(6, 14)); fx.rep(-4); fx.news('All sites stopped. You are now a defendant in several suits you have not yet been served with.'); } },
        { label: 'Borrow privately and trade through it', hint: 'The bet that has ended more Indian developers than any other.',
          do: ({ fx, s }) => { fx.privateLoan(Math.max(CR(1), s.debt * 0.3), 0.40, 18); } },
      ],
    }),
  },
  {
    id: 'insurance_claim', cat: 'Insurance claims', tags: ['construction'],
    when: (s) => anyProject(s, 'construction').length > 0,
    weight: () => 2,
    build: (s, rng, fx) => {
      const p = rng.pick(anyProject(s, 'construction'));
      return {
        head: 'Fire in the material store',
        body: `A short circuit in the temporary wiring at ${p.name}. Shuttering plywood, three hundred bags of cement and the site office are gone. Nobody was hurt.\n\nWhether you are covered depends on whether anybody bought a contractors all-risk policy, which you may or may not remember doing.`,
        choices: [
          { label: 'File the claim and take insurance seriously from now on', hint: 'Adds a small permanent cost. Removes a class of catastrophe.',
            do: ({ fx, s, rng }) => {
              const covered = s.flags.insured || rng.chance(0.35);
              fx.overrun(p.id, covered ? 0.015 : 0.05); fx.delay(p.id, 1);
              s.flags.insured = true;
              fx.news(covered ? 'The claim was largely settled. You now insure everything.' : 'You were not covered. You now insure everything.');
            } },
          { label: 'Absorb it and move on', hint: 'Cheap today.',
            do: ({ fx, rng }) => { fx.overrun(p.id, 0.05); fx.delay(p.id, rng.int(1, 2)); } },
        ],
      };
    },
  },
  {
    id: 'labour_strike', cat: 'Labour problems', tags: ['construction'],
    when: (s) => anyProject(s, 'construction').length > 1,
    weight: (s) => 3 + (s.month > 200 ? 2 : 0),
    build: (s, rng, fx) => ({
      head: 'The labour has downed tools across your sites',
      body: `Word came from the Odisha and Bihar gangs together, which almost never happens. They want a rate revision, weekly rather than fortnightly payment, and drinking water and toilets on site.\n\nThe last two are things you should already have provided.`,
      choices: [
        { label: 'Concede the rate and fix the facilities', hint: 'Costs a few per cent. Ends it in three days.',
          do: ({ fx, s }) => { for (const p of anyProject(s, 'construction')) fx.overrun(p.id, 0.03); fx.rel('contractors', 12); fx.rep(2); } },
        { label: 'Fix facilities, hold the rate', hint: 'Partial. Might hold.',
          do: ({ fx, s, rng }) => { for (const p of anyProject(s, 'construction')) { fx.overrun(p.id, 0.012); if (rng.chance(0.45)) fx.delay(p.id, rng.int(1, 3)); } } },
        { label: 'Bring in a different labour contractor', hint: 'Breaks the strike. Breaks trust with everyone.',
          do: ({ fx, s, rng }) => { for (const p of anyProject(s, 'construction')) { fx.delay(p.id, rng.int(1, 3)); fx.quality(p.id, -0.05); } fx.rel('contractors', -18); } },
      ],
    }),
  },
  {
    id: 'env_objection', cat: 'Environmental issues', tags: ['approvals'],
    when: (s) => anyProject(s).some((p) => p.sqFt > 80000) || s.parcels.some((p) => p.owned && p.defects.includes('CATCHMENT_ZONE')),
    weight: (s) => (s.month > 120 ? 5 : 2),
    build: (s, rng, fx) => {
      const p = anyProject(s).find((x) => x.sqFt > 80000) || anyProject(s)[0];
      if (!p) return null;
      return {
        head: 'Environmental clearance objection',
        body: `A petition has been filed objecting to ${p.name} on grounds of groundwater extraction, tree felling and the absence of a sewage treatment plant. Two of the three objections are substantially correct.\n\nWork can continue, for now.`,
        choices: [
          { label: 'Redesign with an STP, rainwater harvesting and tree transplantation', hint: 'Real cost, real compliance, defensible forever.',
            do: ({ fx }) => { fx.overrun(p.id, 0.05); fx.delay(p.id, 2); fx.rep(5); fx.rel('community', 10); } },
          { label: 'Contest the petition', hint: 'Legal fees and uncertainty.',
            do: ({ fx, rng }) => { fx.cash(-fx.byScale(K(5))); if (rng.chance(0.5)) { fx.news('Petition dismissed.'); } else { fx.delay(p.id, rng.int(4, 12)); fx.rep(-2); } } },
        ],
      };
    },
  },
  {
    id: 'vendor_fraud', cat: 'Vendor fraud', tags: ['construction'],
    when: (s) => anyProject(s, 'construction').length > 0 && !s.flags.internalAudit,
    weight: () => 3,
    build: (s, rng, fx) => {
      const amt = fx.byScale(K(rng.int(2, 9)));
      return {
        head: 'The steel supplier took the advance and vanished',
        body: `You paid ${money(amt)} against a bulk order at a rate twelve per cent below the market. The godown in Balanagar is shuttered. The telephone is disconnected. Two other builders in Kukatpally have the same story and the same amount.\n\nThe rate should have told you.`,
        choices: [
          { label: 'File a cheating case and write it off', hint: 'You will not see the money.',
            do: ({ fx, rng }) => { fx.cash(-amt); fx.skill('finance', 2); if (rng.chance(0.15)) { fx.cash(amt * 0.3); fx.news('You recovered about a third, three years later.'); } } },
          { label: 'Institute a procurement policy: no advances without bank guarantee', hint: 'Slower purchasing. This never happens again.',
            do: ({ fx, s }) => { fx.cash(-amt); s.flags.procurementPolicy = true; fx.skill('finance', 4); fx.news('Advances now require a bank guarantee. Your buying is slower and three per cent dearer.'); } },
        ],
      };
    },
  },
  {
    id: 'infra_announcement', cat: 'Infrastructure delays', tags: ['land'],
    when: (s) => s.month > 18,
    weight: () => 5,
    build: (s, rng, fx) => fx.infraRumour(rng),
  },
  {
    id: 'competitor_undercut', cat: 'Competitor attacks', tags: ['competition'],
    when: (s) => s.inventory.length > 0,
    weight: (s) => 4 + s.inventory.length * 0.3,
    build: (s, rng, fx) => {
      const rival = rng.pick(s.competitors);
      return {
        head: `${rival.name} has launched next door at a lower price`,
        body: `Two hundred metres from your unsold building, ${rival.name} has launched at roughly eleven per cent below your rate, with a booking scheme of ten per cent down and nothing until possession.\n\nYour site enquiries halved in a fortnight.`,
        choices: [
          { label: 'Match the price', hint: 'Moves inventory, costs margin.',
            do: ({ fx }) => { fx.repriceInventory(-0.10); fx.absorption(0.5); } },
          { label: 'Compete on specification and completion date instead', hint: 'Costs money, protects price, works only if buyers believe you.',
            do: ({ fx, s, rng }) => { fx.cash(-fx.byScale(K(4))); if (s.reputation > 40 || rng.chance(0.4)) { fx.absorption(0.3); fx.rep(2); } else { fx.absorption(-0.1); } } },
          { label: 'Hold price and wait him out', hint: 'He may be funding this with buyer advances. He may also outlast you.',
            do: ({ fx, rng }) => { if (rng.chance(0.35)) { fx.news(`${rival.name} ran out of money and stopped work. His buyers came to you.`); fx.absorption(0.4); fx.rep(3); } else { fx.absorption(-0.25); } } },
        ],
      };
    },
  },
  {
    id: 'tax_assessment', cat: 'Taxation', tags: ['finance'],
    when: (s) => s.month > 48 && s.revenueYTD > K(50),
    weight: () => 4,
    build: (s, rng, fx) => {
      const demand = fx.byScale(K(rng.int(4, 20)));
      return {
        head: 'Income tax assessment order',
        body: `The assessing officer has disallowed a portion of your project cost as unverifiable, added back cash payments above the permitted limit, and raised a demand of ${money(demand)} including interest.\n\nYour chartered accountant says roughly sixty per cent of it will not survive appeal, and that the appeal will take four years.`,
        choices: [
          { label: 'Pay under protest and appeal', hint: 'Cash out now, likely refund much later.',
            do: ({ fx, s }) => { fx.cash(-demand); s.pendingRefund = (s.pendingRefund || 0) + demand * 0.55; } },
          { label: 'Appeal without paying, seek stay', hint: 'Preserves cash. Risk of coercive recovery.',
            do: ({ fx, rng }) => { if (rng.chance(0.6)) { fx.cash(-demand * 0.2); fx.news('Stay granted on twenty per cent deposit.'); } else { fx.cash(-demand); fx.rel('banks', -6); fx.news('The department attached your bank account for eleven days.'); } } },
          { label: 'Clean up the accounting entirely, going forward', hint: 'Higher tax paid honestly. Bankable audited accounts. Institutional money becomes possible.',
            do: ({ fx, s }) => { fx.cash(-demand); s.flags.cleanBooks = true; fx.rep(6); fx.rel('banks', 12); fx.news('You moved the business fully onto audited, cheque-only accounting. Your tax bill went up permanently and so did your borrowing capacity.'); } },
        ],
      };
    },
  },
  {
    id: 'recession_squeeze', cat: 'Economic recessions', tags: ['crisis'],
    when: (s) => s.macro.gdp < 5 && s.month > 12,
    weight: () => 5,
    build: (s, rng, fx) => ({
      head: 'The market has simply stopped',
      body: `No enquiries. Brokers are not returning calls because there is nothing to tell you. The buyers who were negotiating last quarter have decided to wait and see, and they are telling each other so.\n\nYour carrying costs do not wait and see.`,
      choices: [
        { label: 'Cut overheads hard', hint: 'Sack staff, close the second office. Cheap survival, expensive rebuild.',
          do: ({ fx }) => { fx.cutOverheads(0.35); fx.rep(-1); } },
        { label: 'Keep the team, cut your own drawings to zero', hint: 'Preserves capability. Burns your personal cash.',
          do: ({ fx, s }) => { s.flags.founderSalaryZero = true; fx.rel('associations', 4); fx.loyaltyAll(12); } },
        { label: 'Use the downturn to buy land cheap', hint: 'The correct move, if you can fund it.',
          do: ({ fx, rng }) => { fx.discountedOffers(rng, 0.7); fx.news('You told your brokers you were buying, not selling. Word spread quickly.'); } },
      ],
    }),
  },
  {
    id: 'bad_bet', cat: 'Bad investment decisions', tags: ['land'],
    when: (s) => ownedLand(s).length > 2,
    weight: () => 3,
    build: (s, rng, fx) => {
      const p = rng.pick(ownedLand(s));
      return {
        head: `The road is not coming to ${p.label}`,
        body: `The alignment has been published. It runs three and a half kilometres north of your land, along a different set of survey numbers, through property belonging to people considerably better connected than you.\n\nWhat you bought as a corridor play is now simply a field.`,
        choices: [
          { label: 'Sell now and take the loss', hint: 'Frees capital, admits the error.',
            do: ({ fx }) => { fx.sellParcel(p.id, 0.75); fx.skill('realestate', 3); } },
          { label: 'Hold it — the city will reach it eventually', hint: 'It might. In eleven years.',
            do: ({ fx, s }) => { const par = s.parcels.find((x) => x.id === p.id); if (par) par.stigma = 0.75; } },
          { label: 'Put a low-value use on it now: godowns', hint: 'Turns dead land into small income.',
            do: ({ fx }) => { fx.suggestBuild(p.id, 'godown'); } },
        ],
      };
    },
  },
  {
    id: 'maintenance_wall', cat: 'Maintenance expenses', tags: ['rental'],
    when: (s) => s.assets.some((a) => s.month - a.completed > 96),
    weight: () => 4,
    build: (s, rng, fx) => {
      const a = rng.pick(s.assets.filter((x) => s.month - x.completed > 96));
      const cost = Math.round(a.sqFt * fx.costIndex() * 55);
      return {
        head: `${a.name} needs serious money spent on it`,
        body: `Eight years in. Lifts at end of life, terrace waterproofing gone, the facade streaked, and the diesel generator running at half capacity. The building still lets, but at a discount to the newer stock down the road.\n\nA proper refurbishment is about ${money(cost)}.`,
        choices: [
          { label: 'Refurbish fully', hint: 'Restores rent and value.',
            do: ({ fx }) => { fx.cash(-cost); fx.upgradeAsset(a.id, 0.18); } },
          { label: 'Patch the essentials only', hint: 'Cheap. The building keeps sliding.',
            do: ({ fx }) => { fx.cash(-cost * 0.3); fx.upgradeAsset(a.id, -0.05); } },
          { label: 'Sell the building', hint: 'Somebody else’s problem, at a price that reflects it.',
            do: ({ fx }) => { fx.sellAsset(a.id, 0.88); } },
        ],
      };
    },
  },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
