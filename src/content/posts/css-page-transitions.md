---
title: "Page transitions with native view transitions"
description: "A cross-page fade, a header and footer that stay put, and a smoother theme switch, all with native view transitions and no router."
date: 2026-10-07T20:34:12
draft: false
---

Remember that empty `transitions` layer I declared at the end of the cascade layers post? It's finally got something in it. This is the page transitions write-up I promised, and it turned out to be a lot less code than I expected. 🤔

The goal was modest: when you click from one page to another, fade between them rather than blinking. No router, no library, and no JavaScript for the navigation itself.

---

## The one-line baseline

This is the whole trick:

```css
@view-transition {
  navigation: auto;
}
```

That opts same-origin navigations in to a cross-document view transition. The browser takes a snapshot of the page you're leaving, a snapshot of the page you're arriving at, and cross-fades between them. Every page on this site shares one layout and one stylesheet, so both sides of every navigation have the rule.

A browser that doesn't understand it just ignores the at-rule and navigates instantly, the way it always has. So there's no `@supports` guard, because there's nothing to break. That's progressive enhancement doing its job.

---

## Keeping the header and footer still

A plain fade has a small flaw. The header and footer are identical on every page, but they'd fade out and back in along with everything else, which looks twitchy.

Giving an element a `view-transition-name` lifts it out of the page snapshot and animates it separately. Because it looks the same before and after, it simply stays where it is while the content between them fades:

```css
header {
  view-transition-name: site-header;
}

footer {
  view-transition-name: site-footer;
}
```

I put these in `transitions.css` rather than in the components, so everything to do with transitions lives in one file.

---

## Respecting reduced motion

This is the bit I'd have missed. The site has a `prefers-reduced-motion: reduce` rule in `reset.css`, which matches `*`. But `*` doesn't match the `::view-transition-*` pseudo-elements, so it can't switch these animations off.

So the transitions have to gate themselves. Everything in `transitions.css` sits inside `prefers-reduced-motion: no-preference`. Someone who has asked for less motion gets a plain, instant navigation instead.

---

## The theme toggle too

The theme switcher was the other obvious candidate. Flipping between light and dark was an instant snap, and a short cross-fade is much kinder on the eyes. For a change on the same page, the API is `document.startViewTransition()`, which takes a function that makes the change. I wrapped it in a small helper, in case anything else on the site wants the same treatment later:

```ts
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
```

The toggle then calls `withViewTransition(applyTheme)`, where `applyTheme` is the code that was already there, just moved into a function: set or remove `data-theme` and update `localStorage`. The check does two jobs. Browsers without the API get the old instant switch, and so does anyone who prefers reduced motion. No-JavaScript visitors are unaffected, because the toggle still ships hidden and is only revealed by script.

---

## The gotcha, again from the build

Once more, this one only showed up by looking at the build output rather than the dev server.

By default, Astro inlines a stylesheet into the HTML only while it's small, under about 4 kB. Adding `transitions.css` nudged the bundle over that line, and the build quietly switched from inline CSS to a separate file. Nothing broke. But it meant the way the site shipped its CSS had changed without me deciding anything.

My first instinct was to force it back inline. Then I thought about it properly: I'd rather have an external file anyway. I'll keep adding CSS to this site, I don't want it sitting in every HTML document, and a separate file with a hashed name can be cached once and reused on every page. So I made it a decision rather than an accident:

```js
build: {
  inlineStylesheets: "never",
},
```

Because the file name changes whenever the contents do, I also told Netlify it can be cached for a year, in `netlify.toml`.

Lesson learnt, same as last time: after adding CSS, check what the build actually emits.

---

## Still to try

I haven't given this a proper look across browsers yet, so treat it as working on paper for now.

There are two bigger ideas I've left for later:

- **A shared-element morph.** When you click a post title on the Posts page, the title would glide and resize into the heading on the post itself, as though it were the same object travelling between pages, while the rest of the page fades.
- **Direction-aware transitions.** The animation would depend on where you're going, so moving from the list into a post slides one way, and going back slides the other.

Both need changes to the markup as well as the CSS, so they get their own experiment.
