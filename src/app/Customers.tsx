import { useMemo, useState } from 'react';
import { customerStats, useStore } from '../lib/store';
import { fmtDate, fmtTime, money } from '../lib/data';
import { Drawer, Field, Icon, useToast } from '../components/ui';
import { PageHead, StatusChip, initials } from './common';

export default function Customers({ onBook }: { onBook: (customerId: string) => void }) {
  const { s, set } = useStore(); const toast = useToast(); const cur = s.business.currency;
  const [q, setQ] = useState(''); const [sort, setSort] = useState<'spent' | 'recent' | 'name'>('spent');
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => s.customers.map((c) => ({ c, st: customerStats(s, c.id) }))
    .filter(({ c }) => `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'spent' ? b.st.spent - a.st.spent : sort === 'name' ? a.c.name.localeCompare(b.c.name) : (b.st.last ?? '').localeCompare(a.st.last ?? '')), [s, q, sort]);
  const sel = s.customers.find((c) => c.id === open);
  const [note, setNote] = useState('');
  const openC = (id: string) => { setOpen(id); setNote(s.customers.find((c) => c.id === id)?.notes ?? ''); };
  return (
    <>
      <PageHead title="Clients" sub={`${s.customers.length} clients · ${rows.filter((r) => r.st.risky).length} often miss appointments`} />
      <div className="tools">
        <label className="search"><Icon n="search" size={17} /><span className="sr-only">Search clients</span><input type="search" placeholder="Name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="sel"><span className="sr-only">Sort</span><select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="spent">Top spenders</option><option value="recent">Most recent visit</option><option value="name">Name A to Z</option></select></label>
      </div>
      <div className="tbl">
        <table>
          <thead><tr><th>Client</th><th>Phone</th><th className="num">Visits</th><th className="num">Spent</th><th>Last visit</th><th>Notes</th></tr></thead>
          <tbody>{rows.map(({ c, st }) => (
            <tr key={c.id} tabIndex={0} onClick={() => openC(c.id)} onKeyDown={(e) => { if (e.key === 'Enter') openC(c.id); }}>
              <td><span className="who"><span className="av av--sm" style={{ background: 'var(--violet)' }}>{initials(c.name)}</span><span><b>{c.name}</b>{c.tags?.includes('VIP') && <span className="chip chip--coral">VIP</span>}</span></span></td>
              <td className="nowrap">{c.phone}</td><td className="num">{st.visits}</td><td className="num">{money(st.spent, cur)}</td>
              <td>{st.last ? fmtDate(st.last) : '—'}</td>
              <td>{st.risky ? <span className="chip chip--red">Missed {st.noShows}×</span> : st.upcoming ? <span className="chip">{st.upcoming} upcoming</span> : null}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {sel && (() => {
        const st = customerStats(s, sel.id); const hist = s.bookings.filter((b) => b.customerId === sel.id).sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start);
        return (
          <Drawer title={sel.name} sub={`Client since ${fmtDate(sel.since, { month: 'long', year: 'numeric' })}`} onClose={() => setOpen(null)}
            footer={<><button type="button" className="btn btn--ghost" onClick={() => { set((x) => ({ ...x, customers: x.customers.map((c) => (c.id === sel.id ? { ...c, notes: note } : c)) })); toast('Note saved'); }}>Save note</button><span className="sp" /><button type="button" className="btn btn--primary" onClick={() => { setOpen(null); onBook(sel.id); }}>Book for {sel.name.split(' ')[0]}</button></>}>
            <div className="cst">
              <div className="cst__stats"><div><b>{st.visits}</b><small>visits</small></div><div><b>{money(st.spent, cur)}</b><small>spent</small></div><div><b>{st.noShows}</b><small>no-shows</small></div></div>
              <p className="cst__contact"><Icon n="phone" size={16} /> {sel.phone}<br /><Icon n="chat" size={16} /> {sel.email}</p>
              {st.risky && <p className="note note--red"><Icon n="shield" size={16} /> {sel.name.split(' ')[0]} has missed {st.noShows} appointments. No-show protection asks for a {s.business.deposits.percent}% deposit on online bookings.</p>}
              <Field label="Notes for the team" id="cst-note"><textarea id="cst-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Preferences, allergies, favourite team member…" /></Field>
              <h3>History</h3>
              <ul className="hist">{hist.slice(0, 12).map((b) => (
                <li key={b.id}><span><b>{s.services.find((x) => x.id === b.serviceId)?.name}</b><small>{fmtDate(b.date)} · {fmtTime(b.start)} · {s.staff.find((x) => x.id === b.staffId)?.name.split(' ')[0]}</small></span><StatusChip s={b.status} /></li>
              ))}</ul>
            </div>
          </Drawer>
        );
      })()}
    </>
  );
}
