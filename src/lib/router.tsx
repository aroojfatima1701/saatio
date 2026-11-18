import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

// Hash router for the preview (#pricing, #book, #app-calendar…). In the Next.js project each route is
// app/<route>/page.tsx: the marketing site at /, the booking page at /book/[slug], the dashboard at /app/*
// and the super-admin at /admin/*.
export const ROUTES = ['pricing', 'signup', 'book', 'app', 'app-calendar', 'app-bookings', 'app-customers', 'app-services', 'app-reports', 'app-ai', 'app-settings', 'admin', 'admin-businesses', 'admin-plans'];
export const SECTIONS = ['features', 'ai', 'industries', 'how'];

const read = () => { const h = window.location.hash.replace(/^#/, ''); return ROUTES.includes(h) ? h : ''; };
export function useRoute(): string {
  const [r, setR] = useState(read);
  useEffect(() => {
    const on = () => {
      const h = window.location.hash.replace(/^#/, '');
      if (SECTIONS.includes(h)) { setR(''); requestAnimationFrame(() => document.getElementById(h)?.scrollIntoView({ behavior: 'smooth' })); return; }
      setR(read()); window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on); on();
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
export const go = (to: string) => { window.location.hash = to ? `#${to}` : '#home'; };
export function Link({ to, onClick, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={to ? `#${to}` : '#home'} onClick={(e: MouseEvent<HTMLAnchorElement>) => { onClick?.(e); }} {...rest} />;
}
