[![Netlify Status](https://api.netlify.com/api/v1/badges/ad7b1723-0897-4550-8fd2-12d4a261f6f5/deploy-status)](https://app.netlify.com/projects/brootaylor-astro-v1/deploys)
[![Built with Astro](https://astro.badg.es/v2/built-with-astro/tiny.svg)](https://astro.build)
[![License: MIT](https://img.shields.io/github/license/brootaylor/brootaylor-astro-v1)](LICENSE)

# playground.brootaylor.com

An experimental playground for web development ideas, techniques, features, demos and learnings, using the Astro web framework as the platform.

## Tech stack

Deliberately vanilla and dependency-light: [Astro](https://astro.build), plus `@astrojs/rss` and `@astrojs/sitemap` for build-time feed/sitemap generation. No UI framework, no CSS framework — everything ships as static output with zero third-party JS in the browser.

## Getting started

```bash
npm install
npm run dev      # dev server at localhost:4321
npm run build    # static output to dist/
npm run preview  # serve the built dist/ locally
```

## Project structure

- `src/pages/` — routes, including the posts listing/detail pages and the RSS endpoint
- `src/layouts/` — `BaseLayout` (page shell) and `PostsLayout` (post-specific wrapper)
- `src/components/` — `Header`, `Navigation`, `Footer`, `ThemeToggle`, `Message`, `Link`
- `src/content/posts/` — Markdown posts, defined as a content collection in `src/content.config.ts`
- `src/utils/` — shared helpers (`date`, `slug`, `posts`)
- `src/styles/main.css` — single global stylesheet
