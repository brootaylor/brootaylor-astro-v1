import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { addPostLastmod } from "./src/utils/sitemap-lastmod.mjs";

// https://astro.build/config
export default defineConfig({
  // Production URL, used only to build absolute URLs (sitemap, RSS, canonical/OG tags).
  // It has no effect on the dev server, which still serves localhost:4321.
  site: "https://playground.brootaylor.com",

  integrations: [
    sitemap({
      // The feed is for readers, not crawlers, and isn't an HTML page. Everything else the
      // build emits is a real page worth indexing.
      filter: (page) => !page.endsWith("/rss.xml"),
      // Gives each post a <lastmod>. See the helper for why only posts.
      serialize: addPostLastmod,
    }),
  ],
});
