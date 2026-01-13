const CACHE = "blog-studio-propp-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./category.html",
  "./post.html",
  "./styles.css",
  "./app.js",
  "./posts.json",
  "./manifest.webmanifest",
  "./rss.xml",
  "./sitemap.xml",
  "./robots.txt"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => cached))
  );
});
