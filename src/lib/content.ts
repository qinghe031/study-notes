import { getCollection, type CollectionEntry } from 'astro:content';
import { withBase } from './url';

export type Note = CollectionEntry<'notes'>;

/** Published notes, sticky first, then newest first. */
export async function getNotes(): Promise<Note[]> {
  const all = await getCollection('notes', ({ data }) => !data.draft || import.meta.env.DEV);
  return all.sort((a, b) => {
    if (b.data.sticky !== a.data.sticky) return b.data.sticky - a.data.sticky;
    return b.data.date.getTime() - a.data.date.getTime();
  });
}

export function noteHref(note: Note) {
  return withBase(`/notes/${note.id}/`);
}

export { withBase };

export function slugify(value: string) {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, '-'));
}

/** Rough reading time in minutes — CJK counted per character, Latin per word. */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const cjk = (body.match(/[一-鿿㐀-䶿぀-ヿ가-힯]/g) || []).length;
  const latinWords = body
    .replace(/[一-鿿㐀-䶿぀-ヿ가-힯]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = cjk / 400 + latinWords / 200;
  return Math.max(1, Math.round(minutes));
}

export function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface Bucket {
  name: string;
  slug: string;
  count: number;
}

export function countBy(notes: Note[], pick: (n: Note) => string[]): Bucket[] {
  const map = new Map<string, number>();
  for (const n of notes) for (const k of pick(n)) map.set(k, (map.get(k) || 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
}

export function getCategories(notes: Note[]) {
  return countBy(notes, (n) => [n.data.category]);
}

export function getTags(notes: Note[]) {
  return countBy(notes, (n) => n.data.tags);
}

export function groupByYear(notes: Note[]) {
  const map = new Map<number, Note[]>();
  for (const n of notes) {
    const y = n.data.date.getFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(n);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
}

/** Prev / next by date, ignoring sticky order. */
export function adjacent(notes: Note[], current: Note) {
  const byDate = [...notes].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  const i = byDate.findIndex((n) => n.id === current.id);
  return {
    newer: i > 0 ? byDate[i - 1] : null,
    older: i >= 0 && i < byDate.length - 1 ? byDate[i + 1] : null,
  };
}

export interface TocItem {
  depth: number;
  slug: string;
  text: string;
}

/** Nest flat Astro headings (h2/h3) for the sidebar TOC. */
export function filterToc(headings: TocItem[]): TocItem[] {
  return headings.filter((h) => h.depth >= 2 && h.depth <= 3);
}

/** Related notes: shared tags weigh most, same category next, recency breaks ties. */
export function related(notes: Note[], current: Note, limit = 3): Note[] {
  const tags = new Set(current.data.tags);
  return notes
    .filter((n) => n.id !== current.id)
    .map((n) => {
      const shared = n.data.tags.filter((t) => tags.has(t)).length;
      const sameCat = n.data.category === current.data.category ? 1 : 0;
      return { n, score: shared * 3 + sameCat * 2 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.n.data.date.getTime() - a.n.data.date.getTime())
    .slice(0, limit)
    .map((x) => x.n);
}
