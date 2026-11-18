// Saatio sample data. In production this comes from the Laravel API (see README).
// Everything here is demo content for a concept project.

export type Currency = 'AED' | 'USD';
export type Industry = 'salon' | 'clinic' | 'spa' | 'gym';
export type Status = 'confirmed' | 'completed' | 'no-show' | 'cancelled';
export type Source = 'online' | 'whatsapp' | 'walk-in' | 'phone';

export interface Service { id: string; name: string; category: string; minutes: number; price: number; staff: string[]; active: boolean }
export interface Staff { id: string; name: string; role: string; color: string; days: number[] /* 0 Sun … 6 Sat */; start: number; end: number }
export interface Customer { id: string; name: string; phone: string; email: string; since: string; notes?: string; tags?: string[] }
export interface Booking {
  id: string; ref: string; date: string; start: number /* minutes from midnight */; serviceId: string; staffId: string;
  customerId: string; status: Status; source: Source; price: number; deposit?: number; createdAt: string; note?: string;
}
export interface Business {
  id: string; name: string; slug: string; industry: Industry; city: string; area: string; currency: Currency; timeZone: string;
  phone: string; open: number; close: number; closedDays: number[];
  reminders: { whatsapp24: boolean; whatsapp2: boolean; email: boolean; template: string };
  deposits: { enabled: boolean; percent: number; onlyRisky: boolean };
  ai: { receptionist: boolean; smartGaps: boolean; noShowGuard: boolean };
  /** Current offers. The AI receptionist quotes these when clients ask about discounts. */
  offers: string[];
  accent: string;
}

export interface Plan { id: 'starter' | 'growth' | 'pro'; name: string; blurb: string; price: { AED: number; USD: number }; staff: string; features: string[]; featured?: boolean }
export type TenantStatus = 'active' | 'trial' | 'past-due' | 'cancelled';
export interface Tenant {
  id: string; name: string; industry: Industry; city: string; country: 'UAE' | 'USA'; plan: Plan['id']; billing: 'monthly' | 'yearly';
  status: TenantStatus; joined: string; staff: number; bookings30: number; owner: string; email: string; trialEnds?: string;
}
export interface Campaign { id: string; gap: string; audience: number; message: string; sentAt: string; booked: number }

export const INDUSTRIES: Record<Industry, { label: string; plural: string }> = {
  salon: { label: 'Salon', plural: 'Salons' }, clinic: { label: 'Clinic', plural: 'Clinics' },
  spa: { label: 'Spa', plural: 'Spas' }, gym: { label: 'Gym & studio', plural: 'Gyms & studios' },
};

export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', blurb: 'For independent stylists, therapists and trainers.', price: { AED: 99, USD: 29 }, staff: '1 team member',
    features: ['Online booking page', 'Calendar and client list', 'Email reminders', 'Basic reports'] },
  { id: 'growth', name: 'Growth', blurb: 'For busy salons, clinics and studios.', price: { AED: 249, USD: 69 }, staff: 'Up to 10 team members', featured: true,
    features: ['Everything in Starter', 'WhatsApp and SMS reminders', 'Deposits and online payments', 'Smart gaps and offers', 'Full reports'] },
  { id: 'pro', name: 'Pro', blurb: 'For groups with several branches.', price: { AED: 549, USD: 149 }, staff: 'Unlimited team members',
    features: ['Everything in Growth', 'AI receptionist on WhatsApp', 'No-show protection', 'Multiple branches', 'Priority support'] },
];
export const YEARLY_DISCOUNT = 0.2;

