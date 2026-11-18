import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { customerStats, findGaps, freeSlots, useStore } from '../lib/store';
import { addDays, fmtDate, fmtTime, money, uid } from '../lib/data';
import { dayL, offer, respond, say, staffName, svcName, timeL, type Choice, type Ctx, type Env, type Slot } from '../lib/receptionist';
import { Symbol } from '../components/Logo';
import { Icon, Toggle, WhatsApp, useToast } from '../components/ui';
import { PageHead, initials, useNow } from './common';

/* ---------- WhatsApp receptionist (demo) ----------
   The conversation logic lives in lib/receptionist.ts. In the product the same tools are driven by an AI model. */
type Msg = { who: 'client' | 'ai' | 'sys'; text: string; choices?: Choice[] };
const SUGGEST = ['Kal shaam 5 baje blow-dry ho sakta hai?', 'بكرة الساعة ٤ مناكير؟', 'How much is a facail?', 'Koi offer hai?', 'Same as last time on Saturday', 'I need to move my appointment', 'Cancel my booking please'];

function Receptionist() {
  const { s, set, addBooking, findOrAddCustomer } = useStore(); const toast = useToast(); const { today, min } = useNow();
  const regular = s.customers[1];
  const [persona, setPersona] = useState<'regular' | 'new'>('regular');
  const [newId, setNewId] = useState<string | null>(null);
  const phone = useRef(`+971 56 ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)}`);
  const intro = (p: 'regular' | 'new') => [{ who: 'sys' as const, text: p === 'regular' ? `You are ${regular.name}, a regular client. Write in English, Arabic or Roman Urdu, typos are fine.` : 'You are a new client messaging for the first time. The AI will ask for your name before booking.' }];
  const [msgs, setMsgs] = useState<Msg[]>(() => intro('regular'));
  const [ctx, setCtx] = useState<Ctx>({ lang: 'en' });
  const [text, setText] = useState(''); const [typing, setTyping] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' }); }, [msgs, typing]);
  const clientId = persona === 'regular' ? regular.id : newId;
  const env: Env = { today, now: min, clientId, clientName: persona === 'regular' ? regular.name : (s.customers.find((c) => c.id === newId)?.name ?? null) };
  const addLog = (l?: string) => { if (l) setLog((x) => [l, ...x].slice(0, 7)); };
  const aiSays = (m: Msg, c: Ctx, delay = 850) => { setTyping(true); setTimeout(() => { setTyping(false); setMsgs((x) => [...x, m]); setCtx(c); }, delay); };
  const clearChoices = () => setMsgs((m) => m.map((x) => ({ ...x, choices: undefined })));
  const restart = (p: 'regular' | 'new') => { setPersona(p); setMsgs(intro(p)); setCtx({ lang: 'en' }); setLog([]); if (p === 'new') { setNewId(null); phone.current = `+971 56 ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)}`; } };

  const bookSlot = (slot: Slot, c: Ctx) => {
    const lang = c.lang; const sid = c.serviceId!; const sv = s.services.find((x) => x.id === sid)!;
    const ignore = c.mode === 'move' ? c.moveId : undefined;
    const still = freeSlots(ignore ? { ...s, bookings: s.bookings.filter((b) => b.id !== ignore) } : s, slot.date, sid, slot.staffId).some((x) => x.start === slot.start);
    if (!still) { const o = offer(s, env, c, { serviceId: sid, date: slot.date, range: c.range, pre: say('taken', lang), ignore }); aiSays({ who: 'ai', text: o.text, choices: o.choices }, o.ctx); return; }
    const who = staffName(s, slot.staffId, lang);
    if (c.mode === 'move' && c.moveId) {
      set((x) => ({ ...x, bookings: x.bookings.map((b) => (b.id === c.moveId ? { ...b, date: slot.date, start: slot.start, staffId: slot.staffId } : b)) }));
      aiSays({ who: 'ai', text: say('moved', lang, { svc: svcName(s, sid, lang), day: dayL(slot.date, today, lang), time: timeL(slot.start, lang), who }) }, { lang });
      addLog(`Moved a booking to ${fmtDate(slot.date)} ${fmtTime(slot.start)}`); toast('The AI moved a booking. The calendar is updated.'); return;
    }
    let cid = clientId; let name = env.clientName;
    if (!cid) {
      if (!c.name) { aiSays({ who: 'ai', text: say('askName', lang) }, { ...c, awaitingName: true, pending: slot }); return; }
      const nc = findOrAddCustomer({ name: c.name, phone: phone.current }); cid = nc.id; name = nc.name; setNewId(nc.id); addLog(`Added ${nc.name} as a new client`);
    }
    const nb = addBooking({ date: slot.date, start: slot.start, serviceId: sid, staffId: slot.staffId, customerId: cid, status: 'confirmed', source: 'whatsapp', price: sv.price });
    aiSays({ who: 'ai', text: say('booked', lang, { svc: svcName(s, sid, lang), who, day: dayL(slot.date, today, lang), time: timeL(slot.start, lang), name: (name ?? '').split(' ')[0] }) }, { lang });
    addLog(`Booked ${nb.ref}: ${sv.name}, ${fmtDate(slot.date)} ${fmtTime(slot.start)}`); toast('New booking from the AI receptionist. It’s in the calendar.');
  };

  const choose = (ch: Choice) => {
    clearChoices(); setMsgs((m) => [...m, { who: 'client', text: ch.label }]);
    const lang = ctx.lang;
    if (ch.kind === 'slot') { bookSlot(ch.slot, ctx); return; }
    const bk = s.bookings.find((b) => b.id === ch.id)!;
    if (ch.kind === 'cancel') {
      set((x) => ({ ...x, bookings: x.bookings.map((b) => (b.id === bk.id ? { ...b, status: 'cancelled' } : b)) }));
      aiSays({ who: 'ai', text: say('cancelled', lang, { svc: svcName(s, bk.serviceId, lang), day: dayL(bk.date, today, lang), time: timeL(bk.start, lang) }) }, { lang });
      addLog(`Cancelled ${bk.ref} and freed the slot`); toast('The AI cancelled a booking. The slot is free again.'); return;
    }
    const o = offer(s, env, { ...ctx, mode: 'move', moveId: bk.id }, { serviceId: bk.serviceId, date: ctx.date, range: ctx.range, pre: say('preMove', lang), ignore: bk.id });
    aiSays({ who: 'ai', text: o.text, choices: o.choices }, o.ctx); addLog(o.log);
  };

  const send = (raw: string) => {
    const t = raw.trim(); if (!t || typing) return;
    clearChoices(); setMsgs((m) => [...m, { who: 'client', text: t }]); setText('');
    const r = respond(s, t, env, ctx);
    if (r.pick) { bookSlot(r.pick, r.ctx); return; }
    aiSays({ who: 'ai', text: r.text, choices: r.choices }, r.ctx); addLog(r.log);
    if (r.handoff) toast('Message flagged for your team');
  };
  const submit = (e: FormEvent) => { e.preventDefault(); send(text); };
  return (
    <div className="rcp">
      <div className="wa">
        <div className="wa__head"><span className="wa__av"><Symbol /></span><div><b>{s.business.name}</b><small>{typing ? 'typing…' : 'AI receptionist · replies instantly'}</small></div><WhatsApp size={22} /></div>
        <div className="wa__as" role="radiogroup" aria-label="Chat as">
          <span>Chat as</span>
          <button type="button" role="radio" aria-checked={persona === 'regular'} onClick={() => restart('regular')}>{regular.name.split(' ')[0]}, regular client</button>
          <button type="button" role="radio" aria-checked={persona === 'new'} onClick={() => restart('new')}>A new client</button>
        </div>
        <div className="wa__body" ref={body} aria-live="polite">
          {msgs.map((m, i) => m.who === 'sys' ? <p key={i} className="wa__sys">{m.text}</p> : (
            <div key={i} className={`wa__m wa__m--${m.who}`} dir="auto">
              <p dir="auto">{m.text}</p>
              {m.choices && <div className="wa__slots">{m.choices.map((c, k) => <button key={k} type="button" onClick={() => choose(c)} disabled={typing}>{c.label}</button>)}</div>}
            </div>
          ))}
          {typing && <div className="wa__m wa__m--ai"><p className="aichat__dots"><span /><span /><span /></p></div>}
        </div>
        <div className="wa__sugg">{SUGGEST.map((x) => <button key={x} type="button" dir="auto" onClick={() => send(x)} disabled={typing}>{x}</button>)}</div>
        <form className="wa__form" onSubmit={submit}><label htmlFor="wa-in" className="sr-only">Message</label><input id="wa-in" dir="auto" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message as the client" autoComplete="off" /><button type="submit" className="wa__send" aria-label="Send" disabled={!text.trim() || typing}><Icon n="send" size={18} /></button></form>
      </div>
      <aside className="rcp__side">
        <section className="card">
          <header className="card__h"><h2>What the AI did</h2>{log.length > 0 && <button type="button" className="lnk lnk--btn" onClick={() => restart(persona)}>New chat</button>}</header>
          {log.length ? <ul className="log">{log.map((l, i) => <li key={i}><Icon n={/^(Booked|Moved|Cancelled|Added)/.test(l) ? 'check' : /flag|Handed/.test(l) ? 'users' : 'sparkle'} size={15} />{l}</li>)}</ul> : <p className="muted">Send a message to see the AI check availability, book, move or cancel.</p>}
        </section>
        <section className="card">
          <header className="card__h"><h2>What it understands</h2></header>
          <ul className="knows">
            <li><Icon n="globe" size={16} />English, Arabic and Roman Urdu, and replies in the same language</li>
            <li><Icon n="check" size={16} />Typos like “tommorow” or “facail”</li>
            <li><Icon n="calendar" size={16} /><span>Days and times: “kal shaam”, <bdi dir="rtl">“بكرة الساعة ٤”</bdi>, “Saturday after 3”</span></li>
            <li><Icon n="chat" size={16} />Follow-ups: “yes”, “any other time?”, “what about Friday?”</li>
            <li><Icon n="clock" size={16} />Booking, moving and cancelling, with live free times</li>
            <li><Icon n="tag" size={16} />Prices for the service you’re talking about, and your current offers (edit them in Settings)</li>
            <li><Icon n="users" size={16} />Anything else goes to your team</li>
          </ul>
          <p className="fine">Demo: this concept runs offline with a built-in language engine. In the product, the same actions are driven by an AI model connected to your calendar.</p>
        </section>
      </aside>
    </div>
  );
}

