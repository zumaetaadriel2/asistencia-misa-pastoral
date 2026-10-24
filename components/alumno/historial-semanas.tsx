"use client";

import type { EstadoSemana, SemanaAlumno } from "@/lib/alumno/identificar";
import { ESTADOS } from "@/lib/ui/estados";
import { formatearFecha } from "@/lib/utils/timeHelpers";

export function EtiquetaEstado({ estado }: { estado: EstadoSemana }) {
  const { alumno, clases } = ESTADOS[estado];
  return (
    <span className={`inline-flex shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium ${clases}`}>{alumno}</span>
  );
}

/** Lista de semanas anteriores con su estado y, si lo hay, el motivo */
export function HistorialSemanas({ semanas }: { semanas: SemanaAlumno[] }) {
  if (semanas.length === 0) return null;

  const asistidas = semanas.filter((s) => s.estado === "validado").length;

  return (
    <section className="tarjeta p-5 animate-fade-in delay-300">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-texto">Tus semanas</h2>
        <p className="text-xs text-texto-tenue">
          Asististe a {asistidas} de {semanas.length}
        </p>
      </div>

      <ul className="divide-y divide-borde">
        {semanas.map((s) => (
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
    </section>
  );
}
