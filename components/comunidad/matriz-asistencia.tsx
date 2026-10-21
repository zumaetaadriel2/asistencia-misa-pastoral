"use client";

import type { AlumnoComunidad, RegistroSemana } from "@/lib/staff/comunidad";
import { resumirAlumno } from "@/lib/staff/estadisticas";
import type { EstadoAsistencia } from "@/lib/staff/revision";

type EstadoCelda = EstadoAsistencia | "sin_registro";

const CELDA: Record<EstadoCelda, { texto: string; clases: string; titulo: string }> = {
  validado: { texto: "✓", clases: "bg-emerald-500/20 text-emerald-300", titulo: "Asistió" },
  pendiente: { texto: "…", clases: "bg-amber-500/20 text-amber-300", titulo: "Foto en revisión" },
  rechazado: { texto: "✕", clases: "bg-rose-500/20 text-rose-300", titulo: "Foto rechazada" },
  inasistencia: { texto: "F", clases: "bg-white/10 text-white/50", titulo: "Faltó" },
  justificada: { texto: "J", clases: "bg-sky-500/20 text-sky-300", titulo: "Justificada" },
  sin_registro: { texto: "·", clases: "bg-white/[0.03] text-white/25", titulo: "Sin registro" },
};

interface Props {
  alumnos: AlumnoComunidad[];
  registros: RegistroSemana[];
  /** Semanas transcurridas del ciclo (1..semanas) */
  semanas: number;
  onJustificar: (alumno: AlumnoComunidad, semana: number) => void;
  onNuevoCodigo: (alumno: AlumnoComunidad) => void;
}

/** Tabla alumno × semana (la más reciente primero) con su porcentaje de asistencia */
export function MatrizAsistencia({ alumnos, registros, semanas, onJustificar, onNuevoCodigo }: Props) {
  const porAlumno = new Map<number, Map<number, RegistroSemana>>();
  for (const registro of registros) {
    const semanasAlumno = porAlumno.get(registro.alumno_id) ?? new Map<number, RegistroSemana>();
    semanasAlumno.set(registro.semana_numero, registro);
    porAlumno.set(registro.alumno_id, semanasAlumno);
  }
  const columnas = Array.from({ length: semanas }, (_, i) => semanas - i);

  if (alumnos.length === 0) {
    return <p className="text-sm text-white/40 text-center py-10">Esta comunidad todavía no tiene alumnos.</p>;
  }

  return (
    <div>
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-xs text-white/40">
              <th className="sticky left-0 z-10 bg-neutral-950 text-left font-medium px-3 py-2.5 border-b border-white/10">
                Alumno
              </th>
              <th className="font-medium px-2 py-2.5 border-b border-white/10 whitespace-nowrap">Asistencia</th>
              {columnas.map((semana) => (
                <th key={semana} className="font-medium px-1 py-2.5 border-b border-white/10 whitespace-nowrap">
                  S{semana}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumnos.map((alumno) => {
              const registrosAlumno = porAlumno.get(alumno.id) ?? new Map<number, RegistroSemana>();
              const resumen = resumirAlumno(
                new Map([...registrosAlumno].map(([semana, r]) => [semana, r.estado])),
                semanas
              );
              return (
                <tr key={alumno.id} className={alumno.activo ? "" : "opacity-40"}>
                  <td className="sticky left-0 z-10 bg-neutral-950 px-3 py-2 border-b border-white/5 min-w-48">
                    <p className="text-white/90 leading-tight">
                      {alumno.nombre_completo}
                      {!alumno.activo && <span className="text-xs text-white/40"> (inactivo)</span>}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-xs tracking-wider text-primary-300">{alumno.codigo}</span>
                      <button
                        onClick={() => onNuevoCodigo(alumno)}
                        className="text-[11px] text-white/30 hover:text-white/70 underline underline-offset-2"
                      >
                        nuevo código
                      </button>
                    </p>
                  </td>
                  <td className="px-2 py-2 border-b border-white/5 text-center whitespace-nowrap">
                    <span className="text-white/80 font-semibold">
                      {resumen.porcentaje === null ? "—" : `${resumen.porcentaje}%`}
                    </span>
                    <span className="block text-[11px] text-white/30">
                      {resumen.asistio}/{resumen.asistio + resumen.faltas}
                    </span>
                  </td>
                  {columnas.map((semana) => {
                    const registro = registrosAlumno.get(semana);
                    const estado: EstadoCelda = registro?.estado ?? "sin_registro";
                    const celda = CELDA[estado];
                    const sePuedeJustificar = estado !== "validado" && estado !== "justificada";
                    const titulo = `Semana ${semana}: ${celda.titulo}${registro?.motivo ? ` — ${registro.motivo}` : ""}${
                      sePuedeJustificar ? " (toca para justificar)" : ""
                    }`;
                    return (
                      <td key={semana} className="px-1 py-2 border-b border-white/5 text-center">
                        <button
                          onClick={() => sePuedeJustificar && onJustificar(alumno, semana)}
                          title={titulo}
                          aria-label={titulo}
                          className={`w-7 h-7 rounded-md text-xs font-bold ${celda.clases} ${
                            sePuedeJustificar ? "hover:ring-2 hover:ring-sky-400/50 cursor-pointer" : "cursor-default"
                          }`}
                        >
                          {celda.texto}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-white/40 flex flex-wrap gap-x-4 gap-y-1">
        {(Object.keys(CELDA) as EstadoCelda[]).map((estado) => (
          <span key={estado} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex w-5 h-5 rounded items-center justify-center font-bold ${CELDA[estado].clases}`}>
              {CELDA[estado].texto}
            </span>
            {CELDA[estado].titulo}
          </span>
        ))}
        <span>· El porcentaje no cuenta las justificadas ni las fotos en revisión.</span>
      </p>
    </div>
  );
}
