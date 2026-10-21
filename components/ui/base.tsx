"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Piezas visuales compartidas por toda la app (colores con nombre de app/globals.css)

export const claseInput =
  "w-full px-3 py-2.5 rounded-xl bg-superficie-2 border border-borde text-texto text-base sm:text-sm " +
  "placeholder:text-texto-tenue focus:outline-none focus:ring-2 focus:ring-marca/40 focus:border-marca/50";

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

/** Clases de un botón, para usarlas también en enlaces (<Link>) */
export function claseDeBoton(variante: VarianteBoton = "primario", tamano: keyof typeof TAMANOS = "normal") {
  return cn(BASE_BOTON, VARIANTES[variante], TAMANOS[tamano]);
}

/** Botón de al menos 44 px de alto. `className` es solo para ubicarlo (márgenes, ancho, flex). */
export function Boton({
  variante = "primario",
  tamano = "normal",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton; tamano?: keyof typeof TAMANOS }) {
  return <button type={type} className={cn(claseDeBoton(variante, tamano), className)} {...props} />;
}

/** Campo de formulario con su etiqueta visible */
export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-texto-suave">{etiqueta}</span>
      <div className="mt-1">{children}</div>
      {ayuda && <span className="mt-1 block text-xs text-texto-tenue">{ayuda}</span>}
    </label>
  );
}

/** Campo para filtrar una lista por nombre (usar con `coincide` de lib/staff/busqueda.ts) */
export function Buscador({
  valor,
  onCambiar,
  etiqueta = "Buscar por nombre",
}: {
  valor: string;
  onCambiar: (valor: string) => void;
  etiqueta?: string;
}) {
  return (
    <input
      type="search"
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      placeholder={etiqueta}
      aria-label={etiqueta}
      enterKeyHint="search"
      className={claseInput}
    />
  );
}

export interface MensajeAdmin {
  tipo: "ok" | "error";
  texto: string;
}

export function Tarjeta({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="tarjeta p-5 animate-fade-in">
      <h2 className="text-sm font-semibold text-texto">{titulo}</h2>
      {descripcion && <p className="text-xs text-texto-tenue mt-1">{descripcion}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Mensaje({ mensaje }: { mensaje: MensajeAdmin | null }) {
  if (!mensaje) return null;
  return (
    <p
      role={mensaje.tipo === "error" ? "alert" : "status"}
      className={`text-xs px-3 py-2 rounded-lg border ${
        mensaje.tipo === "ok"
          ? "bg-exito/10 border-exito/25 text-exito"
          : "bg-error/10 border-error/25 text-error"
      }`}
    >
      {mensaje.texto}
    </p>
  );
}

export function Cargando() {
  return (
    <div role="status" className="flex justify-center py-10">
      <div className="w-8 h-8 rounded-full border-2 border-marca border-t-transparent animate-spin" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
