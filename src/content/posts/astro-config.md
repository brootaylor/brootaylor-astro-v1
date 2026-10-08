---
title: "How this Astro site is put together"
description: "A tour of the config and architecture behind this site: a tiny Astro config, content collections, layouts, a feed, a sitemap and a build that ships no third party code."
date: 2026-09-14T19:41:08Z
updated: 2026-10-08T10:57:48Z
draft: false
---

This site runs on [Astro](https://astro.build), and I wanted to write down how it all fits together while it's still small enough to hold in my head. Back when I started, I said I wanted to see [how far I could push things with as few npm dependencies as possible](https://brootaylor.com/notes/2026-02-01/note_202602011239), leaning on vanilla JS and CSS wherever I could. Most of what follows is the result of sticking to that.

---

## The shape of it

It's a fully static site. There's no UI framework, no CSS framework and no server rendering. Astro builds plain HTML into `dist/`, and Netlify serves it.

There are three runtime dependencies: `astro`, `@astrojs/rss` and `@astrojs/sitemap`. The two integrations only run at build time, so the site ships no third party code to the browser. `netlify-cli` is in there as a dev dependency for running Netlify locally, but nothing it installs reaches the built site.

---

## The config

`astro.config.mjs` is still short. Here it is with the comments and the filename-handling function trimmed out:

```js
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { addPostLastmod } from "./src/utils/sitemap-lastmod.mjs";

export default defineConfig({
  site: "https://playground.brootaylor.com",

  build: {
    inlineStylesheets: "never",
  },

  vite: {
    environments: {
      client: {
        build: {
          rolldownOptions: {
            output: {
              entryFileNames(chunkInfo) { /* shortens the script file names */ },
            },
          },
        },
      },
    },
    build: {
      cssCodeSplit: false,
      assetsInlineLimit: 0,
      rolldownOptions: {
        output: {
          assetFileNames(assetInfo) { /* names the stylesheet "main" */ },
        },
      },
    },
  },

  integrations: [
    sitemap({
      filter: (page) => !page.endsWith("/rss.xml"),
      serialize: addPostLastmod,
    }),
  ],
});
```

`site` is the production URL, used only to build absolute URLs for the sitemap, the feed and the canonical and Open Graph tags. It doesn't affect the dev server, which still serves `localhost:4321`. The sitemap filter drops `/rss.xml`, because the feed is for readers rather than crawlers, and `serialize` is what adds a `<lastmod>` to posts (more on that below).

### How the CSS and scripts are shipped

These settings are there because I'd rather the site's CSS and JavaScript lived in external files than be scattered through the HTML. Each one does a specific job:

- **`inlineStylesheets: "never"`.** By default Astro inlines a stylesheet into every page while it's under about 4 kB, and links to a file once it's bigger. That means the way the site ships its CSS can flip the moment the stylesheet grows, which is exactly what happened when I added page transitions. I'd rather have an external file anyway, since the CSS will keep growing and a hashed file is cached once and reused on every page. So I made it an explicit choice.
- **`cssCodeSplit: false`.** Out of the box the build also splits out a small extra file for each page's own styles. Mine were around 95 bytes each, which isn't worth a second request. Turning splitting off merges everything into one file, so every page makes a single CSS request.
- **`assetsInlineLimit: 0`.** The same size-based inlining applies to bundled scripts, so a small script would be inlined into every page until it grew past about 4 kB. Setting the limit to zero keeps them external from the start. It doesn't touch the small theme script in the `<head>`, which is marked inline on purpose.
- **`entryFileNames`.** Astro names a script after the component that holds it, so the theme toggle's script would be called something like `ThemeToggle.astro_astro_type_script_index_0_lang.<hash>.js`. This function trims it to `ThemeToggle.<hash>.js`. It also names the site-wide script, `src/scripts/main.ts`, as `main`.
- **`assetFileNames`.** The merged file is called `style` by default. I wanted `main`, to match the script, and there's no simple setting for that, so this function sets it. It replaces Astro's own file naming, so it also has to repeat the plain pattern for everything else. It matches on Vite's default name, so a future Vite change would quietly revert the file to `style`. Nothing would break, but it's worth knowing.

One thing stays inline on purpose: the line that declares the cascade layer order. The production build drops it from the external file, so it has to sit in the `<head>` as an inline style (the [cascade layers post](/posts/css-cascade-layers) has the full story).

---

## Posts are a content collection

Posts are Markdown files in `src/content/posts/`, loaded by Astro's glob loader and checked against a schema. Every post needs a `title` and a `date`, and can optionally have a `draft` flag, a `description` and an `updated` date for when I change a post later on. Miss one of the required fields and the build fails, which I'd much rather find out about now than later. The same goes for an `updated` date that's earlier than the `date`.

The bit I'm happiest with is a tiny helper, `getPublishedPosts()`. It's the one place that decides what counts as a public post: not a draft, newest first. The listing page, the individual post pages and the RSS feed all go through it.

That means a draft isn't hidden so much as never built. There's no page, no listing entry, no feed item and no sitemap entry. The only way to see one is `npm run dev`. I'd originally filtered drafts in one place and found out they were still reachable by guessing the URL, so now there's one rule instead of several that could drift apart.

Dates work the same way. One small helper formats them for display and another produces the machine readable version, so the listing and the post page can't disagree. A date can be a bare day or carry a time, and a time is shown in London time, like `7 October 2026 @ 4:00 PM`. A bare day is read as midnight UTC, so it's formatted in UTC. Formatting it in the build machine's own time zone could show the previous day.

---

## Layouts and components

`BaseLayout` owns the entire HTML document: the `<head>`, the header, the `<main>` wrapper, the `<h1>` and the footer. A post layout wraps it and maps frontmatter onto its props. Because the layout renders the `<h1>` from the title, page and post bodies start at `<h2>`.

The head is built from a small `site.ts` file holding the site name, description and locale. It's the single home for those strings, and the RSS feed reads from it too. Those strings had already drifted apart once when they were duplicated, so now they can't. Canonical and `og:url` are derived from the current path, so there's nothing to pass per page. There's no `og:image` yet, because nothing I have is suitable.

Navigation is a hardcoded list of links in a component. There's deliberately no hamburger menu: the links wrap onto a second line rather than overflowing, so it works at any width with no JavaScript.

Browser JavaScript follows the same idea as the CSS. A component that needs a script keeps it in its own `<script>` block, next to its markup, and the theme toggle is the example. `src/scripts/` is for the whole site: one entry file, `main.ts`, imports site-wide modules and calls them, and shared helpers like `withViewTransition()` live there too. Right now `main.ts` only calls a small demo module that logs a quote to the console, there to show the pattern. The bundled scripts are TypeScript, and Astro turns each into an external file. The only inline script left is the small one in the `<head>` that has to run before first paint.

---

## The feed and the sitemap

The RSS feed is a static endpoint that carries full post content, not just titles. I render each post through Astro's Container API rather than a separate Markdown parser, so the feed gets exactly the same HTML as the site, including syntax highlighted code blocks. It costs one dependency instead of three. The catch is that the API is still marked experimental, so a future Astro update is the first place I'd look if the build breaks.

The sitemap integration writes `sitemap-index.xml` and `sitemap-0.xml`. The index filename isn't configurable, so a Netlify redirect covers `/sitemap.xml` for any crawler that guesses it, and `robots.txt` points at the real file with an absolute URL.

Posts also get a `<lastmod>`, which is their `updated` date, or their `date` if they've never been updated. Other pages don't get one, on purpose: a date that changes on every deploy would teach crawlers to ignore the field. The config can't read the content collection, so that bit of code reads the frontmatter itself. It's the one place the "updated, else date" rule is written down twice.

---

## Styling and theming

The CSS is plain native CSS, split into partials and ordered with cascade layers. Colours are `light-dark()` pairs written in `oklch()` that follow the OS with no JavaScript, with a theme toggle layered on top as an enhancement. Type and spacing scale fluidly with `clamp()`, and moving between pages fades with native view transitions. Each of those has its own post:

- [Light and dark theming with light-dark()](/posts/css-light-dark-theming)
- [Fluid type and spacing with clamp()](/posts/css-clamp-fluid-type)
- [Taming the cascade with @layer](/posts/css-cascade-layers)
- [Page transitions with native view transitions](/posts/css-page-transitions)

---

## Deployment

`netlify.toml` is the source of truth for build settings, and it overrides the Netlify UI. The Node version lives in `.nvmrc` only. If it were also in `netlify.toml`, that would win, and the two could quietly disagree.

There's no `@astrojs/netlify` adapter. It's for server rendering, and this build is static, so it would add a dependency and a server runtime for nothing.

The CSS file name includes a content hash, so a URL never changes what it contains. `netlify.toml` takes advantage of that and tells browsers to cache anything under `/_astro/` for a year, as `immutable`. When the CSS changes, so does the name, and everyone gets the new file.

Security headers live in `netlify.toml` too. The Content Security Policy needs `'unsafe-inline'`, because the small theme script in the `<head>` has to be inline to run before the first paint, and the cascade layer order statement has to stay an inline style. Hashes would break on every edit, and nonces need a server. The other directives still earn their place, blocking things like framing and form hijacking.

---

## Why bother writing it down

A site this small is easy to reason about, and that makes the next experiment cheaper to try. Anything new has to justify itself, because there's no big pile of config to hide behind.
