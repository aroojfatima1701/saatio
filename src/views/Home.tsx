import { useEffect, useState } from 'react';
import { Link, go } from '../lib/router';
import { useStore } from '../lib/store';
import { useCurrency } from '../lib/prefs';
import { money, YEARLY_DISCOUNT } from '../lib/data';
import { Symbol } from '../components/Logo';
import { CurrencySwitch } from '../components/Site';
import { Icon, WhatsApp, useInView } from '../components/ui';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* A small looping story: an online booking arrives, the AI books a WhatsApp request, a reminder goes out. */
function useLoop(steps: number, ms: number) {
  const [i, setI] = useState(reduced() ? steps - 1 : 0);
  useEffect(() => { if (reduced()) return; const t = setTimeout(() => setI((x) => (x + 1) % steps), i === steps - 1 ? ms * 2.2 : ms); return () => clearTimeout(t); }, [i, steps, ms]);
  return i;
}

const COLS = [
  { n: 'Sara', c: '#6C4CF5', blocks: [[0, 2, 'Haircut', 'Aisha K.'], [3, 1.5, 'Blow-dry', 'Chloe M.'], [5.5, 1, 'Blow-dry', 'Reem A.']] },
  { n: 'Maya', c: '#FF7A59', blocks: [[0.5, 3, 'Full colour', 'Noura S.'], [4, 2, 'Haircut', 'Priya S.']] },
  { n: 'Leila', c: '#2ED3A0', blocks: [[0, 1.5, 'Gel manicure', 'Sophie L.'], [2, 2, 'Spa pedicure', 'Dana K.'], [5, 1.5, 'Gel manicure', 'Hessa F.']] },
] as const;

