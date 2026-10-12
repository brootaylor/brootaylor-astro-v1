---
title: "Taming the cascade with @layer"
description: "Splitting a single stylesheet into cascade layers, and keeping the layer order intact in a production build."
date: 2026-10-06T09:47:23
updated: 2026-10-12T09:40:18
draft: false
---

This site is a playground, so every time I try something new on it I'm going to write it up. Partly as a reference for future me, and partly because explaining a thing is the quickest way to find out whether I actually understood it. 🤔

First up isn't a flashy effect. It's a tidy up — but it's a tidy up that leans on a CSS feature I'd never properly used: cascade layers.

---

## The problem with "who wins?"

Normally the cascade settles a fight between two rules by specificity first, then by source order. That works, right up until it doesn't. A rule in the wrong file, or a selector one class too weak, and suddenly you're reaching for a more specific selector to win. Then the next person (usually me) needs an even more specific one. It never ends well.

The site had a single `main.css` at about 200 lines. Fine for now, but I know myself. This is a playground, so it will only grow.

---

## Layers sit above both

A cascade layer sits *above* specificity and source order. A rule in a later layer beats a rule in an earlier one, however specific the earlier selector is and wherever it appears. So you declare the order once, and that's your answer to "what overrides what?".

```css
@layer reset, tokens, base, components, utilities, transitions;
```

Read it left to right, later wins. Reset is deliberately the weakest, so anything can override it. Utilities sit near the end, so a little `.visually-hidden` class reliably beats a component's own styles, with no `!important` and no specificity games.

`main.css` is now split by purpose into `reset.css`, `tokens.css`, `base.css` and `utilities.css`, each wrapping its rules in the matching layer. They're pulled together with a plain native `@import`, and Astro's build tooling bundles them. No Sass, no PostCSS.

---

## Three things to know

**Unlayered CSS beats every layer.** Astro's scoped component `<style>` blocks aren't in any layer by default, so they'd silently win over everything, utilities included. So each component's styles are wrapped in `@layer components { … }`.

**The order statement lives in the `<head>`, inline.** A production build's minifier merges and reorders the bundled styles, and drops a leading `@layer` order statement. Layers would then be ranked by whichever one the browser sees first, which put the components *below* the reset. The development server doesn't minify, so it only happens in a build. An inline style in the `<head>`, ahead of the stylesheet, can't be reordered:

```html
<style is:inline>
  @layer reset, tokens, base, components, utilities, transitions;
</style>
```

**`!important` flips the order.** For `!important` declarations, layer priority is reversed, so the *earliest* layer wins. That sounds odd, but it's handy. The `prefers-reduced-motion` safety net lives in `reset`, so nothing later can accidentally switch motion back on.

---

## Progressive enhancement, with a shrug

A browser without `@layer` support gets unstyled but readable HTML. I'm fine with that. Layers are well over two years old now, so under my own rule they need no fallback. The banner at the top of the site says new techniques are in use for exactly this reason.

---

## The transitions layer

The `transitions` layer at the end of that list holds the site's page transitions, using the native View Transitions API. They're covered in [Page transitions with native view transitions](/posts/css-page-transitions/).
