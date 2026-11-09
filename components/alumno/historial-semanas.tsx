"use client";

import { useState } from "react";
import { Plegable } from "@/components/ui/plegable";
import type { EstadoSemana, SemanaAlumno } from "@/lib/alumno/identificar";
import type { ProgresoAlumno } from "@/lib/alumno/progreso";
import { ESTADOS } from "@/lib/ui/estados";
import { formatearFecha } from "@/lib/utils/timeHelpers";

/** Semanas que se ven sin tocar "Ver todas" */
const VISIBLES = 6;

export function EtiquetaEstado({ estado }: { estado: EstadoSemana }) {
  const { alumno, clases } = ESTADOS[estado];
  return (
    <span className={`inline-flex shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium ${clases}`}>{alumno}</span>
  );
}

/** Semanas anteriores con su estado y, si lo hay, el motivo. El conteo usa las reglas que ve su guía. */
export function HistorialSemanas({ semanas, progreso }: { semanas: SemanaAlumno[]; progreso: ProgresoAlumno }) {
  const [todas, setTodas] = useState(false);
  if (semanas.length === 0) return null;
  const { asistio, cuentan, porcentaje } = progreso;
  const mostradas = todas ? semanas : semanas.slice(0, VISIBLES);

  return (
    <Plegable titulo="Tus semanas" resumen={cuentan > 0 ? `Asististe a ${asistio} de ${cuentan}` : undefined}>
      {porcentaje !== null && (
        <>
          <div
            className="h-2 rounded-full bg-superficie-2 overflow-hidden"
            role="progressbar"
            aria-label="Tu asistencia del ciclo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
          >
            <div className="h-full rounded-full bg-marca-solido" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="mt-2 mb-2 text-xs text-texto-suave">
            Asististe a {asistio} de {cuentan} {cuentan === 1 ? "semana" : "semanas"} · {porcentaje}%. Las justificadas no cuentan.
          </p>
        </>
      )}

      <ul className="divide-y divide-borde">
        {mostradas.map((s) => (
          <li key={s.semana} className="flex items-start justify-between gap-3 py-2.5">
            <div>
              <p className="text-sm text-texto">
                Semana {s.semana}
                {s.domingo && <span className="text-texto-tenue"> · {formatearFecha(s.domingo)}</span>}
              </p>
              {s.motivo && <p className="text-xs text-texto-suave mt-0.5">Motivo: {s.motivo}</p>}
            </div>
            <EtiquetaEstado estado={s.estado} />
          </li>
        ))}
      </ul>

      {semanas.length > VISIBLES && (
        <button
          onClick={() => setTodas(!todas)}
          aria-expanded={todas}
          className="mt-2 min-h-11 w-full rounded-xl text-sm font-medium text-marca hover:bg-superficie-2 transition-colors"
        >
          {todas ? "Ver menos" : `Ver todas (${semanas.length})`}
        </button>
      )}
    </Plegable>
  );
}
