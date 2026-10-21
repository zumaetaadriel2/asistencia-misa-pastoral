// =============================================
// Consejo de la primera vez en la revisión ("desliza para validar o rechazar")
// =============================================
// Se recuerda en localStorage del navegador del guía; si no hay localStorage
// (modo privado), solo mientras la página siga abierta. Mismo patrón que
// useCodigoGuardado (lib/alumno/codigo.ts).

import { useSyncExternalStore } from "react";

const CLAVE = "revision.consejoVisto";
let vistoEnMemoria = false;
const oyentes = new Set<() => void>();

function leer(): boolean {
  try {
    return window.localStorage.getItem(CLAVE) === "1" || vistoEnMemoria;
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

export function marcarConsejoVisto(): void {
  vistoEnMemoria = true;
  try {
    window.localStorage.setItem(CLAVE, "1");
  } catch {
    // Sin localStorage: queda solo en memoria
  }
  oyentes.forEach((oyente) => oyente());
}

/** `true` si ya lo vio; en el servidor también `true`, para no mostrarlo y esconderlo de golpe */
export function useConsejoVisto(): boolean {
  return useSyncExternalStore(suscribir, leer, () => true);
}
