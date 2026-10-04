/* Learning Lasair service worker.
 *
 * Goal: the whole course, the exam-prep track and the Exam Room work offline on a
 * phone after one online visit. Strategy:
 *   - install: precache the app shell (pages, css, js, data) and EVERY lesson listed in
 *     data/course.json. The OCaml toplevel
 *     (playground) is excluded: ~8 MB and only useful with a keyboard.
 *   - fetch: network-first (always the current deploy when online), falling back to the
 *     cache when offline. Stylesheets and scripts carry ?v=<hash> (tools/stamp_assets.py).
 *   - navigation offline miss: fall back to index.html.
 *
 * Bump CACHE_VERSION when the shell changes shape; lesson/data updates flow through
 * stale-while-revalidate without a bump.
 */

const CACHE_VERSION = "ll-v8";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = SHELL_CACHE; // one cache, so refreshed entries replace stale ones

const SHELL = [
  "./",
  "index.html",
  "lesson.html",
  "exam.html",
  "conformance.html",
  "mutation.html",
  "divergences.html",
  "manifest.webmanifest",
  "../assets/css/style.css",
  "../assets/css/exam.css",
  "../assets/css/conformance.css",
  "../assets/css/mutation.css",
  "../assets/css/divergences.css",
  "../assets/css/vendor/highlight-github-dark.min.css",
  "../assets/js/nav.js",
  "../assets/js/app.js",
  "../assets/js/lesson.js",
  "../assets/js/exam.js",
  "../assets/js/conformance.js",
  "../assets/js/mutation.js",
  "../assets/js/divergences.js",
  "../assets/js/vendor/marked.min.js",
  "../assets/js/vendor/highlight.min.js",
  "../assets/js/vendor/highlight-ocaml.min.js",
  "data/course.json",
  "data/exam.json",
  "data/divergences.json",
  "data/mutation.json",
  "../assets/icons/icon-192.png",
  "../assets/icons/icon-512.png",
  "../assets/icons/icon-maskable-512.png",
];

const EXCLUDE = [/\/js\/toplevel\.js$/, /\/data\/conformance\//];

function lessonUrls(course) {
  const out = [];
  for (const track of course.tracks || []) {
    for (const lesson of track.lessons || []) out.push(`content/${track.id}/${lesson.id}.md`);
    for (const section of track.sections || []) {
      for (const lesson of section.lessons || []) out.push(`content/${track.id}/${lesson.id}.md`);
    }
  }
  return out;
}

async function addAllTolerant(cache, urls, init) {
  // cache.addAll fails the whole batch on one 404; add one by one and report misses.
  const missed = [];
  await Promise.all(urls.map(async (u) => {
    try {
      // cache: "reload" bypasses the HTTP cache so a deploy never precaches stale
      // files (Netlify serves js/css with a one-year max-age).
      const res = await fetch(u, Object.assign({ cache: "reload" }, init));
      if (res.ok) await cache.put(u, res);
      else missed.push(u);
    } catch (e) {
      missed.push(u);
    }
  }));
  return missed;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const missedShell = await addAllTolerant(cache, SHELL, { credentials: "same-origin" });
    let lessons = [];
    try {
      const res = await cache.match("data/course.json") || await fetch("data/course.json", { cache: "reload" });
      lessons = lessonUrls(await res.clone().json());
    } catch (e) { /* no manifest, no lessons precached */ }
    const missedLessons = await addAllTolerant(cache, lessons, { credentials: "same-origin" });
    if (missedShell.length || missedLessons.length) {
      console.warn("[sw] precache misses", missedShell, missedLessons);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !n.startsWith(CACHE_VERSION)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

function isExcluded(url) { return EXCLUDE.some((re) => re.test(url.pathname)); }

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || isExcluded(url)) return;

  event.respondWith((async () => {
    // Network first: online you always get the current deploy; offline, the cache.
    // (Cache-first served stale styles and scripts after deploys.)
    try {
      const res = await fetch(req, { cache: "no-cache" });
      if (res && res.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, res.clone()).catch(() => {});
        return res;
      }
      if (res && res.status !== 401) return res;
    } catch (e) { /* offline: fall through to the cache */ }
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === "navigate") {
      return (await caches.match("index.html")) || new Response("Offline and not cached yet.", { status: 503 });
    }
    return new Response("", { status: 504, statusText: "offline" });
  })());
});

// The page can ask for a re-precache after a deploy (see app.js).
self.addEventListener("message", (event) => {
  if (event.data === "refresh-lessons") {
    event.waitUntil((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const res = await fetch("data/course.json", { credentials: "same-origin", cache: "reload" });
        if (res.ok) {
          await cache.put("data/course.json", res.clone());
          await addAllTolerant(cache, lessonUrls(await res.json()).concat(["data/exam.json"]), { credentials: "same-origin" });
        }
      } catch (e) { /* offline */ }
    })());
  }
});
