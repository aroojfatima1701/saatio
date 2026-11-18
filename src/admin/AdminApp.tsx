import { useMemo, useState } from 'react';
import { Link, go } from '../lib/router';
import { useStore } from '../lib/store';
import { INDUSTRIES, addDays, fmtDate, money, tenantMrr, todayIn, YEARLY_DISCOUNT, type Industry, type Plan, type Tenant, type TenantStatus } from '../lib/data';
import { Logo, Symbol } from '../components/Logo';
import { Drawer, Field, Icon, useToast } from '../components/ui';
import { Kpi, PageHead, initials } from '../app/common';

// The Saatio company's own panel: every business on the platform, subscriptions and plans.
const NAV = [{ to: 'admin', label: 'Overview', icon: 'chart' }, { to: 'admin-businesses', label: 'Businesses', icon: 'building' }, { to: 'admin-plans', label: 'Plans and pricing', icon: 'tag' }];
const ST: Record<TenantStatus, { label: string; cls: string }> = { active: { label: 'Active', cls: 'chip chip--mint' }, trial: { label: 'Trial', cls: 'chip' }, 'past-due': { label: 'Payment due', cls: 'chip chip--warn' }, cancelled: { label: 'Cancelled', cls: 'chip chip--grey' } };
const IND_COL: Record<Industry, string> = { salon: '#6C4CF5', clinic: '#FF7A59', spa: '#2ED3A0', gym: '#3BA1F5' };
const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
const today = () => todayIn('Asia/Dubai');

function Overview() {
  const { s } = useStore(); const t0 = today();
  const mrr = s.tenants.reduce((a, t) => a + tenantMrr(t, s.plans), 0);
  const active = s.tenants.filter((t) => t.status === 'active' || t.status === 'past-due');
  const trials = s.tenants.filter((t) => t.status === 'trial');
  const cancelled = s.tenants.filter((t) => t.status === 'cancelled');
  // MRR history from join dates. Cancelled accounts are assumed to have paid for their first two months.
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(`${t0}T12:00:00Z`); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (11 - i)); return d.toISOString().slice(0, 7); });
  const hist = months.map((m) => s.tenants.reduce((a, t) => {
    const end = `${m}-31`; if (t.joined > end || t.status === 'trial') return a;
    if (t.status === 'cancelled' && addDays(t.joined, 60) < `${m}-01`) return a;
    return a + tenantMrr({ ...t, status: 'active' }, s.plans);
  }, 0));
  const max = Math.max(...hist, 1); const [hov, setHov] = useState<number | null>(null);
  const byInd = (Object.keys(INDUSTRIES) as Industry[]).map((k) => ({ k, n: s.tenants.filter((t) => t.industry === k && t.status !== 'cancelled').length }));
  const maxI = Math.max(...byInd.map((x) => x.n), 1);
  const uae = active.filter((t) => t.country === 'UAE').length;
  const recent = [...s.tenants].sort((a, b) => b.joined.localeCompare(a.joined)).slice(0, 6);
  const ending = trials.filter((t) => t.trialEnds && t.trialEnds <= addDays(t0, 5)).sort((a, b) => (a.trialEnds ?? '').localeCompare(b.trialEnds ?? ''));
  const growth = hist[0] ? Math.round(((hist[11] - hist[0]) / hist[0]) * 100) : 0;
  return (
    <>
      <PageHead title="Platform overview" sub={`Saatio · ${fmtDate(t0, { weekday: 'long', day: 'numeric', month: 'long' })}`} />
      <div className="kpis">
        <Kpi label="Monthly recurring revenue" value={usd(mrr)} sub={`${growth >= 0 ? '+' : ''}${growth}% in 12 months`} tone={growth >= 0 ? 'up' : 'down'} />
        <Kpi label="Paying businesses" value={String(active.length)} sub={`${uae} UAE · ${active.length - uae} USA`} />
        <Kpi label="On free trial" value={String(trials.length)} sub={`${ending.length} ending in 5 days`} />
        <Kpi label="Average per business" value={usd(mrr / Math.max(1, active.length))} sub={`${cancelled.length} cancelled in total`} />
      </div>
      <div className="ov">
        <section className="card">
          <header className="card__h"><h2>MRR, last 12 months</h2><span className="muted">USD, AED converted at 3.6725</span></header>
          <div className="bars bars--tall" role="img" aria-label="Monthly recurring revenue over the last 12 months">
            {hist.map((v, i) => (
              <button key={i} type="button" className="bars__col" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(i)} onBlur={() => setHov(null)} aria-label={`${months[i]}: ${usd(v)}`}>
                <span className="bars__b" style={{ height: `${(v / max) * 100}%` }} data-today={i === 11 || undefined} />
              </button>
            ))}
            {hov != null && <div className="tip" style={{ left: `${((hov + 0.5) / 12) * 100}%` }}><b>{usd(hist[hov])}</b><small>{new Date(`${months[hov]}-15`).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</small></div>}
          </div>
          <div className="bars__x"><span>{new Date(`${months[0]}-15`).toLocaleString('en-GB', { month: 'short' })}</span><span>This month</span></div>
          <h3 className="card__sub">Businesses by type</h3>
          <ul className="hbars">{byInd.map(({ k, n }) => <li key={k}><span className="hbars__l"><b>{INDUSTRIES[k].plural}</b></span><span className="hbars__track"><span style={{ width: `${(n / maxI) * 100}%`, background: IND_COL[k] }} /></span><b className="hbars__v">{n}</b></li>)}</ul>
        </section>
        <div className="ov__side">
          <section className="card">
            <header className="card__h"><h2>Newest sign-ups</h2><Link to="admin-businesses" className="lnk">All businesses</Link></header>
            <ul className="rows">{recent.map((t) => (
              <li key={t.id}><span className="rows__main rows__main--static"><span className="who"><span className="av av--sm" style={{ background: IND_COL[t.industry] }}>{initials(t.name)}</span><span><b>{t.name}</b><small>{t.city} · {fmtDate(t.joined)}</small></span></span></span><span className={ST[t.status].cls}>{ST[t.status].label}</span></li>
            ))}</ul>
          </section>
          <section className="card">
            <header className="card__h"><h2>Trials ending soon</h2></header>
            {ending.length ? <ul className="rows">{ending.map((t) => <li key={t.id}><span className="rows__main rows__main--static"><b>{t.name}</b><small>{s.plans.find((p) => p.id === t.plan)?.name} plan · ends {fmtDate(t.trialEnds!)}</small></span><a className="lnk" href={`mailto:${t.email}`}>Email</a></li>)}</ul> : <p className="muted">No trials end in the next 5 days.</p>}
          </section>
        </div>
      </div>
    </>
  );
}

