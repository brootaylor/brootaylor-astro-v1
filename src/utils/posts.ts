import { getCollection } from 'astro:content';

// The single definition of "a post the public should see": not a draft, newest first.
// The listing page, the post pages and the RSS feed all call this, so a draft can't leak into
// one surface after being filtered out of another.
export const getPublishedPosts = async () => {
  const published = await getCollection('posts', ({ data }) => data.draft !== true);

  return published.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
};
