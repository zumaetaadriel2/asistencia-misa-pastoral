"use client";

import { useEffect } from "react";

/**
 * Componente que registra el Service Worker para habilitar la PWA.
 * Se monta una sola vez en el layout raíz.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registrado con éxito:", registration.scope);
        })
        .catch((error) => {
          console.error("Error al registrar el Service Worker:", error);
        });
    }
  }, []);

  return null;
}
