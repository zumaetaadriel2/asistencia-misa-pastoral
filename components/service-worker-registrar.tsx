"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker de la PWA (se monta una sola vez en el layout raíz).
 * En desarrollo lo desregistra: su caché de archivos con hash interfiere con la
 * recarga en caliente de `next dev`.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registros) => registros.forEach((registro) => registro.unregister()));
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Error al registrar el Service Worker:", error);
    });
  }, []);

  return null;
}
