// Adds a <lastmod> to each post's sitemap entry: the post's `updated` date if it has one,
// otherwise its `date`. Passed to the sitemap integration as `serialize` in astro.config.mjs.
//
// Unlike the other utils, this is config-time code: only astro.config.mjs imports it, and nothing
// in the pages can use it. Every page other than a post gets no <lastmod>, which is better than a
// guess: a date that changes on every deploy would teach crawlers to ignore the field.
//
// Why it reads the files itself instead of calling `getCollection()` like posts.ts does:
// astro.config.mjs runs before Astro's content layer exists, so `astro:content` isn't available.
// The cost is a second copy of how the content schema (src/content.config.ts) reads a date: the
// YAML parsing below and the London conversion. If the schema's date handling changes, change
// this too.
//
// Limits, all fine today: it only handles simple `key: value` frontmatter lines and a flat posts
// folder, and it matches a post by its filename. The glob loader builds `post.id` (and so the
// URL) by slugifying the filename, or from a `slug` in frontmatter, so a filename that isn't
// already a slug (capitals, dots, spaces) or a `slug` override would quietly lose its <lastmod>.
import { readdirSync, readFileSync } from 'node:fs';
import { fromLondonTime } from './date';

const postsDir = new URL('../content/posts/', import.meta.url);

// Slug -> last modified Date, built once when the config loads.
const lastmods = new Map();

for (const file of readdirSync(postsDir).filter((name) => /\.mdx?$/.test(name))) {
  const source = readFileSync(new URL(file, postsDir), 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const read = (key: string) => frontmatter.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm'))?.[1];

  // Read the value the way YAML does when Astro loads the post: a bare day as UTC midnight, and a
  // time with no zone as UTC too (JavaScript alone would use the build machine's zone). Then treat
  // it as London clock time, exactly as the content schema does.
  const value = read('updated') ?? read('date') ?? '';
  const asYaml = /T[\d:.]+$/.test(value) ? `${value}Z` : value;
  const parsed = new Date(asYaml);
  if (!Number.isNaN(parsed.valueOf())) lastmods.set(file.replace(/\.mdx?$/, ''), fromLondonTime(parsed));
}

export const addPostLastmod = (item: { url: string }) => {
  const slug = new URL(item.url).pathname.match(/^\/posts\/([^/]+)\/$/)?.[1];
  const lastmod = lastmods.get(slug);

  return lastmod ? { ...item, lastmod: lastmod.toISOString() } : item;
};
