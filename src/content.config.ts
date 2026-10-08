// 1. Import utilities from `astro:content`
import { defineCollection } from 'astro:content';

// 2. Import loader(s)
import { glob } from 'astro/loaders';

// 3. Import Zod
import { z } from 'astro/zod';

// 4. Defining collection(s)
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    draft: z.boolean().optional(),
    // Optional so a post without one still builds. Where absent, the page falls back to the
    // site-wide description — correct, but identical across every post, so it's worth filling
    // in per post. Every current post has one.
    description: z.string().optional(),
    // When a post was last meaningfully changed. Optional: most posts never need it. Same format
    // as `date`, so it can be a bare day or carry a time. It's shown on the post page and used as
    // the post's <lastmod> in the sitemap (src/utils/sitemap-lastmod.mjs). Sorting and the feed
    // still go by `date`, so editing a post never reshuffles the list.
    updated: z.date().optional()
  }).refine((post) => !post.updated || post.updated >= post.date, {
    // Catches a mistyped year or a swapped pair at build time, instead of printing an "Updated"
    // that predates the post itself.
    message: '`updated` can\'t be earlier than `date`',
    path: ['updated']
  }),
});

// 5. Exporting collection(s) to be used in `getCollection()`
export const collections = { posts };
