// =============================================
// "Ya lo vio": una marca en localStorage para consejos de la primera vez
// =============================================
// Sin localStorage (modo privado) queda solo mientras la página siga abierta. Mismo patrón
// que useCodigoGuardado (lib/alumno/codigo.ts).

import { useSyncExternalStore } from "react";

export function crearMarcaVista(clave: string) {
  let vistoEnMemoria = false;
  const oyentes = new Set<() => void>();

  function leer(): boolean {
    try {
      return window.localStorage.getItem(clave) === "1" || vistoEnMemoria;
    } catch {
      return vistoEnMemoria;
    }
  }

  function suscribir(oyente: () => void): () => void {
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  }

  function marcar(): void {
    vistoEnMemoria = true;
    try {
      window.localStorage.setItem(clave, "1");
    } catch {
      // Sin localStorage: queda solo en memoria
    }
    oyentes.forEach((oyente) => oyente());
  }

  /** `true` si ya lo vio; en el servidor también `true`, para no mostrarlo y esconderlo de golpe */
  function useVista(): boolean {
    return useSyncExternalStore(suscribir, leer, () => true);
  }

  return { marcar, useVista };
}
