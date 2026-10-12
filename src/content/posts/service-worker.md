---
title: "Reading offline with a service worker"
description: "How this site's hand-written service worker caches assets and pages, falls back to an offline page, and lists the posts you can still read."
date: 2026-10-12T08:33:45
draft: false
---

This site has a service worker. It does two jobs: pages you've already read still open without a connection, and a repeat visit is quicker because the CSS and JavaScript are already on your device.

It's written by hand, with no library. It needs two caches and a handful of rules, which is small enough to read in one sitting, and it keeps to this site's habit of shipping no third party code to the browser. Here's how each part works.

---

## Registering it

The worker is registered by a few lines at the end of every page. They're only rendered in a production build, so the development server never has a worker serving cached pages over my edits:

```astro
{import.meta.env.PROD && (
  <script is:inline>
    if ('serviceWorker' in navigator) {
      addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
          console.warn('Offline support is unavailable:', error);
        });
      });
    }
  </script>
)}
```

Registration waits for `load`, so the worker's own downloads don't compete with the page's.

---

## A template the build fills in

A service worker can only look after pages at or below its own address, so it has to live at the root, as `/sw.js`, with a name that never changes. That means it can't go through the bundler like the site's other scripts, which come out with a content hash in their file names.

But the worker needs to know those hashed names, so it can store the right files. So its source is a template with two placeholders:

```js
const version = '__swVersion__';
const manifest = '__swManifest__';
```

A small Astro integration runs once the build is done. It lists the files in the build output, works out a version, and writes the finished worker:

```js
const template = readFileSync(templateUrl, 'utf8');
const hash = createHash('sha256').update(template).update(JSON.stringify(manifest));
for (const file of files.filter((name) => name.endsWith('.html'))) {
  hash.update(file).update(readFileSync(join(dist, file)));
}
for (const path of rootAssets) {
  hash.update(path).update(readFileSync(join(dist, path)));
}
const version = hash.digest('hex').slice(0, 10);

// …

writeFileSync(
  join(dist, 'sw.js'),
  template
    .replace("'__swVersion__'", () => `'${version}'`)
    .replace("'__swManifest__'", () => JSON.stringify(manifest))
);
```

The version is a hash of the worker itself, the list of files, every page and the favicons. An unchanged site gives a byte-for-byte identical worker, so nothing updates for no reason, and any change at all gives a new one. There's nothing to bump by hand.

The manifest is an object of URL paths: the assets (the hashed CSS and JavaScript plus the two favicons), the pages to store up front, and the offline page. It's swapped in as JSON, which is valid JavaScript, so it lands as an object literal.

---

## Deciding what to handle

Every request the page makes passes through the worker's `fetch` listener, which sorts it:

```js
addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  const isNavigation = request.mode === 'navigate';
  const isExcluded = neverIntercept.test(url.pathname);
  const isAsset = assetPaths.has(url.pathname);

  if (isNavigation && (isExcluded || isAsset)) {
    event.respondWith(Promise.resolve(event.preloadResponse).then((preloaded) => preloaded || fetch(request)));
    return;
  }

  if (isExcluded) return;

  if (isAsset) {
    event.respondWith(respondWithAsset(request));
  } else if (isNavigation) {
    event.respondWith(respondWithPage(event));
  }
});
```

Anything that isn't a `GET`, or is for another site, is left alone. So are a few addresses that should always come straight from the server:

```js
const neverIntercept = /^\/(rss\.xml|robots\.txt|sitemap.*\.xml|sw\.js)$/;
```

A feed reader or a crawler should always see live content, and the worker must never serve itself from its own cache.

Everything else is either an asset from the manifest or a page. The one odd branch is for when you open the feed, a sitemap or a file directly in the address bar. It passes the response straight through without storing it (more on `preloadResponse` below).

---

## Assets: cache first

CSS, JavaScript and favicons come from the cache when they're there, and from the network when they're not:

```js
const respondWithAsset = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheable(response)) {
    const cache = await caches.open(assetsCacheName);
    await cache.put(request, response.clone());
  }
  return response;
};
```

That's safe because the CSS and JavaScript file names carry a content hash. A given URL never changes, so a stored copy is always the right one.

It also means this cache can outlive a deploy. When a new worker takes over, it only removes the files the new build no longer lists:

```js
const assets = await caches.open(assetsCacheName);
const stored = await assets.keys();
await Promise.all(
  stored.filter((request) => !assetPaths.has(new URL(request.url).pathname)).map((request) => assets.delete(request))
);
```

A file that hasn't changed between deploys is never downloaded twice.

---

## Pages: network first

Pages work the other way round. If you're online, you should see the latest version, so the worker asks the network first. But it won't wait forever:

```js
const respondWithPage = (event) => {
  const { request } = event;
  const key = pageKey(request.url);

  const network = Promise.resolve(event.preloadResponse).then((preloaded) => preloaded || fetch(request));

  event.waitUntil(
    network
      .then((response) => (isCacheable(response) ? savePage(key, response.clone()) : undefined))
      .catch(() => {})
  );

  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      const cached = await caches.match(key);
      if (cached) resolve(cached);
    }, timeout);

    network.then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      async () => {
        clearTimeout(timer);
        resolve((await caches.match(key)) ?? (await offlineResponse()));
      }
    );
  });
};
```

Three things race here:

- **The network answers.** You get the fresh page, and a copy is stored for next time.
- **Three seconds pass first** (`timeout` is `3000`). If there's a stored copy, you get that instead of staring at a blank screen. If there isn't, it keeps waiting for the network rather than giving up early.
- **The network fails.** You get the stored copy, or the offline page if there's no copy.

`event.waitUntil()` keeps the worker alive until the copy is written, even if you were already given the stored version.

---

## Navigation preload

