import { useEffect, useMemo, useState } from 'react';
import { customerStats, freeSlots, useStore } from '../lib/store';
import { addDays, fmtDate, fmtDur, fmtTime, money, nowMinutes, todayIn, type Booking, type Source, type Status } from '../lib/data';
import { Drawer, Field, Icon, useToast } from '../components/ui';

export const STATUS: Record<Status, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmed', cls: 'chip' }, completed: { label: 'Completed', cls: 'chip chip--mint' },
  'no-show': { label: 'No-show', cls: 'chip chip--red' }, cancelled: { label: 'Cancelled', cls: 'chip chip--grey' },
};
export const SOURCE: Record<Source, string> = { online: 'Online', whatsapp: 'WhatsApp AI', 'walk-in': 'Walk-in', phone: 'Phone' };
export const StatusChip = ({ s }: { s: Status }) => <span className={STATUS[s].cls}>{STATUS[s].label}</span>;
export const initials = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/** Today and the current minute in the business's own time zone, refreshed every minute. */
export function useNow() {
  const { s } = useStore(); const tz = s.business.timeZone;
  const [n, setN] = useState(() => ({ today: todayIn(tz), min: nowMinutes(tz) }));
  useEffect(() => { const id = setInterval(() => setN({ today: todayIn(tz), min: nowMinutes(tz) }), 60000); return () => clearInterval(id); }, [tz]);
  return n;
}

export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'up' | 'down' | 'warn' }) {
  return <div className="kpi"><span>{label}</span><b>{value}</b>{sub && <small className={tone ? `is-${tone}` : ''}>{sub}</small>}</div>;
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return <div className="ph"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="ph__act">{children}</div>}</div>;
}

