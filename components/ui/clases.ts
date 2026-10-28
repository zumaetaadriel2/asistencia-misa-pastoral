import { cn } from "@/lib/utils";

// Clases de los botones, sin "use client": también se usan desde páginas de servidor
// (p. ej. un <Link> con forma de botón en /privacidad). base.tsx las reexporta.

const VARIANTES = {
  primario: "bg-marca-solido hover:bg-marca-solido/85 text-white font-semibold",
  secundario: "bg-superficie-2 hover:bg-borde text-texto-suave font-medium",
  peligro: "bg-error-solido hover:bg-error-solido/85 text-white font-semibold",
  exito: "bg-exito-solido hover:bg-exito-solido/85 text-white font-semibold",
  fantasma: "text-texto-suave hover:text-texto hover:bg-superficie-2 font-medium",
} as const;

const TAMANOS = {
  normal: "min-h-11 px-4 rounded-xl text-sm",
  pequeno: "min-h-11 px-3 rounded-lg text-xs",
} as const;

const BASE_BOTON =
  "inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-marca/50 disabled:opacity-40 disabled:cursor-not-allowed";

export type VarianteBoton = keyof typeof VARIANTES;
export type TamanoBoton = keyof typeof TAMANOS;

/** Clases de un botón, para usarlas también en enlaces (<Link>) */
export function claseDeBoton(variante: VarianteBoton = "primario", tamano: TamanoBoton = "normal") {
  return cn(BASE_BOTON, VARIANTES[variante], TAMANOS[tamano]);
}
