// Build-time Astro integration that turns src/service-worker/sw.js into dist/sw.js.
//
// The worker needs two things only a finished build knows: the hashed file names under /_astro/
// (they change whenever the CSS or JS does) and a version that changes whenever the site does.
// This runs once the build is done, works those out from dist/, and writes them into a copy of
// the template. It is build-time code and never reaches the browser, like src/utils/.
//
// Why not a library such as Workbox: the worker needs two caches and a handful of rules, which is
// small enough to read and own, and this keeps the site's dependency list as it is.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

// Pages stored when the worker installs: the ones the navigation links to, plus the offline page.
// Posts aren't listed, so the install doesn't grow with the blog; each is kept the first time it's
// read. Keep this in step with the links in Navigation.astro and src/pages/offline.astro.
const precachedPages = ['/', '/about/', '/posts/', '/offline/'];
const offlinePage = '/offline/';

// Unhashed files from public/ that every page asks for.
const rootAssets = ['/favicon.svg', '/favicon.ico'];

const templateUrl = new URL('../service-worker/sw.js', import.meta.url);

// Every file under `dir`, as a path relative to it with forward slashes.
const listFiles = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();

export const serviceWorker = (): AstroIntegration => ({
  name: 'service-worker',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const dist = fileURLToPath(dir);
      const files = listFiles(dist);

      const assets = [...rootAssets, ...files.filter((file) => file.startsWith('_astro/')).map((file) => `/${file}`)];
      const missing = [...rootAssets, ...precachedPages.map((page) => `${page}index.html`)].filter(
        (path) => !existsSync(join(dist, path))
      );
      if (missing.length > 0) {
        throw new Error(`service-worker: expected these in the build but they are missing: ${missing.join(', ')}`);
      }

      const manifest = { assets, pages: precachedPages, offline: offlinePage };

      // The version is a hash of the worker itself, the manifest, every page and the favicons. An
      // unchanged site gives an unchanged worker, so nothing updates for no reason, and any edit
      // (including to a post's prose) gives a new one, which replaces the pages cache. The favicons
      // are hashed by content because their names never change: without this, a new icon alone
      // would leave sw.js identical, and the worker would keep serving the old one from its cache.
      // Files under /_astro/ need no such step: a change to one changes its name, which the
      // manifest already covers.
      const template = readFileSync(templateUrl, 'utf8');
      const hash = createHash('sha256').update(template).update(JSON.stringify(manifest));
      for (const file of files.filter((name) => name.endsWith('.html'))) {
        hash.update(file).update(readFileSync(join(dist, file)));
      }
      for (const path of rootAssets) {
        hash.update(path).update(readFileSync(join(dist, path)));
      }
      const version = hash.digest('hex').slice(0, 10);

      // The placeholders are quoted strings, so the template is valid JS as it stands. Matching
      // the quotes too means a mention in a comment can never be replaced by mistake. The version
      // goes in as a string; the manifest replaces its quotes entirely and lands as an object
      // literal (JSON is valid JS). Functions as replacements, so a `$` is never read as a pattern.
      if (!template.includes("'__swVersion__'") || !template.includes("'__swManifest__'")) {
        throw new Error("service-worker: sw.js is missing its '__swVersion__' or '__swManifest__' placeholder");
      }
      writeFileSync(
        join(dist, 'sw.js'),
        template
          .replace("'__swVersion__'", () => `'${version}'`)
          .replace("'__swManifest__'", () => JSON.stringify(manifest))
      );
    },
  },
});
