// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import devWriter from './scripts/dev-writer.mjs';

// `SITE_URL` is only used for the sitemap / RSS absolute links when you deploy.
// For a purely local build it can stay as the placeholder below.
const SITE_URL = process.env.SITE_URL || 'https://example.com';
// `BASE_PATH` is for GitHub Pages *project* sites served under /repo-name/.
// Leave it unset for user sites (username.github.io), Cloudflare Pages, or local builds.
const BASE_PATH = process.env.BASE_PATH || '/';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  // Emit a plain static site — no server, no database, no accounts.
  output: 'static',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: 'heading-anchor' } }],
      rehypeKatex,
    ],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss(), devWriter()],
  },
});
