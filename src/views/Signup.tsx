import { useState, type FormEvent } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../lib/store';
import { setCurrency, useCurrency } from '../lib/prefs';
import { INDUSTRIES, todayIn, addDays, uid, type Industry, type Plan, type Tenant } from '../lib/data';
import { Logo } from '../components/Logo';
import { Field, Icon, useToast } from '../components/ui';
import { BillingSwitch, PlanCards } from './Pricing';

const ICON: Record<Industry, string> = { salon: 'scissors', clinic: 'clinic', spa: 'lotus', gym: 'dumbbell' };
const CITIES: Record<'UAE' | 'USA', string[]> = { UAE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'], USA: ['New York', 'Los Angeles', 'Miami', 'Chicago', 'Houston', 'Austin', 'Other'] };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);

export default function Signup() {
  const { set } = useStore(); const toast = useToast(); const cur = useCurrency();
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [f, setF] = useState({ business: '', owner: '', email: '', phone: '', country: cur === 'USD' ? 'USA' : 'UAE' as 'UAE' | 'USA', city: cur === 'USD' ? 'New York' : 'Dubai', team: '2-5' });
  const [plan, setPlan] = useState<Plan['id']>(() => { try { return (sessionStorage.getItem('saatio-plan') as Plan['id']) || 'growth'; } catch { return 'growth'; } });
  const [yearly, setYearly] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Tenant | null>(null);
  const up = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const checkDetails = () => {
    const e: Record<string, string> = {};
    if (f.business.trim().length < 2) e.business = 'Enter your business name.';
    if (f.owner.trim().length < 2) e.owner = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter an email like you@business.com.';
    if (f.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number with country code.';
    setErr(e); return !Object.keys(e).length;
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) { if (checkDetails()) setStep(2); return; }
    const today = todayIn('Asia/Dubai');
    const t: Tenant = { id: uid(), name: f.business.trim(), industry: industry!, city: f.city, country: f.country, plan, billing: yearly ? 'yearly' : 'monthly', status: 'trial', joined: today,
      staff: f.team === '1' ? 1 : f.team === '2-5' ? 3 : f.team === '6-10' ? 8 : 14, bookings30: 0, owner: f.owner.trim().split(' ')[0], email: f.email.trim(), trialEnds: addDays(today, 14) };
    set((s) => ({ ...s, tenants: [t, ...s.tenants] }));
    setDone(t); toast('Your free trial has started');
  };

  if (done) return (
    <section className="signup">
      <div className="signup__card signup__card--done page-in">
        <span className="signup__ok"><Icon n="check" size={30} /></span>
        <h1>Welcome to Saatio, {done.owner}!</h1>
        <p>Your 14-day free trial of the {done.plan[0].toUpperCase() + done.plan.slice(1)} plan has started. Your booking page is ready to share:</p>
        <p className="signup__link"><Icon n="link" size={18} /><span>saatio.com/{slugify(done.name)}</span></p>
        <div className="signup__next">
          <Link to="app" className="btn btn--primary btn--lg">Open the dashboard <Icon n="arrow" size={18} className="arrow" /></Link>
          <Link to="admin-businesses" className="btn btn--ghost btn--lg">See it in the Saatio admin</Link>
        </div>
        <p className="fine">This is a concept project. The dashboard shows a sample business, Noor Beauty Lounge, so you can explore it with real-looking data. Your sign-up appears in the Saatio admin panel as a new trial.</p>
      </div>
    </section>
  );

  return (
    <section className="signup">
      <form className="signup__card page-in" onSubmit={submit} noValidate>
        <div className="signup__top"><Logo className="signup__logo" /><ol className="signup__steps" aria-label="Steps">{['Your business', 'Details', 'Plan'].map((x, i) => <li key={x} className={i === step ? 'is-on' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}><span>{i < step ? <Icon n="check" size={14} /> : i + 1}</span>{x}</li>)}</ol></div>

        {step === 0 && (
          <fieldset className="signup__set">
            <legend><h1>What kind of business do you run?</h1><p>We’ll set up your calendar and booking page to match.</p></legend>
            <div className="signup__types">
              {(Object.keys(INDUSTRIES) as Industry[]).map((k) => (
                <label key={k} className={`signup__type ${industry === k ? 'is-on' : ''}`}>
                  <input type="radio" name="industry" value={k} checked={industry === k} onChange={() => setIndustry(k)} />
                  <span className="signup__tic"><Icon n={ICON[k]} size={26} /></span><b>{INDUSTRIES[k].plural}</b>
                </label>
              ))}
            </div>
            <button type="button" className="btn btn--primary btn--lg btn--block" disabled={!industry} onClick={() => setStep(1)}>Continue <Icon n="arrow" size={18} className="arrow" /></button>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="signup__set">
            <legend><h1>Tell us about your {industry ? INDUSTRIES[industry].label.toLowerCase() : 'business'}</h1><p>You can change all of this later.</p></legend>
            <div className="form">
              <Field label="Business name" id="su-biz" error={err.business} wide><input id="su-biz" value={f.business} onChange={(e) => up('business', e.target.value)} aria-invalid={!!err.business} autoComplete="organization" placeholder="e.g. Glow Studio" /></Field>
              <Field label="Country" id="su-country">
                <select id="su-country" value={f.country} onChange={(e) => { const c = e.target.value as 'UAE' | 'USA'; setF((x) => ({ ...x, country: c, city: CITIES[c][0] })); setCurrency(c === 'USA' ? 'USD' : 'AED'); }}>
                  <option value="UAE">United Arab Emirates</option><option value="USA">United States</option>
                </select>
              </Field>
              <Field label="City" id="su-city"><select id="su-city" value={f.city} onChange={(e) => up('city', e.target.value)}>{CITIES[f.country].map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Your name" id="su-owner" error={err.owner}><input id="su-owner" value={f.owner} onChange={(e) => up('owner', e.target.value)} aria-invalid={!!err.owner} autoComplete="name" /></Field>
              <Field label="Team size" id="su-team"><select id="su-team" value={f.team} onChange={(e) => up('team', e.target.value)}><option value="1">Just me</option><option value="2-5">2 to 5</option><option value="6-10">6 to 10</option><option value="11+">11 or more</option></select></Field>
              <Field label="Work email" id="su-email" error={err.email}><input id="su-email" type="email" value={f.email} onChange={(e) => up('email', e.target.value)} aria-invalid={!!err.email} autoComplete="email" /></Field>
              <Field label="Mobile (for WhatsApp)" id="su-phone" error={err.phone}><input id="su-phone" type="tel" value={f.phone} onChange={(e) => up('phone', e.target.value)} aria-invalid={!!err.phone} autoComplete="tel" placeholder={f.country === 'UAE' ? '+971 50 123 4567' : '+1 212 555 0100'} /></Field>
            </div>
            <div className="signup__nav"><button type="button" className="btn btn--ghost" onClick={() => setStep(0)}>Back</button><button type="submit" className="btn btn--primary">Continue <Icon n="arrow" size={18} className="arrow" /></button></div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="signup__set">
            <legend><h1>Choose a plan for your trial</h1><p>Free for 14 days. No card needed, and you can switch at any time.</p></legend>
            <div className="signup__bill"><BillingSwitch yearly={yearly} setYearly={setYearly} /></div>
            <PlanCards yearly={yearly} onPick={setPlan} picked={plan} />
            <div className="signup__nav"><button type="button" className="btn btn--ghost" onClick={() => setStep(1)}>Back</button><button type="submit" className="btn btn--primary btn--lg">Start my free trial <Icon n="arrow" size={18} className="arrow" /></button></div>
          </fieldset>
        )}
      </form>
    </section>
  );
}
