// =============================================
// Service worker de la PWA
// =============================================
// Solo guarda en caché los archivos de la propia app (JS/CSS con hash, íconos y
// manifest). Nunca intercepta fotos, datos ni llamadas a Supabase o R2: son de
// menores y no deben quedar guardados en el celular de nadie.
// Al cambiar esta lógica, subir CACHE_NAME: la activación borra las cachés viejas.

const CACHE_NAME = "asistencia-misa-v7";

const ARCHIVOS_INICIALES = ["/manifest.json"];

function esArchivoDeLaApp(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.json")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_INICIALES)));
  self.skipWaiting();
});

// Borra las cachés de versiones anteriores (la v1 guardaba cualquier respuesta)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((nombre) => nombre !== CACHE_NAME).map((nombre) => caches.delete(nombre)))
      )
  );
  self.clients.claim();
});

// Archivos de la app: primero la caché (llevan hash en el nombre, no cambian)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!esArchivoDeLaApp(new URL(event.request.url))) return;

  event.respondWith(
    caches.match(event.request).then(
      (guardada) =>
        guardada ||
        fetch(event.request).then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          }
          return respuesta;
        })
    )
  );
});