export const money = (v: number, c: Currency) => (c === 'AED' ? `AED ${v.toLocaleString('en-US')}` : `$${v.toLocaleString('en-US')}`);
export const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- Dates in the business's own time zone ---------- */
export function todayIn(tz: string): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return p;
}
export function nowMinutes(tz: string): number {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  return Number(p.find((x) => x.type === 'hour')!.value) * 60 + Number(p.find((x) => x.type === 'minute')!.value);
}
export function addDays(d: string, n: number): string {
  const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10);
}
export const weekday = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
export function fmtDate(d: string, o: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
}
export function fmtTime(m: number): string {
  const h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`;
}
export const fmtDur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

/* ---------- Seed: Noor Beauty Lounge, Dubai Marina ---------- */
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

export const seedBusiness = (): Business => ({
  id: 'noor', name: 'Noor Beauty Lounge', slug: 'noor-beauty', industry: 'salon', city: 'Dubai', area: 'Dubai Marina', currency: 'AED',
  timeZone: 'Asia/Dubai', phone: '+971 4 555 0142', open: 10 * 60, close: 22 * 60, closedDays: [],
  reminders: { whatsapp24: true, whatsapp2: true, email: true, template: 'Hi {name}, a reminder of your {service} at Noor Beauty Lounge on {day} at {time}. Reply 1 to confirm or 2 to reschedule.' },
  deposits: { enabled: true, percent: 25, onlyRisky: true },
  ai: { receptionist: true, smartGaps: true, noShowGuard: true },
  offers: ['15% off your first visit', '20% off blow-dries on weekdays before 1 PM', 'A free brow tint with any signature facial'],
  accent: '#6C4CF5',
});

export const seedStaff = (): Staff[] => [
  { id: 'sara', name: 'Sara Haddad', role: 'Senior stylist', color: '#6C4CF5', days: [0, 1, 2, 3, 4, 6], start: 600, end: 1260 },
  { id: 'maya', name: 'Maya Reyes', role: 'Colour specialist', color: '#FF7A59', days: [1, 2, 3, 4, 5, 6], start: 660, end: 1320 },
  { id: 'leila', name: 'Leila Nasser', role: 'Nail artist', color: '#2ED3A0', days: [0, 1, 2, 3, 5, 6], start: 600, end: 1260 },
  { id: 'hana', name: 'Hana Kim', role: 'Skin and brow therapist', color: '#3BA1F5', days: [0, 2, 3, 4, 5, 6], start: 720, end: 1320 },
];

export const seedServices = (): Service[] => [
  { id: 'cut', name: 'Haircut and styling', category: 'Hair', minutes: 60, price: 180, staff: ['sara', 'maya'], active: true },
  { id: 'blow', name: 'Blow-dry', category: 'Hair', minutes: 45, price: 120, staff: ['sara', 'maya'], active: true },
  { id: 'colour', name: 'Full hair colour', category: 'Hair', minutes: 120, price: 450, staff: ['maya'], active: true },
  { id: 'balayage', name: 'Balayage', category: 'Hair', minutes: 180, price: 750, staff: ['maya'], active: true },
  { id: 'mani', name: 'Gel manicure', category: 'Nails', minutes: 45, price: 140, staff: ['leila'], active: true },
  { id: 'pedi', name: 'Spa pedicure', category: 'Nails', minutes: 60, price: 160, staff: ['leila'], active: true },
  { id: 'facial', name: 'Signature facial', category: 'Skin', minutes: 60, price: 350, staff: ['hana'], active: true },
  { id: 'brows', name: 'Brow shaping and tint', category: 'Skin', minutes: 30, price: 90, staff: ['hana'], active: true },
  { id: 'lash', name: 'Lash lift', category: 'Skin', minutes: 45, price: 220, staff: ['hana'], active: true },
];

const NAMES = ['Aisha Al Mansoori', 'Fatima Khan', 'Sophie Laurent', 'Mariam Haddad', 'Noura Al Suwaidi', 'Priya Sharma', 'Elena Petrova', 'Layla Hassan',
  'Hessa Al Falasi', 'Chloe Martin', 'Reem Abdullah', 'Zainab Raza', 'Olivia Brown', 'Dana Kassem', 'Amira Saleh', 'Jessica Taylor', 'Sana Malik',
  'Latifa Al Nuaimi', 'Yasmin Farouk', 'Hannah Lee', 'Maryam Qureshi', 'Ana Silva', 'Nadia Karim', 'Rania Youssef', 'Emily Clark', 'Huda Al Ketbi',
  'Sofia Rossi', 'Alia Mahmoud', 'Grace Kim', 'Shaikha Al Hammadi', 'Lina Chaker', 'Mona Aziz'];

const FIRST = ['Aisha', 'Fatima', 'Sophie', 'Mariam', 'Noura', 'Priya', 'Elena', 'Layla', 'Hessa', 'Chloe', 'Reem', 'Zainab', 'Olivia', 'Dana', 'Amira', 'Jessica', 'Sana', 'Latifa', 'Yasmin', 'Hannah', 'Maryam', 'Ana', 'Nadia', 'Rania', 'Emily', 'Huda', 'Sofia', 'Alia', 'Grace', 'Shaikha', 'Lina', 'Mona', 'Sarah', 'Nour', 'Farah', 'Isabel', 'Meera', 'Salma', 'Kate', 'Leen'];
const LAST = ['Al Mansoori', 'Khan', 'Laurent', 'Haddad', 'Al Suwaidi', 'Sharma', 'Petrova', 'Hassan', 'Al Falasi', 'Martin', 'Abdullah', 'Raza', 'Brown', 'Kassem', 'Saleh', 'Taylor', 'Malik', 'Al Nuaimi', 'Farouk', 'Lee', 'Qureshi', 'Silva', 'Karim', 'Youssef', 'Clark', 'Al Ketbi', 'Rossi', 'Mahmoud', 'Kim', 'Al Hammadi', 'Chaker', 'Aziz', 'Nair', 'Fernandes', 'Al Zaabi'];
export function seedCustomers(): Customer[] {
  const r = rng(11);
  const names = [...NAMES]; let k = 0;
  while (names.length < 420) { const n = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; if (!names.includes(n)) names.push(n); k++; }
  return names.map((n, i) => ({
    id: `c${i}`, name: n, phone: `+971 5${Math.floor(r() * 9)} ${String(Math.floor(r() * 900 + 100))} ${String(Math.floor(r() * 9000 + 1000))}`,
    email: `${n.split(' ')[0].toLowerCase()}.${n.split(' ').slice(-1)[0].toLowerCase()}@example.com`,
    since: addDays(todayIn('Asia/Dubai'), -Math.floor(r() * 400 + 20)),
    tags: i % 7 === 0 ? ['VIP'] : undefined,
  }));
}

export function seedBookings(services: Service[], staff: Staff[], customers: Customer[], tz = 'Asia/Dubai'): Booking[] {
  const r = rng(7); const today = todayIn(tz); const out: Booking[] = []; let n = 1040;
  // A couple of customers who often miss appointments, so the no-show guard has something to show.
  const risky = ['c3', 'c11', 'c19'];
  for (let d = -75; d <= 14; d++) {
    const date = addDays(today, d); const wd = weekday(date);
    for (const s of staff) {
      if (!s.days.includes(wd)) continue;
      let t = s.start + Math.floor(r() * 3) * 15;
      const fill = d < -30 ? 0.68 : d < 0 ? 0.78 : d === 0 ? 0.72 : Math.max(0.2, 0.7 - d * 0.04);
      while (t < s.end - 30) {
        const opts = services.filter((x) => x.staff.includes(s.id) && t + x.minutes <= s.end);
        if (!opts.length) break;
        const sv = opts[Math.floor(r() * opts.length)];
        if (r() < fill) {
          const isRisky = r() < 0.009; const cust = isRisky ? risky[Math.floor(r() * 3)] : customers[Math.floor(r() * customers.length)].id;
          let status: Status = 'confirmed';
          if (d < 0) { const x = r(); status = isRisky && x < 0.5 ? 'no-show' : x < 0.012 ? 'no-show' : x < 0.06 ? 'cancelled' : 'completed'; }
          else if (r() < 0.04) status = 'cancelled';
          else if (d === 0 && t + sv.minutes <= nowMinutes(tz)) status = r() < 0.97 ? 'completed' : 'no-show';
          const src: Source = (['online', 'online', 'online', 'whatsapp', 'whatsapp', 'walk-in', 'phone'] as Source[])[Math.floor(r() * 7)];
          out.push({ id: `b${n}`, ref: `SA-${n}`, date, start: t, serviceId: sv.id, staffId: s.id, customerId: cust, status, source: d < 0 && src === 'walk-in' ? 'walk-in' : src,
            price: sv.price, createdAt: addDays(date, -Math.floor(r() * 10 + 1)), deposit: risky.includes(cust) && d >= 0 ? Math.round(sv.price * 0.25) : undefined });
          n++; t += sv.minutes;
        } else t += 30 + Math.floor(r() * 3) * 15;
      }
    }
  }
  return out;
}

/* ---------- Platform (super-admin) ---------- */
const TENANT_NAMES: [string, Industry, string, Tenant['country']][] = [
  ['Noor Beauty Lounge', 'salon', 'Dubai', 'UAE'], ['Marina Smile Dental', 'clinic', 'Dubai', 'UAE'], ['Oud & Amber Spa', 'spa', 'Abu Dhabi', 'UAE'],
  ['Pulse Fitness JLT', 'gym', 'Dubai', 'UAE'], ['The Barber Room', 'salon', 'Sharjah', 'UAE'], ['Lumière Skin Clinic', 'clinic', 'Dubai', 'UAE'],
  ['Desert Lotus Yoga', 'gym', 'Abu Dhabi', 'UAE'], ['Glow Lab Nails', 'salon', 'Dubai', 'UAE'], ['Al Reem Physio', 'clinic', 'Abu Dhabi', 'UAE'],
  ['Saffron Hammam', 'spa', 'Dubai', 'UAE'], ['Iron Temple', 'gym', 'Sharjah', 'UAE'], ['Bloom Brow Bar', 'salon', 'Ajman', 'UAE'],
  ['Hudson Cuts', 'salon', 'New York', 'USA'], ['Brooklyn Body Lab', 'gym', 'New York', 'USA'], ['Sunset Med Spa', 'spa', 'Los Angeles', 'USA'],
  ['Bayfront Dental', 'clinic', 'Miami', 'USA'], ['Lone Star Barbers', 'salon', 'Houston', 'USA'], ['Pilates on Fifth', 'gym', 'New York', 'USA'],
  ['Venice Ink & Brows', 'salon', 'Los Angeles', 'USA'], ['Coral Gables Derm', 'clinic', 'Miami', 'USA'], ['Harbor Float Spa', 'spa', 'Seattle', 'USA'],
  ['Mile High Massage', 'spa', 'Denver', 'USA'], ['Wicker Park Studio', 'salon', 'Chicago', 'USA'], ['Peak Climbing Gym', 'gym', 'Denver', 'USA'],
  ['Gold Coast Lashes', 'salon', 'Chicago', 'USA'], ['Palm Jumeirah Wellness', 'spa', 'Dubai', 'UAE'], ['Kite Beach Boxing', 'gym', 'Dubai', 'UAE'],
  ['Mirdif Kids Dental', 'clinic', 'Dubai', 'UAE'], ['Austin Glow Studio', 'salon', 'Austin', 'USA'], ['SoHo Skin Studio', 'clinic', 'New York', 'USA'],
  ['Corniche Beauty', 'salon', 'Abu Dhabi', 'UAE'], ['Oakland Strength Co', 'gym', 'Oakland', 'USA'], ['Al Barsha Vet Care', 'clinic', 'Dubai', 'UAE'],
  ['Miami Beach Blowout', 'salon', 'Miami', 'USA'], ['Downtown Cryo', 'spa', 'Dubai', 'UAE'], ['Tribeca Physio', 'clinic', 'New York', 'USA'],
];
const OWNERS = ['Rania', 'Omar', 'Khalid', 'Sarah', 'Mike', 'Jen', 'Ahmed', 'Nadia', 'Chris', 'Lauren', 'Yousef', 'Dana', 'Tom', 'Priya', 'Ali', 'Kate'];

const GEN: Record<Industry, string[]> = { salon: ['Salon', 'Hair Studio', 'Barbers', 'Nail Bar', 'Brow Bar', 'Beauty Lounge'], clinic: ['Dental', 'Physio', 'Skin Clinic', 'Dermatology', 'Wellness Clinic', 'Chiropractic'], spa: ['Spa', 'Massage', 'Wellness', 'Day Spa', 'Hammam'], gym: ['Fitness', 'Pilates', 'Yoga', 'Boxing Club', 'Strength Lab', 'Cycle Studio'] };
const PLACES: [string, Tenant['country']][] = [['Dubai', 'UAE'], ['Abu Dhabi', 'UAE'], ['Sharjah', 'UAE'], ['Dubai', 'UAE'], ['Al Ain', 'UAE'], ['New York', 'USA'], ['Los Angeles', 'USA'], ['Miami', 'USA'], ['Chicago', 'USA'], ['Austin', 'USA'], ['Houston', 'USA'], ['Seattle', 'USA'], ['Atlanta', 'USA']];
const PRE = ['Velvet', 'Bloom', 'Urban', 'Golden', 'Olive', 'Crescent', 'Harbor', 'Cedar', 'Lumen', 'Sage', 'Atlas', 'Coral', 'Jade', 'Maple', 'Pearl', 'Summit', 'Willow', 'Amber', 'Nova', 'Haven', 'Oasis', 'Marina', 'Dune', 'Palm', 'Linen', 'Iris', 'Echo', 'Kinetic', 'Zen', 'Ivory'];
function allTenantNames(): [string, Industry, string, Tenant['country']][] {
  const out = [...TENANT_NAMES]; const r = rng(53); const inds: Industry[] = ['salon', 'salon', 'clinic', 'spa', 'gym', 'gym'];
  for (let i = 0; out.length < 168; i++) {
    const ind = inds[Math.floor(r() * inds.length)]; const [city, country] = PLACES[Math.floor(r() * PLACES.length)];
    const name = `${PRE[Math.floor(r() * PRE.length)]} ${GEN[ind][Math.floor(r() * GEN[ind].length)]}`;
    if (!out.some((x) => x[0] === name)) out.push([name, ind, city, country]);
  }
  return out;
}
export function seedTenants(): Tenant[] {
  const r = rng(29); const today = todayIn('Asia/Dubai');
  return allTenantNames().map(([name, industry, city, country], i) => {
    const x = r(); const plan: Plan['id'] = i === 0 ? 'pro' : x < 0.32 ? 'starter' : x < 0.8 ? 'growth' : 'pro';
    const y = r(); const status: TenantStatus = i === 0 ? 'active' : y < 0.76 ? 'active' : y < 0.86 ? 'trial' : y < 0.91 ? 'past-due' : 'cancelled';
    const joinedAgo = status === 'trial' ? Math.floor(r() * 13) : Math.floor(Math.pow(r(), 0.75) * 340 + 16);
    const owner = OWNERS[Math.floor(r() * OWNERS.length)];
    return {
      id: `t${i}`, name, industry, city, country, plan, billing: r() < 0.35 ? 'yearly' : 'monthly', status, joined: addDays(today, -joinedAgo),
      staff: plan === 'starter' ? 1 : plan === 'growth' ? Math.floor(r() * 8 + 2) : Math.floor(r() * 18 + 6),
      bookings30: status === 'cancelled' ? 0 : Math.floor((plan === 'starter' ? 40 : plan === 'growth' ? 220 : 610) * (0.6 + r() * 0.8)),
      owner, email: `${owner.toLowerCase()}@${name.toLowerCase().replace(/[^a-z]+/g, '')}.com`,
      trialEnds: status === 'trial' ? addDays(today, 14 - joinedAgo) : undefined,
    };
  });
}

/** Monthly recurring revenue in USD for a tenant (AED converted at 3.6725). */
export function tenantMrr(t: Tenant, plans: Plan[]): number {
  if (t.status !== 'active' && t.status !== 'past-due') return 0;
  const p = plans.find((x) => x.id === t.plan)!; const base = t.country === 'UAE' ? p.price.AED / 3.6725 : p.price.USD;
  return Math.round(base * (t.billing === 'yearly' ? 1 - YEARLY_DISCOUNT : 1));
}
