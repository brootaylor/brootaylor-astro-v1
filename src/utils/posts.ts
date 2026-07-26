import { getCollection } from 'astro:content';

// The single definition of "a post the public should see": not a draft, newest first.
// Both the listing page and the RSS feed call this, so a draft can't leak into one
// after being filtered out of the other — the same reasoning behind `date.ts`.
export const getPublishedPosts = async () => {
  const published = await getCollection('posts', ({ data }) => data.draft !== true);

  return published.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
};
