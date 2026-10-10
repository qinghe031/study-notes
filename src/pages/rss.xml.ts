import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNotes, noteHref } from '../lib/content';
import { SITE } from '../lib/site';

export async function GET(context: APIContext) {
  const notes = await getNotes();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    items: notes.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      description: n.data.summary,
      link: noteHref(n),
      categories: [n.data.category, ...n.data.tags],
    })),
  });
}
