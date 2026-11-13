/* SpringDrill service worker — OFFLINE JAMB PRACTICE ONLY.
 *
 * SAFETY: this worker must NEVER disturb the portal. It only ever handles:
 *   - the public /jamb-practice document (network-first, cache fallback),
 *   - the static question packs under /jamb-packs/*.json (cache-first),
 *   - the PWA manifest, icons and logo images (cache-first),
 *   - hashed Next.js static assets under /_next/static/ (cache-first —
 *     content-hashed and immutable, so a cached copy can never be stale).
 * Every other request — all portal pages, sign-in, Submit, results,
 * /api/*, and all cross-origin requests (Supabase, CDNs) — passes through
 * to the network untouched: the fetch handler simply returns without
 * calling respondWith. Portal pages can therefore never be served stale.
 *
 * Bump CACHE_VERSION whenever the pack content or the practice page shell
 * changes in a way that must reach devices that already cached it: old
 * caches are deleted on activate.
 */
const CACHE_VERSION = "sd-pwa-v1";
const PACK_CACHE = CACHE_VERSION + "-packs";
const SHELL_CACHE = CACHE_VERSION + "-shell";

const PACK_URLS = [
  "/jamb-packs/english.json",
  "/jamb-packs/mathematics.json",
  "/jamb-packs/biology.json",
];

const SHELL_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/springdrill-emblem.png",
  "/springdrill-logo.png",
  "/springdrill-wordmark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Precache the packs + shell assets. Each URL is fetched
      // independently: one failure must not fail the whole install.
      const packCache = await caches.open(PACK_CACHE);
      const shellCache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PACK_URLS.map((url) => packCache.add(url).catch(() => {})),
      );
      await Promise.all(
        SHELL_URLS.map((url) => shellCache.add(url).catch(() => {})),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== PACK_CACHE && name !== SHELL_CACHE)
          .filter((name) => name.indexOf("sd-pwa-") === 0)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const copy = response.clone();
      const cache = await caches.open(cacheName);
      await cache.put(request, copy);
    }
    return response;
  } catch (err) {
    return new Response("Offline, and this file has not been saved yet.", {
      status: 504,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function networkFirstDocument(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const copy = response.clone();
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, copy);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return new Response(
      "<!doctype html><title>SpringDrill — offline</title><main style=\"font-family:sans-serif;padding:2rem;max-width:34rem;margin:auto\"><h1>You are offline</h1><p>JAMB practice has not been saved on this device yet. Connect to the internet once and open the practice page — it will then work fully offline.</p><p><a href=\"/jamb-practice\">Try again</a></p></main>",
      { status: 200, headers: { "Content-Type": "text/html" } },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Cross-origin requests (Supabase, CDNs, fonts): never touch.
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // API routes: never touch.
  if (path.indexOf("/api/") === 0) return;

  // Question packs: cache-first.
  if (path.indexOf("/jamb-packs/") === 0 && path.endsWith(".json")) {
    event.respondWith(cacheFirst(request, PACK_CACHE));
    return;
  }

  // Manifest, icons, logo images: cache-first.
  if (
    path === "/manifest.webmanifest" ||
    path.indexOf("/icons/") === 0 ||
    path === "/springdrill-emblem.png" ||
    path === "/springdrill-logo.png" ||
    path === "/springdrill-wordmark.png"
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Hashed Next.js static assets: cache-first (immutable by content hash).
  if (path.indexOf("/_next/static/") === 0) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // The practice page document only: network-first, cache fallback.
  if ((path === "/jamb-practice" || path === "/jamb-practice/") && request.mode === "navigate") {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  // Everything else — all portal pages, sign-in, results, other
  // navigations — is deliberately NOT handled: the browser fetches it
  // from the network exactly as if no worker existed.
});
