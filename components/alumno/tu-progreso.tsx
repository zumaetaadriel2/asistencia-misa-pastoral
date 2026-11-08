"use client";

import type { SemanaAlumno } from "@/lib/alumno/identificar";
import { progresoAlumno } from "@/lib/alumno/progreso";

/** Domingos seguidos y porcentaje del ciclo, con las mismas reglas que ve su guía */
export function TuProgreso({ semanas, semanaActual }: { semanas: SemanaAlumno[]; semanaActual: number }) {
  const { seguidas, asistio, cuentan, porcentaje } = progresoAlumno(semanas, semanaActual);
  // La primera semana del ciclo todavía no hay nada que contar
  if (cuentan === 0 && seguidas === 0) return null;

  return (
    <section className="tarjeta p-5 animate-fade-in delay-200">
      <h2 className="text-sm font-semibold text-texto">Tu progreso</h2>
      <p className="mt-2 flex items-center gap-2 text-xl font-bold text-texto">
        <svg className="w-6 h-6 text-aviso shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
        </svg>
        {seguidas > 0 ? `${seguidas} ${seguidas === 1 ? "domingo seguido" : "domingos seguidos"}` : "Empieza tu racha este domingo"}
      </p>
      {porcentaje !== null && (
        <>
          <div
            className="mt-3 h-2 rounded-full bg-superficie-2 overflow-hidden"
            role="progressbar"
            aria-label="Tu asistencia del ciclo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
          >
            <div className="h-full rounded-full bg-marca-solido" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="mt-2 text-xs text-texto-suave">
            Asististe a {asistio} de {cuentan} {cuentan === 1 ? "semana" : "semanas"} · {porcentaje}%. Las justificadas no cuentan.
          </p>
        </>
      )}
    </section>
  );
}
