const CACHE_NAME = "asistencia-misa-v1";

// Archivos a cachear en la instalación del service worker
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// Instalación: cachear archivos estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: limpiar caches anteriores
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Estrategia de caché: Network First con fallback a cache
self.addEventListener("fetch", (event) => {
  // Solo cachear requests GET
  if (event.request.method !== "GET") return;

  // No cachear requests a la API de Supabase
  if (event.request.url.includes("supabase.co")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar la respuesta para guardarla en cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Si falla la red, buscar en cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response("Offline", { status: 503 });
        });
      })
  );
});
