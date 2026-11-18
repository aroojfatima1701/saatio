import { useMemo, useState } from 'react';
import { customerStats, useStore } from '../lib/store';
import { addDays, fmtDate, fmtTime, money, type Source, type Status } from '../lib/data';
import { Icon } from '../components/ui';
import { PageHead, SOURCE, STATUS, StatusChip, useNow, type Draft } from './common';

const RANGES = [{ v: 'upcoming', label: 'Upcoming' }, { v: 'today', label: 'Today' }, { v: 'past', label: 'Last 30 days' }] as const;

export default function Bookings({ onOpen }: { onOpen: (d: Draft) => void }) {
  const { s } = useStore(); const { today } = useNow(); const cur = s.business.currency;
  const [range, setRange] = useState<'upcoming' | 'today' | 'past'>('upcoming');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [source, setSource] = useState<Source | 'all'>('all');
  const [q, setQ] = useState('');
  const list = useMemo(() => s.bookings.filter((b) => {
    if (range === 'upcoming' && b.date < today) return false;
    if (range === 'today' && b.date !== today) return false;
    if (range === 'past' && (b.date >= today || b.date < addDays(today, -30))) return false;
    if (status !== 'all' && b.status !== status) return false;
    if (source !== 'all' && b.source !== source) return false;
    if (q) { const c = s.customers.find((x) => x.id === b.customerId); if (!`${c?.name} ${c?.phone} ${b.ref}`.toLowerCase().includes(q.toLowerCase())) return false; }
    return true;
  }).sort((a, b) => (range === 'past' ? -1 : 1) * (a.date.localeCompare(b.date) || a.start - b.start)), [s, range, status, source, q, today]);
  const shown = list.slice(0, 80);
  return (
    <>
      <PageHead title="Bookings" sub={`${list.length} booking${list.length === 1 ? '' : 's'} · ${money(list.filter((b) => b.status !== 'cancelled' && b.status !== 'no-show').reduce((a, b) => a + b.price, 0), cur)}`} />
      <div className="tools">
        <div className="seg" role="radiogroup" aria-label="When">{RANGES.map((r) => <button key={r.v} type="button" role="radio" aria-checked={range === r.v} onClick={() => setRange(r.v)}>{r.label}</button>)}</div>
        <label className="sel"><span className="sr-only">Status</span><select value={status} onChange={(e) => setStatus(e.target.value as Status | 'all')}><option value="all">All statuses</option>{(Object.keys(STATUS) as Status[]).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}</select></label>
        <label className="sel"><span className="sr-only">Booked by</span><select value={source} onChange={(e) => setSource(e.target.value as Source | 'all')}><option value="all">All channels</option>{(Object.keys(SOURCE) as Source[]).map((k) => <option key={k} value={k}>{SOURCE[k]}</option>)}</select></label>
        <label className="search"><Icon n="search" size={17} /><span className="sr-only">Search</span><input type="search" placeholder="Client, phone or reference" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      <div className="tbl">
        <table>
          <thead><tr><th>When</th><th>Client</th><th>Service</th><th>With</th><th>Channel</th><th className="num">Price</th><th>Status</th></tr></thead>
          <tbody>{shown.map((b) => {
            const c = s.customers.find((x) => x.id === b.customerId); const sv = s.services.find((x) => x.id === b.serviceId); const st = s.staff.find((x) => x.id === b.staffId);
            return (
              <tr key={b.id} tabIndex={0} onClick={() => onOpen(b)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(b); }}>
                <td className="nowrap"><b>{b.date === today ? 'Today' : fmtDate(b.date)}</b><small>{fmtTime(b.start)}</small></td>
                <td><b>{c?.name}</b><small>{b.ref}{c && customerStats(s, c.id).risky ? ' · often misses' : ''}</small></td>
                <td>{sv?.name}</td>
                <td><span className="who"><span className="dot" style={{ background: st?.color }} />{st?.name.split(' ')[0]}</span></td>
                <td>{b.source === 'whatsapp' ? <span className="chip chip--mint"><Icon n="sparkle" size={13} /> WhatsApp AI</span> : SOURCE[b.source]}</td>
                <td className="num">{money(b.price, cur)}{b.deposit ? <small>{money(b.deposit, cur)} deposit</small> : null}</td>
                <td><StatusChip s={b.status} /></td>
              </tr>
            );
          })}</tbody>
        </table>
        {!list.length && <p className="empty">No bookings match these filters.</p>}
        {list.length > 80 && <p className="empty">Showing the first 80. Narrow the filters to see more.</p>}
      </div>
    </>
  );
}