function TenantDrawer({ t, onClose }: { t: Tenant; onClose: () => void }) {
  const { s, set } = useStore(); const toast = useToast();
  const [v, setV] = useState(t);
  const plan = s.plans.find((p) => p.id === v.plan)!;
  const save = (patch: Partial<Tenant>, msg: string) => { set((x) => ({ ...x, tenants: x.tenants.map((o) => (o.id === t.id ? { ...o, ...v, ...patch } : o)) })); toast(msg); onClose(); };
  return (
    <Drawer title={t.name} sub={`${INDUSTRIES[t.industry].label} · ${t.city}, ${t.country} · joined ${fmtDate(t.joined, { day: 'numeric', month: 'long', year: 'numeric' })}`} onClose={onClose}
      footer={<>{t.status !== 'cancelled' ? <button type="button" className="btn btn--ghost btn--sm dr__danger" onClick={() => save({ status: 'cancelled' }, `${t.name} cancelled`)}>Cancel subscription</button> : <button type="button" className="btn btn--ghost btn--sm" onClick={() => save({ status: 'active' }, `${t.name} reactivated`)}>Reactivate</button>}<span className="sp" /><button type="button" className="btn btn--ghost" onClick={onClose}>Close</button><button type="button" className="btn btn--primary" onClick={() => save({}, 'Changes saved')}>Save</button></>}>
      <div className="cst">
        <div className="cst__stats"><div><b>{usd(tenantMrr(v, s.plans))}</b><small>MRR</small></div><div><b>{t.staff}</b><small>team members</small></div><div><b>{t.bookings30}</b><small>bookings, 30 days</small></div></div>
        <p className="cst__contact"><Icon n="users" size={16} /> {t.owner}, owner<br /><Icon n="chat" size={16} /> {t.email}</p>
        <div className="form">
          <Field label="Plan" id="tn-plan"><select id="tn-plan" value={v.plan} onChange={(e) => setV({ ...v, plan: e.target.value as Plan['id'] })}>{s.plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price[t.country === 'UAE' ? 'AED' : 'USD'], t.country === 'UAE' ? 'AED' : 'USD')}</option>)}</select></Field>
          <Field label="Billing" id="tn-bill"><select id="tn-bill" value={v.billing} onChange={(e) => setV({ ...v, billing: e.target.value as Tenant['billing'] })}><option value="monthly">Monthly</option><option value="yearly">Yearly (−{Math.round(YEARLY_DISCOUNT * 100)}%)</option></select></Field>
          <Field label="Status" id="tn-st" wide><select id="tn-st" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as TenantStatus })}>{(Object.keys(ST) as TenantStatus[]).map((k) => <option key={k} value={k}>{ST[k].label}</option>)}</select></Field>
        </div>
        <p className="muted">{plan.name} includes: {plan.features.join(', ').toLowerCase()}.</p>
        {t.status === 'trial' && <div className="note"><Icon n="clock" size={16} /><span>Trial ends {fmtDate(t.trialEnds!, { day: 'numeric', month: 'long' })}. <button type="button" className="lnk lnk--btn" onClick={() => save({ trialEnds: addDays(t.trialEnds!, 7) }, 'Trial extended by 7 days')}>Extend by 7 days</button></span></div>}
        {t.status === 'past-due' && <div className="note note--red"><Icon n="card" size={16} /><span>The last payment failed. Saatio retries automatically and emails the owner.</span></div>}
        {t.id === 't0' && <button type="button" className="btn btn--ghost" onClick={() => go('app')}><Icon n="logout" size={16} /> Open this business’s dashboard</button>}
      </div>
    </Drawer>
  );
}

