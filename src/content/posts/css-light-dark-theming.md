---
title: "Light and dark theming with light-dark()"
date: 2026-09-28T10:08:36Z
draft: false
description: "One colour declaration that covers OS light, OS dark and a manual toggle, with no JavaScript needed for the baseline."
---

I wanted dark mode on this site, but without keeping a second palette in sync and without the whole thing depending on JavaScript. CSS has had a neat answer to this for a while now: `light-dark()`.

---

## It starts with color-scheme

Everything hangs off one property on `:root`:

```css
:root {
  color-scheme: light dark;
}
```

That tells the browser the page supports both schemes. It follows the visitor's OS setting, and as a bonus the browser's own UI (scrollbars, form controls) switches to match. No JavaScript involved.

---

## One declaration per colour

Each colour token is a `light-dark()` pair: first value for light, second for dark.

```css
--color-bg: light-dark(oklch(1 0 0), oklch(0.2 0 0));
--color-body: light-dark(oklch(0 0 0), oklch(0.91 0 0));
--color-link: light-dark(oklch(0.45 0.313 264), oklch(0.77 0.122 254));
```

The browser picks whichever side matches the computed `color-scheme`. So there's no `prefers-color-scheme` media query and no second set of dark variables to forget to update. Adding a new colour means adding one pair. That's it.

Neither end of the scale is pure black or white, by the way. Slightly off values avoid that glowing text effect ("halation") you get on OLED screens.

---

## The manual override is almost free

I also wanted a toggle, so a visitor can pick Light, Dark or System regardless of their OS. I assumed that meant duplicating every colour. It doesn't. Since everything resolves against `color-scheme`, overriding that one property re-resolves every token at once:

```css
:root[data-theme="light"] {
  color-scheme: light;
}

:root[data-theme="dark"] {
  color-scheme: dark;
}
```

The toggle just sets a `data-theme` attribute on `<html>`. With no attribute, the `light dark` value stands and the OS is followed natively. Three modes, no colour value written twice. That was a nice surprise.

---

## No JavaScript, no problem

The no JS path matters to me. The toggle ships `hidden` and a script reveals it, so someone without JavaScript never sees a dead control, and still gets correct theming from their OS. A tiny inline script in the `<head>` applies a stored choice before first paint, so there's no flash of the wrong theme. But that's an enhancement. The CSS is the baseline.

---

## What I'd tell past me

Don't reach for a `prefers-color-scheme` block. Don't build a parallel dark palette. Add a pair, and let `color-scheme` do the work.
