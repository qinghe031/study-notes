import site from '../data/site.json';
import galleryData from '../data/gallery.json';
import nowPlayingData from '../data/now-playing.json';
import guestbookData from '../data/guestbook.json';
import interactions from '../data/interactions.json';

export interface NavItem {
  label: string;
  href: string;
}

export interface SiteConfig {
  title: string;
  description: string;
  author: string;
  slogan: string;
  footer: string;
  postsPerPage: number;
  /** Where the hosted site's "write/edit" buttons commit to. */
  github: { owner: string; repo: string; branch: string };
  social: { github: string; email: string; bilibili: string };
}

const NAV: NavItem[] = [
  { label: '首页', href: '/' },
  { label: '归档', href: '/archive/' },
  { label: '分类', href: '/category/' },
  { label: '标签', href: '/tag/' },
  { label: '相册', href: '/gallery/' },
  { label: '在听', href: '/now-playing/' },
  { label: '浪费时间', href: '/time/' },
  { label: '留言板', href: '/guestbook/' },
  { label: '关于', href: '/about/' },
];

export const SITE: SiteConfig = { ...(site as SiteConfig) };
export const SITE_NAV = NAV;

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

/* ── 在听什么(网易云) ─────────────────────────────────────────────────── */
export interface Track {
  title: string;
  artist?: string;
  neteaseId?: string;
  cover?: string;
  /** Plain text or LRC ("[mm:ss.xx] line"). Shown beside the turntable. */
  lyrics?: string;
}
export interface Playlist {
  title: string;
  description?: string;
  /** 网易云歌单 ID。填了整单可播;不填则逐首列 tracks。 */
  neteaseId?: string;
  tracks?: Track[];
}
export interface NowPlayingConfig {
  nowPlaying: Track;
  playlists: Playlist[];
}
export const NOW_PLAYING = nowPlayingData as NowPlayingConfig;

/**
 * 网易云官方外链播放器。type: 2 = 单曲, 0 = 歌单。
 * auto=1 会自动播放(浏览器可能拦截,唱片机点击后再加载就不会被拦)。
 */
export function neteaseEmbedUrl(id: string, kind: 'song' | 'playlist' = 'song', auto = 0) {
  const type = kind === 'playlist' ? 0 : 2;
  return `https://music.163.com/outchain/player?type=${type}&id=${id}&auto=${auto}&height=66`;
}

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
