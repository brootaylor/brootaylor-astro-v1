# Security policy

This is a personal playground site, built with Astro and deployed as static
files on Netlify. It has no accounts, forms, database or server-side code, and
it ships no third-party JavaScript. Even so, if you spot a security problem, I'd
like to hear about it.

## Supported versions

Only the live site at <https://playground.brootaylor.com>, built from the
`main` branch, is supported. There are no older versions to patch.

## Reporting a vulnerability

Please **don't open a public issue** for a security problem.

Use GitHub's private reporting instead: go to the **Security** tab of this
repository and choose **Report a vulnerability**.

Things that are in scope include:

- Weaknesses in the security headers or Content Security Policy
  (see `netlify.toml`)
- Vulnerable dependencies that affect the built site
- Anything that lets someone run script or inject content on the site

## What to expect

This is a hobby project, so replies are best effort. I'll aim to acknowledge a
report within a week and let you know what I decide. There's no bounty.
