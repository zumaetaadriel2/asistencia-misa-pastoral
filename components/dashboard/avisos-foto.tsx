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
              ? "bg-aviso/10 border-aviso/25 text-aviso"
              : "bg-superficie-2 border-borde text-texto-tenue"
          }`}
        >
          {aviso.nivel === "alerta" ? "⚠ " : ""}
          {aviso.texto}
        </li>
      ))}
    </ul>
  );
}
