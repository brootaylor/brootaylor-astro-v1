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
    // Optional so existing posts keep building. Where absent, the page falls back to the
    // site-wide description — correct, but identical across every post, so it's worth
    // filling in per post over time.
    description: z.string().optional()
  }),
});

// 5. Exporting collection(s) to be used in `getCollection()`
export const collections = { posts };
