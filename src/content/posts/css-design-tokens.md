---
title: "A design system with CSS custom properties"
description: "How this site's design tokens are organised into tiers, how a reference page documents them by reading the stylesheet itself, and where the system can grow."
date: 2026-10-12T20:40:23
draft: false
---

This site's design system is a set of CSS custom properties in one file, `tokens.css`. Design decisions have names, the names are organised in tiers, and a reference page shows them all with their live values. No build step for the tokens, no JSON, no extra dependencies.

This is a snapshot of how it works today, and what it leaves room for as the site grows.

---

## Tiers

The tokens are organised in tiers, and each tier only refers to the ones above it, so a change made higher up flows down on its own. Today there are three: primitives, semantic tokens and component tokens. That's what the site needs right now, not a ceiling.

---

## Primitives

Primitives are the raw values. They say what a value *is*, not what it's *for*. The colour palette is the clearest example:

```css
--palette-neutral-0: oklch(0 0 0);
--palette-neutral-20: oklch(0.2 0 0);
--palette-neutral-34: oklch(0.34 0 0);
--palette-neutral-91: oklch(0.91 0 0);
--palette-neutral-92: oklch(0.92 0 0);
--palette-neutral-100: oklch(1 0 0);
--palette-blue-45: oklch(0.45 0.313 264);
--palette-blue-77: oklch(0.77 0.122 254);
```

Each colour is named by its hue family and its lightness as a percentage, so `--palette-neutral-20` is a grey at 20% lightness. Because they're `oklch()` colours, that number is the first value in the colour itself, so the name can't quietly disagree with it.

No stylesheet or component uses these directly. A palette colour on its own means nothing: is `--palette-blue-45` a link, a button, a border? That's for the semantic tokens to say.

The fluid type and spacing scales are primitives too: a set of steps with no opinion about where each is used. Unlike palette colours, they're used directly in stylesheets and components, since a step like `--fluid-type-1` is already as meaningful as it needs to be. How those scales work is in [Fluid type and spacing with clamp()](/posts/css-clamp-fluid-type/).

---

## Semantic tokens

Semantic tokens say what a value is *for*, and they're what the rest of the CSS uses. The colours are `light-dark()` pairs, each side picked from the palette:

```css
--color-bg: light-dark(var(--palette-neutral-100), var(--palette-neutral-20));
--color-body: light-dark(var(--palette-neutral-0), var(--palette-neutral-91));
--color-link: light-dark(var(--palette-blue-45), var(--palette-blue-77));
--color-hr: light-dark(var(--palette-neutral-92), var(--palette-neutral-34));
```

So `--color-link` is "the link colour", and the palette decides what that looks like in light and dark mode. The switching itself is covered in [Light and dark theming with light-dark()](/posts/css-light-dark-theming/).

It isn't only colours. Font weights, line heights, the corner radius, the border width and the focus ring all have names:

```css
--fw-light: 300;
--fw-bold: 700;
--fw-black: 900;
```

```css
--lh-body: 1.5;
--lh-heading: 1.1;
```

```css
--radius: 0.25rem;
```

```css
--border-thin: 1px;
```

```css
--focus-ring-width: 2px;
--focus-ring-offset: 2px;
```

`--border-thin` is `1px` rather than a `rem` value on purpose. A fractional width like `0.1rem` works out at 1.6px, which some screens draw as a slightly blurry line. One whole pixel stays crisp.

Using them reads like a description of the design. Here's the theme toggle's label and its focus ring:

```css
label {
  display: block;
  padding: 0.15em 0.6em;
  border: var(--border-thin) solid var(--color-hr);
  border-radius: var(--radius);
  font-size: var(--fluid-type--1);
  cursor: pointer;
}
```

```css
input:focus-visible + label {
  outline: var(--focus-ring-width) solid var(--color-link);
  outline-offset: var(--focus-ring-offset);
}
```

Change `--radius` once and every rounded corner on the site follows, code blocks and banner included.

---

## Component tokens

Some values belong to exactly one component. The amber "work in progress" banner at the top of every page is the example: nothing else on the site is amber, so its colours have no business in `:root`. They're declared at the top of the component's own styles instead, then used from there:

```css
aside {
  --message-bg: light-dark(oklch(0.98 0.027 95), oklch(0.26 0.026 96));
  --message-border: light-dark(oklch(0.94 0.076 92), oklch(0.43 0.054 92));
  --message-text: light-dark(oklch(0.47 0.098 102), oklch(0.88 0.066 96));

  background-color: var(--message-bg);
  border: var(--border-thin) solid var(--message-border);
  padding: 1em;
  border-radius: var(--radius);
}

p {
  color: var(--message-text);
}
```

