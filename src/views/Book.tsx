import { useMemo, useState, type FormEvent } from 'react';
import { Link } from '../lib/router';
import { customerStats, freeSlots, useStore } from '../lib/store';
import { addDays, fmtDate, fmtDur, fmtTime, money, nowMinutes, todayIn, weekday, type Booking } from '../lib/data';
import { Symbol } from '../components/Logo';
import { Field, Icon } from '../components/ui';

// The page a client sees at saatio.com/noor-beauty. Everything it books shows up in the business dashboard.
export default function Book() {
  const { s, addBooking, findOrAddCustomer } = useStore();
  const b = s.business; const today = todayIn(b.timeZone);
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | 'any'>('any');
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<{ start: number; staffId: string } | null>(null);
  const [f, setF] = useState({ name: '', phone: '', email: '', note: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Booking | null>(null);
  const [cat, setCat] = useState('All');

  const sv = s.services.find((x) => x.id === serviceId);
  const team = sv ? s.staff.filter((x) => sv.staff.includes(x.id)) : [];
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const slots = useMemo(() => {
    if (!sv) return [];
    const now = nowMinutes(b.timeZone);
    return freeSlots(s, date, sv.id, staffId).filter((x) => date !== today || x.start > now + 30);
  }, [s, sv, date, staffId, today, b.timeZone]);
  const cats = ['All', ...new Set(s.services.filter((x) => x.active).map((x) => x.category))];
  const who = slot ? s.staff.find((x) => x.id === slot.staffId) : null;
  const known = f.phone.replace(/\D/g, '').length >= 7 ? s.customers.find((c) => c.phone.replace(/\D/g, '') === f.phone.replace(/\D/g, '')) : undefined;
  const needsDeposit = !!sv && b.deposits.enabled && (!b.deposits.onlyRisky || (!!known && customerStats(s, known.id).risky));
  const deposit = sv ? Math.round(sv.price * b.deposits.percent / 100) : 0;
  const open = !b.closedDays.includes(weekday(today));

  const confirm = (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = 'Enter your full name.';
    if (f.phone.replace(/\D/g, '').length < 7) er.phone = 'Enter a mobile number so we can send your reminder.';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Check your email address.';
    setErr(er); if (Object.keys(er).length || !sv || !slot) return;
    const c = findOrAddCustomer({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || undefined });
    const nb = addBooking({ date, start: slot.start, serviceId: sv.id, staffId: slot.staffId, customerId: c.id, status: 'confirmed', source: 'online', price: sv.price, deposit: needsDeposit ? deposit : undefined, note: f.note.trim() || undefined });
    setDone(nb);
  };

  const Summary = () => (
    <aside className="bk__sum" aria-label="Your booking">
      <h2>Your booking</h2>
      {!sv ? <p className="muted">Choose a service to start.</p> : (
        <dl>
          <div><dt>Service</dt><dd>{sv.name}<small>{fmtDur(sv.minutes)}</small></dd></div>
          <div><dt>With</dt><dd>{who ? who.name : staffId === 'any' ? 'Anyone available' : s.staff.find((x) => x.id === staffId)?.name}</dd></div>
          <div><dt>When</dt><dd>{slot ? `${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${fmtTime(slot.start)}` : 'Not chosen yet'}</dd></div>
          <div className="bk__total"><dt>Total</dt><dd>{money(sv.price, b.currency)}</dd></div>
          {needsDeposit && step >= 3 && <div><dt>Deposit today</dt><dd>{money(deposit, b.currency)}</dd></div>}
        </dl>
      )}
      <p className="bk__note"><Icon n="bell" size={16} /> You’ll get a WhatsApp reminder the day before. Free cancellation up to 24 hours before.</p>
    </aside>
  );

  if (done) {
    const d = s.staff.find((x) => x.id === done.staffId)!; const sv2 = s.services.find((x) => x.id === done.serviceId)!;
    return (
      <div className="bk">
        <div className="bk__done page-in">
          <span className="bk__tick"><Icon n="check" size={34} /></span>
          <h1>You’re booked, {f.name.trim().split(' ')[0]}!</h1>
          <p className="bk__ref">Booking {done.ref}</p>
          <div className="bk__ticket">
            <div><small>Service</small><b>{sv2.name}</b></div><div><small>With</small><b>{d.name}</b></div>
            <div><small>Date</small><b>{fmtDate(done.date, { weekday: 'long', day: 'numeric', month: 'long' })}</b></div><div><small>Time</small><b>{fmtTime(done.start)}</b></div>
            <div><small>Where</small><b>{b.name}, {b.area}</b></div><div><small>{done.deposit ? 'Deposit paid' : 'Pay at the salon'}</small><b>{money(done.deposit ?? sv2.price, b.currency)}</b></div>
          </div>
          <p className="muted">A confirmation is on its way to your WhatsApp. Reply to it any time to reschedule.</p>
          <div className="bk__done-act">
            <button type="button" className="btn btn--ghost" onClick={() => { setDone(null); setStep(0); setServiceId(null); setSlot(null); }}>Book something else</button>
            <Link to="app-calendar" className="btn btn--primary">See it in the salon’s calendar <Icon n="arrow" size={18} className="arrow" /></Link>
          </div>
          <p className="fine">Demo: nothing was charged or sent. The booking now appears in the Noor Beauty Lounge dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bk">
      <header className="bk__biz">
        <div className="bk__cover" aria-hidden="true"><Symbol /></div>
        <Link to="" className="bk__demo"><Symbol /> Demo booking page by Saatio</Link>
        <div className="bk__bizin">
          <span className="bk__mono">N</span>
          <div><h1>{b.name}</h1><p>Hair, nails and skin · {b.area}, {b.city}</p>
            <p className="bk__meta"><span className={`chip ${open ? 'chip--mint' : 'chip--grey'}`}>{open ? 'Open today' : 'Closed today'} · {fmtTime(b.open)} to {fmtTime(b.close)}</span><span className="bk__ph"><Icon n="phone" size={15} />{b.phone}</span></p>
          </div>
        </div>
      </header>

      <div className="bk__grid">
        <div className="bk__main">
          <ol className="bk__steps" aria-label="Booking steps">
            {['Service', 'Team member', 'Date and time', 'Your details'].map((x, i) => (
              <li key={x}><button type="button" className={i === step ? 'is-on' : i < step ? 'is-done' : ''} disabled={i > step} onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Icon n="check" size={13} /> : i + 1}</span>{x}</button></li>
            ))}
          </ol>

          {step === 0 && (
            <section className="bk__panel page-in" aria-labelledby="bk-h">
              <h2 id="bk-h">Choose a service</h2>
              <div className="seg" role="radiogroup" aria-label="Category">{cats.map((c) => <button key={c} type="button" role="radio" aria-checked={cat === c} onClick={() => setCat(c)}>{c}</button>)}</div>
              <ul className="bk__services">
                {s.services.filter((x) => x.active && (cat === 'All' || x.category === cat)).map((x) => (
                  <li key={x.id}><button type="button" className={`bk__svc ${serviceId === x.id ? 'is-on' : ''}`} aria-pressed={serviceId === x.id} onClick={() => { setServiceId(x.id); setSlot(null); setStaffId('any'); setStep(1); }}>
                    <span><b>{x.name}</b><small>{fmtDur(x.minutes)} · {x.category}</small></span><span className="bk__price">{money(x.price, b.currency)}</span><Icon n="arrow" size={18} />
                  </button></li>
                ))}
              </ul>
            </section>
          )}

          {step === 1 && sv && (
            <section className="bk__panel page-in">
              <h2>Who would you like?</h2>
              <div className="bk__team">
                {[{ id: 'any', name: 'Anyone available', role: 'Earliest free time', color: '#0E1330' }, ...team].map((t) => (
                  <button key={t.id} type="button" className={`bk__pro ${staffId === t.id ? 'is-on' : ''}`} aria-pressed={staffId === t.id} onClick={() => { setStaffId(t.id); setSlot(null); setStep(2); }}>
                    <span className="bk__av" style={{ background: t.color }}>{t.id === 'any' ? <Icon n="users" size={20} /> : t.name.split(' ').map((p) => p[0]).join('')}</span>
                    <b>{t.name}</b><small>{t.role}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && sv && (
            <section className="bk__panel page-in">
              <h2>Pick a date and time</h2>
              <p className="muted">Times are in Dubai time.</p>
              <div className="bk__days" role="radiogroup" aria-label="Date">
                {days.map((d, i) => {
                  const n = freeSlots(s, d, sv.id, staffId).length;
                  return <button key={d} type="button" role="radio" aria-checked={date === d} className={date === d ? 'is-on' : ''} onClick={() => { setDate(d); setSlot(null); }} disabled={!n}>
                    <small>{i === 0 ? 'Today' : fmtDate(d, { weekday: 'short' })}</small><b>{fmtDate(d, { day: 'numeric' })}</b><span>{fmtDate(d, { month: 'short' })}</span>
                  </button>;
                })}
              </div>
              {slots.length ? (
                <div className="bk__slots" role="radiogroup" aria-label="Time">
                  {slots.map((x) => <button key={x.start} type="button" role="radio" aria-checked={slot?.start === x.start} className={slot?.start === x.start ? 'is-on' : ''} onClick={() => setSlot(x)}>{fmtTime(x.start)}</button>)}
                </div>
              ) : <p className="bk__empty">No free times left on this day. Please try another date.</p>}
              <div className="bk__nav"><button type="button" className="btn btn--ghost" onClick={() => setStep(1)}>Back</button><button type="button" className="btn btn--primary" disabled={!slot} onClick={() => setStep(3)}>Continue</button></div>
            </section>
          )}

          {step === 3 && sv && slot && (
            <form className="bk__panel page-in" onSubmit={confirm} noValidate>
              <h2>Your details</h2>
              <div className="form">
                <Field label="Full name" id="bk-name" error={err.name}><input id="bk-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" aria-invalid={!!err.name} /></Field>
                <Field label="Mobile (WhatsApp)" id="bk-phone" error={err.phone} hint={known ? `Welcome back, ${known.name.split(' ')[0]}.` : undefined}><input id="bk-phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" placeholder="+971 50 123 4567" aria-invalid={!!err.phone} /></Field>
                <Field label="Email (optional)" id="bk-email" error={err.email} wide><input id="bk-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" aria-invalid={!!err.email} /></Field>
                <Field label="Anything we should know? (optional)" id="bk-note" wide><textarea id="bk-note" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Allergies, hair length, a reference photo you’ll bring…" /></Field>
              </div>
              {needsDeposit && (
                <div className="bk__dep">
                  <Icon n="shield" size={20} />
                  <div><b>A {b.deposits.percent}% deposit holds this booking: {money(deposit, b.currency)}</b><small>The rest is paid at the salon. Refunded if you cancel at least 24 hours before.</small></div>
                </div>
              )}
              <div className="bk__nav"><button type="button" className="btn btn--ghost" onClick={() => setStep(2)}>Back</button><button type="submit" className="btn btn--primary btn--lg">{needsDeposit ? `Pay ${money(deposit, b.currency)} and book` : 'Confirm booking'}</button></div>
            </form>
          )}
        </div>
        <Summary />
      </div>
      <p className="bk__powered">Booking by <Link to="">Saatio</Link> · Demo booking page</p>
    </div>
  );
}
