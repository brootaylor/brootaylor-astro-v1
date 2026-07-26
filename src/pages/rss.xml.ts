// Builds /rss.xml at build time. A static endpoint, so nothing here runs in the browser.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { render } from 'astro:content';

// Astro's Container API renders a post through Astro's own pipeline, giving the feed exactly
// the HTML the site serves — Shiki-highlighted code blocks included. The documented
// `markdown-it` + `sanitize-html` recipe would re-parse the Markdown separately, costing two
// more dependencies and flattening every code fence to unstyled markup. Note the
// `experimental_` prefix: this API can change between Astro minors, so it's worth a glance
// at the changelog on upgrade.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

// Shared with the listing page so the draft filter and sort order can't drift apart.
import { getPublishedPosts } from '../utils/posts';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  const container = await AstroContainer.create();

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);

      return {
        title: post.data.title,
        pubDate: post.data.date,
        // Trailing slash to match the directory that static output actually writes, so feed
        // readers and the site agree on a post's identity.
        link: `/posts/${post.id}/`,
        content: await container.renderToString(Content),
      };
    })
  );

  return rss({
    title: "Broo's Playground Website",
    description: 'An experimental/playground website of sorts using the Astro web framework.',
    // `context.site` comes from `site` in astro.config.mjs, which is what makes the relative
    // `link` values above resolve to absolute URLs.
    site: context.site!,
    items,
    customData: '<language>en-gb</language>',
  });
}
