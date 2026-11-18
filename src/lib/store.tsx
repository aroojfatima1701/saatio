import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  PLANS, seedBookings, seedBusiness, seedCustomers, seedServices, seedStaff, seedTenants, uid,
  type Booking, type Business, type Campaign, type Customer, type Plan, type Service, type Staff, type Tenant,
} from './data';

// One store for the whole demo: the business using Saatio (Noor Beauty Lounge) and the Saatio platform itself.
// It is saved in this browser so the website, the booking page, the business dashboard and the super-admin stay in sync.
// In production each slice is a Laravel API resource.
export interface State {
  business: Business; services: Service[]; staff: Staff[]; customers: Customer[]; bookings: Booking[];
  campaigns: Campaign[]; plans: Plan[]; tenants: Tenant[]; version: number;
}
const KEY = 'saatio-demo-v6';
const VERSION = 6;

function fresh(): State {
  const services = seedServices(); const staff = seedStaff(); const customers = seedCustomers();
  return { business: seedBusiness(), services, staff, customers, bookings: seedBookings(services, staff, customers), campaigns: [], plans: PLANS, tenants: seedTenants(), version: VERSION };
}
function load(): State {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.version === VERSION) return v; } catch { /* use fresh data */ }
  return fresh();
}

interface Ctx {
  s: State;
  set: (fn: (s: State) => State) => void;
  reset: () => void;
  addBooking: (b: Omit<Booking, 'id' | 'ref' | 'createdAt'>) => Booking;
  findOrAddCustomer: (c: { name: string; phone: string; email?: string }) => Customer;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(load);
  const ref = useRef(s); ref.current = s;
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full or blocked: keep in memory */ } }, [s]);
  // Keep tabs in sync (website in one tab, dashboard in another).
  useEffect(() => {
    const on = (e: StorageEvent) => { if (e.key === KEY && e.newValue) try { setS(JSON.parse(e.newValue)); } catch { /* ignore */ } };
    window.addEventListener('storage', on); return () => window.removeEventListener('storage', on);
  }, []);
  const set = useCallback((fn: (s: State) => State) => setS((x) => fn(x)), []);
  const reset = useCallback(() => setS(fresh()), []);
  const addBooking = useCallback((b: Omit<Booking, 'id' | 'ref' | 'createdAt'>) => {
    const max = ref.current.bookings.reduce((m, x) => Math.max(m, Number(x.ref.slice(3)) || 0), 1000);
    const nb: Booking = { ...b, id: uid(), ref: `SA-${max + 1}`, createdAt: new Date().toISOString().slice(0, 10) };
    setS((x) => ({ ...x, bookings: [...x.bookings, nb] }));
    return nb;
  }, []);
  const findOrAddCustomer = useCallback((c: { name: string; phone: string; email?: string }) => {
    const digits = (p: string) => p.replace(/\D/g, '');
    const hit = ref.current.customers.find((x) => digits(x.phone) === digits(c.phone) || (c.email && x.email.toLowerCase() === c.email.toLowerCase()));
    if (hit) return hit;
    const nc: Customer = { id: uid(), name: c.name, phone: c.phone, email: c.email ?? '', since: new Date().toISOString().slice(0, 10) };
    ref.current = { ...ref.current, customers: [...ref.current.customers, nc] };
    setS((x) => ({ ...x, customers: [...x.customers, nc] }));
    return nc;
  }, []);
  const value = useMemo(() => ({ s, set, reset, addBooking, findOrAddCustomer }), [s, set, reset, addBooking, findOrAddCustomer]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
export function useStore() { const c = useContext(StoreCtx); if (!c) throw new Error('StoreProvider missing'); return c; }

/* ---------- Availability ---------- */
export function freeSlots(s: State, date: string, serviceId: string, staffId: string | 'any', step = 15): { start: number; staffId: string }[] {
  const sv = s.services.find((x) => x.id === serviceId); if (!sv) return [];
  const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (s.business.closedDays.includes(wd)) return [];
  const team = s.staff.filter((st) => sv.staff.includes(st.id) && (staffId === 'any' || st.id === staffId) && st.days.includes(wd));
  const out = new Map<number, string>();
  for (const st of team) {
    const busy = s.bookings.filter((b) => b.date === date && b.staffId === st.id && b.status !== 'cancelled')
      .map((b) => [b.start, b.start + (s.services.find((x) => x.id === b.serviceId)?.minutes ?? 60)]);
    for (let t = Math.max(st.start, s.business.open); t + sv.minutes <= Math.min(st.end, s.business.close); t += step) {
      if (busy.some(([a, z]) => t < z && t + sv.minutes > a)) continue;
      if (!out.has(t)) out.set(t, st.id);
    }
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0]).map(([start, id]) => ({ start, staffId: id }));
}

/** Gaps of 60 minutes or more in the next few days: what the smart-gaps AI looks for. */
export function findGaps(s: State, from: string, days: number, nowMin: number) {
  const gaps: { date: string; staffId: string; start: number; end: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(`${from}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + i); const d = date.toISOString().slice(0, 10); const wd = date.getUTCDay();
    for (const st of s.staff) {
      if (!st.days.includes(wd)) continue;
      const busy = s.bookings.filter((b) => b.date === d && b.staffId === st.id && b.status !== 'cancelled')
        .map((b) => [b.start, b.start + (s.services.find((x) => x.id === b.serviceId)?.minutes ?? 60)] as [number, number]).sort((a, b) => a[0] - b[0]);
      let t = i === 0 ? Math.max(st.start, Math.ceil(nowMin / 30) * 30) : st.start;
      for (const [a, z] of [...busy, [st.end, st.end] as [number, number]]) {
        if (a - t >= 90) gaps.push({ date: d, staffId: st.id, start: t, end: a });
        t = Math.max(t, z);
      }
    }
  }
  return gaps.sort((a, b) => (b.end - b.start) - (a.end - a.start)).slice(0, 6).sort((a, b) => (a.date + String(a.start).padStart(4, '0')).localeCompare(b.date + String(b.start).padStart(4, '0')));
}

export function customerStats(s: State, id: string) {
  const mine = s.bookings.filter((b) => b.customerId === id);
  const done = mine.filter((b) => b.status === 'completed');
  const noShows = mine.filter((b) => b.status === 'no-show').length;
  const last = done.map((b) => b.date).sort().pop();
  return { visits: done.length, spent: done.reduce((a, b) => a + b.price, 0), noShows, last, upcoming: mine.filter((b) => b.status === 'confirmed').length, risky: noShows >= 2 };
}
