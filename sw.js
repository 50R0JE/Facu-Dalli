// GIZE service worker — "network-first" para que SIEMPRE veas la última versión,
// y cache de respaldo para poder abrir la app sin internet.
const CACHE = "core-v20";
// El CSS y el JS ahora viven repartidos en muchos archivos chiquitos (css/**, app/**),
// así que no se listan todos acá a mano: quedan cacheados solos por el fetch handler
// de abajo apenas se piden la primera vez (mismo criterio "network-first" de siempre).
const ASSETS = ["./", "./index.html", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png",
  "./brand/tokens.css", "./brand/logo/gize-firma-horizontal.svg", "./brand/logo/gize-monograma.svg",
  "./brand/logo/gize-logotipo.svg", "./brand/logo/gize-icono-negro.svg", "./manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Nunca cachear la API (Supabase, Open Food Facts): siempre red. La excepción es la
  // librería de Supabase del CDN: sin ella en caché, abrir la app sin internet dejaba
  // la app "sin cuenta" y lo que se cargaba ahí nunca entraba a la cola de envío.
  const isSbLib = url.origin === "https://cdn.jsdelivr.net" && url.pathname.startsWith("/npm/@supabase/supabase-js");
  if (url.origin !== self.location.origin && !isSbLib) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || (isSbLib ? Response.error() : caches.match("./index.html"))))
  );
});
