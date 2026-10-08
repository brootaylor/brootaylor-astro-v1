// A stand-in for a site-wide module, here to show the pattern. All it does is log a quote
// to the browser console.
//
// A site-wide module in src/scripts/ exports an init function and does nothing on import.
// src/scripts/main.ts imports it and calls it, so every page runs it once.
//
// When the first real site-wide script exists, replace this file (and its two lines in main.ts)
// with that one. Behaviour that belongs to a single component or page doesn't go here; it stays
// in that file's own <script>.
export const initQuote = () => {
  console.log(
    'The original, shimmering self gets buried so deep that most of us end up hardly living out of it at all. Instead we live out all the other selves, which we are constantly putting on and taking off like coats and hats against the world’s weather.\n\n- Frederick Buechner, Telling Secrets'
  );
};
