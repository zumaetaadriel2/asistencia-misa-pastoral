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

const CLASE_CELDA = "w-11 h-11 rounded-lg inline-flex items-center justify-center text-sm font-bold border";

/** Tabla alumno × semana (la más reciente primero) con su porcentaje de asistencia */
export function MatrizAsistencia({ alumnos, registros, semanas, onJustificar, onNuevoCodigo }: Props) {
  const porAlumno = new Map<number, Map<number, RegistroSemana>>();
  for (const registro of registros) {
    const semanasAlumno = porAlumno.get(registro.alumno_id) ?? new Map<number, RegistroSemana>();
    semanasAlumno.set(registro.semana_numero, registro);
    porAlumno.set(registro.alumno_id, semanasAlumno);
  }
  const columnas = Array.from({ length: semanas }, (_, i) => semanas - i);

  return (
    <div>
      <p className="mb-2 text-sm text-texto-suave">
        Toca una falta (<strong>F</strong>, <strong>✕</strong>, <strong>…</strong> o <strong>·</strong>) para
        justificarla. Desliza la tabla hacia los lados para ver las semanas anteriores.
      </p>

      <div className="tarjeta overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-xs text-texto-suave">
              <th className="sticky left-0 z-10 bg-superficie text-left font-medium px-3 py-2.5 border-b border-borde">
                Alumno
              </th>
              <th className="font-medium px-2 py-2.5 border-b border-borde whitespace-nowrap">Asistencia</th>
              {columnas.map((semana) => (
                <th key={semana} scope="col" className="font-medium px-0.5 py-2.5 border-b border-borde whitespace-nowrap">
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
                <tr key={alumno.id} className={alumno.activo ? "" : "opacity-50"}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-superficie text-left font-normal px-3 py-2 border-b border-borde min-w-36 max-w-44 sm:min-w-48 sm:max-w-none"
                  >
                    <p className="text-texto leading-tight">
                      {alumno.nombre_completo}
                      {!alumno.activo && <span className="text-xs text-texto-tenue"> (inactivo)</span>}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-xs tracking-wider text-marca">{alumno.codigo}</span>
                      <button
                        onClick={() => onNuevoCodigo(alumno)}
                        aria-label={`Dar un código nuevo a ${alumno.nombre_completo}`}
                        className="min-h-8 px-2 rounded-md bg-superficie-2 hover:bg-borde text-texto-suave text-xs font-medium"
                      >
                        Nuevo código
                      </button>
                    </p>
                  </th>
                  <td className="px-2 py-2 border-b border-borde text-center whitespace-nowrap">
                    <span className="text-texto font-semibold">
                      {resumen.porcentaje === null ? "—" : `${resumen.porcentaje}%`}
                    </span>
                    <span className="block text-xs text-texto-tenue">
                      {resumen.asistio}/{resumen.asistio + resumen.faltas}
                    </span>
                  </td>
                  {columnas.map((semana) => {
                    const registro = registrosAlumno.get(semana);
                    const estado: EstadoSemana = registro?.estado ?? "sin_registro";
                    const celda = ESTADOS[estado];
                    const sePuedeJustificar = estado !== "validado" && estado !== "justificada";
                    const titulo = `Semana ${semana}: ${celda.staff}${registro?.motivo ? ` — ${registro.motivo}` : ""}`;
                    return (
                      <td key={semana} className="px-0.5 py-2 border-b border-borde text-center">
                        {/* Solo las faltas son botones; lo validado y justificado es informativo */}
                        {sePuedeJustificar ? (
                          <button
                            onClick={() => onJustificar(alumno, semana)}
                            title={`${titulo} (toca para justificar)`}
                            aria-label={`${alumno.nombre_completo}, ${titulo}. Justificar`}
                            className={`${CLASE_CELDA} ${celda.clases} hover:ring-2 hover:ring-info/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca/60`}
                          >
                            {celda.simbolo}
                          </button>
                        ) : (
                          <span role="img" title={titulo} aria-label={`${alumno.nombre_completo}, ${titulo}`} className={`${CLASE_CELDA} ${celda.clases}`}>
                            {celda.simbolo}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 text-xs text-texto-suave flex flex-wrap gap-x-4 gap-y-2" aria-label="Leyenda">
        {(Object.keys(ESTADOS) as EstadoSemana[]).map((estado) => (
          <li key={estado} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex w-6 h-6 rounded border items-center justify-center font-bold ${ESTADOS[estado].clases}`}>
              {ESTADOS[estado].simbolo}
            </span>
            {ESTADOS[estado].staff}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-texto-tenue">El porcentaje no cuenta las justificadas ni las fotos en revisión.</p>
    </div>
  );
}
