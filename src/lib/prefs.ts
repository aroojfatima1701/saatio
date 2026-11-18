import { useSyncExternalStore } from 'react';
import type { Currency } from './data';

// Visitor's chosen currency on the marketing site (AED for the UAE, USD for the USA).
let cur: Currency = (() => { try { return localStorage.getItem('saatio-cur') === 'USD' ? 'USD' : 'AED'; } catch { return 'AED'; } })();
const subs = new Set<() => void>();
export function setCurrency(c: Currency) { cur = c; try { localStorage.setItem('saatio-cur', c); } catch { /* memory only */ } subs.forEach((f) => f()); }
export function useCurrency(): Currency { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => cur, () => cur); }
