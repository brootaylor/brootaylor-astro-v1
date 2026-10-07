// Adds a <lastmod> to each post's sitemap entry: the post's `updated` date if it has one,
// otherwise its `date`. Passed to the sitemap integration as `serialize` in astro.config.mjs.
//
// Unlike the other utils, this is config-time code: only astro.config.mjs imports it, and nothing
// in the pages can use it. Every page other than a post gets no <lastmod>, which is better than a
// guess: a date that changes on every deploy would teach crawlers to ignore the field.
//
// Why it reads the files itself instead of calling `getCollection()` like posts.ts does:
// astro.config.mjs runs before Astro's content layer exists, so `astro:content` isn't available.
// The cost is a second copy of the "updated, else date" rule that PostsLayout applies, so keep
// the two in step. It only handles simple `key: value` frontmatter lines and a flat posts folder,
// which is all there is today. That's also why it's plain `.mjs` rather than `.ts`.
import { readdirSync, readFileSync } from 'node:fs';

const postsDir = new URL('../content/posts/', import.meta.url);

// Slug -> last modified Date, built once when the config loads.
const lastmods = new Map();

for (const file of readdirSync(postsDir).filter((name) => /\.mdx?$/.test(name))) {
  const source = readFileSync(new URL(file, postsDir), 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const read = (key) => frontmatter.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm'))?.[1];

  // A bare day parses as UTC midnight, the same as YAML does when Astro loads the post.
  const lastmod = new Date(read('updated') ?? read('date'));
  if (!Number.isNaN(lastmod.valueOf())) lastmods.set(file.replace(/\.mdx?$/, ''), lastmod);
}

export const addPostLastmod = (item) => {
  const slug = new URL(item.url).pathname.match(/^\/posts\/([^/]+)\/$/)?.[1];
  const lastmod = lastmods.get(slug);

  return lastmod ? { ...item, lastmod: lastmod.toISOString() } : item;
};
