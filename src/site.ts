// Site-wide identity strings. One home for values that otherwise get copied into the layout and
// the feed — the name had already drifted between those two once.
// The canonical URL itself is not here: it lives in `site` in astro.config.mjs, which is the
// only place Astro reads it from.

export const siteName = "Broo's Playground Website";

export const siteDescription =
  'An experimental playground for web development ideas, techniques, features, demos and learnings, using the Astro web framework as the platform.';

// The person the site belongs to. Used for the Open Graph `profile` tags on the homepage and the
// About page (`profile:first_name` and `profile:last_name`).
export const ownerFirstName = 'Bruce';
export const ownerLastName = 'Taylor';

// The document language: `lang` on <html> and the feed's <language>.
export const siteLang = 'en-gb';

// The same language as Open Graph wants it, with an underscore.
export const siteLocale = 'en_GB';
