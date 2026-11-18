import { useState } from 'react';
import { useStore } from '../lib/store';
import { fmtDur, money, uid, type Service, type Staff } from '../lib/data';
import { Drawer, Field, Icon, Toggle, useToast } from '../components/ui';
import { PageHead, initials } from './common';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#6C4CF5', '#FF7A59', '#2ED3A0', '#3BA1F5', '#E64C9A', '#F2B233'];
const hours = Array.from({ length: 33 }, (_, i) => 360 + i * 30);
const hm = (m: number) => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${m >= 720 ? 'PM' : 'AM'}`;

function ServiceEditor({ sv, onClose }: { sv: Service; onClose: () => void }) {
  const { s, set } = useStore(); const toast = useToast(); const isNew = !s.services.some((x) => x.id === sv.id);
  const [v, setV] = useState(sv); const [err, setErr] = useState<Record<string, string>>({});
  const save = () => {
    const e: Record<string, string> = {};
    if (v.name.trim().length < 2) e.name = 'Add a service name.';
    if (!(v.price > 0)) e.price = 'Enter a price above zero.';
    if (!v.staff.length) e.staff = 'Choose at least one team member.';
    setErr(e); if (Object.keys(e).length) return;
    set((x) => ({ ...x, services: isNew ? [...x.services, { ...v, name: v.name.trim() }] : x.services.map((o) => (o.id === v.id ? { ...v, name: v.name.trim() } : o)) }));
    toast(`${v.name.trim()} saved. Your booking page is updated.`); onClose();
  };
  return (
    <Drawer title={isNew ? 'New service' : `Edit ${sv.name}`} onClose={onClose} footer={<><span className="sp" /><button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn--primary" onClick={save}>Save</button></>}>
      <div className="form">
        <Field label="Name" id="sv-name" error={err.name} wide><input id="sv-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Category" id="sv-cat"><input id="sv-cat" list="sv-cats" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} /><datalist id="sv-cats">{[...new Set(s.services.map((x) => x.category))].map((c) => <option key={c} value={c} />)}</datalist></Field>
        <Field label="Duration" id="sv-min"><select id="sv-min" value={v.minutes} onChange={(e) => setV({ ...v, minutes: Number(e.target.value) })}>{[15, 30, 45, 60, 75, 90, 120, 150, 180].map((m) => <option key={m} value={m}>{fmtDur(m)}</option>)}</select></Field>
        <Field label={`Price (${s.business.currency})`} id="sv-price" error={err.price}><input id="sv-price" type="number" inputMode="decimal" value={v.price || ''} onChange={(e) => setV({ ...v, price: Number(e.target.value) })} /></Field>
        <div className="fld fld--wide"><span className="lbl">Who can do it</span>
          <div className="chips">{s.staff.map((st) => <button key={st.id} type="button" className={`pick ${v.staff.includes(st.id) ? 'is-on' : ''}`} aria-pressed={v.staff.includes(st.id)} onClick={() => setV({ ...v, staff: v.staff.includes(st.id) ? v.staff.filter((x) => x !== st.id) : [...v.staff, st.id] })}><span className="dot" style={{ background: st.color }} />{st.name.split(' ')[0]}</button>)}</div>
          {err.staff && <em className="err">{err.staff}</em>}
        </div>
        <div className="fld--wide"><Toggle id="sv-on" checked={v.active} onChange={(on) => setV({ ...v, active: on })} label="Bookable online" sub="Hidden services can still be booked by your team." /></div>
      </div>
    </Drawer>
  );
}

function StaffEditor({ st, onClose }: { st: Staff; onClose: () => void }) {
  const { s, set } = useStore(); const toast = useToast(); const isNew = !s.staff.some((x) => x.id === st.id);
  const [v, setV] = useState(st); const [err, setErr] = useState('');
  const save = () => {
    if (v.name.trim().length < 2) { setErr('Add a name.'); return; }
    if (v.end <= v.start) { setErr('Finish time must be after start time.'); return; }
    set((x) => ({ ...x, staff: isNew ? [...x.staff, { ...v, name: v.name.trim() }] : x.staff.map((o) => (o.id === v.id ? { ...v, name: v.name.trim() } : o)) }));
    toast(`${v.name.trim()} saved`); onClose();
  };
  return (
    <Drawer title={isNew ? 'Add a team member' : `Edit ${st.name}`} onClose={onClose} footer={<><span className="sp" /><button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn--primary" onClick={save}>Save</button></>}>
      <div className="form">
        <Field label="Name" id="st-name" error={err} wide><input id="st-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Role" id="st-role" wide><input id="st-role" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} /></Field>
        <div className="fld fld--wide"><span className="lbl">Working days</span><div className="chips">{DAYS.map((d, i) => <button key={d} type="button" className={`pick ${v.days.includes(i) ? 'is-on' : ''}`} aria-pressed={v.days.includes(i)} onClick={() => setV({ ...v, days: v.days.includes(i) ? v.days.filter((x) => x !== i) : [...v.days, i].sort() })}>{d}</button>)}</div></div>
        <Field label="Starts" id="st-start"><select id="st-start" value={v.start} onChange={(e) => setV({ ...v, start: Number(e.target.value) })}>{hours.map((h) => <option key={h} value={h}>{hm(h)}</option>)}</select></Field>
        <Field label="Finishes" id="st-end"><select id="st-end" value={v.end} onChange={(e) => setV({ ...v, end: Number(e.target.value) })}>{hours.map((h) => <option key={h} value={h}>{hm(h)}</option>)}</select></Field>
        <div className="fld fld--wide"><span className="lbl">Calendar colour</span><div className="chips">{COLORS.map((c) => <button key={c} type="button" className={`swatch ${v.color === c ? 'is-on' : ''}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={v.color === c} onClick={() => setV({ ...v, color: c })} />)}</div></div>
      </div>
    </Drawer>
  );
}

