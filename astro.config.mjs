import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Production URL, used only to build absolute URLs (sitemap, RSS, canonical/OG tags).
  // It has no effect on the dev server, which still serves localhost:4321.
  site: "https://playground.brootaylor.com",
});