Starting up a service worker takes a moment, and normally the page request waits for it. Navigation preload lets the browser start fetching the page *while* the worker wakes up. It's switched on when the worker activates:

```js
await self.registration.navigationPreload?.enable();
```

The `?.` skips it in a browser without the feature. The worker then uses that early response instead of making its own request, which is the `event.preloadResponse` you can see in both handlers above. It resolves to `undefined` when the browser didn't preload, and then the worker falls back to a normal `fetch()`.

---

## Cache keys, and what's worth storing

`/about` and `/about/` are the same page, but they'd be two separate cache entries, and a tracking parameter on a link would make a third. So every page is stored under one key, the path with a trailing slash and no query string:

```js
const pageKey = (urlString) => {
  const { origin, pathname } = new URL(urlString);
  const isFile = /\.[^/]+$/.test(pathname);
  return origin + (isFile || pathname.endsWith('/') ? pathname : `${pathname}/`);
};
```

A path ending in a file extension, like `/rss.xml`, keeps its form.

Not every response is worth keeping:

```js
const isCacheable = (response) => response.ok && !response.redirected && response.type === 'basic';
```

It has to be a success, from this site, and not the result of a redirect. That last one matters because the server answers `/about` with a redirect to `/about/`, and a browser refuses a redirected response handed to it as a page.

---

## Installing

When a new worker installs, it stores the assets and a few pages up front: the home page, About, the posts listing and the offline page.

```js
const precache = async () => {
  const [assets, pages] = await Promise.all([caches.open(assetsCacheName), caches.open(pagesCacheName)]);

  await Promise.all(
    manifest.assets.map(async (path) => {
      if (path.startsWith('/_astro/') && (await assets.match(path))) return;
      await assets.put(path, await fetchFresh(path));
    })
  );

  await Promise.all(
    manifest.pages.map(async (path) => {
      await pages.put(pageKey(new URL(path, location.origin)), await fetchFresh(path));
    })
  );
};
```

Hashed assets already stored by an earlier worker are skipped. Posts aren't stored up front, so the install doesn't grow with the blog; each one is kept the first time you read it.

`fetchFresh` picks how much to trust the browser's own HTTP cache:

```js
const fetchFresh = async (path) => {
  const cache = path.startsWith('/_astro/') ? 'default' : 'no-cache';
  const response = await fetch(new Request(path, { cache }));
  if (!isCacheable(response)) {
    throw new Error(`Could not precache ${path}: ${response.status}${response.redirected ? ' (redirected)' : ''}`);
  }
  return response;
};
```

A hashed file can't be stale, so it comes from the HTTP cache as normal. It's usually there already, because the page that registered the worker has just loaded it. A page or a favicon is fetched with `no-cache`, which makes the browser check with the server first. A stale copy is never stored, and an unchanged file costs a quick "not modified" rather than a full download.

If anything fails, the error fails the whole install, and the previous worker stays in charge until the next try.

---

## Keeping it tidy

Pages you read are kept up to a limit of 50. Past that, the oldest go first:

```js
const trimPages = async () => {
  const precached = new Set(manifest.pages.map((path) => pageKey(new URL(path, location.origin))));
  const cache = await caches.open(pagesCacheName);
  const keys = await cache.keys();
  const excess = keys.length - maxPages;
  if (excess <= 0) return;

  const evictable = keys.filter((request) => !precached.has(request.url));
  await Promise.all(evictable.slice(0, excess).map((request) => cache.delete(request)));
};
```

`cache.keys()` returns entries in the order they were stored, and storing a page again moves it to the end. So the first entries are the ones read longest ago. The pages stored on install are never evicted, so the offline page is always there.

The pages cache also carries the version in its name:

```js
const pagesCacheName = `playground-pages@${version}`;
```

When a new worker activates, any pages cache with a different version is deleted. A new deploy starts with a fresh set of pages, so a stored page always matches the assets that worker kept.

---

## Updates

A new worker installs alongside the old one, then waits until every tab of the site is closed before it takes over. There's deliberately no `skipWaiting()` to rush it.

The reason is the asset clean-up. A new worker removes files the old build used, and a page still open in another tab could suddenly find its CSS gone. Waiting avoids that. The cost is that a deploy reaches you one visit later, and that's a fair trade.

---

## The offline page

When a page can't come from the network or the cache, you get the offline page. It links to the pages that are always stored, and lists the posts you've read, so you know exactly what you can still open.

The page is built with every post on it, in a list that starts out `hidden`. A small script asks the cache which of those posts it holds:

```ts
const readPosts = document.querySelector('.read-posts');

if (readPosts instanceof HTMLElement && 'caches' in window) {
  const items = [...readPosts.querySelectorAll('li')];
  const cached = await Promise.all(
    items.map(async (item) => {
      const link = item.querySelector('a');
      return link !== null && (await caches.match(link.href)) !== undefined;
    })
  );

  items.forEach((item, index) => {
    if (!cached[index]) item.remove();
  });

  if (cached.includes(true)) readPosts.hidden = false;
}
```

A link's `href` is the full URL with its trailing slash, which is exactly the key the worker stores a page under. `caches.match()` searches every cache, so the page doesn't need to know what the worker calls them.

Items that aren't stored are removed rather than hidden. The list's spacing puts a gap above every item that follows another, and a hidden item would still count, leaving an odd gap above the first visible one.

The list needs JavaScript, but that's fine: this page only ever appears through the service worker, and that needs JavaScript too.

---

## Trying it

In Chrome's DevTools, the *Application* panel shows the worker and both caches. Tick *Offline* in the Network panel, then open a post you've read and one you haven't. The first loads from the cache. The second shows the offline page, with the first in its list.

And if a broken worker ever ships, the fix is to deploy a replacement `/sw.js` that deletes every cache and unregisters itself.