function Businesses() {
  const { s } = useStore();
  const [q, setQ] = useState(''); const [st, setSt] = useState<TenantStatus | 'all'>('all'); const [plan, setPlan] = useState<Plan['id'] | 'all'>('all'); const [country, setCountry] = useState<'all' | 'UAE' | 'USA'>('all');
  const [open, setOpen] = useState<Tenant | null>(null);
  const list = useMemo(() => s.tenants.filter((t) => (st === 'all' || t.status === st) && (plan === 'all' || t.plan === plan) && (country === 'all' || t.country === country) && `${t.name} ${t.city} ${t.owner} ${t.email}`.toLowerCase().includes(q.toLowerCase())), [s.tenants, q, st, plan, country]);
  return (
    <>
      <PageHead title="Businesses" sub={`${list.length} of ${s.tenants.length} · ${usd(list.reduce((a, t) => a + tenantMrr(t, s.plans), 0))} MRR`} />
      <div className="tools">
        <label className="search"><Icon n="search" size={17} /><span className="sr-only">Search businesses</span><input type="search" placeholder="Name, city or owner" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="sel"><span className="sr-only">Status</span><select value={st} onChange={(e) => setSt(e.target.value as TenantStatus | 'all')}><option value="all">All statuses</option>{(Object.keys(ST) as TenantStatus[]).map((k) => <option key={k} value={k}>{ST[k].label}</option>)}</select></label>
        <label className="sel"><span className="sr-only">Plan</span><select value={plan} onChange={(e) => setPlan(e.target.value as Plan['id'] | 'all')}><option value="all">All plans</option>{s.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <div className="seg" role="radiogroup" aria-label="Country">{(['all', 'UAE', 'USA'] as const).map((c) => <button key={c} type="button" role="radio" aria-checked={country === c} onClick={() => setCountry(c)}>{c === 'all' ? 'Both' : c}</button>)}</div>
      </div>
      <div className="tbl">
        <table>
          <thead><tr><th>Business</th><th>Location</th><th>Plan</th><th className="num">Team</th><th className="num">Bookings, 30 days</th><th className="num">MRR</th><th>Status</th></tr></thead>
          <tbody>{list.map((t) => (
            <tr key={t.id} tabIndex={0} onClick={() => setOpen(t)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(t); }}>
              <td><span className="who"><span className="av av--sm" style={{ background: IND_COL[t.industry] }}>{initials(t.name)}</span><span><b>{t.name}</b><small>{INDUSTRIES[t.industry].label} · {t.owner}</small></span></span></td>
              <td>{t.city}<small>{t.country}</small></td>
              <td>{s.plans.find((p) => p.id === t.plan)?.name}<small>{t.billing === 'yearly' ? 'Yearly' : 'Monthly'}</small></td>
              <td className="num">{t.staff}</td><td className="num">{t.bookings30.toLocaleString('en-US')}</td><td className="num">{usd(tenantMrr(t, s.plans))}</td>
              <td><span className={ST[t.status].cls}>{ST[t.status].label}</span>{t.status === 'trial' && t.trialEnds && <small>ends {fmtDate(t.trialEnds)}</small>}</td>
            </tr>
          ))}</tbody>
        </table>
        {!list.length && <p className="empty">No businesses match.</p>}
      </div>
      {open && <TenantDrawer key={open.id} t={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Plans() {
  const { s, set } = useStore(); const toast = useToast();
  const [ps, setPs] = useState<Plan[]>(() => JSON.parse(JSON.stringify(s.plans)));
  const dirty = JSON.stringify(ps) !== JSON.stringify(s.plans);
  const up = (i: number, p: Partial<Plan>) => setPs((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const save = () => {
    if (ps.some((p) => !(p.price.AED > 0) || !(p.price.USD > 0) || !p.name.trim())) { toast('Every plan needs a name and prices above zero'); return; }
    set((x) => ({ ...x, plans: ps })); toast('Plans published. The pricing page is updated.');
  };
  return (
    <>
      <PageHead title="Plans and pricing" sub="What businesses see on the pricing page and at sign-up. Existing customers keep their price until renewal.">
        <Link to="pricing" className="btn btn--ghost btn--sm">View pricing page</Link>
      </PageHead>
      <div className="plans-ed">{ps.map((p, i) => (
        <section key={p.id} className={`card ${p.featured ? 'card--ai' : ''}`}>
          <header className="card__h"><h2>{p.name || 'Untitled'}</h2><span className="muted">{s.tenants.filter((t) => t.plan === p.id && t.status !== 'cancelled').length} businesses</span></header>
          <div className="form">
            <Field label="Name" id={`pl-n-${i}`}><input id={`pl-n-${i}`} value={p.name} onChange={(e) => up(i, { name: e.target.value })} /></Field>
            <Field label="Team members" id={`pl-s-${i}`}><input id={`pl-s-${i}`} value={p.staff} onChange={(e) => up(i, { staff: e.target.value })} /></Field>
            <Field label="AED per month" id={`pl-a-${i}`}><input id={`pl-a-${i}`} type="number" value={p.price.AED || ''} onChange={(e) => up(i, { price: { ...p.price, AED: Number(e.target.value) } })} /></Field>
            <Field label="USD per month" id={`pl-u-${i}`}><input id={`pl-u-${i}`} type="number" value={p.price.USD || ''} onChange={(e) => up(i, { price: { ...p.price, USD: Number(e.target.value) } })} /></Field>
            <Field label="Short description" id={`pl-b-${i}`} wide><input id={`pl-b-${i}`} value={p.blurb} onChange={(e) => up(i, { blurb: e.target.value })} /></Field>
            <Field label="Features, one per line" id={`pl-f-${i}`} wide><textarea id={`pl-f-${i}`} rows={5} value={p.features.join('\n')} onChange={(e) => up(i, { features: e.target.value.split('\n') })} /></Field>
            <label className="ck fld--wide"><input type="radio" name="featured" checked={!!p.featured} onChange={() => setPs((l) => l.map((x, k) => ({ ...x, featured: k === i })))} /> Highlight as “Most popular”</label>
          </div>
        </section>
      ))}</div>
      <div className={`savebar ${dirty ? 'is-on' : ''}`} aria-hidden={!dirty}><span>Unsaved changes</span><button type="button" className="btn btn--sm btn--ghost" tabIndex={dirty ? 0 : -1} onClick={() => setPs(JSON.parse(JSON.stringify(s.plans)))}>Discard</button><button type="button" className="btn btn--sm btn--primary" tabIndex={dirty ? 0 : -1} onClick={() => { setPs((l) => l.map((p) => ({ ...p, features: p.features.map((f) => f.trim()).filter(Boolean) }))); save(); }}>Publish</button></div>
    </>
  );
}

export default function AdminApp({ route }: { route: string }) {
  const { s } = useStore(); const [open, setOpen] = useState(false);
  const trials = s.tenants.filter((t) => t.status === 'trial').length;
  return (
    <div className={`ap ap--admin ${open ? 'is-open' : ''}`}>
      <aside className="ap__side" aria-label="Admin">
        <Link to="" className="ap__brand" aria-label="Saatio home"><Logo light /></Link>
        <div className="ap__biz"><span className="ap__mono ap__mono--dark"><Icon n="shield" size={18} /></span><div><b>Saatio admin</b><small>Internal team panel</small></div></div>
        <nav>{NAV.map((n) => <Link key={n.to} to={n.to} className={route === n.to ? 'is-on' : ''} aria-current={route === n.to ? 'page' : undefined} onClick={() => setOpen(false)}><Icon n={n.icon} size={19} />{n.label}{n.to === 'admin-businesses' && trials > 0 && <span className="ap__count">{trials} trials</span>}</Link>)}</nav>
        <div className="ap__foot"><Link to="app" className="ap__booklink"><Icon n="building" size={17} /><span><b>Business dashboard</b><small>Noor Beauty Lounge demo</small></span></Link><Link to="" className="ap__out"><Icon n="logout" size={17} /> Back to the website</Link></div>
      </aside>
      <button type="button" className="ap__scrim" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} />
      <div className="ap__main">
        <header className="ap__top">
          <button type="button" className="ap__burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon n="menu" size={22} /></button>
          <span className="ap__topsym"><Symbol /></span>
          <p className="ap__demo">Concept admin panel · sample businesses · changes are saved in this browser</p>
          <span className="ap__me" style={{ background: 'var(--violet)' }} title="Arooj, Saatio team">AF</span>
        </header>
        <main id="main" className="ap__view page-in" key={route}>{route === 'admin-businesses' ? <Businesses /> : route === 'admin-plans' ? <Plans /> : <Overview />}</main>
      </div>
    </div>
  );
}
