const V = "lc-1cede08728", ARQ = ["./", "index.html", "css/app.css", "js/config.js", "js/app.js", "manifest.webmanifest", "img/icon-192.png", "img/icon-512.png", "img/favicon.svg"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(ARQ)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((c) => c || fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((x) => x.put(e.request, cp)); } return r; }).catch(() => caches.match("index.html"))));
});
