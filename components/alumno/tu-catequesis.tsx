"use client";

import { useState } from "react";
import type { SesionAlumno } from "@/lib/alumno/identificar";
import { ESTADOS_CATEQUESIS } from "@/lib/ui/estados";
import { formatearFecha } from "@/lib/utils/timeHelpers";

/** Sesiones que se ven sin tocar "Ver todas" */
const VISIBLES = 5;

/** Sesiones de catequesis del alumno (la más reciente primero) con lo que marcó su catequista */
export function TuCatequesis({ sesiones }: { sesiones: SesionAlumno[] }) {
  const [todas, setTodas] = useState(false);
  if (sesiones.length === 0) return null;

  // Como en el panel del staff: la tardanza cuenta como asistencia; lo justificado y lo sin marcar no cuentan
  const asistio = sesiones.filter((s) => s.estado === "presente" || s.estado === "tardanza").length;
  const cuentan = asistio + sesiones.filter((s) => s.estado === "falta").length;
  const mostradas = todas ? sesiones : sesiones.slice(0, VISIBLES);

  return (
    <section className="tarjeta p-5 animate-fade-in delay-200">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-texto">Tu catequesis</h2>
        {cuentan > 0 && (
          <p className="text-xs text-texto-tenue">
            Asististe a {asistio} de {cuentan}
          </p>
        )}
      </div>

      <ul className="divide-y divide-borde">
        {mostradas.map((s, i) => {
          const { texto, clases } = ESTADOS_CATEQUESIS[s.estado];
          return (
            <li key={`${s.fecha}-${s.titulo}-${i}`} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-texto break-words">
                  {s.titulo}
                  <span className="text-texto-tenue"> · {formatearFecha(s.fecha)}</span>
                </p>
                {s.estado === "justificada" && s.motivo && (
                  <p className="text-xs text-texto-suave mt-0.5">Motivo: {s.motivo}</p>
                )}
              </div>
              <span className={`inline-flex shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium ${clases}`}>
                {texto}
              </span>
            </li>
          );
        })}
      </ul>

      {sesiones.length > VISIBLES && (
        <button
          onClick={() => setTodas(!todas)}
          aria-expanded={todas}
          className="mt-2 min-h-11 w-full rounded-xl text-sm font-medium text-marca hover:bg-superficie-2 transition-colors"
        >
          {todas ? "Ver menos" : `Ver todas (${sesiones.length})`}
        </button>
      )}
    </section>
  );
}