function Gaps() {
  const { s, set } = useStore(); const toast = useToast(); const { today, min } = useNow();
  const gaps = useMemo(() => findGaps(s, today, 4, min), [s, today, min]);
  const [sel, setSel] = useState(0);
  const g = gaps[sel];
  const st = g ? s.staff.find((x) => x.id === g.staffId)! : null;
  // Clients due a visit: they last came 5+ weeks ago for something this team member does.
  const due = useMemo(() => !st ? [] : s.customers.filter((c) => {
    const k = customerStats(s, c.id); if (!k.last || k.last > addDays(today, -28) || k.upcoming || k.risky) return false;
    return s.bookings.some((b) => b.customerId === c.id && s.services.find((x) => x.id === b.serviceId)?.staff.includes(st.id));
  }), [s, st, today]);
  const day = g ? (g.date === today ? 'today' : g.date === addDays(today, 1) ? 'tomorrow' : fmtDate(g.date, { weekday: 'long' })) : '';
  const [msg, setMsg] = useState('');
  useEffect(() => { if (g && st) setMsg(`Hi {name}! ${st.name.split(' ')[0]} has a few free spots ${day} between ${fmtTime(g.start)} and ${fmtTime(g.end)}. Book in the next 24 hours and get 15% off. Reply here or book at saatio.com/${s.business.slug} ✨`); }, [sel, g?.date, g?.start]); // eslint-disable-line react-hooks/exhaustive-deps
  const sendOffer = () => {
    if (!g || !due.length) return;
    set((x) => ({ ...x, campaigns: [{ id: uid(), gap: `${fmtDate(g.date)} ${fmtTime(g.start)}–${fmtTime(g.end)} · ${st!.name.split(' ')[0]}`, audience: due.length, message: msg, sentAt: new Date().toISOString(), booked: 0 }, ...x.campaigns] }));
    toast(`Offer sent to ${due.length} clients on WhatsApp (demo)`);
  };
  if (!gaps.length) return <p className="empty">No big gaps in the next few days. Nicely booked!</p>;
  return (
    <div className="gaps">
      <section className="card">
        <header className="card__h"><h2>Quiet times found</h2><span className="muted">next 4 days</span></header>
        <ul className="gaps__list" role="radiogroup" aria-label="Gap">{gaps.map((x, i) => { const p = s.staff.find((y) => y.id === x.staffId)!; return (
          <li key={i}><button type="button" role="radio" aria-checked={sel === i} className={sel === i ? 'is-on' : ''} onClick={() => setSel(i)}>
            <span className="av av--sm" style={{ background: p.color }}>{initials(p.name)}</span>
            <span><b>{x.date === today ? 'Today' : fmtDate(x.date, { weekday: 'long' })}, {fmtTime(x.start)} to {fmtTime(x.end)}</b><small>{p.name.split(' ')[0]} · {Math.round((x.end - x.start) / 60 * 10) / 10} hours free</small></span>
          </button></li>
        ); })}</ul>
      </section>
      <section className="card">
        <header className="card__h"><h2><Icon n="sparkle" size={18} /> Suggested offer</h2></header>
        <p className="muted">{due.length} clients haven’t visited for 4 weeks or more, have nothing booked and have seen {st?.name.split(' ')[0]} before.</p>
        <div className="avs">{due.slice(0, 8).map((c) => <span key={c.id} className="av av--sm" title={c.name} style={{ background: 'var(--violet)' }}>{initials(c.name)}</span>)}{due.length > 8 && <span className="av av--sm av--more">+{due.length - 8}</span>}</div>
        <label htmlFor="gap-msg" className="lbl">WhatsApp message</label>
        <textarea id="gap-msg" className="ta" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} />
        <p className="fine">{'{name}'} becomes each client’s first name. Nothing is sent until you press the button.</p>
        <button type="button" className="btn btn--primary" disabled={!due.length} onClick={sendOffer}><Icon n="send" size={17} /> Send to {due.length} clients</button>
        {s.campaigns.length > 0 && <><h3 className="card__sub">Sent offers</h3><ul className="log">{s.campaigns.slice(0, 4).map((c) => <li key={c.id}><Icon n="check" size={15} />{c.gap} · {c.audience} clients</li>)}</ul></>}
      </section>
    </div>
  );
}

