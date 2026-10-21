"use client";

import type { ReactNode } from "react";

// Piezas visuales compartidas por las secciones de administración

export const claseInput =
  "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500/50";

export const claseBoton =
  "px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-all " +
  "disabled:opacity-30 disabled:cursor-not-allowed";

export const claseBotonSecundario =
  "px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-all " +
  "disabled:opacity-30 disabled:cursor-not-allowed";

export interface MensajeAdmin {
  tipo: "ok" | "error";
  texto: string;
}

export function Tarjeta({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="glass-card p-5 animate-fade-in">
      <h2 className="text-sm font-semibold text-white">{titulo}</h2>
      {descripcion && <p className="text-xs text-white/40 mt-1">{descripcion}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Mensaje({ mensaje }: { mensaje: MensajeAdmin | null }) {
  if (!mensaje) return null;
  return (
    <p
      role="status"
      className={`text-xs px-3 py-2 rounded-lg border ${
        mensaje.tipo === "ok"
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          : "bg-rose-500/10 border-rose-500/20 text-rose-300"
      }`}
    >
      {mensaje.texto}
    </p>
  );
}

export function Cargando() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>
  );
}
