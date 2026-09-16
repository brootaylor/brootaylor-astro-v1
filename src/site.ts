// Site-wide identity strings. One home for values that otherwise get copied into the layout,
// the feed and any future sitemap — the name had already drifted between two of those once.
// The canonical URL itself is not here: it lives in `site` in astro.config.mjs, which is the
// only place Astro reads it from.

export const siteName = "Broo's Playground Website";

export const siteDescription =
  'An experimental playground for web development ideas, techniques, features, demos and learnings, using the Astro web framework as the platform.';

// Matches `lang="en-gb"` on the document. Open Graph wants the underscored form.
export const siteLocale = 'en_GB';
