import { getCollection } from 'astro:content';

// The single definition of "a post the public should see": not a draft, newest first.
// The listing page, the post pages, the RSS feed and the offline page all call this, so a draft
// can't leak into one surface after being filtered out of another.
//
// Under `npm run dev` drafts are included, so a draft can be read in place, in the listing and
// at its own URL, before it's published. A build (`import.meta.env.DEV` is false) leaves them
// out, so no page is ever generated for one.
export const getPublishedPosts = async () => {
  const published = await getCollection('posts', ({ data }) => data.draft !== true || import.meta.env.DEV);

  return published.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
};
