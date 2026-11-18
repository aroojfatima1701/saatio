import { useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../lib/store';
import { fmtTime, type Business } from '../lib/data';
import { Field, Icon, Toggle, WhatsApp, useToast } from '../components/ui';
import { PageHead } from './common';

const hours = Array.from({ length: 37 }, (_, i) => 300 + i * 30);

export default function Settings() {
  const { s, set, reset } = useStore(); const toast = useToast();
  const [b, setB] = useState<Business>(s.business);
  const [confirm, setConfirm] = useState(false);
  const dirty = JSON.stringify(b) !== JSON.stringify(s.business);
  const save = () => {
    if (b.name.trim().length < 2) { toast('Add your business name'); return; }
    if (b.close <= b.open) { toast('Closing time must be after opening time'); return; }
    set((x) => ({ ...x, business: { ...b, name: b.name.trim(), offers: (b.offers ?? []).map((o) => o.trim()).filter(Boolean) } })); toast('Settings saved');
  };
  const preview = b.reminders.template.replace('{name}', 'Aisha').replace('{service}', 'Haircut and styling').replace('{day}', 'tomorrow').replace('{time}', '10:00 AM');
  return (
    <>
      <PageHead title="Settings" sub="Changes apply to your booking page straight away." />
      <div className="set">
        <section className="card">
          <header className="card__h"><h2>Business</h2></header>
          <div className="form">
            <Field label="Business name" id="se-name" wide><input id="se-name" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
            <Field label="Area" id="se-area"><input id="se-area" value={b.area} onChange={(e) => setB({ ...b, area: e.target.value })} /></Field>
            <Field label="Phone" id="se-phone"><input id="se-phone" type="tel" value={b.phone} onChange={(e) => setB({ ...b, phone: e.target.value })} /></Field>
            <Field label="Opens" id="se-open"><select id="se-open" value={b.open} onChange={(e) => setB({ ...b, open: Number(e.target.value) })}>{hours.map((h) => <option key={h} value={h}>{fmtTime(h)}</option>)}</select></Field>
            <Field label="Closes" id="se-close"><select id="se-close" value={b.close} onChange={(e) => setB({ ...b, close: Number(e.target.value) })}>{hours.map((h) => <option key={h} value={h}>{fmtTime(h)}</option>)}</select></Field>
            <Field label="Booking page link" id="se-slug" hint="Share this on Instagram, Google and WhatsApp." wide><div className="pre"><span>saatio.com/</span><input id="se-slug" value={b.slug} onChange={(e) => setB({ ...b, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></div></Field>
          </div>
        </section>
        <section className="card">
          <header className="card__h"><h2>Reminders</h2></header>
          <div className="stackf">
            <Toggle id="se-w24" checked={b.reminders.whatsapp24} onChange={(v) => setB({ ...b, reminders: { ...b.reminders, whatsapp24: v } })} label="WhatsApp, 24 hours before" sub="Clients can reply 1 to confirm or 2 to reschedule." />
            <Toggle id="se-w2" checked={b.reminders.whatsapp2} onChange={(v) => setB({ ...b, reminders: { ...b.reminders, whatsapp2: v } })} label="WhatsApp, 2 hours before" />
            <Toggle id="se-em" checked={b.reminders.email} onChange={(v) => setB({ ...b, reminders: { ...b.reminders, email: v } })} label="Email confirmation and reminder" />
            <Field label="Reminder message" id="se-tpl" hint="Use {name}, {service}, {day} and {time}."><textarea id="se-tpl" rows={3} value={b.reminders.template} onChange={(e) => setB({ ...b, reminders: { ...b.reminders, template: e.target.value } })} /></Field>
            <div className="wa-prev"><span><WhatsApp size={16} /> Preview</span><p>{preview}</p></div>
          </div>
        </section>
        <section className="card">
          <header className="card__h"><h2>Offers</h2></header>
          <div className="stackf">
            <Field label="Current offers, one per line" id="se-offers" hint="The AI receptionist quotes these when clients ask about discounts or offers."><textarea id="se-offers" rows={4} value={(b.offers ?? []).join('\n')} onChange={(e) => setB({ ...b, offers: e.target.value.split('\n') })} placeholder="15% off your first visit" /></Field>
          </div>
        </section>
        <section className="card">
          <header className="card__h"><h2>Deposits</h2></header>
          <div className="stackf">
            <Toggle id="se-dep" checked={b.deposits.enabled} onChange={(v) => setB({ ...b, deposits: { ...b.deposits, enabled: v } })} label="Take deposits on online bookings" />
            <Toggle id="se-risky" checked={b.deposits.onlyRisky} onChange={(v) => setB({ ...b, deposits: { ...b.deposits, onlyRisky: v } })} label="Only from clients who often miss" sub="Everyone else books without paying anything upfront." />
            <Field label="Deposit amount" id="se-pct"><select id="se-pct" value={b.deposits.percent} onChange={(e) => setB({ ...b, deposits: { ...b.deposits, percent: Number(e.target.value) } })}>{[10, 15, 20, 25, 30, 40, 50].map((p) => <option key={p} value={p}>{p}% of the service price</option>)}</select></Field>
          </div>
        </section>
        <section className="card">
          <header className="card__h"><h2>Plan</h2></header>
          <div className="plan-mini"><span className="chip">Pro</span><p><b>AED 549 a month</b>, renews on the 1st. Includes the AI receptionist, no-show protection and unlimited team members.</p><Link to="pricing" className="lnk">Compare plans</Link></div>
          <div className="danger">
            <div><b>Reset demo data</b><small>Puts back the sample bookings, clients and settings.</small></div>
            {confirm ? <span className="danger__ask"><button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirm(false)}>Keep</button><button type="button" className="btn btn--sm btn--dark" onClick={() => { reset(); setConfirm(false); toast('Demo data reset'); window.setTimeout(() => window.location.reload(), 300); }}>Reset</button></span>
              : <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirm(true)}>Reset</button>}
          </div>
        </section>
      </div>
      <div className={`savebar ${dirty ? 'is-on' : ''}`} aria-hidden={!dirty}><span><Icon n="settings" size={16} /> Unsaved changes</span><button type="button" className="btn btn--sm btn--ghost" tabIndex={dirty ? 0 : -1} onClick={() => setB(s.business)}>Discard</button><button type="button" className="btn btn--sm btn--primary" tabIndex={dirty ? 0 : -1} onClick={save}>Save</button></div>
    </>
  );
}
