"use client";

import type { AlumnoComunidad } from "@/lib/staff/comunidad";

interface Props {
  comunidad: string;
  alumnos: AlumnoComunidad[];
}

/**
 * Tarjetas con el código de cada alumno para recortar y repartir.
 * No se ven en pantalla: solo aparecen al imprimir (window.print()).
 */
export function CodigosImprimibles({ comunidad, alumnos }: Props) {
  const direccion = typeof window === "undefined" ? "/alumno" : `${window.location.host}/alumno`;

  return (
    <section className="hidden print:grid grid-cols-2 gap-3 text-black">
      {alumnos
        .filter((alumno) => alumno.activo)
        .map((alumno) => (
          <article key={alumno.id} className="border border-dashed border-neutral-400 rounded-lg p-4 break-inside-avoid">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Asistencia a misa · {comunidad}</p>
            <p className="mt-1 text-sm font-semibold">{alumno.nombre_completo}</p>
            <p className="mt-2 text-3xl font-mono font-bold tracking-[0.3em]">{alumno.codigo}</p>
            <p className="mt-2 text-[11px] text-neutral-600 leading-snug">
              Entra a <strong>{direccion}</strong> y escribe tu código. Solo se pide la primera vez; guárdalo y no lo
              compartas.
            </p>
          </article>
        ))}
    </section>
  );
}
