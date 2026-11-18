import { useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../lib/store';
import { useCurrency } from '../lib/prefs';
import { money, YEARLY_DISCOUNT, type Plan } from '../lib/data';
import { CurrencySwitch } from '../components/Site';
import { Icon } from '../components/ui';

export const planPrice = (p: Plan, c: 'AED' | 'USD', yearly: boolean) => Math.round(p.price[c] * (yearly ? 1 - YEARLY_DISCOUNT : 1));

const ROWS: [string, (string | boolean)[]][] = [
  ['Team members', ['1', 'Up to 10', 'Unlimited']],
  ['Online booking page', [true, true, true]],
  ['Calendar and client profiles', [true, true, true]],
  ['Email reminders', [true, true, true]],
  ['WhatsApp and SMS reminders', [false, true, true]],
  ['Deposits and online payments', [false, true, true]],
  ['Smart gaps and offers', [false, true, true]],
  ['Reports', ['Basic', 'Full', 'Full']],
  ['AI receptionist on WhatsApp', [false, false, true]],
  ['No-show protection', [false, false, true]],
  ['Multiple branches', [false, false, true]],
  ['Support', ['Email', 'Email and chat', 'Priority']],
];
const FAQ = [
  ['Do I need a card for the free trial?', 'No. You get 14 days with everything in the plan you choose. We only ask for payment if you decide to stay.'],
  ['Can I switch plans later?', 'Yes, upgrade or downgrade at any time from your settings. The change applies from your next bill.'],
  ['Do my clients pay anything to book?', 'Never. Booking is free for clients. Deposits, if you turn them on, go to your business.'],
  ['Which countries do you support?', 'Saatio is built for the UAE and the USA, with prices in AED or USD, local time zones and WhatsApp reminders that work in both.'],
  ['Is the AI receptionist really a robot?', 'It is an AI assistant trained on your services, prices and real availability. It hands anything it can’t answer to your team.'],
];

export function PlanCards({ yearly, onPick, picked }: { yearly: boolean; onPick?: (id: Plan['id']) => void; picked?: Plan['id'] }) {
  const { s } = useStore(); const c = useCurrency();
  return (
    <div className="plans">
      {s.plans.map((p) => (
        <article key={p.id} className={`plan ${p.featured ? 'is-feat' : ''} ${picked === p.id ? 'is-picked' : ''}`}>
          {p.featured && <span className="plan__flag">Most popular</span>}
          <h3>{p.name}</h3><p className="plan__blurb">{p.blurb}</p>
          <p className="plan__price"><b>{money(planPrice(p, c, yearly), c)}</b><span>/ month{yearly ? ', billed yearly' : ''}</span></p>
          {yearly && <p className="plan__was"><s>{money(p.price[c], c)}</s> save {Math.round(YEARLY_DISCOUNT * 100)}%</p>}
          <p className="plan__staff"><Icon n="users" size={16} />{p.staff}</p>
          <ul>{p.features.map((f) => <li key={f}><Icon n="check" size={16} />{f}</li>)}</ul>
          {onPick
            ? <button type="button" className={`btn btn--block ${picked === p.id ? 'btn--primary' : 'btn--ghost'}`} aria-pressed={picked === p.id} onClick={() => onPick(p.id)}>{picked === p.id ? 'Selected' : `Choose ${p.name}`}</button>
            : <Link to="signup" className={`btn btn--block ${p.featured ? 'btn--primary' : 'btn--ghost'}`} onClick={() => { try { sessionStorage.setItem('saatio-plan', p.id); } catch { /* ok */ } }}>Start free trial</Link>}
        </article>
      ))}
    </div>
  );
}

export function BillingSwitch({ yearly, setYearly }: { yearly: boolean; setYearly: (v: boolean) => void }) {
  return (
    <div className="bill" role="radiogroup" aria-label="Billing">
      <button type="button" role="radio" aria-checked={!yearly} onClick={() => setYearly(false)}>Monthly</button>
      <button type="button" role="radio" aria-checked={yearly} onClick={() => setYearly(true)}>Yearly <span className="chip chip--mint">−{Math.round(YEARLY_DISCOUNT * 100)}%</span></button>
    </div>
  );
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const { s } = useStore();
  return (
    <>
      <section className="phero">
        <div className="wrap phero__in">
          <span className="eyebrow">Pricing</span>
          <h1>Pay for the size you are, <span className="hl">not the features you need</span></h1>
          <p>Every plan includes online booking, the calendar and client profiles. Try any plan free for 14 days.</p>
          <div className="phero__sw"><BillingSwitch yearly={yearly} setYearly={setYearly} /><CurrencySwitch /></div>
        </div>
      </section>
      <section className="sec sec--tight">
        <div className="wrap">
          <PlanCards yearly={yearly} />
          <div className="cmp">
            <h2 className="cmp__h">Compare plans</h2>
            <div className="cmp__scroll">
              <table>
                <thead><tr><th scope="col"><span className="sr-only">Feature</span></th>{s.plans.map((p) => <th key={p.id} scope="col">{p.name}</th>)}</tr></thead>
                <tbody>{ROWS.map(([label, vals]) => (
                  <tr key={label}><th scope="row">{label}</th>{vals.map((v, i) => <td key={i}>{v === true ? <span className="yes"><Icon n="check" size={18} /><span className="sr-only">Included</span></span> : v === false ? <span className="no">—<span className="sr-only">Not included</span></span> : v}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <div className="faq">
            <h2 className="cmp__h">Questions</h2>
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}<Icon n="plus" size={18} /></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>
    </>
  );
}
