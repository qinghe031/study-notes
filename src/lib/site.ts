import site from '../data/site.json';
import galleryData from '../data/gallery.json';
import guestbookData from '../data/guestbook.json';
import interactions from '../data/interactions.json';
import stickiesData from '../data/stickies.json';
import countdownsData from '../data/countdowns.json';

export interface NavItem {
  label: string;
  href: string;
}

export interface SiteConfig {
  title: string;
  description: string;
  author: string;
  tagline: string;
  slogan: string;
  quote: string;
  motto: string;
  footer: string;
  postsPerPage: number;
  /** Where the hosted site's "write/edit" buttons commit to. */
  github: { owner: string; repo: string; branch: string };
  social: { github: string; email: string; bilibili: string };
}

const NAV: NavItem[] = [
  { label: '首页', href: '/' },
  { label: '归档', href: '/archive/' },
  { label: '标签', href: '/tag/' },
  { label: '关于', href: '/about/' },
];

export const SITE: SiteConfig = { ...(site as SiteConfig) };
export const SITE_NAV = NAV;

/* ── 便利贴 / 倒计时(发布版默认值;本地可改,同步后写回) ──────────── */
export interface StickyNote { id: string; text: string; color: string; createdAt: number }
export interface Countdown { id: string; label: string; date: string; note?: string }
export const STICKIES: StickyNote[] = (stickiesData.stickies || []) as StickyNote[];
export const COUNTDOWNS: Countdown[] = (countdownsData.countdowns || []) as Countdown[];

export const THEMES = [
  { id: 'sky', label: '云蓝', swatch: '#7fa8c9' },
  { id: 'dawn', label: '晨金', swatch: '#c9a870' },
  { id: 'lavender', label: '暮紫', swatch: '#a99fcb' },
  { id: 'meadow', label: '草甸', swatch: '#93b490' },
  { id: 'blossom', label: '霞粉', swatch: '#d6a5b0' },
  { id: 'lagoon', label: '湖青', swatch: '#85b3b1' },
  { id: 'peach', label: '暖橘', swatch: '#d6a680' },
  { id: 'mist', label: '雾灰', swatch: '#939aa3' },
] as const;

/* ── 相册 ──────────────────────────────────────────────────────────────── */
export interface Photo {
  src: string;
  caption?: string;
}
export interface Album {
  title: string;
  date?: string;
  description?: string;
  photos: Photo[];
}
export const ALBUMS: Album[] = (galleryData.albums || []) as Album[];
export const ALL_PHOTOS = ALBUMS.flatMap((a) =>
  a.photos.map((p) => ({ ...p, album: a.title, date: a.date })),
);

/* ── 留言板 ────────────────────────────────────────────────────────────── */
export interface GuestbookEntry {
  name: string;
  message: string;
  date?: string;
  avatar?: string;
}
export const GUESTBOOK_ENTRIES: GuestbookEntry[] = (guestbookData.entries || []) as GuestbookEntry[];

/* ── 互动开关 ──────────────────────────────────────────────────────────── */
export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: string;
  term?: string;
  reactionsEnabled: string;
}
export interface InteractionsConfig {
  likes: { provider: string };
  comments: { provider: string; giscus: GiscusConfig };
  guestbook: { provider: string; giscus: GiscusConfig };
}
export const INTERACTIONS = interactions as unknown as InteractionsConfig;

export function giscusReady(cfg: GiscusConfig | undefined): boolean {
  return Boolean(cfg && cfg.repo && cfg.repoId && cfg.categoryId);
}
