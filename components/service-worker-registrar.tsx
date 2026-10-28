"use client";

import { useEffect } from "react";
import { escucharInstalacion } from "@/lib/pwa/instalacion";

/**
 * Registra el Service Worker de la PWA (se monta una sola vez en el layout raíz) y empieza
 * a escuchar el aviso de instalación, que Chrome da una sola vez por carga (ver /instalar).
 * En desarrollo lo desregistra: su caché de archivos con hash interfiere con la
 * recarga en caliente de `next dev`.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    escucharInstalacion();
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