Custom properties inherit, so the `<p>` inside the banner picks up `--message-text` from the `<aside>` around it. And the banner still uses the shared `--border-thin` and `--radius`, so it can't drift from the rest of the site.

---

## The rule that holds it together

Tiers only help if they're respected, so there's one rule: no stylesheet or component uses a palette colour, or writes out a raw value that a token covers. Stylesheets and components reach for a semantic token, a component token or a fluid scale step.

Two kinds of plain value are allowed. Spacing in `em` inside a component, like the banner's `padding: 1em`, scales with that component's own text, which is exactly what it should do. And the `1px` sizes in the visually-hidden clipping trick are a mechanism, not a design decision, so they'd gain nothing from a name.

---

## A page that documents itself

There's a reference page at [/design-system/](/design-system/) that shows every token in `tokens.css` with a live sample. Rather than keeping its own list of tokens, which would go stale the first time a token was added and the page forgotten, it reads `tokens.css` when the site is built. Vite's `?raw` suffix imports a file as a plain string:

```js
import tokensCss from '../styles/tokens.css?raw';
```

Comments are stripped first, so a token mentioned in a comment isn't mistaken for a real one, and then every `--name: value;` declaration is collected:

```js
const declarations = [...tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(
  ([, name, value]) => ({ name, value: value.replace(/\s+/g, ' ').trim() })
);
```

The page sorts tokens into groups by name prefix (`--palette-`, `--color-`, `--fw-` and so on). A token whose prefix it doesn't recognise isn't dropped; it lands in an "Other" group, so nothing can go missing silently:

```js
const other = declarations.filter(({ name }) => !groups.some(({ prefix }) => name.startsWith(prefix)));
if (other.length > 0) {
  grouped.push({ prefix: '', heading: 'Other', sample: 'none', note: 'Tokens with a prefix this page has no group for yet.', tokens: other });
}
```

Each sample is drawn *with* its token rather than with a copy of its value:

```js
const sampleStyle = (sample: Sample, name: string) => {
  const token = `var(${name})`;
  switch (sample) {
    case 'colour': return `background-color: ${token}`;
    case 'font': return `font-family: ${token}`;
    case 'weight': return `font-weight: ${token}`;
    case 'line-height': return `line-height: ${token}`;
    case 'type': return `font-size: ${token}`;
    case 'space': return `inline-size: ${token}`;
    case 'radius': return `border-radius: ${token}`;
    case 'border': return `border-width: ${token}`;
    case 'focus': return 'outline: var(--focus-ring-width) solid var(--color-link); outline-offset: var(--focus-ring-offset)';
    case 'none': return undefined;
  }
};
```

A swatch for `--color-link` is styled `background-color: var(--color-link)`, so it's whatever the browser resolves right now. Flip the theme toggle and the semantic swatches change with it. Resize the window and the type and space samples grow and shrink along their fluid scales.

After the tokens, the page shows the plain HTML elements and the utility classes they style, so the whole visual vocabulary is in one place.

It's a reference for working on the site rather than something for visitors, so it isn't in the navigation, carries a `noindex`, and is left out of the sitemap. The parsing all happens at build time, in the page's frontmatter, so none of it reaches the browser.

---

## Room to grow

The structure is there so the system can change without a rewrite:

- **New tokens document themselves.** Add one to `tokens.css` and it's on the reference page at the next build, drawn with its live value.
- **New kinds of token have a landing spot.** A token with a prefix the page doesn't know yet turns up under "Other", which is the cue to give it a group of its own.
- **New tiers fit between the existing ones.** Light and dark don't need a tier: `light-dark()` handles them inside each semantic token. If the site ever wants a variation beyond that, like a high-contrast or a seasonal theme, a theme tier would sit between primitives and semantic tokens, choosing which palette colours the semantic tokens point at. Everything below it would follow without a change.
- **New components bring their own tokens.** A component with values of its own declares them in its styles, the way the banner does, and borrows the shared ones for everything else.
- **Gaps can become tokens.** A few fixed sizes are still written out, like the space above a horizontal rule and the offset of the skip link. None of them matches a step on the fluid spacing scale, so they're candidates for a small fixed spacing scale if more of them turn up.
