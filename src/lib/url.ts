/**
 * Prefix a root-relative path with the configured `base` from astro.config.
 *
 * Why: GitHub Pages *project* sites are served under /repo-name/, so a link to
 * `/tag/foo/` must become `/repo-name/tag/foo/`. Set BASE_PATH when building for
 * such a site; for local builds / user sites / Cloudflare Pages, base is `/`
 * and this is a no-op.
 */
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}${path}`;
}
