---
title: "Fluid type and spacing with clamp()"
date: 2026-10-03T16:22:51Z
draft: false
description: "How a handful of clamp() values give the whole site a smoothly scaling type and spacing system, with no breakpoints."
---

Text that's comfortable on a phone looks a bit lost on a big monitor, and text that suits a big monitor is shouting on a phone. The traditional fix is breakpoints: at this width, jump to that size. It works, but you end up with sizes that leap about, and a pile of media queries to look after.

This site doesn't use any for type or spacing. Instead, everything scales smoothly with the viewport, using one CSS function: `clamp()`.

---

## What clamp() does

It takes three values: a minimum, a preferred value and a maximum.

```css
font-size: clamp(1.125rem, 1.0739rem + 0.2273vw, 1.25rem);
```

The browser uses the preferred value, but never lets the result drop below the minimum or climb above the maximum. The preferred value is the interesting one. It mixes a fixed part (`rem`) with a part that depends on the viewport width (`vw`), so as the window grows, the size grows with it, until it hits a ceiling.

That particular line is my body text. It's 18px on a small phone, 20px on a wide screen, and anywhere in between on everything else. No `@media` in sight.

---

## Where those odd numbers come from

I didn't work out `1.0739rem + 0.2273vw` by hand. 🙃 It's just a straight line between two points: "18px at a 320px wide viewport" and "20px at a 1200px wide viewport". Rather than doing that algebra myself, I used the calculator at [Utopia](https://utopia.fyi/), which spits out the clamp values for each step. The whole idea of fluid type and spacing scales with no breakpoints comes from their work, and it's where I learnt the approach. If you want the thinking behind it, start there.

The scale itself is a modular one. On small screens each step is 1.2 times the last, and on large screens 1.25 times. So the gap between body text and headings opens up a little as the screen gets bigger, which feels about right to me.

```css
/* Step 0: 18px → 20px */
--fluid-type-0: clamp(1.125rem, 1.0739rem + 0.2273vw, 1.25rem);
/* Step 1: 21.6px → 25px */
--fluid-type-1: clamp(1.35rem, 1.2631rem + 0.3864vw, 1.5625rem);
/* Step 3: 31.104px → 39.0625px */
--fluid-type-3: clamp(1.944rem, 1.7405rem + 0.9044vw, 2.4414rem);
```

I've left a comment above each step giving the range in pixels. The raw numbers mean nothing at a glance, and that comment is what I'll actually read in six months.

One catch worth knowing: the values are interpolated as a set, so nudging a single number by hand will quietly break the scale. When I want to change it, I recalculate the lot.

---

## Using it

The steps are custom properties, so using them is dull in the best way:

```css
body {
  font-size: var(--fluid-type-0);
}

h1 {
  font-size: var(--fluid-type-3);
}

h2 {
  font-size: var(--fluid-type-1);
}
```

Body text is step 0, `h2` is step 1 and the page `<h1>` is step 3. Nothing in a component ever hardcodes a size, it just picks a step.

---

## Spacing gets the same treatment

Type isn't the only thing that benefits. Gaps and padding scale the same way, and I named the spacing tokens as pairs, like `--fluid-space-s-2xl`. That reads as "starts at the small step, ends at the 2xl step", so a gap can loosen up on a big screen without a media query. The side gutters on the `<body>` use that one: tight on a phone, generous on a desktop.

```css
body {
  padding-inline: var(--fluid-space-s-2xl);
  padding-block: var(--fluid-space-s-l);
}
```

---

## Why rem matters in there

You'll notice the preferred value isn't pure `vw`. The `rem` part is deliberate. A size based only on viewport width ignores the browser's zoom and the visitor's own text size setting, which is an accessibility problem. Keeping `rem` in the mix means people who bump their text size up still get bigger text.

It's also why the min and max are in `rem` rather than `px`.

---

## The honest bit

Fluid type is one of those things where I'm still deciding how much I trust the numbers versus my own eyes. The maths says it's smooth. I've only eyeballed it in a few window widths so far, so I'll keep an eye on it as the site grows.
