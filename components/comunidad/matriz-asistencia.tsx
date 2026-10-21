"use client";

import type { AlumnoComunidad, RegistroSemana } from "@/lib/staff/comunidad";
import { resumirAlumno } from "@/lib/staff/estadisticas";
import { ESTADOS, type EstadoSemana } from "@/lib/ui/estados";

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
    return <p className="text-sm text-texto-tenue text-center py-10">Esta comunidad todavía no tiene alumnos.</p>;
  }

  return (
    <div>
      <div className="tarjeta overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-xs text-texto-tenue">
              <th className="sticky left-0 z-10 bg-superficie text-left font-medium px-3 py-2.5 border-b border-borde">
                Alumno
              </th>
              <th className="font-medium px-2 py-2.5 border-b border-borde whitespace-nowrap">Asistencia</th>
              {columnas.map((semana) => (
                <th key={semana} className="font-medium px-1 py-2.5 border-b border-borde whitespace-nowrap">
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
                  <td className="sticky left-0 z-10 bg-superficie px-3 py-2 border-b border-borde min-w-48">
                    <p className="text-texto-suave leading-tight">
                      {alumno.nombre_completo}
                      {!alumno.activo && <span className="text-xs text-texto-tenue"> (inactivo)</span>}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-xs tracking-wider text-marca">{alumno.codigo}</span>
                      <button
                        onClick={() => onNuevoCodigo(alumno)}
                        className="text-[11px] text-texto-tenue hover:text-texto-suave underline underline-offset-2"
                      >
                        nuevo código
                      </button>
                    </p>
                  </td>
                  <td className="px-2 py-2 border-b border-borde text-center whitespace-nowrap">
                    <span className="text-texto-suave font-semibold">
                      {resumen.porcentaje === null ? "—" : `${resumen.porcentaje}%`}
                    </span>
                    <span className="block text-[11px] text-texto-tenue">
                      {resumen.asistio}/{resumen.asistio + resumen.faltas}
                    </span>
                  </td>
                  {columnas.map((semana) => {
                    const registro = registrosAlumno.get(semana);
                    const estado: EstadoSemana = registro?.estado ?? "sin_registro";
                    const celda = ESTADOS[estado];
                    const sePuedeJustificar = estado !== "validado" && estado !== "justificada";
                    const titulo = `Semana ${semana}: ${celda.staff}${registro?.motivo ? ` — ${registro.motivo}` : ""}${
                      sePuedeJustificar ? " (toca para justificar)" : ""
                    }`;
                    return (
                      <td key={semana} className="px-1 py-2 border-b border-borde text-center">
                        <button
                          onClick={() => sePuedeJustificar && onJustificar(alumno, semana)}
                          title={titulo}
                          aria-label={titulo}
                          className={`w-7 h-7 rounded-md text-xs font-bold ${celda.clases} ${
                            sePuedeJustificar ? "hover:ring-2 hover:ring-info/50 cursor-pointer" : "cursor-default"
                          }`}
                        >
                          {celda.simbolo}
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

      <p className="mt-3 text-[11px] text-texto-tenue flex flex-wrap gap-x-4 gap-y-1">
        {(Object.keys(ESTADOS) as EstadoSemana[]).map((estado) => (
          <span key={estado} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex w-5 h-5 rounded items-center justify-center font-bold ${ESTADOS[estado].clases}`}>
              {ESTADOS[estado].simbolo}
            </span>
            {ESTADOS[estado].staff}
          </span>
        ))}
        <span>· El porcentaje no cuenta las justificadas ni las fotos en revisión.</span>
      </p>
    </div>
  );
}
