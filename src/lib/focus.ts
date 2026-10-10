// Shared focus-time store. Everything lives in localStorage so it works offline
// and needs no backend. Each visitor's numbers are their own.
//
// Storage shape (key: focus-time:v1):
//   { days: { "2026-10-10": 1234, ... } }   // seconds per local calendar day

export const FOCUS_KEY = 'focus-time:v1';
export const FOCUS_EVENT = 'focus-time:tick';

export interface FocusStore {
  days: Record<string, number>;
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function load(): FocusStore {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.days === 'object') return parsed;
    }
  } catch {}
  return { days: {} };
}

export function save(store: FocusStore) {
  try {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(store));
  } catch {}
}

export function addSeconds(sec: number, date = new Date()) {
  const store = load();
  const k = todayKey(date);
  store.days[k] = (store.days[k] || 0) + sec;
  save(store);
  window.dispatchEvent(new CustomEvent(FOCUS_EVENT, { detail: { today: store.days[k] } }));
  return store.days[k];
}

export function todaySeconds(): number {
  return load().days[todayKey()] || 0;
}

export function totalSeconds(): number {
  return Object.values(load().days).reduce((a, b) => a + b, 0);
}

/** Format seconds as "1h 23m" / "23m" / "45s". */
export function fmt(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Format as HH:MM:SS. */
export function fmtClock(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Last N days as [{key, seconds}], oldest first, zero-filled. */
export function lastDays(n: number): { key: string; seconds: number; date: Date }[] {
  const store = load();
  const out: { key: string; seconds: number; date: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const k = todayKey(d);
    out.push({ key: k, seconds: store.days[k] || 0, date: d });
  }
  return out;
}

/** Consecutive days (ending today or yesterday) with any focus time. */
export function streak(): number {
  const store = load();
  const now = new Date();
  let n = 0;
  for (let i = 0; i < 3650; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const k = todayKey(d);
    if (store.days[k] > 0) n++;
    else if (i === 0) continue; // today may not have started yet
    else break;
  }
  return n;
}
