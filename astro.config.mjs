import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { addPostLastmod } from "./src/utils/sitemap-lastmod.ts";

// https://astro.build/config
export default defineConfig({
  // Production URL, used only to build absolute URLs (sitemap, RSS, canonical/OG tags).
  // It has no effect on the dev server, which still serves localhost:4321.
  site: "https://playground.brootaylor.com",

  build: {
    // Always emit the CSS as an external file, however small. The default ("auto") inlines anything
    // under 4 kB, which would flip the site's behaviour the moment the CSS crossed that line, as
    // it did when transitions.css landed. A hashed file is cached across pages, and keeps the HTML
    // free of stylesheet. Cache headers for it are in netlify.toml.
    inlineStylesheets: "never",
  },

  vite: {
    environments: {
      client: {
        build: {
          rolldownOptions: {
            output: {
              // Astro names a script after the component that holds it, which gives
              // `ThemeToggle.astro_astro_type_script_index_0_lang.<hash>.js`. Keep just the
              // component name: `ThemeToggle.<hash>.js`. A site-wide entry, if one is ever added
              // as src/scripts/main.ts, is named `main` instead; matching on the file the chunk
              // contains means it doesn't matter which component loads it.
              entryFileNames(chunkInfo) {
                if (chunkInfo.moduleIds.some((id) => id.endsWith("/src/scripts/main.ts"))) {
                  return "_astro/main.[hash].js";
                }
                const name = chunkInfo.name.replace(/\.astro_astro_type_script_index_\d+_lang$/, "");
                return `_astro/${name}.[hash].js`;
              },
            },
          },
        },
      },
    },
    build: {
      // One stylesheet for the whole site. By default the build splits out a separate file for
      // each page's own styles, and on this site those are around 95 bytes each: not worth a
      // second request. Everything lands in the shared file instead.
      cssCodeSplit: false,
      // Never inline a bundled asset, whatever its size. By default Astro inlines a script under
      // 4 kB into every page, so a script would switch from inline to external the day it grew past
      // that, as the CSS did. This keeps bundled scripts external from the start. It does not affect
      // `is:inline` scripts, which Astro leaves alone.
      assetsInlineLimit: 0,
      rolldownOptions: {
        output: {
          // With CSS code splitting off, Vite emits the one stylesheet as `style.<hash>.css`.
          // Call it `main` instead, to match the script. Everything else keeps Astro's own naming,
          // which this function has to reproduce because it replaces it.
          assetFileNames(assetInfo) {
            const name = assetInfo.names?.[0] ?? "";
            if (name === "style.css") return "_astro/main.[hash][extname]";
            return "_astro/[name].[hash][extname]";
          },
        },
      },
    },
  },

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