function NoShows() {
  const { s, set } = useStore(); const { today } = useNow(); const toast = useToast(); const b = s.business; const cur = b.currency;
  const risky = s.customers.map((c) => ({ c, k: customerStats(s, c.id) })).filter((x) => x.k.risky).sort((a, z) => z.k.noShows - a.k.noShows);
  const lost = s.bookings.filter((x) => x.status === 'no-show' && x.date >= addDays(today, -30));
  return (
    <div className="ns">
      <section className="card">
        <header className="card__h"><h2><Icon n="shield" size={18} /> No-show protection</h2></header>
        <Toggle id="ns-on" checked={b.ai.noShowGuard} onChange={(v) => { set((x) => ({ ...x, business: { ...x.business, ai: { ...x.business.ai, noShowGuard: v }, deposits: { ...x.business.deposits, enabled: v || x.business.deposits.enabled } } })); toast(v ? 'No-show protection is on' : 'No-show protection is off'); }}
          label="Ask clients who often miss for a deposit" sub="Clients with two or more no-shows pay a deposit when they book online." />
        <div className="ns__pct"><label htmlFor="ns-p" className="lbl">Deposit</label><input id="ns-p" type="range" min={10} max={50} step={5} value={b.deposits.percent} onChange={(e) => set((x) => ({ ...x, business: { ...x.business, deposits: { ...x.business.deposits, percent: Number(e.target.value) } } }))} /><b>{b.deposits.percent}%</b></div>
        <p className="note"><Icon n="wallet" size={16} /> Last 30 days: {lost.length} no-shows, {money(lost.reduce((a, x) => a + x.price, 0), cur)} of empty chair time.</p>
      </section>
      <section className="card">
        <header className="card__h"><h2>Clients who often miss</h2><span className="muted">{risky.length}</span></header>
        <ul className="rows">{risky.map(({ c, k }) => (
          <li key={c.id}><span className="rows__main rows__main--static"><span className="who"><span className="av av--sm" style={{ background: 'var(--coral)' }}>{initials(c.name)}</span><span><b>{c.name}</b><small>{k.visits} visits · {k.upcoming} upcoming</small></span></span></span><span className="chip chip--red">{k.noShows} no-shows</span></li>
        ))}</ul>
      </section>
    </div>
  );
}

export default function Ai() {
  const [tab, setTab] = useState<'rcp' | 'gaps' | 'ns'>('rcp');
  const { s, set } = useStore();
  return (
    <>
      <PageHead title="AI assistant" sub="Your receptionist on WhatsApp, plus help filling quiet hours and protecting against no-shows.">
        <Toggle id="ai-on" checked={s.business.ai.receptionist} onChange={(v) => set((x) => ({ ...x, business: { ...x.business, ai: { ...x.business.ai, receptionist: v } } }))} label="Receptionist on" />
      </PageHead>
      <div className="tabs" role="tablist" aria-label="AI features">
        {([['rcp', 'chat', 'WhatsApp receptionist'], ['gaps', 'zap', 'Smart gaps'], ['ns', 'shield', 'No-show protection']] as const).map(([k, i, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}><Icon n={i} size={17} />{l}</button>
        ))}
      </div>
      <div role="tabpanel">{tab === 'rcp' ? <Receptionist /> : tab === 'gaps' ? <Gaps /> : <NoShows />}</div>
    </>
  );
}
