// Runs `update` (a function that changes the page) inside a view transition, so the browser
// cross-fades from the old state to the new one.
//
// Falls back to calling `update` directly, with no animation, when:
// - the browser doesn't support `document.startViewTransition`, or
// - the person has asked for reduced motion. The `prefers-reduced-motion` rule in
//   src/styles/reset.css can't switch view transition animations off, so the check is made here.
export const withViewTransition = (update: () => void) => {
  const canAnimate =
    'startViewTransition' in document &&
    matchMedia('(prefers-reduced-motion: no-preference)').matches;

  if (canAnimate) {
    document.startViewTransition(update);
  } else {
    update();
  }
};