/* ---------- New / edit booking ---------- */
export type Draft = Partial<Booking> & { customerName?: string; customerPhone?: string };
export function BookingDrawer({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const { s, set, addBooking, findOrAddCustomer } = useStore(); const toast = useToast(); const { today, min } = useNow();
  const isNew = !draft.id;
  const [b, setB] = useState<Draft>(() => {
    const d: Draft = { date: today, serviceId: s.services[0].id, status: 'confirmed', source: 'phone', ...draft };
    if (isNew && d.start == null) { // Start on the next free time, so a walk-in can be booked in two taps.
      for (let i = 0; i < 14; i++) {
        const day = addDays(d.date!, i); const f = freeSlots(s, day, d.serviceId!, d.staffId ?? 'any').filter((x) => day !== today || x.start > min);
        if (f.length) { d.date = day; d.start = f[0].start; d.staffId = d.staffId ?? f[0].staffId; break; }
      }
    }
    return d;
  });
  const [q, setQ] = useState(isNew ? '' : s.customers.find((c) => c.id === draft.customerId)?.name ?? '');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const sv = s.services.find((x) => x.id === b.serviceId)!;
  const team = s.staff.filter((x) => sv.staff.includes(x.id));
  const staffId = b.staffId && sv.staff.includes(b.staffId) ? b.staffId : team[0]?.id;
  // Free times for this team member, plus the booking's own current time when editing.
  const times = useMemo(() => {
    const base = freeSlots({ ...s, bookings: s.bookings.filter((x) => x.id !== b.id) }, b.date!, sv.id, staffId ?? 'any').map((x) => x.start).filter((t) => !isNew || b.date !== today || t > min);
    return [...new Set([...(b.start != null ? [b.start] : []), ...base])].sort((x, y) => x - y);
  }, [s, b.date, b.id, b.start, sv.id, staffId, isNew, today, min]);
  const matches = q.length > 1 ? s.customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§')).slice(0, 5) : [];
  const picked = s.customers.find((c) => c.id === b.customerId);
  const risky = picked ? customerStats(s, picked.id).risky : false;

  const save = () => {
    const e: Record<string, string> = {};
    if (!picked && q.trim().length < 2) e.client = 'Choose a client or type a new client’s name.';
    if (!picked && phone.replace(/\D/g, '').length < 7) e.phone = 'Add a mobile number for the new client.';
    if (b.start == null || !times.includes(b.start)) e.time = 'Choose a free time.';
    setErr(e); if (Object.keys(e).length) return;
    const cid = picked ? picked.id : findOrAddCustomer({ name: q.trim(), phone: phone.trim() }).id;
    if (isNew) {
      const nb = addBooking({ date: b.date!, start: b.start!, serviceId: sv.id, staffId: staffId!, customerId: cid, status: 'confirmed', source: (b.source as Source) ?? 'phone', price: sv.price, note: b.note });
      toast(`Booked ${sv.name} at ${fmtTime(nb.start)}`);
    } else {
      set((x) => ({ ...x, bookings: x.bookings.map((o) => (o.id === b.id ? { ...o, date: b.date!, start: b.start!, serviceId: sv.id, staffId: staffId!, customerId: cid, status: b.status as Status, note: b.note, price: o.serviceId === sv.id ? o.price : sv.price } : o)) }));
      toast('Booking updated');
    }
    onClose();
  };
  const cancel = () => { set((x) => ({ ...x, bookings: x.bookings.map((o) => (o.id === b.id ? { ...o, status: 'cancelled' } : o)) })); toast('Booking cancelled and the client notified'); onClose(); };

  return (
    <Drawer title={isNew ? 'New booking' : `Booking ${draft.ref}`} sub={isNew ? 'For phone calls and walk-ins.' : `${SOURCE[draft.source as Source]} · created ${fmtDate(draft.createdAt!)}`} onClose={onClose}
      footer={<>{!isNew && b.status !== 'cancelled' && <button type="button" className="btn btn--ghost btn--sm dr__danger" onClick={cancel}>Cancel booking</button>}<span className="sp" /><button type="button" className="btn btn--ghost" onClick={onClose}>Close</button><button type="button" className="btn btn--primary" onClick={save}>{isNew ? 'Book' : 'Save'}</button></>}>
      <div className="form">
        <Field label="Client" id="bd-client" error={err.client} wide>
          <div className="ac">
            <input id="bd-client" value={q} placeholder="Search by name or phone, or type a new name" autoComplete="off" onChange={(e) => { setQ(e.target.value); setB({ ...b, customerId: undefined }); }} aria-invalid={!!err.client} />
            {!picked && matches.length > 0 && <ul className="ac__list" role="listbox">{matches.map((c) => <li key={c.id}><button type="button" onClick={() => { setB({ ...b, customerId: c.id }); setQ(c.name); }}><b>{c.name}</b><small>{c.phone}</small></button></li>)}</ul>}
          </div>
        </Field>
        {picked ? (
          <div className="fld--wide bd__client">
            <span className="av" style={{ background: 'var(--violet)' }}>{initials(picked.name)}</span>
            <div><b>{picked.name}</b><small>{picked.phone} · {customerStats(s, picked.id).visits} visits</small></div>
            {risky && <span className="chip chip--red"><Icon n="shield" size={14} /> Missed {customerStats(s, picked.id).noShows} times</span>}
          </div>
        ) : q.trim().length > 1 && (
          <Field label="New client’s mobile" id="bd-phone" error={err.phone} wide><input id="bd-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 50 123 4567" /></Field>
        )}
        <Field label="Service" id="bd-svc"><select id="bd-svc" value={b.serviceId} onChange={(e) => setB({ ...b, serviceId: e.target.value, start: undefined })}>{s.services.filter((x) => x.active || x.id === b.serviceId).map((x) => <option key={x.id} value={x.id}>{x.name} · {fmtDur(x.minutes)} · {money(x.price, s.business.currency)}</option>)}</select></Field>
        <Field label="Team member" id="bd-staff"><select id="bd-staff" value={staffId} onChange={(e) => setB({ ...b, staffId: e.target.value, start: undefined })}>{team.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Date" id="bd-date"><input id="bd-date" type="date" value={b.date} min={addDays(today, -60)} onChange={(e) => setB({ ...b, date: e.target.value, start: undefined })} /></Field>
        <Field label="Time" id="bd-time" error={err.time}>
          <select id="bd-time" value={b.start ?? ''} onChange={(e) => setB({ ...b, start: Number(e.target.value) })} aria-invalid={!!err.time}>
            <option value="" disabled>{times.length ? 'Choose a time' : 'No free times'}</option>{times.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
          </select>
        </Field>
        {isNew ? (
          <Field label="Booked by" id="bd-src"><select id="bd-src" value={b.source} onChange={(e) => setB({ ...b, source: e.target.value as Source })}><option value="phone">Phone</option><option value="walk-in">Walk-in</option></select></Field>
        ) : (
          <Field label="Status" id="bd-status"><select id="bd-status" value={b.status} onChange={(e) => setB({ ...b, status: e.target.value as Status })}>{(Object.keys(STATUS) as Status[]).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}</select></Field>
        )}
        <Field label="Note for the team" id="bd-note" wide><textarea id="bd-note" rows={2} value={b.note ?? ''} onChange={(e) => setB({ ...b, note: e.target.value })} /></Field>
        {!isNew && draft.deposit && <p className="fld--wide note"><Icon n="wallet" size={16} /> Deposit of {money(draft.deposit, s.business.currency)} taken when booking.</p>}
      </div>
    </Drawer>
  );
}
