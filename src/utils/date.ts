// Formats a post date for display. `en-GB` to match the document's `lang="en-gb"` — gives "26 July 2026".
// `timeZone: 'UTC'` is load-bearing: YAML parses a bare `date: 2026-02-22` as UTC midnight, so formatting
// in the build machine's local zone would show the previous day anywhere behind UTC, contradicting the
// `datetime` attribute below. Pinning to UTC keeps the two agreeing wherever the site is built.
export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// The machine-readable form for `<time datetime="...">`: an ISO 8601 date, no time component.
export const toDateTime = (date: Date) => date.toISOString().slice(0, 10);
