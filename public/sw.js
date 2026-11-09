// =============================================
// Service worker de la PWA
// =============================================
// Solo guarda en caché los archivos de la propia app (JS/CSS con hash, íconos y
// manifest). Nunca intercepta fotos, datos ni llamadas a Supabase o R2: son de
// menores y no deben quedar guardados en el celular de nadie.
// Al cambiar esta lógica, subir CACHE_NAME: la activación borra las cachés viejas.

const CACHE_NAME = "asistencia-misa-v8";

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

// ---------------------------------------------
// Avisos push (los manda la Edge Function enviar-avisos)
// ---------------------------------------------

// En iPhone, cada aviso que llega tiene que mostrarse: por eso no se descarta ninguno
self.addEventListener("push", (event) => {
  let aviso = {};
  try {
    aviso = event.data ? event.data.json() : {};
  } catch {
    // Sin texto legible: se muestra el aviso con el nombre de la app
  }
  event.waitUntil(
    self.registration.showNotification(aviso.titulo || "Mi Misa PS", {
      body: aviso.cuerpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: aviso.url || "/" },
    })
  );
});

// Al tocar el aviso: abre esa página de la app, en la ventana que ya esté abierta si hay una
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/", self.location.origin);
  const url = destino.origin === self.location.origin ? destino.href : self.location.origin + "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((ventana) => new URL(ventana.url).origin === self.location.origin);
      if (!abierta) return self.clients.openWindow(url);
      return abierta
        .focus()
        .then((ventana) => ventana.navigate(url))
        .catch(() => self.clients.openWindow(url));
    })
  );
});
