// =============================================
// Código personal del alumno y su recuerdo en el celular
// =============================================

import { useSyncExternalStore } from "react";

/** Mismo alfabeto que la base: sin 0/O/1/I/L para que no se confundan */
export const PATRON_CODIGO = /^[A-HJKMNP-Z2-9]{6}$/;
export const LARGO_CODIGO = 6;

/** Mismo criterio que la base: mayúsculas y solo letras y números ("test-22" → "TEST22") */
export function normalizarCodigo(texto: string): string {
  return texto.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function esCodigoValido(texto: string): boolean {
  return PATRON_CODIGO.test(normalizarCodigo(texto));
}

// ---------------------------------------------
// Recuerdo del código en localStorage
// ---------------------------------------------
// Si el navegador bloquea localStorage (modo privado), se recuerda solo en memoria
// mientras la página siga abierta.

const CLAVE = "asistencia.codigo";
let codigoEnMemoria: string | null = null;
const oyentes = new Set<() => void>();

function leerCodigo(): string | null {
  try {
    return window.localStorage.getItem(CLAVE) ?? codigoEnMemoria;
  } catch {
    return codigoEnMemoria;
  }
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  window.addEventListener("storage", oyente);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", oyente);
  };
}

/** Guarda el código en el celular, o lo olvida con `null` ("No soy yo") */
export function guardarCodigo(codigo: string | null): void {
  codigoEnMemoria = codigo;
  try {
    if (codigo) window.localStorage.setItem(CLAVE, codigo);
    else window.localStorage.removeItem(CLAVE);
  } catch {
    // Sin localStorage: queda solo en memoria
  }
  oyentes.forEach((oyente) => oyente());
}

/**
 * Código recordado en este celular.
 * `undefined` mientras se renderiza en el servidor o se hidrata (aún no se sabe),
 * `null` si no hay ninguno guardado.
 */
export function useCodigoGuardado(): string | null | undefined {
  return useSyncExternalStore(suscribir, leerCodigo, () => undefined);
}
