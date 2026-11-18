import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, fmtDate, money, weekday, type Source } from '../lib/data';
import { Kpi, PageHead, SOURCE, initials, useNow } from './common';

const SRC_COL: Record<Source, string> = { online: '#6C4CF5', whatsapp: '#2ED3A0', 'walk-in': '#FF7A59', phone: '#8A8FA8' };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Reports() {
  const { s } = useStore(); const { today } = useNow(); const cur = s.business.currency;
  const [span, setSpan] = useState(30);
  const from = addDays(today, -span);
  const inRange = useMemo(() => s.bookings.filter((b) => b.date >= from && b.date < today), [s, from, today]);
  const done = inRange.filter((b) => b.status === 'completed');
  const revenue = done.reduce((a, b) => a + b.price, 0);
  const days = Array.from({ length: span }, (_, i) => addDays(from, i));
  const perDay = days.map((d) => done.filter((b) => b.date === d).reduce((a, b) => a + b.price, 0));
  const maxD = Math.max(...perDay, 1);
  const [hover, setHover] = useState<number | null>(null);
  const svc = s.services.map((x) => ({ x, n: done.filter((b) => b.serviceId === x.id).length, v: done.filter((b) => b.serviceId === x.id).reduce((a, b) => a + b.price, 0) })).sort((a, b) => b.v - a.v).slice(0, 6);
  const maxS = Math.max(...svc.map((x) => x.v), 1);
  const srcs = (Object.keys(SOURCE) as Source[]).map((k) => ({ k, n: inRange.filter((b) => b.source === k && b.status !== 'cancelled').length }));
  const totalSrc = Math.max(1, srcs.reduce((a, b) => a + b.n, 0));
  const util = s.staff.map((st) => {
    const workDays = days.filter((d) => st.days.includes(weekday(d))).length;
    const avail = workDays * (st.end - st.start);
    const used = inRange.filter((b) => b.staffId === st.id && (b.status === 'completed' || b.status === 'no-show')).reduce((a, b) => a + (s.services.find((x) => x.id === b.serviceId)?.minutes ?? 0), 0);
    return { st, pct: avail ? Math.round((used / avail) * 100) : 0, rev: done.filter((b) => b.staffId === st.id).reduce((a, b) => a + b.price, 0) };
  });
  // Busiest hours: bookings starting in each hour, by weekday.
  const hrs = Array.from({ length: (s.business.close - s.business.open) / 60 }, (_, i) => s.business.open / 60 + i);
  const heat = DAYS.map((_, wd) => hrs.map((h) => inRange.filter((b) => b.status !== 'cancelled' && weekday(b.date) === wd && Math.floor(b.start / 60) === h).length));
  const maxH = Math.max(...heat.flat(), 1);
  const noShows = inRange.filter((b) => b.status === 'no-show');
  return (
    <>
      <PageHead title="Reports" sub={`${fmtDate(from)} to ${fmtDate(addDays(today, -1))}`}>
        <div className="seg" role="radiogroup" aria-label="Period">{[7, 30, 45].map((n) => <button key={n} type="button" role="radio" aria-checked={span === n} onClick={() => setSpan(n)}>{n} days</button>)}</div>
      </PageHead>
      <div className="kpis">
        <Kpi label="Revenue" value={money(revenue, cur)} sub={`${done.length} completed appointments`} />
        <Kpi label="Average ticket" value={money(Math.round(revenue / Math.max(1, done.length)), cur)} />
        <Kpi label="Lost to no-shows" value={money(noShows.reduce((a, b) => a + b.price, 0), cur)} sub={`${noShows.length} missed appointments`} tone="warn" />
        <Kpi label="Booked online or by AI" value={`${Math.round(((srcs[0].n + srcs[1].n) / totalSrc) * 100)}%`} sub="no phone call needed" tone="up" />
      </div>
      <section className="card">
        <header className="card__h"><h2>Revenue per day</h2><span className="muted">{cur}</span></header>
        <div className="bars bars--tall" role="img" aria-label="Revenue per day">
          {perDay.map((v, i) => (
            <button key={i} type="button" className="bars__col" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`${fmtDate(days[i])}: ${money(v, cur)}`}>
              <span className="bars__b" style={{ height: `${(v / maxD) * 100}%` }} />
            </button>
          ))}
          {hover != null && <div className="tip" style={{ left: `${((hover + 0.5) / span) * 100}%` }}><b>{money(perDay[hover], cur)}</b><small>{fmtDate(days[hover])}</small></div>}
        </div>
        <div className="bars__x"><span>{fmtDate(days[0], { day: 'numeric', month: 'short' })}</span><span>{fmtDate(days[days.length - 1], { day: 'numeric', month: 'short' })}</span></div>
      </section>
      <div className="grid2">
        <section className="card">
          <header className="card__h"><h2>Top services</h2><span className="muted">by revenue</span></header>
          <ul className="hbars">{svc.map(({ x, n, v }) => <li key={x.id}><span className="hbars__l"><b>{x.name}</b><small>{n} appointments</small></span><span className="hbars__track"><span style={{ width: `${(v / maxS) * 100}%` }} /></span><b className="hbars__v">{money(v, cur)}</b></li>)}</ul>
        </section>
        <section className="card">
          <header className="card__h"><h2>How clients book</h2></header>
          <div className="stack" role="img" aria-label={srcs.map((x) => `${SOURCE[x.k]} ${Math.round((x.n / totalSrc) * 100)}%`).join(', ')}>{srcs.map((x) => <span key={x.k} style={{ width: `${(x.n / totalSrc) * 100}%`, background: SRC_COL[x.k] }} />)}</div>
          <ul className="lgd">{srcs.map((x) => <li key={x.k}><span className="dot" style={{ background: SRC_COL[x.k] }} />{SOURCE[x.k]}<b>{Math.round((x.n / totalSrc) * 100)}%</b><small>{x.n}</small></li>)}</ul>
          <h3 className="card__sub">Team, time booked</h3>
          <ul className="team">{util.map(({ st, pct, rev }) => <li key={st.id}><span className="av" style={{ background: st.color }}>{initials(st.name)}</span><div><b>{st.name.split(' ')[0]}</b><small>{money(rev, cur)}</small></div><span className="meter"><span style={{ width: `${pct}%`, background: st.color }} /></span><b className="pct">{pct}%</b></li>)}</ul>
        </section>
      </div>
      <section className="card">
        <header className="card__h"><h2>Busiest hours</h2><span className="muted">bookings starting each hour</span></header>
        <div className="heat__scroll">
          <table className="heat"><thead><tr><th><span className="sr-only">Day</span></th>{hrs.map((h) => <th key={h} scope="col">{((h + 11) % 12) + 1}{h < 12 ? 'a' : 'p'}</th>)}</tr></thead>
            <tbody>{DAYS.map((d, wd) => <tr key={d}><th scope="row">{d}</th>{heat[wd].map((n, i) => <td key={i} title={`${d} ${hrs[i]}:00 · ${n} bookings`}><span style={{ opacity: n ? 0.12 + (n / maxH) * 0.88 : 0.04 }} /><span className="sr-only">{n}</span></td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
