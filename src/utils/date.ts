// Date helpers for posts. A post's `date` can be a bare day (`date: 2026-02-22`) or carry a time
// (`date: 2026-10-07T16:00:00`). YAML parses the bare form as UTC midnight, so "is it exactly UTC
// midnight?" is how we tell the two apart: those get a date only, everything else gets a time too.
// Consequence: a time that is exactly UTC midnight once converted is indistinguishable from a bare
// date and shows no time. That's a written time of 00:00 (left alone, see `fromLondonTime`), and,
// in BST only, a written 01:00, which converts to 00:00 UTC.
const hasTime = (date: Date) => date.getTime() % 86_400_000 !== 0;

// The zone times are written and shown in. The site is `en-gb`, so a UK reader expects UK clock
// time (BST in summer), not UTC, which would read an hour out for half the year. The date and time
// are both formatted in this zone so they can't disagree near midnight.
const timeZone = 'Europe/London';

// How far London's clock is ahead of UTC at a given moment, in milliseconds: 0 in GMT, an hour in BST.
const londonOffset = (utcMs: number) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    })
      .formatToParts(utcMs)
      .map(({ type, value }) => [type, Number(value)])
  );
  const asLondonClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asLondonClock - (utcMs - (utcMs % 1000));
};

// Frontmatter times are London clock time, as read off a watch in the UK: write
// `updated: 2026-10-08T23:16:48` with no `Z` and no worrying about BST. YAML has no idea of
// London, so it reads that as 23:16:48 UTC. This shifts it back by whatever London's offset was
// at the time, giving the real moment. The schema in src/content.config.ts applies it to `date`
// and `updated`, and src/utils/sitemap-lastmod.ts does the same for its own copy.
//
// A bare day is left alone: it stays UTC midnight, which is what marks it as having no time. The
// offset is worked out twice so a time near a clock change settles on the right side of it.
export const fromLondonTime = (date: Date) => {
  if (!hasTime(date)) return date;

  const clock = date.getTime();
  const firstGuess = clock - londonOffset(clock);
  return new Date(clock - londonOffset(firstGuess));
};

// Formats a post date for display. `en-GB` to match the document's `lang="en-gb"`.
//
// With a time: "7 October 2026 @ 4:00 PM". 12-hour clock, and the AM/PM is uppercased because
// `en-GB` would otherwise give a lowercase "pm".
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
    .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone })
    .toUpperCase();

  return `${day} @ ${time}`;
};

// The machine-readable form for `<time datetime="...">`: a full ISO 8601 timestamp (in UTC, so it's
// unambiguous) when the post has a time, otherwise just the date.
export const toDateTime = (date: Date) =>
  hasTime(date) ? date.toISOString() : date.toISOString().slice(0, 10);
