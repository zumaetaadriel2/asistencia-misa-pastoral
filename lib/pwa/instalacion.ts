// =============================================
// Instalar la app en el celular (página /instalar)
// =============================================
// Chrome y Edge avisan una sola vez por carga que la app se puede instalar
// (beforeinstallprompt), casi siempre en la primera página: el aviso se escucha desde el
// layout (ServiceWorkerRegistrar) y se guarda aquí para que /instalar lo use después.
// No se cancela, así Chrome sigue mostrando su propio aviso "Instalar". iPhone no tiene
// este aviso: allí se instala a mano desde Safari.

import { useSyncExternalStore } from "react";

export type Plataforma = "ios" | "android" | "otra";

/**
 * iPhone y iPad → "ios" (también el iPad que se presenta como Mac: tiene pantalla táctil);
 * Android → "android". `puntosTactiles` es navigator.maxTouchPoints (una Mac tiene 0).
 */
export function plataformaDe(userAgent: string, puntosTactiles = 0): Plataforma {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/macintosh/i.test(userAgent) && puntosTactiles > 1) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "otra";
}

// ---------------------------------------------
// Estado compartido: el aviso guardado y si ya se instaló
// ---------------------------------------------

let aviso: BeforeInstallPromptEvent | null = null;
let instaladaAhora = false;
let escuchando = false;
const oyentes = new Set<() => void>();
const avisarCambio = () => oyentes.forEach((oyente) => oyente());

/** Se llama una vez al cargar la app */
export function escucharInstalacion(): void {
  if (escuchando || typeof window === "undefined") return;
  escuchando = true;
  window.addEventListener("beforeinstallprompt", (evento) => {
    aviso = evento;
    avisarCambio();
  });
  window.addEventListener("appinstalled", () => {
    aviso = null;
    instaladaAhora = true;
    avisarCambio();
  });
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** true si el navegador permite abrir la ventana de instalación desde un botón */
export function usePuedeInstalar(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => aviso !== null,
    () => false
  );
}

/** Abre la ventana de instalación del sistema. Devuelve true si el usuario aceptó. */
export async function instalar(): Promise<boolean> {
  const evento = aviso;
  if (!evento) return false;
  // prompt() solo se puede usar una vez
  aviso = null;
  avisarCambio();
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  return outcome === "accepted";
}

const MODO_APP = "(display-mode: standalone)";

function suscribirModo(oyente: () => void) {
  const consulta = window.matchMedia(MODO_APP);
  consulta.addEventListener("change", oyente);
  oyentes.add(oyente);
  return () => {
    consulta.removeEventListener("change", oyente);
    oyentes.delete(oyente);
  };
}

/** Abierta desde la pantalla de inicio, o recién instalada en esta visita; undefined mientras hidrata */
export function useAppInstalada(): boolean | undefined {
  return useSyncExternalStore(
    suscribirModo,
    () => instaladaAhora || window.matchMedia(MODO_APP).matches || navigator.standalone === true,
    () => undefined
  );
}

/** La plataforma del celular; null mientras hidrata (en el servidor no se sabe) */
export function usePlataforma(): Plataforma | null {
  return useSyncExternalStore(
    () => () => {},
    () => plataformaDe(navigator.userAgent, navigator.maxTouchPoints),
    () => null
  );
}
