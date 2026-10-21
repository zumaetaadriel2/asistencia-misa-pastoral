// =============================================
// Atajos de teclado de la revisión (para quien revisa en PC)
// =============================================
// → o V valida, ← o R rechaza, Z deshace. No se activan mientras se escribe,
// con un modal abierto, con Ctrl/Cmd/Alt (Ctrl+R recarga, Ctrl+Z deshace texto)
// ni al mantener la tecla apretada.

export type AccionAtajo = "validar" | "rechazar" | "deshacer";

export interface TeclaPresionada {
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  /** Elemento con el foco (tagName e isContentEditable) */
  objetivo: { tagName?: string; isContentEditable?: boolean } | null;
  hayModalAbierto: boolean;
}

const TECLAS: Record<string, AccionAtajo> = {
  ArrowRight: "validar",
  v: "validar",
  ArrowLeft: "rechazar",
  r: "rechazar",
  z: "deshacer",
};

const CAMPOS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function accionDeTecla(tecla: TeclaPresionada): AccionAtajo | null {
  if (tecla.repeat || tecla.ctrlKey || tecla.metaKey || tecla.altKey || tecla.hayModalAbierto) return null;
  if (tecla.objetivo?.isContentEditable || CAMPOS.has(tecla.objetivo?.tagName ?? "")) return null;
  return TECLAS[tecla.key.length === 1 ? tecla.key.toLowerCase() : tecla.key] ?? null;
}

/** Lee un KeyboardEvent del navegador en el formato de accionDeTecla */
export function leerTecla(e: KeyboardEvent): TeclaPresionada {
  const objetivo = e.target instanceof HTMLElement ? e.target : null;
  return {
    key: e.key,
    repeat: e.repeat,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    objetivo,
    hayModalAbierto: document.querySelector("dialog[open]") !== null,
  };
}
