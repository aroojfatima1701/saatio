import { useEffect } from 'react';
import { useRoute } from './lib/router';
import { StoreProvider } from './lib/store';
import { ToastProvider } from './components/ui';
import { Footer, Header } from './components/Site';
import Home from './views/Home';
import Pricing from './views/Pricing';
import Signup from './views/Signup';
import Book from './views/Book';
import BusinessApp from './app/BusinessApp';
import AdminApp from './admin/AdminApp';
import DemoTour from './components/DemoTour';

const TITLES: Record<string, string> = {
  '': 'Saatio · Smarter scheduling for salons, clinics, spas and gyms', pricing: 'Pricing · Saatio', signup: 'Start your free trial · Saatio',
  book: 'Book at Noor Beauty Lounge · Saatio',
};

function Shell() {
  const route = useRoute();
  useEffect(() => { document.title = TITLES[route] ?? (route.startsWith('admin') ? 'Saatio admin' : 'Noor Beauty Lounge · Saatio'); }, [route]);
  const tour = <DemoTour route={route} />;
  if (route.startsWith('app')) return <><BusinessApp route={route} />{tour}</>;
  if (route.startsWith('admin')) return <><AdminApp route={route} />{tour}</>;
  if (route === 'book') return <><main id="main"><Book /></main>{tour}</>;
  return (
    <>
      <a href="#main" className="skip" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <div className="ribbon">Concept project · sample businesses and data</div>
      <Header route={route} />
      <main id="main" tabIndex={-1} key={route} className="page-in">{route === 'pricing' ? <Pricing /> : route === 'signup' ? <Signup /> : <Home />}</main>
      {route !== 'signup' && <Footer />}
      {tour}
    </>
  );
}

export default function App() {
  return <StoreProvider><ToastProvider><Shell /></ToastProvider></StoreProvider>;
}