export default function Services() {
  const { s, set } = useStore(); const toast = useToast(); const cur = s.business.currency;
  const [sv, setSv] = useState<Service | null>(null); const [st, setSt] = useState<Staff | null>(null);
  const cats = [...new Set(s.services.map((x) => x.category))];
  return (
    <>
      <PageHead title="Services and team" sub="What clients can book, and who does it.">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSt({ id: uid(), name: '', role: '', color: COLORS[s.staff.length % COLORS.length], days: [1, 2, 3, 4, 6], start: 600, end: 1260 })}><Icon n="plus" size={16} /> Team member</button>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setSv({ id: uid(), name: '', category: cats[0], minutes: 60, price: 0, staff: [], active: true })}><Icon n="plus" size={16} /> Service</button>
      </PageHead>
      <div className="svc">
        <div className="svc__list">{cats.map((c) => (
          <section key={c} className="card">
            <header className="card__h"><h2>{c}</h2><span className="muted">{s.services.filter((x) => x.category === c).length} services</span></header>
            <ul className="rows">{s.services.filter((x) => x.category === c).map((x) => (
              <li key={x.id} className={x.active ? '' : 'is-off'}>
                <button type="button" className="rows__main" onClick={() => setSv(x)}><b>{x.name}</b><small>{fmtDur(x.minutes)} · {x.staff.map((id) => s.staff.find((y) => y.id === id)?.name.split(' ')[0]).join(', ')}</small></button>
                <span className="rows__price">{money(x.price, cur)}</span>
                <label className="mini"><input type="checkbox" role="switch" checked={x.active} onChange={(e) => { set((y) => ({ ...y, services: y.services.map((o) => (o.id === x.id ? { ...o, active: e.target.checked } : o)) })); toast(e.target.checked ? `${x.name} is bookable online` : `${x.name} hidden from your booking page`); }} /><span className="sr-only">Bookable online</span><span className="mini__t" aria-hidden="true" /></label>
              </li>
            ))}</ul>
          </section>
        ))}</div>
        <section className="card svc__team">
          <header className="card__h"><h2>Team</h2></header>
          <ul className="staff">{s.staff.map((x) => (
            <li key={x.id}><button type="button" onClick={() => setSt(x)}>
              <span className="av" style={{ background: x.color }}>{initials(x.name)}</span>
              <span><b>{x.name}</b><small>{x.role}</small><span className="days">{DAYS.map((d, i) => <i key={d} className={x.days.includes(i) ? 'on' : ''}>{d[0]}</i>)}</span></span>
              <Icon n="arrow" size={16} />
            </button></li>
          ))}</ul>
        </section>
      </div>
      {sv && <ServiceEditor sv={sv} onClose={() => setSv(null)} />}
      {st && <StaffEditor st={st} onClose={() => setSt(null)} />}
    </>
  );
}
