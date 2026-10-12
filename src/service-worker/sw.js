// The site's service worker. It makes the site readable offline and quicker on a repeat visit.
//
// This file is a template, not what ships. src/integrations/service-worker.ts fills in the two
// placeholders below at build time and writes the result to dist/sw.js. (Reading this in
// dist/sw.js? It's generated; edit src/service-worker/sw.js instead.) It has to be served
// unhashed from the site root, so its scope is the whole site; that is why it isn't bundled
// by Vite like the scripts in src/scripts/.
//
// Two caches, because the site's files fall into two kinds:
// - `assets` holds the CSS, JS and favicons. Files under /_astro/ carry a content hash in their
//   name, so a given URL never changes and the cache can outlive a deploy. A file that hasn't
//   changed is never downloaded twice. Only entries the new build no longer lists are removed.
// - `pages` holds HTML and is replaced by every deploy that changes anything.
//
// A deploy is detected by the browser re-fetching this file, which netlify.toml serves with
// `no-cache`. The new worker then waits for every open tab to close before taking over. There is
// deliberately no skipWaiting(): an old page still open would otherwise lose the assets the new
// worker removes. It does call `clients.claim()` on activate, which is safe without the skip: it
// only takes over a page, and never removes anything from under one.
//
// To retire the worker if a bad one ever ships, deploy a /sw.js that deletes every cache and
// calls `registration.unregister()`.

// Filled in by the integration. `version` becomes a short hash; `manifest` becomes an object,
// `{ assets, pages, offline }`, of URL paths to precache.
const version = '__swVersion__';
const manifest = '__swManifest__';

const assetsCacheName = 'playground-assets';
const pagesCacheName = `playground-pages@${version}`;

// How long to wait for the network before showing a cached copy of a page, and how many pages
// to keep. Precached pages are never trimmed.
const timeout = 3000;
const maxPages = 50;

// Left to the network, always. A feed reader or crawler should see live content, and the
// worker file must never be served from a cache it manages.
const neverIntercept = /^\/(rss\.xml|robots\.txt|sitemap.*\.xml|sw\.js)$/;

const assetPaths = new Set(manifest.assets);

// A page's cache key: the path with a trailing slash, and no query string or hash. Navigation links
// on the site mix `/about` and `/about/`, and a tracking parameter shouldn't make a second copy.
const pageKey = (urlString) => {
  const { origin, pathname } = new URL(urlString);
  const isFile = /\.[^/]+$/.test(pathname);
  return origin + (isFile || pathname.endsWith('/') ? pathname : `${pathname}/`);
};

// A redirected response can't be served to a navigation (the browser rejects it), so it is never
// stored. Only a plain success is worth keeping.
const isCacheable = (response) => response.ok && !response.redirected && response.type === 'basic';

// Fetches a file to precache, using the browser's own HTTP cache as far as it's safe to. A page or
// an unhashed favicon is fetched with `no-cache`: the browser must check with the server, so a
// stale copy is never stored, but an unchanged file costs a 304 rather than a second download.
// A hashed /_astro/ file can't be stale, so it uses the HTTP cache as normal, which usually holds
// it already: the page that registered the worker has just loaded it.
const fetchFresh = async (path) => {
  const cache = path.startsWith('/_astro/') ? 'default' : 'no-cache';
  const response = await fetch(new Request(path, { cache }));
  if (!isCacheable(response)) {
    throw new Error(`Could not precache ${path}: ${response.status}${response.redirected ? ' (redirected)' : ''}`);
  }
  return response;
};

const precache = async () => {
  const [assets, pages] = await Promise.all([caches.open(assetsCacheName), caches.open(pagesCacheName)]);

  // Hashed assets already in the cache from an earlier deploy are kept as they are. The favicons
  // aren't hashed, so they're refreshed every time.
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

const clearOldCaches = async () => {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith('playground-pages@') && name !== pagesCacheName)
      .map((name) => caches.delete(name))
  );

  // Drop assets the new build no longer lists; keep the ones it still uses.
  const assets = await caches.open(assetsCacheName);
  const stored = await assets.keys();
  await Promise.all(
    stored.filter((request) => !assetPaths.has(new URL(request.url).pathname)).map((request) => assets.delete(request))
  );
};

// Removes the oldest visited pages beyond the limit. `cache.keys()` is in insertion order, and the
// precached pages are skipped so the offline page and the main pages are never evicted.
const trimPages = async () => {
  const precached = new Set(manifest.pages.map((path) => pageKey(new URL(path, location.origin))));
  const cache = await caches.open(pagesCacheName);
  const keys = await cache.keys();
  const excess = keys.length - maxPages;
  if (excess <= 0) return;

  const evictable = keys.filter((request) => !precached.has(request.url));
  await Promise.all(evictable.slice(0, excess).map((request) => cache.delete(request)));
};

const savePage = async (key, response) => {
  const cache = await caches.open(pagesCacheName);
  await cache.put(key, response);
  await trimPages();
};

const offlineResponse = async () =>
  (await caches.match(pageKey(new URL(manifest.offline, location.origin)))) ?? Response.error();

// Assets: the cache first. Their names are hashed, so a cached copy is always the right one.
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

// Pages: the network first, so a visitor on a good connection always sees the latest. If the
// network is slow (the timeout) or down, a cached copy is used, and failing that the offline page.
const respondWithPage = (event) => {
  const { request } = event;
  const key = pageKey(request.url);

  // Reuse the fetch the browser started during navigation preload (enabled in `activate`) rather
  // than make a second one. It resolves to undefined when the browser chose not to preload.
  const network = Promise.resolve(event.preloadResponse).then((preloaded) => preloaded || fetch(request));

  // Keep a copy of the page. This handler is attached before the one below, so its `clone()`
  // runs before the response is handed to the browser and its body is used. `waitUntil` keeps
  // the worker alive until the write finishes, even if the page was already answered.
  event.waitUntil(
    network
      .then((response) => (isCacheable(response) ? savePage(key, response.clone()) : undefined))
      .catch(() => {
        // A network failure is dealt with below; a failed write just means no copy was kept.
      })
  );

  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      const cached = await caches.match(key);
      // With nothing cached, keep waiting for the network rather than give up early.
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

addEventListener('install', (event) => {
  event.waitUntil(precache());
});

addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await clearOldCaches();
      // Starts the page request while the worker is still waking up, which trims the delay a
      // worker adds to a navigation.
      await self.registration.navigationPreload?.enable();
      // Takes control of the page that registered the worker, so a first visit is handled from
      // then on rather than from the next page. In practice it only acts on a first install:
      // without skipWaiting(), an updated worker activates once no tab it would take over from is
      // open. The exception is a tab opened with a hard reload, which bypasses the worker; that's
      // safe to claim, because it loaded the current deploy's files. It runs after the clean-up,
      // so a claimed page never sees a cache being emptied.
      await self.clients.claim();
    })()
  );
});

addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  const isNavigation = request.mode === 'navigate';
  const isExcluded = neverIntercept.test(url.pathname);
  const isAsset = assetPaths.has(url.pathname);

  // With navigation preload on, the browser has already started fetching every navigation, these
  // included. Leaving one unanswered would send it to the network a second time, so it's answered
  // with the preload instead: straight through, nothing cached. Only reached by opening the feed,
  // a sitemap or a file in the address bar.
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