function HeroDemo() {
  const step = useLoop(6, 1500);
  return (
    <div className="hdemo" aria-hidden="true">
      <div className="hdemo__petals"><Symbol /></div>
      <div className="hcal">
        <div className="hcal__top"><b>Today</b><span>Noor Beauty Lounge · Dubai Marina</span><span className="chip chip--mint"><span className="dot" style={{ background: 'var(--mint)' }} /> 18 booked</span></div>
        <div className="hcal__grid">
          <div className="hcal__times">{['10', '11', '12', '1', '2', '3', '4'].map((t) => <span key={t}>{t}</span>)}</div>
          {COLS.map((col, ci) => (
            <div key={col.n} className="hcal__col">
              <div className="hcal__who"><span className="hcal__av" style={{ background: col.c }}>{col.n[0]}</span>{col.n}</div>
              <div className="hcal__lane">
                {col.blocks.map(([top, h, sv, who], bi) => (
                  <div key={bi} className="hcal__bk" style={{ top: `${(top as number) * 14.3}%`, height: `calc(${(h as number) * 14.3}% - 4px)`, '--c': col.c } as React.CSSProperties}>
                    <b>{sv}</b><small>{who}</small>
                  </div>
                ))}
                {ci === 1 && step >= 1 && (
                  <div className="hcal__bk hcal__bk--new" style={{ top: `${6.2 * 14.3}%`, height: `calc(${0.8 * 14.3}% - 4px)`, '--c': '#FF7A59' } as React.CSSProperties}><b>Blow-dry</b><small>New · online</small></div>
                )}
                {ci === 0 && step >= 4 && (
                  <div className="hcal__bk hcal__bk--new" style={{ top: `${1.8 * 14.3}%`, height: `calc(${1 * 14.3}% - 4px)`, '--c': '#6C4CF5' } as React.CSSProperties}><b>Lash lift</b><small>Booked by AI</small></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={`hwa ${step >= 2 ? 'is-on' : ''}`}>
        <div className="hwa__head"><WhatsApp size={18} /><b>WhatsApp</b><span>now</span></div>
        <p className="hwa__in">Hi! Any chance of a lash lift tomorrow around 11?</p>
        {step >= 3 && <p className="hwa__out"><span className="hwa__ai"><Icon n="sparkle" size={12} /> Saatio AI</span>Yes! Sara is free at 11:15 AM. Shall I book it for you?</p>}
        {step >= 4 && <p className="hwa__in hwa__in--sm">Perfect, thank you 🙏</p>}
      </div>
      <div className={`hbooked ${step >= 4 ? 'is-on' : ''}`}><span><Icon n="check" size={16} /></span>Booked · 11:15 AM</div>
      <div className={`hrem ${step >= 5 ? 'is-on' : ''}`}><Icon n="bell" size={16} /><span><b>Reminder sent</b><small>Aisha K. · tomorrow 10:00 AM</small></span></div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden="true" />
      <div className="wrap hero__grid">
        <div className="hero__copy">
          <Link to="ai" className="hero__pill"><span className="chip chip--coral">New</span>An AI receptionist that books on WhatsApp <Icon n="arrow" size={16} /></Link>
          <h1 className="hero__title">Smarter scheduling. <span>Happier customers.</span></h1>
          <p className="hero__sub">Saatio fills your calendar while you work. Clients book online or on WhatsApp, get reminded automatically and pay a deposit when it matters. Built for salons, clinics, spas and gyms in the UAE and the USA.</p>
          <div className="hero__ctas">
            <Link to="signup" className="btn btn--primary btn--lg">Start free trial <Icon n="arrow" size={18} className="arrow" /></Link>
            <Link to="book" className="btn btn--ghost btn--lg">Try a live booking page</Link>
          </div>
          <ul className="hero__ticks"><li><Icon n="check" size={16} />14 days free</li><li><Icon n="check" size={16} />No card needed</li><li><Icon n="check" size={16} />Prices in AED or USD</li></ul>
          <div className="hero__tour"><span>Explore the live demo:</span><Link to="app"><Icon n="calendar" size={16} />Business dashboard</Link><Link to="admin"><Icon n="shield" size={16} />Admin panel</Link></div>
        </div>
        <HeroDemo />
      </div>
      <div className="wrap hero__for">
        <span>Made for</span>
        {[['scissors', 'Salons and barbers'], ['clinic', 'Clinics'], ['lotus', 'Spas'], ['dumbbell', 'Gyms and studios']].map(([i, l]) => <Link key={l} to="industries"><Icon n={i} size={18} />{l}</Link>)}
      </div>
    </section>
  );
}

/* ---------- Features ---------- */
const FEATS = [
  { id: 'book', icon: 'link', title: 'Online booking page', text: 'Your own link for Instagram, Google and WhatsApp. Clients pick a service, a team member and a time, day or night.' },
  { id: 'cal', icon: 'calendar', title: 'Team calendar', text: 'Everyone’s day on one screen. Drag to move an appointment, block breaks and see gaps at a glance.' },
  { id: 'rem', icon: 'bell', title: 'Automatic reminders', text: 'WhatsApp, SMS and email reminders a day before and two hours before. Clients confirm or reschedule in one reply.' },
  { id: 'pay', icon: 'card', title: 'Deposits and payments', text: 'Take a deposit when someone books, in AED or USD. Turn it on for everyone, or only for clients who have missed before.' },
  { id: 'cli', icon: 'users', title: 'Client profiles', text: 'Every visit, spend, preference and note in one place, so the whole team knows each client.' },
  { id: 'rep', icon: 'chart', title: 'Reports', text: 'Revenue, best-selling services, busy hours and how full each team member is, updated live.' },
];
function FeatMock({ id }: { id: string }) {
  if (id === 'book') return (
    <div className="mk mk--book">
      <div className="mk__bar"><span className="mk__logo">N</span><b>Noor Beauty Lounge</b></div>
      <p className="mk__lbl">Blow-dry · 45 min · AED 120</p>
      <div className="mk__days">{['Mon 17', 'Tue 18', 'Wed 19', 'Thu 20'].map((d, i) => <span key={d} className={i === 1 ? 'is-on' : ''}>{d}</span>)}</div>
      <div className="mk__slots">{['10:00', '10:45', '12:30', '2:15', '4:00', '5:30'].map((t, i) => <span key={t} className={i === 4 ? 'is-on' : ''}>{t}</span>)}</div>
      <span className="btn btn--primary btn--block btn--sm">Book for 4:00 PM</span>
    </div>
  );
  if (id === 'cal') return (
    <div className="mk mk--cal">{['Sara', 'Maya', 'Leila', 'Hana'].map((n, i) => (
      <div key={n} className="mk__lane"><b>{n}</b>{[0, 1, 2].map((k) => <span key={k} style={{ height: `${[48, 30, 62, 40, 54, 36][(i + k) % 6]}px`, background: ['#6C4CF5', '#FF7A59', '#2ED3A0', '#3BA1F5'][i] }} />)}</div>
    ))}</div>
  );
  if (id === 'rem') return (
    <div className="mk mk--rem">
      <div className="mk__wa"><WhatsApp size={18} /><b>Noor Beauty Lounge</b></div>
      <p className="mk__msg">Hi Aisha, a reminder of your Haircut and styling tomorrow at 10:00 AM with Sara. Reply 1 to confirm or 2 to reschedule.</p>
      <p className="mk__msg mk__msg--me">1</p>
      <p className="mk__msg">Lovely, you’re confirmed. See you tomorrow ✨</p>
    </div>
  );
  if (id === 'pay') return (
    <div className="mk mk--pay">
      <p className="mk__lbl">Deposit to hold your booking</p>
      <b className="mk__big">AED 45</b><small>25% of Full hair colour · rest paid at the salon</small>
      <div className="mk__card"><Icon n="card" size={18} /> •••• 4242 <span>Apple Pay</span></div>
      <span className="btn btn--primary btn--block btn--sm">Pay deposit and book</span>
    </div>
  );
  if (id === 'cli') return (
    <div className="mk mk--cli">
      <div className="mk__who"><span>AK</span><div><b>Aisha Al Mansoori</b><small>Client since March 2025 · VIP</small></div></div>
      <div className="mk__stats"><div><b>14</b><small>visits</small></div><div><b>AED 3,920</b><small>spent</small></div><div><b>0</b><small>no-shows</small></div></div>
      <p className="mk__note">Prefers Sara. Sensitive scalp, use the gentle shampoo.</p>
    </div>
  );
  return (
    <div className="mk mk--rep">
      <p className="mk__lbl">Revenue this week</p><b className="mk__big">AED 18,640</b>
      <div className="mk__bars">{[52, 64, 48, 80, 92, 100, 70].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
      <div className="mk__days mk__days--plain">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
    </div>
  );
}
function Features() {
  const [on, setOn] = useState('book');
  const f = FEATS.find((x) => x.id === on)!;
  return (
    <section id="features" className="sec">
      <div className="wrap">
        <div className="sec__head"><span className="eyebrow">Everything in one place</span><h2>Run a fully booked day <span className="hl">without the phone calls</span></h2></div>
        <div className="feat">
          <div className="feat__list" role="tablist" aria-label="Features">
            {FEATS.map((x) => (
              <button key={x.id} type="button" role="tab" id={`ft-${x.id}`} aria-selected={on === x.id} aria-controls="ft-panel" className={`feat__tab ${on === x.id ? 'is-on' : ''}`} onClick={() => setOn(x.id)}>
                <span className="feat__ic"><Icon n={x.icon} size={20} /></span>
                <span><b>{x.title}</b><small>{x.text}</small></span>
              </button>
            ))}
          </div>
          <div className="feat__stage" id="ft-panel" role="tabpanel" aria-labelledby={`ft-${on}`}>
            <div className="feat__glow" aria-hidden="true" />
            <div key={on} className="feat__mock"><FeatMock id={on} /></div>
            <p className="feat__cap"><b>{f.title}.</b> {f.text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- AI ---------- */
const CHAT: [('in' | 'out'), string][] = [
  ['in', 'Hi, can I book a gel manicure on Saturday?'],
  ['out', 'Of course! Leila has 11:00 AM, 1:30 PM or 4:15 PM free on Saturday. Which suits you?'],
  ['in', '1:30 please'],
  ['out', 'Done ✅ Gel manicure with Leila, Saturday at 1:30 PM, AED 140. I’ll send you a reminder the day before.'],
];
function AiChat() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return; if (reduced()) { setN(CHAT.length); return; }
    const t = setTimeout(() => setN((x) => (x >= CHAT.length + 2 ? 0 : x + 1)), n === 0 ? 500 : 1700);
    return () => clearTimeout(t);
  }, [seen, n]);
  const typing = n < CHAT.length && n > 0 && CHAT[n][0] === 'out';
  return (
    <div ref={ref} className="aichat">
      <div className="aichat__head"><span className="aichat__av"><Symbol /></span><div><b>Noor Beauty Lounge</b><small>{typing ? 'typing…' : 'Saatio AI receptionist · online'}</small></div><WhatsApp size={22} /></div>
      <div className="aichat__body" aria-live="off">
        {CHAT.slice(0, Math.min(n, CHAT.length)).map(([w, t], i) => <p key={i} className={`aichat__m aichat__m--${w}`}>{t}</p>)}
        {typing && <p className="aichat__m aichat__m--out aichat__dots"><span /><span /><span /></p>}
        {n >= CHAT.length && <div className="aichat__booked"><Icon n="calendar" size={16} /> Added to Leila’s calendar · Sat 1:30 PM</div>}
      </div>
    </div>
  );
}
function Ai() {
  return (
    <section id="ai" className="sec sec--navy">
      <div className="wrap">
        <div className="sec__head sec__head--light"><span className="eyebrow eyebrow--light"><Icon n="sparkle" size={16} /> Saatio AI</span><h2>A receptionist that <span className="hl hl--coral">never sleeps</span></h2><p>Most bookings come in when you are busy with a client or the salon is closed. Saatio’s AI answers on WhatsApp, finds a real free slot and books it, in English or Arabic.</p></div>
        <div className="aigrid">
          <AiChat />
          <div className="aicards">
            <article className="aicard"><span className="aicard__ic"><Icon n="chat" /></span><h3>Books on WhatsApp</h3><p>Answers questions about prices and opening hours, offers real free times and books, moves or cancels. Anything unusual goes to your team.</p></article>
            <article className="aicard"><span className="aicard__ic aicard__ic--mint"><Icon n="zap" /></span><h3>Fills empty gaps</h3><p>Spots quiet hours in the next few days and suggests a message to clients who are due a visit. You approve it before anything is sent.</p><div className="aicard__eg"><span>Thu 2–4 PM free with Maya</span><span className="chip chip--mint">Send offer to 12 clients</span></div></article>
            <article className="aicard"><span className="aicard__ic aicard__ic--coral"><Icon n="shield" /></span><h3>Protects against no-shows</h3><p>Notices clients who have missed appointments before and asks them for a small deposit, so regular clients book as easily as ever.</p></article>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Industries ---------- */
const IND = [
  { i: 'scissors', t: 'Salons and barbers', c: 'var(--violet)', p: ['Book by stylist or “anyone available”', 'Colour and long services blocked correctly', 'Walk-ins added in two taps'] },
  { i: 'clinic', t: 'Clinics', c: 'var(--coral)', p: ['Consultations and follow-ups', 'Intake notes on each patient', 'Deposits for high-value treatments'] },
  { i: 'lotus', t: 'Spas', c: 'var(--mint)', p: ['Rooms and therapists together', 'Couples and group bookings', 'Packages and gift vouchers'] },
  { i: 'dumbbell', t: 'Gyms and studios', c: '#3BA1F5', p: ['Classes with limited spots', 'Waitlists that fill themselves', 'Memberships and class packs'] },
];
function Industries() {
  return (
    <section id="industries" className="sec">
      <div className="wrap">
        <div className="sec__head"><span className="eyebrow">Who it’s for</span><h2>Built for businesses that <span className="hl">run on appointments</span></h2></div>
        <div className="ind">
          {IND.map((x) => (
            <article key={x.t} className="ind__card" style={{ '--c': x.c } as React.CSSProperties}>
              <span className="ind__ic"><Icon n={x.i} size={26} /></span>
              <h3>{x.t}</h3>
              <ul>{x.p.map((p) => <li key={p}><Icon n="check" size={16} />{p}</li>)}</ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works + before/after ---------- */
function How() {
  return (
    <section id="how" className="sec sec--lilac">
      <div className="wrap">
        <div className="sec__head"><span className="eyebrow">Set up in an afternoon</span><h2>Three steps to <span className="hl">your first online booking</span></h2></div>
        <ol className="how">
          <li><span className="how__n">1</span><h3>Add your services and team</h3><p>Prices, durations and who does what. Import clients from a spreadsheet if you have one.</p></li>
          <li><span className="how__n">2</span><h3>Share your booking link</h3><p>Put it in your Instagram bio, on Google and in WhatsApp. It works beautifully on phones.</p></li>
          <li><span className="how__n">3</span><h3>Let Saatio do the rest</h3><p>Bookings land in your calendar, reminders go out by themselves and the AI handles the messages.</p></li>
        </ol>
        <div className="vs">
          <div className="vs__col"><h3>Without Saatio</h3><ul>{['Phone ringing while you are with a client', 'Bookings in a notebook and three chats', 'Clients forget, and the chair stays empty', 'No idea which services make money'].map((x) => <li key={x}><Icon n="x" size={16} />{x}</li>)}</ul></div>
          <div className="vs__col vs__col--on"><h3>With Saatio</h3><ul>{['Clients book themselves, day and night', 'One calendar for the whole team', 'Automatic reminders and deposits', 'Live reports on revenue and busy hours'].map((x) => <li key={x}><Icon n="check" size={16} />{x}</li>)}</ul></div>
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  const { s } = useStore(); const c = useCurrency();
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec__head sec__head--row"><div><span className="eyebrow">Pricing</span><h2>Simple plans, <span className="hl">no setup fees</span></h2></div><CurrencySwitch /></div>
        <div className="tease">
          {s.plans.map((p) => (
            <Link key={p.id} to="pricing" className={`tease__card ${p.featured ? 'is-feat' : ''}`}>
              <b>{p.name}</b><span className="tease__price">{money(p.price[c], c)}<small> / month</small></span><small>{p.staff}</small>
              <span className="tease__go">See what’s included <Icon n="arrow" size={16} /></span>
            </Link>
          ))}
        </div>
        <p className="fine center">Pay yearly and save {Math.round(YEARLY_DISCOUNT * 100)}%. Every plan starts with a 14-day free trial.</p>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="cta">
      <div className="cta__petals" aria-hidden="true"><Symbol /></div>
      <div className="wrap cta__in">
        <h2>Your next client is trying to book right now.</h2>
        <p>Give them a link that works at 2 AM. Set up Saatio in an afternoon and try it free for 14 days.</p>
        <div className="hero__ctas"><button type="button" className="btn btn--light btn--lg" onClick={() => go('signup')}>Start free trial <Icon n="arrow" size={18} className="arrow" /></button><Link to="app" className="btn btn--outline-light btn--lg">Explore the dashboard</Link></div>
      </div>
    </section>
  );
}

function TryIt() {
  const cards = [
    { to: 'book', icon: 'phone', tag: 'For clients', title: 'Client booking page', text: 'Book a blow-dry at Noor Beauty Lounge, a sample salon in Dubai Marina. Pick a service, a stylist and a real free time.', cta: 'Book as a client', mock: 'book' },
    { to: 'app', icon: 'calendar', tag: 'For the business', title: 'Business dashboard', text: 'The salon’s side: drag bookings around the calendar, check reports and chat with the AI receptionist yourself.', cta: 'Open the dashboard', mock: 'app' },
    { to: 'admin', icon: 'shield', tag: 'For the Saatio team', title: 'Saatio admin panel', text: 'The company’s own panel: every business on Saatio, monthly revenue, trials and the plans on the pricing page.', cta: 'Open the admin panel', mock: 'admin' },
  ];
  return (
    <section className="try" aria-labelledby="try-h">
      <div className="wrap">
        <div className="try__head"><span className="eyebrow">Live demo, no sign-up</span><h2 id="try-h">See the whole product, <span className="hl">from both sides</span></h2><p>Everything is connected. Make a booking as a client and watch it land in the salon’s calendar. Start a trial and it appears in the Saatio admin.</p></div>
        <div className="try__grid">
          {cards.map((c, i) => (
            <Link key={c.to} to={c.to} className={`try__card try__card--${c.mock}`}>
              <span className="try__n">0{i + 1}</span>
              <div className="try__vis" aria-hidden="true">
                {c.mock === 'book' && <div className="tv tv--book"><b>Blow-dry · 45 min</b><div className="tv__slots"><i /><i className="on" /><i /><i /><i /><i /></div><span className="tv__btn">Book 4:00 PM</span></div>}
                {c.mock === 'app' && <div className="tv tv--app">{[0, 1, 2].map((k) => <div key={k} className="tv__lane">{[0, 1, 2].map((j) => <i key={j} style={{ height: `${[30, 18, 26, 22, 34, 16][(k + j) % 6]}px` }} />)}</div>)}</div>}
                {c.mock === 'admin' && <div className="tv tv--admin"><b>Monthly revenue</b><div className="tv__bars">{[30, 38, 44, 52, 58, 66, 74, 84, 92, 100].map((h, k) => <i key={k} style={{ height: `${h}%` }} />)}</div></div>}
              </div>
              <span className="chip">{c.tag}</span>
              <h3><Icon n={c.icon} size={20} />{c.title}</h3>
              <p>{c.text}</p>
              <span className="try__go">{c.cta} <Icon n="arrow" size={17} /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return <><Hero /><TryIt /><Features /><Ai /><Industries /><How /><PricingTeaser /><Cta /></>;
}
