import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Every file under src/content/notes/**/*.md becomes one note.
// The `slug` (URL) is derived from the file path: `2026-10-09-foo.md` → `/notes/2026-10-09-foo/`.
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      category: z.string().default('未分类'),
      tags: z.array(z.string()).default([]),
      summary: z.string().optional(),
      cover: image().optional(),
      sticky: z.number().int().min(0).default(0),
      draft: z.boolean().default(false),
    }),
});

export const collections = { notes };
