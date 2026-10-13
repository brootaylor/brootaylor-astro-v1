// The site's content collections: just the posts for now. Each post's frontmatter is checked
// against the schema below, and a post that fails it fails the build.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Frontmatter times are London clock time; this turns them into the real moment. See date.ts.
import { fromLondonTime } from './utils/date';

const posts = defineCollection({
  // Markdown only. `.mdx` would need the @astrojs/mdx integration, which isn't installed: without
  // it the loader skips an `.mdx` file with just a warning. src/utils/sitemap-lastmod.ts reads the
  // same files, so change its file pattern too if this ever changes.
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  // Keys in the same order as post frontmatter: title, description, date, updated, draft.
  schema: z.object({
    title: z.string(),
    // Optional so a post without one still builds. Where absent, the page falls back to the
    // site-wide description — correct, but identical across every post, so it's worth filling
    // in per post. Every current post has one.
    description: z.string().optional(),
    // A bare day (`2026-10-08`) or a London clock time with no `Z` (`2026-10-08T23:16:48`).
    date: z.date().transform(fromLondonTime),
    // When a post was last meaningfully changed. Optional: most posts never need it. Same format
    // as `date`, so it can be a bare day or carry a time. It's shown on the post page and used as
    // the post's <lastmod> in the sitemap (src/utils/sitemap-lastmod.ts). Sorting and the feed
    // still go by `date`, so editing a post never reshuffles the list.
    updated: z.date().transform(fromLondonTime).optional(),
    draft: z.boolean().optional(),
  }).refine((post) => !post.updated || post.updated >= post.date, {
    // Catches a mistyped year or a swapped pair at build time, instead of printing an "Updated"
    // that predates the post itself.
    message: '`updated` can\'t be earlier than `date`',
    path: ['updated'],
  }),
});

// Read with `getCollection('posts')`, which only src/utils/posts.ts calls.
export const collections = { posts };
