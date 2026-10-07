// Date helpers for posts. A post's `date` can be a bare day (`date: 2026-02-22`) or carry a time
// (`date: 2026-10-07T15:00:00Z`). YAML parses the bare form as UTC midnight, so "is it exactly UTC
// midnight?" is how we tell the two apart: those get a date only, everything else gets a time too.
// Consequence: an explicit `T00:00:00Z` is indistinguishable from a bare date and shows no time.
const hasTime = (date: Date) => date.getTime() % 86_400_000 !== 0;

// The zone times are shown in. The site is `en-gb`, so a UK reader expects UK clock time (BST in
// summer), not UTC, which would read an hour out for half the year. The date and time are both
// formatted in this zone so they can't disagree near midnight.
const timeZone = 'Europe/London';

// Formats a post date for display. `en-GB` to match the document's `lang="en-gb"`.
//
// With a time: "7 October 2026 @ 4:00 PM BST". 12-hour clock, and the AM/PM is uppercased because
// `en-GB` would otherwise give a lowercase "pm". The zone abbreviation comes from `timeZoneName`, so
// it reads "GMT" in winter and "BST" in summer, always agreeing with the clock time beside it.
//
// Without one: "26 July 2026". Here `timeZone: 'UTC'` is load-bearing: a bare date is UTC midnight, so
// formatting in the build machine's local zone, or in London during BST, would show the wrong day or
// invent a "1:00 AM". Pinning to UTC keeps it agreeing with the `datetime` attribute wherever the
// site is built.
export const formatDate = (date: Date) => {
  const dayOptions = { day: 'numeric', month: 'long', year: 'numeric' } as const;

  if (!hasTime(date)) {
    return date.toLocaleDateString('en-GB', { ...dayOptions, timeZone: 'UTC' });
  }

  const day = date.toLocaleDateString('en-GB', { ...dayOptions, timeZone });
  const time = date
    .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone, timeZoneName: 'short' })
    .toUpperCase();

  return `${day} @ ${time}`;
};

// The machine-readable form for `<time datetime="...">`: a full ISO 8601 timestamp (in UTC, so it's
// unambiguous) when the post has a time, otherwise just the date.
export const toDateTime = (date: Date) =>
  hasTime(date) ? date.toISOString() : date.toISOString().slice(0, 10);
