import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import { useStore } from '../lib/store';
import { addDays, fmtDate, fmtTime, weekday, type Booking } from '../lib/data';
import { Icon, useToast } from '../components/ui';
import { PageHead, initials, useNow, type Draft } from './common';

const HOUR = 72; // pixels per hour
const SNAP = 15;

export default function Calendar({ onOpen }: { onOpen: (d: Draft) => void }) {
  const { s, set } = useStore(); const toast = useToast(); const { today, min } = useNow();
  const [date, setDate] = useState(today);
  const [showCancelled, setShowCancelled] = useState(false);
  const open = s.business.open, close = s.business.close; const hours = (close - open) / 60;
  const wd = weekday(date);
  const cols = s.staff;
  const scroller = useRef<HTMLDivElement>(null);
  const lanes = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<{ id: string; dy: number; col: number; moved: boolean } | null>(null);
  const start = useRef<{ y: number; x: number; id: string; col: number } | null>(null);

  useEffect(() => { // Scroll to the current time (or opening time) when the day changes.
    const el = scroller.current; if (!el) return;
    el.scrollTop = date === today ? Math.max(0, ((min - open) / 60) * HOUR - 120) : 0;
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const svc = (id: string) => s.services.find((x) => x.id === id)!;
  const dayBookings = s.bookings.filter((b) => b.date === date && (showCancelled || b.status !== 'cancelled'));
  const strip = Array.from({ length: 7 }, (_, i) => addDays(date, i - 3));

  const colAt = (x: number) => lanes.current.findIndex((el) => { if (!el) return false; const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right; });
  const onDown = (e: RPE, b: Booking, ci: number) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, x: e.clientX, id: b.id, col: ci };
    setDrag({ id: b.id, dy: 0, col: ci, moved: false });
  };
  const onMove = (e: RPE) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y; const dx = e.clientX - start.current.x;
    const moved = Math.abs(dy) > 4 || Math.abs(dx) > 4;
    const c = colAt(e.clientX);
    setDrag({ id: start.current.id, dy, col: c >= 0 ? c : start.current.col, moved });
  };
  const onUp = (b: Booking) => {
    const d = drag; start.current = null; setDrag(null);
    if (!d) return;
    if (!d.moved) { onOpen(b); return; }
    const minutes = Math.round((d.dy / HOUR) * 60 / SNAP) * SNAP;
    const ns = Math.max(open, Math.min(close - svc(b.serviceId).minutes, b.start + minutes));
    const st = cols[d.col];
    if (!svc(b.serviceId).staff.includes(st.id)) { toast(`${st.name.split(' ')[0]} doesn’t do ${svc(b.serviceId).name.toLowerCase()}`); return; }
    if (!st.days.includes(wd) || ns < st.start || ns + svc(b.serviceId).minutes > st.end) { toast(`${st.name.split(' ')[0]} isn’t working then`); return; }
    const clash = s.bookings.some((o) => o.id !== b.id && o.date === date && o.staffId === st.id && o.status !== 'cancelled' && ns < o.start + svc(o.serviceId).minutes && ns + svc(b.serviceId).minutes > o.start);
    if (clash) { toast('That time overlaps another booking'); return; }
    if (ns === b.start && st.id === b.staffId) return;
    set((x) => ({ ...x, bookings: x.bookings.map((o) => (o.id === b.id ? { ...o, start: ns, staffId: st.id } : o)) }));
    toast(`Moved to ${fmtTime(ns)} with ${st.name.split(' ')[0]}. The client gets a WhatsApp update.`);
  };
  const onEmpty = (e: React.MouseEvent<HTMLDivElement>, ci: number) => {
    if (e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect(); const m = open + Math.floor(((e.clientY - r.top) / HOUR) * 60 / SNAP) * SNAP;
    const st = cols[ci]; const sv = s.services.find((x) => x.active && x.staff.includes(st.id))!;
    onOpen({ date, start: m, staffId: st.id, serviceId: sv.id, source: 'phone' });
  };

  return (
    <>
      <PageHead title="Calendar" sub="Drag a booking to move it. Click an empty time to add one.">
        <label className="ck"><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Show cancelled</label>
      </PageHead>
      <div className="cal__bar">
        <div className="cal__nav">
          <button type="button" className="icbtn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><Icon n="back" size={18} /></button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDate(today)} disabled={date === today}>Today</button>
          <button type="button" className="icbtn" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}><Icon n="arrow" size={18} /></button>
          <h2>{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        </div>
        <div className="cal__strip" role="radiogroup" aria-label="Day">
          {strip.map((d) => {
            const n = s.bookings.filter((b) => b.date === d && b.status !== 'cancelled').length;
            return <button key={d} type="button" role="radio" aria-checked={d === date} className={`${d === date ? 'is-on' : ''} ${d === today ? 'is-today' : ''}`} onClick={() => setDate(d)}><small>{fmtDate(d, { weekday: 'short' })}</small><b>{fmtDate(d, { day: 'numeric' })}</b><span>{n}</span></button>;
          })}
        </div>
      </div>
      <div className="cal" style={{ '--cols': cols.length } as React.CSSProperties}>
        <div className="cal__head">
          <span />
          {cols.map((st) => {
            const works = st.days.includes(wd); const n = dayBookings.filter((b) => b.staffId === st.id && b.status !== 'cancelled').length;
            return <div key={st.id} className="cal__who"><span className="av" style={{ background: st.color }}>{initials(st.name)}</span><div><b>{st.name.split(' ')[0]}</b><small>{works ? `${n} bookings` : 'Day off'}</small></div></div>;
          })}
        </div>
        <div className="cal__scroll" ref={scroller}>
          <div className="cal__body" style={{ height: hours * HOUR }}>
            <div className="cal__times">{Array.from({ length: hours }, (_, i) => <span key={i} style={{ top: i * HOUR }}>{fmtTime(open + i * 60).replace(':00', '')}</span>)}</div>
            {cols.map((st, ci) => {
              const works = st.days.includes(wd);
              return (
                <div key={st.id} ref={(el) => { lanes.current[ci] = el; }} className={`cal__lane ${drag?.moved && drag.col === ci ? 'is-target' : ''}`} onClick={(e) => works && onEmpty(e, ci)} style={{ '--hour': `${HOUR}px` } as React.CSSProperties}>
                  {!works ? <div className="cal__off">Day off</div> : <>
                    {st.start > open && <div className="cal__closed" style={{ top: 0, height: ((st.start - open) / 60) * HOUR }} />}
                    {st.end < close && <div className="cal__closed" style={{ top: ((st.end - open) / 60) * HOUR, bottom: 0 }} />}
                  </>}
                  {dayBookings.filter((b) => b.staffId === st.id).map((b) => {
                    const sv = svc(b.serviceId); const c = s.customers.find((x) => x.id === b.customerId);
                    const isDrag = drag?.id === b.id && drag.moved;
                    const style = { top: ((b.start - open) / 60) * HOUR, height: (sv.minutes / 60) * HOUR - 3, '--c': st.color,
                      transform: isDrag ? `translate(${(drag!.col - ci) * (lanes.current[ci]?.getBoundingClientRect().width ?? 0)}px, ${Math.round((drag!.dy / HOUR) * 60 / SNAP) * SNAP / 60 * HOUR}px)` : undefined } as React.CSSProperties;
                    return (
                      <div key={b.id} role="button" tabIndex={0} className={`ev ev--${b.status} ${isDrag ? 'is-drag' : ''} ${sv.minutes <= 30 ? 'ev--short' : ''}`} style={style}
                        onPointerDown={(e) => onDown(e, b, ci)} onPointerMove={onMove} onPointerUp={() => onUp(b)} onPointerCancel={() => { start.current = null; setDrag(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(b); } }}
                        aria-label={`${fmtTime(b.start)}, ${sv.name} for ${c?.name}, ${b.status}`}>
                        <span className="ev__t">{fmtTime(b.start)}{b.source === 'whatsapp' && <Icon n="sparkle" size={12} />}{b.deposit ? <Icon n="wallet" size={12} /> : null}</span>
                        <b>{c?.name}</b><small>{sv.name}</small>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {date === today && min >= open && min <= close && <div className="cal__now" style={{ top: ((min - open) / 60) * HOUR }}><span>{fmtTime(min)}</span></div>}
          </div>
        </div>
      </div>
      <p className="legend"><span><Icon n="sparkle" size={13} /> Booked by the AI on WhatsApp</span><span><Icon n="wallet" size={13} /> Deposit paid</span><span><i className="lg lg--ns" /> No-show</span><span><i className="lg lg--done" /> Completed</span></p>
    </>
  );
}
