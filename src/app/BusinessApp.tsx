import { useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../lib/store';
import { Logo, Symbol } from '../components/Logo';
import { Icon } from '../components/ui';
import { BookingDrawer, type Draft } from './common';
import Overview from './Overview';
import Calendar from './Calendar';
import Bookings from './Bookings';
import Customers from './Customers';
import Services from './Services';
import Reports from './Reports';
import Ai from './Ai';
import Settings from './Settings';

const NAV = [
  { to: 'app', label: 'Overview', icon: 'home' }, { to: 'app-calendar', label: 'Calendar', icon: 'calendar' },
  { to: 'app-bookings', label: 'Bookings', icon: 'list' }, { to: 'app-customers', label: 'Clients', icon: 'users' },
  { to: 'app-services', label: 'Services and team', icon: 'tag' }, { to: 'app-reports', label: 'Reports', icon: 'chart' },
  { to: 'app-ai', label: 'AI assistant', icon: 'sparkle' }, { to: 'app-settings', label: 'Settings', icon: 'settings' },
];

export default function BusinessApp({ route }: { route: string }) {
  const { s } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const newBooking = (d: Draft = {}) => setDraft(d);
  const view = (() => {
    switch (route) {
      case 'app-calendar': return <Calendar onOpen={setDraft} />;
      case 'app-bookings': return <Bookings onOpen={setDraft} />;
      case 'app-customers': return <Customers onBook={(customerId) => newBooking({ customerId })} />;
      case 'app-services': return <Services />;
      case 'app-reports': return <Reports />;
      case 'app-ai': return <Ai />;
      case 'app-settings': return <Settings />;
      default: return <Overview onOpen={setDraft} />;
    }
  })();
  return (
    <div className={`ap ${open ? 'is-open' : ''}`}>
      <aside className="ap__side" aria-label="Dashboard">
        <Link to="" className="ap__brand" aria-label="Saatio home"><Logo light /></Link>
        <div className="ap__biz"><span className="ap__mono">N</span><div><b>{s.business.name}</b><small>{s.business.area} · Pro plan</small></div></div>
        <nav>{NAV.map((n) => (
          <Link key={n.to} to={n.to} className={route === n.to ? 'is-on' : ''} aria-current={route === n.to ? 'page' : undefined} onClick={() => setOpen(false)}>
            <Icon n={n.icon} size={19} />{n.label}{n.to === 'app-ai' && <span className="ap__new">AI</span>}
          </Link>
        ))}</nav>
        <div className="ap__foot">
          <Link to="book" className="ap__booklink"><Icon n="link" size={17} /><span><b>Your booking page</b><small>saatio.com/{s.business.slug}</small></span></Link>
          <Link to="" className="ap__out"><Icon n="logout" size={17} /> Back to the website</Link>
        </div>
      </aside>
      <button type="button" className="ap__scrim" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} />
      <div className="ap__main">
        <header className="ap__top">
          <button type="button" className="ap__burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon n="menu" size={22} /></button>
          <span className="ap__topsym"><Symbol /></span>
          <p className="ap__demo">Demo dashboard · sample data saved in this browser</p>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => newBooking()}><Icon n="plus" size={17} /> New booking</button>
          <span className="ap__me" title="Rania, owner">RO</span>
        </header>
        <main id="main" className="ap__view page-in" key={route}>{view}</main>
      </div>
      {draft && <BookingDrawer key={draft.id ?? 'new'} draft={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}
