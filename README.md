[![Netlify Status](https://api.netlify.com/api/v1/badges/ad7b1723-0897-4550-8fd2-12d4a261f6f5/deploy-status)](https://app.netlify.com/projects/brootaylor-astro-v1/deploys)
[![Built with Astro](https://astro.badg.es/v2/built-with-astro/tiny.svg)](https://astro.build)
[![License: MIT](https://img.shields.io/github/license/brootaylor/brootaylor-astro-v1)](LICENSE)

# playground.brootaylor.com

An experimental playground for web development ideas, techniques, features, demos and learnings, using the Astro web framework as the platform.

Live at [playground.brootaylor.com](https://playground.brootaylor.com).

## Tech stack

Deliberately vanilla and dependency-light: [Astro](https://astro.build), plus `@astrojs/rss` and `@astrojs/sitemap`, which only run at build time. No UI framework, no CSS framework, and everything ships as static output with zero third-party JS in the browser.

## Features

- Posts written in Markdown, with drafts that are never built
- Light, dark and system themes, using native CSS with no JavaScript needed for the default
- An RSS feed at `/rss.xml` with full post content
- A sitemap, with a `lastmod` on each post
- Meta description and Open Graph tags on every page
- Page transitions using native view transitions, switched off for anyone who prefers reduced motion

## Getting started

```bash
npm install
npm run dev      # dev server at localhost:4321
npm run build    # static output to dist/
npm run preview  # serve the built dist/ locally
```

The Node version is in `.nvmrc`.

## Writing a post

Add a Markdown file to `src/content/posts/`. The filename becomes the URL.

```yaml
---
title: "A post title"
description: "Optional. Used for the meta description and social cards."
date: 2026-10-07T15:00:00Z
updated: 2026-10-09T09:30:00Z
draft: true
---
```

`title` and `date` are required, and a build fails without them. Keep the keys in the order shown. `date` can be a bare day or carry a time, and `updated` is optional and shows beside it. Posts are listed newest first by `date`. A post with `draft: true` has no page built at all, so it can't appear in the listing, feed or sitemap. Preview one with `npm run dev`.

## Project structure

- `src/pages/` — routes, including the posts listing and detail pages and the RSS endpoint
- `src/layouts/` — `BaseLayout` (page shell) and `PostsLayout` (post-specific wrapper)
- `src/components/` — `Header`, `Navigation`, `Footer`, `ThemeToggle`, `Message`, `Link`
- `src/content/posts/` — Markdown posts, defined as a content collection in `src/content.config.ts`
- `src/utils/` — shared helpers (`date`, `slug`, `posts`), plus `sitemap-lastmod.ts`, which only the Astro config uses
- `src/scripts/` — browser-only TypeScript for site-wide behaviour (`main.ts` is the entry, currently calling a demo `quote` module) and shared helpers (`view-transition`). Logic that belongs to one component stays in that component
- `src/styles/` — global CSS as native partials (`reset`, `tokens`, `base`, `utilities`, `transitions`), ordered by cascade layers in `index.css`
- `src/site.ts` — the site name, description and locale, shared by the page head and the feed
- `public/` — favicons and `robots.txt`
- `astro.config.mjs` — Astro config, including the sitemap
- `netlify.toml` — build settings, redirects and security headers

## Deployment

Deployed to Netlify. `netlify.toml` is the source of truth for build settings and overrides the Netlify UI. To run the site locally with its redirects and headers applied, use `npx netlify dev`.

---

© [Bruce Taylor](https://brootaylor.com)
