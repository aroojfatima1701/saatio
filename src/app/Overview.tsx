import { useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { customerStats, findGaps, useStore } from '../lib/store';
import { addDays, fmtDate, fmtTime, money } from '../lib/data';
import { Icon, useToast } from '../components/ui';
import { Kpi, PageHead, SOURCE, StatusChip, initials, useNow, type Draft } from './common';

export default function Overview({ onOpen }: { onOpen: (d: Draft) => void }) {
  const { s, set } = useStore(); const toast = useToast(); const { today, min } = useNow(); const cur = s.business.currency;
  const svc = (id: string) => s.services.find((x) => x.id === id)!;
  const live = s.bookings.filter((b) => b.status !== 'cancelled');
  const todays = live.filter((b) => b.date === today).sort((a, b) => a.start - b.start);
  const last30 = s.bookings.filter((b) => b.date >= addDays(today, -30) && b.date < today);
  const prev30 = s.bookings.filter((b) => b.date >= addDays(today, -60) && b.date < addDays(today, -30));
  const rev = (l: typeof s.bookings) => l.filter((b) => b.status === 'completed').reduce((a, b) => a + b.price, 0);
  const noShow = last30.length ? last30.filter((b) => b.status === 'no-show').length / last30.filter((b) => b.status !== 'cancelled').length : 0;
  const r30 = rev(last30), rp = rev(prev30); const ch = rp ? Math.round(((r30 - rp) / rp) * 100) : 0;
  const online = last30.filter((b) => b.source === 'online' || b.source === 'whatsapp').length / Math.max(1, last30.length);
  const gaps = useMemo(() => findGaps(s, today, 3, min), [s, today, min]);
  const risky = live.filter((b) => b.date >= today && b.status === 'confirmed' && customerStats(s, b.customerId).risky && !b.deposit);
  const [hover, setHover] = useState<number | null>(null);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const perDay = days.map((d) => ({ d, n: s.bookings.filter((b) => b.date === d && b.status !== 'cancelled').length, v: s.bookings.filter((b) => b.date === d && (b.status === 'completed' || (d === today && b.status === 'confirmed'))).reduce((a, b) => a + b.price, 0) }));
  const maxV = Math.max(...perDay.map((p) => p.v), 1);
  const mark = (id: string, status: 'completed' | 'no-show') => { set((x) => ({ ...x, bookings: x.bookings.map((b) => (b.id === id ? { ...b, status } : b)) })); toast(status === 'completed' ? 'Marked as completed' : 'Marked as no-show'); };
  const nextUp = todays.find((b) => b.start + svc(b.serviceId).minutes > min && b.status === 'confirmed');

  return (
    <>
      <PageHead title={`${min < 720 ? 'Good morning' : min < 1020 ? 'Good afternoon' : 'Good evening'}, Rania`} sub={`${fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })} · ${s.business.name}, ${s.business.area}`}>
        <Link to="app-calendar" className="btn btn--ghost btn--sm"><Icon n="calendar" size={17} /> Open calendar</Link>
      </PageHead>
      <div className="kpis">
        <Kpi label="Bookings today" value={String(todays.length)} sub={`${money(todays.reduce((a, b) => a + b.price, 0), cur)} expected`} />
        <Kpi label="Revenue, last 30 days" value={money(r30, cur)} sub={`${ch >= 0 ? '+' : ''}${ch}% on the 30 days before`} tone={ch >= 0 ? 'up' : 'down'} />
        <Kpi label="Booked online or by AI" value={`${Math.round(online * 100)}%`} sub="of bookings in the last 30 days" />
        <Kpi label="No-show rate" value={`${(noShow * 100).toFixed(1)}%`} sub="last 30 days" tone={noShow > 0.05 ? 'warn' : 'up'} />
      </div>

      <div className="ov">
        <section className="card ov__today">
          <header className="card__h"><h2>Today</h2>{nextUp && <span className="chip chip--coral">{nextUp.start <= min ? 'Now' : 'Next'}: {fmtTime(nextUp.start)} · {s.customers.find((c) => c.id === nextUp.customerId)?.name.split(' ')[0]}</span>}</header>
          {todays.length === 0 ? <p className="empty">No bookings today.</p> : (
            <ul className="tl">{todays.map((b) => {
              const c = s.customers.find((x) => x.id === b.customerId); const st = s.staff.find((x) => x.id === b.staffId)!; const past = b.start + svc(b.serviceId).minutes <= min;
              return (
                <li key={b.id} className={`tl__i ${past ? 'is-past' : ''}`}>
                  <span className="tl__t">{fmtTime(b.start)}</span>
                  <span className="tl__bar" style={{ background: st.color }} />
                  <button type="button" className="tl__body" onClick={() => onOpen(b)}><b>{c?.name}</b><small>{svc(b.serviceId).name} · {st.name.split(' ')[0]} · {SOURCE[b.source]}</small></button>
                  {b.status === 'confirmed' && past ? (
                    <span className="tl__act"><button type="button" className="btn btn--sm btn--ghost" onClick={() => mark(b.id, 'completed')}>Done</button><button type="button" className="btn btn--sm btn--ghost tl__ns" onClick={() => mark(b.id, 'no-show')}>No-show</button></span>
                  ) : <StatusChip s={b.status} />}
                </li>
              );
            })}</ul>
          )}
        </section>

        <div className="ov__side">
          <section className="card card--ai">
            <header className="card__h"><h2><Icon n="sparkle" size={18} /> AI insights</h2><Link to="app-ai" className="lnk">Open assistant</Link></header>
            {gaps.slice(0, 2).map((g, i) => (
              <div key={i} className="ins"><span className="ins__ic"><Icon n="zap" size={16} /></span><div><b>{fmtDate(g.date, { weekday: 'long' })}, {fmtTime(g.start)} to {fmtTime(g.end)} is free</b><small>with {s.staff.find((x) => x.id === g.staffId)?.name.split(' ')[0]}. Send an offer to clients who are due a visit.</small></div></div>
            ))}
            <div className="ins"><span className="ins__ic ins__ic--coral"><Icon n="shield" size={16} /></span><div><b>{risky.length} upcoming booking{risky.length === 1 ? '' : 's'} from clients who often miss</b><small>{s.business.ai.noShowGuard ? 'No-show protection asks them for a deposit from now on.' : 'Turn on no-show protection to ask them for a deposit.'}</small></div></div>
          </section>
          <section className="card">
            <header className="card__h"><h2>Revenue, last 14 days</h2></header>
            <div className="bars" role="img" aria-label="Revenue per day for the last 14 days">
              {perDay.map((p, i) => (
                <button key={p.d} type="button" className="bars__col" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`${fmtDate(p.d)}: ${money(p.v, cur)}, ${p.n} bookings`}>
                  <span className="bars__b" style={{ height: `${(p.v / maxV) * 100}%` }} data-today={p.d === today || undefined} />
                </button>
              ))}
              {hover != null && <div className="tip" style={{ left: `${((hover + 0.5) / 14) * 100}%` }}><b>{money(perDay[hover].v, cur)}</b><small>{fmtDate(perDay[hover].d)} · {perDay[hover].n} bookings</small></div>}
            </div>
            <div className="bars__x"><span>{fmtDate(days[0], { day: 'numeric', month: 'short' })}</span><span>Today</span></div>
          </section>
          <section className="card">
            <header className="card__h"><h2>Team today</h2></header>
            <ul className="team">{s.staff.map((st) => {
              const mine = todays.filter((b) => b.staffId === st.id); const used = mine.reduce((a, b) => a + svc(b.serviceId).minutes, 0);
              const works = st.days.includes(new Date(`${today}T12:00:00Z`).getUTCDay()); const pct = works ? Math.min(100, Math.round(used / (st.end - st.start) * 100)) : 0;
              return <li key={st.id}><span className="av" style={{ background: st.color }}>{initials(st.name)}</span><div><b>{st.name.split(' ')[0]}</b><small>{works ? `${mine.length} bookings · ${pct}% booked` : 'Day off'}</small></div><span className="meter"><span style={{ width: `${pct}%`, background: st.color }} /></span></li>;
            })}</ul>
          </section>
        </div>
      </div>
    </>
  );
}
