import { useEffect, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { Symbol } from './Logo';
import { Icon } from './ui';

// A small switcher on every page so visitors can move between the four parts of the demo.
export const TOUR = [
  { to: '', match: (r: string) => !r.startsWith('app') && !r.startsWith('admin') && r !== 'book', icon: 'globe', label: 'Marketing website', sub: 'What a business owner sees first' },
  { to: 'book', match: (r: string) => r === 'book', icon: 'phone', label: 'Client booking page', sub: 'What a salon’s clients book on' },
  { to: 'app', match: (r: string) => r.startsWith('app'), icon: 'calendar', label: 'Business dashboard', sub: 'Calendar, clients, reports and AI' },
  { to: 'admin', match: (r: string) => r.startsWith('admin'), icon: 'shield', label: 'Saatio admin panel', sub: 'Every business, plan and payment' },
];

export default function DemoTour({ route }: { route: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [route]);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', click); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open]);
  const cur = TOUR.find((t) => t.match(route));
  return (
    <div className={`tour ${open ? 'is-open' : ''}`} ref={ref}>
      {open && (
        <div className="tour__pop" id="tour-pop" role="menu" aria-label="Demo tour">
          <p className="tour__h">Explore the demo</p>
          {TOUR.map((t) => (
            <Link key={t.label} to={t.to} role="menuitem" className={`tour__i ${t === cur ? 'is-on' : ''}`} aria-current={t === cur ? 'page' : undefined}>
              <span className="tour__ic"><Icon n={t.icon} size={18} /></span><span><b>{t.label}</b><small>{t.sub}</small></span>{t === cur && <span className="chip chip--mint">Here</span>}
            </Link>
          ))}
          <p className="tour__note">Everything is connected: book on the booking page and it appears in the dashboard.</p>
        </div>
      )}
      <button type="button" className="tour__btn" aria-expanded={open} aria-controls="tour-pop" onClick={() => setOpen((v) => !v)}>
        <span className="tour__sym"><Symbol /></span><span className="tour__lbl">Demo tour</span><Icon n={open ? 'x' : 'list'} size={16} />
      </button>
    </div>
  );
}
