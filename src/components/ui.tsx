import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/* ---------- Icons: one stroke style, 24px grid ---------- */
const P: Record<string, ReactNode> = {
  scissors: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></>,
  clinic: <><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" /></>,
  lotus: <><path d="M12 20c-4 0-8-2.5-9-7 3 0 6 1 9 4 3-3 6-4 9-4-1 4.5-5 7-9 7z" /><path d="M12 17c-2-2-3-5-2-9 1 1 1.6 2 2 3 .4-1 1-2 2-3 1 4 0 7-2 9z" /></>,
  dumbbell: <><path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 10h19M6.5 15h4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8M18 14.6c2 .6 3.2 2.4 3.6 5.4" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
  chat: <><path d="M4 18.5V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  back: <><path d="M19 12H5M11 6l-6 6 6 6" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z" /></>,
  home: <><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" /></>,
  tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="8" cy="8" r="1.5" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z" /></>,
  zap: <><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></>,
  building: <><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M3 21h18M8 7h4M8 11h4M8 15h4" /></>,
  phone: <><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M11 18.5h2" /></>,
  send: <><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></>,
  wallet: <><path d="M3 7a2 2 0 0 1 2-2h13v4" /><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="16.5" cy="13.5" r="1.2" /></>,
  drag: <><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>,
};
export type IconName = keyof typeof P;
export function Icon({ n, size = 20, className = '' }: { n: string; size?: number; className?: string }) {
  return <svg className={`ic ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>;
}
export function WhatsApp({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" /><path fill="#fff" d="M8.6 7.2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.1 4.5 2.5 1 3 .8 3.6.7.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4l-.6-.4-2-1c-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.5z" /></svg>;
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext<(t: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<{ id: number; text: string }[]>([]);
  const push = useCallback((text: string) => { const id = Date.now() + Math.random(); setList((l) => [...l.slice(-2), { id, text }]); setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3400); }, []);
  return <ToastCtx.Provider value={push}>{children}<div className="toasts" role="status" aria-live="polite">{list.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div></ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Drawer ---------- */
export function Drawer({ title, sub, onClose, children, footer, wide }: { title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.dr__x)')?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="dr" role="dialog" aria-modal="true" aria-labelledby="dr-title">
      <button type="button" className="dr__bg" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div ref={ref} className={`dr__panel ${wide ? 'dr__panel--wide' : ''}`}>
        <header className="dr__head"><div><h2 id="dr-title">{title}</h2>{sub && <p>{sub}</p>}</div><button type="button" className="dr__x" onClick={onClose} aria-label="Close"><Icon n="x" /></button></header>
        <div className="dr__body">{children}</div>
        {footer && <footer className="dr__foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* ---------- Form fields ---------- */
export function Field({ label, id, hint, error, children, wide }: { label: string; id: string; hint?: string; error?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`fld ${wide ? 'fld--wide' : ''} ${error ? 'is-err' : ''}`}>
      <label htmlFor={id}>{label}</label>{children}
      {error ? <em id={`${id}-err`}>{error}</em> : hint ? <small>{hint}</small> : null}
    </div>
  );
}
export function Toggle({ id, checked, onChange, label, sub }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <label className="tgl" htmlFor={id}>
      <span className="tgl__txt"><b>{label}</b>{sub && <small>{sub}</small>}</span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tgl__track" aria-hidden="true"><span /></span>
    </label>
  );
}

/* ---------- Reveal on scroll ---------- */
export function useInView<T extends HTMLElement>(margin = '-10% 0px') {
  const ref = useRef<T>(null); const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el); return () => io.disconnect();
  }, [margin]);
  return [ref, seen] as const;
}
