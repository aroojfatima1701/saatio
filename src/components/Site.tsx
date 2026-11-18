import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { setCurrency, useCurrency } from '../lib/prefs';
import { Logo } from './Logo';
import { Icon } from './ui';

const NAV = [{ to: 'features', label: 'Product' }, { to: 'ai', label: 'AI receptionist' }, { to: 'industries', label: 'Who it’s for' }, { to: 'pricing', label: 'Pricing' }];

export function CurrencySwitch({ dark }: { dark?: boolean }) {
  const c = useCurrency();
  return (
    <div className={`cur ${dark ? 'cur--dark' : ''}`} role="radiogroup" aria-label="Currency">
      {(['AED', 'USD'] as const).map((x) => <button key={x} type="button" role="radio" aria-checked={c === x} onClick={() => setCurrency(x)}>{x}</button>)}
    </div>
  );
}

export function Header({ route }: { route: string }) {
  const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const on = () => setScrolled(window.scrollY > 8); on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);
  useEffect(() => setOpen(false), [route]);
  return (
    <header className={`hd ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="wrap hd__in">
        <Link to="" className="hd__logo" aria-label="Saatio home"><Logo /></Link>
        <nav className="hd__nav" aria-label="Main">{NAV.map((n) => <Link key={n.to} to={n.to} className={route === n.to ? 'is-on' : ''}>{n.label}</Link>)}</nav>
        <div className="hd__act">
          <Link to="app" className="hd__login">Log in</Link>
          <Link to="signup" className="btn btn--primary btn--sm">Start free trial</Link>
          <button type="button" className="hd__burger" aria-expanded={open} aria-controls="mnav" aria-label="Menu" onClick={() => setOpen((v) => !v)}><Icon n={open ? 'x' : 'menu'} size={22} /></button>
        </div>
      </div>
      <nav id="mnav" className="mnav" aria-label="Mobile" hidden={!open}>
        {NAV.map((n) => <Link key={n.to} to={n.to} onClick={() => setOpen(false)}>{n.label}</Link>)}
        <Link to="book" onClick={() => setOpen(false)}>Try a live booking page</Link>
        <Link to="app" onClick={() => setOpen(false)}>Log in</Link>
        <Link to="signup" className="btn btn--primary btn--block" onClick={() => setOpen(false)}>Start free trial</Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="ft">
      <div className="wrap ft__grid">
        <div className="ft__brand">
          <Logo light className="ft__logo" />
          <p>Online booking, calendar, reminders and an AI receptionist for salons, clinics, spas and gyms.</p>
          <CurrencySwitch dark />
        </div>
        <div><h3>Product</h3><Link to="features">Features</Link><Link to="ai">AI receptionist</Link><Link to="pricing">Pricing</Link><Link to="book">Live booking page</Link></div>
        <div><h3>Who it’s for</h3><Link to="industries">Salons and barbers</Link><Link to="industries">Clinics</Link><Link to="industries">Spas</Link><Link to="industries">Gyms and studios</Link></div>
        <div><h3>Demo</h3><Link to="app">Business dashboard</Link><Link to="admin">Saatio admin panel</Link><Link to="signup">Start free trial</Link></div>
      </div>
      <div className="wrap ft__base">
        <span>© 2026 Saatio</span>
        <span>Concept project by Arooj Fatima. Sample businesses and data. Nothing is booked, charged or sent.</span>
      </div>
    </footer>
  );
}
