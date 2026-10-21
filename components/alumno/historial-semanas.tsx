"use client";

import type { EstadoSemana, SemanaAlumno } from "@/lib/alumno/identificar";
import { ESTADOS } from "@/lib/ui/estados";

export function EtiquetaEstado({ estado }: { estado: EstadoSemana }) {
  const { alumno, clases } = ESTADOS[estado];
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${clases}`}>{alumno}</span>
  );
}

/** Lista de semanas anteriores con su estado y, si lo hay, el motivo */
export function HistorialSemanas({ semanas }: { semanas: SemanaAlumno[] }) {
  if (semanas.length === 0) return null;

  const asistidas = semanas.filter((s) => s.estado === "validado").length;

  return (
    <section className="tarjeta p-5 animate-fade-in delay-200">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-texto">Tus semanas</h2>
        <p className="text-xs text-texto-tenue">
          Asististe a {asistidas} de {semanas.length}
        </p>
      </div>

      <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {semanas.map((s) => (
          <li key={s.semana} className="flex items-start justify-between gap-3 py-1.5">
            <div>
              <p className="text-sm text-texto-suave">Semana {s.semana}</p>
              {s.motivo && <p className="text-xs text-texto-tenue mt-0.5">{s.motivo}</p>}
            </div>
            <EtiquetaEstado estado={s.estado} />
          </li>
        ))}
      </ul>
    </section>
  );
}
