"use client";

import type { Aviso } from "@/lib/staff/avisos";

/** Indicios sobre la foto (fecha de la cámara, foto parecida) bajo el nombre del alumno */
export function AvisosFoto({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1.5">
      {avisos.map((aviso) => (
        <li
          key={aviso.texto}
          className={`text-xs px-3 py-2 rounded-lg border ${
            aviso.nivel === "alerta"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
              : "bg-white/[0.03] border-white/10 text-white/50"
          }`}
        >
          {aviso.nivel === "alerta" ? "⚠ " : ""}
          {aviso.texto}
        </li>
      ))}
    </ul>
  );
}
