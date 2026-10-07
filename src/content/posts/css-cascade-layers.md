---
title: "Taming the cascade with @layer"
date: 2026-10-06T08:47:23Z
draft: false
description: "Splitting a single stylesheet into cascade layers, and the production build gotcha that only showed up after I'd shipped it."
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

## Where it got interesting

This is the bit I'd have missed if I'd stopped at "it works on my machine".

**Unlayered CSS beats every layer.** Astro's scoped component `<style>` blocks aren't in any layer by default, so they'd silently win over everything, utilities included. The fix is to wrap each component's styles in `@layer components { … }`. Easy, once you know.

**The minifier ate my layer order.** I'd put that `@layer` order statement at the top of `index.css`, where it felt like it belonged. In dev, everything looked right. In a production build, the minifier merged and reordered the bundled styles and dropped the statement entirely. Layers then get ranked by whichever one the browser sees first, and my components ended up *below* the reset.

Dev doesn't minify, so I'd never have spotted it by looking at the dev server. I only caught it by inspecting the built HTML. The fix is an inline style, first thing in the `<head>`, which can't be reordered:

```html
<style is:inline>
  @layer reset, tokens, base, components, utilities, transitions;
</style>
```

Lesson learnt: with CSS, check the build, not just the dev server.

**`!important` flips the order.** For `!important` declarations, layer priority is reversed, so the *earliest* layer wins. That sounds odd, but it's handy. The `prefers-reduced-motion` safety net lives in `reset`, so nothing later can accidentally switch motion back on.

---

## Progressive enhancement, with a shrug

A browser without `@layer` support gets unstyled but readable HTML. I'm fine with that. Layers are well over two years old now, so under my own rule they need no fallback. The banner at the top of the site says new techniques are in use for exactly this reason.

---

## What's next

There's a `transitions` layer declared at the end of that list, and it's empty for now. That's where page transitions will live, using the native View Transitions API. Dabbly dabbles to follow.
