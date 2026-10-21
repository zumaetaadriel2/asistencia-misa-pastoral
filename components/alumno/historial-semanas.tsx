"use client";

import type { EstadoSemana, SemanaAlumno } from "@/lib/alumno/identificar";

export const ETIQUETA_ESTADO: Record<EstadoSemana, { texto: string; clases: string }> = {
  validado: { texto: "Asistió", clases: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" },
  pendiente: { texto: "En revisión", clases: "bg-amber-500/10 border-amber-500/20 text-amber-300" },
  rechazado: { texto: "Rechazada", clases: "bg-rose-500/10 border-rose-500/20 text-rose-300" },
  justificada: { texto: "Justificada", clases: "bg-sky-500/10 border-sky-500/20 text-sky-300" },
  inasistencia: { texto: "Faltó", clases: "bg-white/5 border-white/10 text-white/40" },
  sin_registro: { texto: "Sin foto", clases: "bg-white/5 border-white/10 text-white/30" },
};

export function EtiquetaEstado({ estado }: { estado: EstadoSemana }) {
  const { texto, clases } = ETIQUETA_ESTADO[estado];
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${clases}`}>{texto}</span>
  );
}

/** Lista de semanas anteriores con su estado y, si lo hay, el motivo */
export function HistorialSemanas({ semanas }: { semanas: SemanaAlumno[] }) {
  if (semanas.length === 0) return null;

  const asistidas = semanas.filter((s) => s.estado === "validado").length;

  return (
    <section className="glass-card p-5 animate-fade-in delay-200">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Tus semanas</h2>
        <p className="text-xs text-white/40">
          Asististe a {asistidas} de {semanas.length}
        </p>
      </div>

      <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {semanas.map((s) => (
          <li key={s.semana} className="flex items-start justify-between gap-3 py-1.5">
            <div>
              <p className="text-sm text-white/80">Semana {s.semana}</p>
              {s.motivo && <p className="text-xs text-white/40 mt-0.5">{s.motivo}</p>}
            </div>
            <EtiquetaEstado estado={s.estado} />
          </li>
        ))}
      </ul>
    </section>
  );
}
