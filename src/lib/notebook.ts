// Local-first notebook store. Everything you write lives here first (in this
// browser), with per-keystroke autosave. Publishing is a separate, deliberate
// "sync" step that commits to GitHub. Nothing is public until you sync it.
//
// Storage key: notebook:v1
//   {
//     notes: { [slug]: NoteDraft },
//     stickies: Sticky[],
//     countdowns: Countdown[],
//     deleted: { [slug]: true }   // tombstones: synced notes you removed locally
//   }

export const NB_KEY = 'notebook:v1';
export const NB_EVENT = 'notebook:change';

export interface NoteDraft {
  slug: string;
  title: string;
  date: string;      // YYYY-MM-DD
  category: string;
  tags: string[];
  summary: string;
  sticky: number;
  draft: boolean;
  body: string;
  updatedAt: number;   // local edit time
  syncedAt?: number;   // last successful sync
  syncedHash?: string; // content hash at last sync, to know if dirty
  sha?: string;        // GitHub blob sha from last sync
}

export interface Sticky {
  id: string;
  text: string;
  color: string;       // sky | dawn | lavender | meadow | blossom | lagoon | peach | mist
  createdAt: number;
}

export interface Countdown {
  id: string;
  label: string;
  date: string;        // YYYY-MM-DD
}

export interface Notebook {
  notes: Record<string, NoteDraft>;
  stickies: Sticky[];
  countdowns: Countdown[];
  deleted: Record<string, true>;
  miscSyncedHash?: string; // hash of stickies+countdowns at last sync
}

const empty = (): Notebook => ({ notes: {}, stickies: [], countdowns: [], deleted: {} });

export function load(): Notebook {
  try {
    const raw = localStorage.getItem(NB_KEY);
    if (raw) {
      const j = JSON.parse(raw);
      return { ...empty(), ...j, notes: j.notes || {}, stickies: j.stickies || [], countdowns: j.countdowns || [], deleted: j.deleted || {} };
    }
  } catch {}
  return empty();
}

export function save(nb: Notebook) {
  try { localStorage.setItem(NB_KEY, JSON.stringify(nb)); } catch {}
  window.dispatchEvent(new CustomEvent(NB_EVENT));
}

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function slugify(title: string, date: string) {
  const safe = title.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '') || '未命名';
  return `${date}-${safe}`;
}

/* ── hashing (cheap, for dirty detection) ─────────────────────────────── */
export function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* ── markdown (de)serialisation ───────────────────────────────────────── */
export function toMarkdown(n: NoteDraft): string {
  return [
    '---',
    `title: ${n.title}`,
    `date: ${n.date}`,
    `category: ${n.category || '未分类'}`,
    `tags: [${n.tags.join(', ')}]`,
    n.summary ? `summary: ${n.summary}` : null,
    `sticky: ${n.sticky || 0}`,
    `draft: ${n.draft}`,
    '---',
    '',
    n.body.trim(),
    '',
  ].filter((l) => l !== null).join('\n');
}

export function fromMarkdown(slug: string, src: string, sha?: string): NoteDraft {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm: Record<string, string> = {};
  let body = src;
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv) fm[kv[1]] = kv[2].trim();
    }
    body = m[2].replace(/^\n+/, '').replace(/\s+$/, '');
  }
  const tags = (fm.tags || '').replace(/^\[|\]$/g, '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  const n: NoteDraft = {
    slug,
    title: fm.title || slug,
    date: fm.date || slug.slice(0, 10),
    category: fm.category || '未分类',
    tags,
    summary: fm.summary || '',
    sticky: Number(fm.sticky || 0) || 0,
    draft: fm.draft === 'true',
    body,
    updatedAt: Date.now(),
    sha,
  };
  const md = toMarkdown(n);
  n.syncedHash = hash(md);
  n.syncedAt = Date.now();
  return n;
}

/* ── notes ────────────────────────────────────────────────────────────── */
export function getNote(slug: string): NoteDraft | null {
  return load().notes[slug] || null;
}

export function upsertNote(n: NoteDraft) {
  const nb = load();
  n.updatedAt = Date.now();
  nb.notes[n.slug] = n;
  delete nb.deleted[n.slug];
  save(nb);
  return n;
}

export function removeNote(slug: string) {
  const nb = load();
  const n = nb.notes[slug];
  delete nb.notes[slug];
  // If it was ever synced, remember to delete it remotely on next sync.
  if (n?.syncedAt || n?.sha) nb.deleted[slug] = true;
  save(nb);
}

export function isDirty(n: NoteDraft): boolean {
  return hash(toMarkdown(n)) !== n.syncedHash;
}

export function markSynced(slug: string, sha?: string) {
  const nb = load();
  const n = nb.notes[slug];
  if (!n) return;
  n.syncedAt = Date.now();
  n.syncedHash = hash(toMarkdown(n));
  if (sha) n.sha = sha;
  save(nb);
}

export function clearTombstone(slug: string) {
  const nb = load();
  delete nb.deleted[slug];
  save(nb);
}

/** Everything that needs pushing: dirty notes + tombstones + misc. */
export function pending() {
  const nb = load();
  const notes = Object.values(nb.notes).filter(isDirty);
  const deletions = Object.keys(nb.deleted);
  const miscHash = hash(JSON.stringify({ s: nb.stickies, c: nb.countdowns }));
  const misc = miscHash !== nb.miscSyncedHash;
  return { notes, deletions, misc, count: notes.length + deletions.length + (misc ? 1 : 0) };
}

export function markMiscSynced() {
  const nb = load();
  nb.miscSyncedHash = hash(JSON.stringify({ s: nb.stickies, c: nb.countdowns }));
  save(nb);
}

/* ── stickies ─────────────────────────────────────────────────────────── */
export function setStickies(list: Sticky[]) {
  const nb = load();
  nb.stickies = list;
  save(nb);
}

/* ── countdowns ───────────────────────────────────────────────────────── */
export function setCountdowns(list: Countdown[]) {
  const nb = load();
  nb.countdowns = list;
  save(nb);
}

/** Seed stickies/countdowns from the site's JSON on first visit (so the
 *  owner's published data shows up, and can then be edited locally). */
export function seedMisc(stickies: Sticky[], countdowns: Countdown[]) {
  const nb = load();
  let changed = false;
  if (!nb.stickies.length && stickies.length) { nb.stickies = stickies; changed = true; }
  if (!nb.countdowns.length && countdowns.length) { nb.countdowns = countdowns; changed = true; }
  if (changed) {
    nb.miscSyncedHash = hash(JSON.stringify({ s: nb.stickies, c: nb.countdowns }));
    save(nb);
  }
}

/* ── time helpers ─────────────────────────────────────────────────────── */
export function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return '刚刚';
  if (s < 60) return `${s} 秒前`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}
