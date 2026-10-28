"use client";

import { useEffect, useState } from "react";
import { descargarExcel } from "@/lib/excel/libro";
import {
  marcasPorAlumno,
  resumenCatequesis,
  resumirCatequesis,
  tablaCatequesis,
  type FilaResumenCatequesis,
  type SesionCatequesis,
} from "@/lib/staff/catequesis";
import { coincide } from "@/lib/staff/busqueda";
import { mensajeDe } from "@/lib/staff/errores";
import { nombreArchivo } from "@/lib/staff/reporte";
import { ESTADOS_CATEQUESIS, type EstadoCatequesisVista } from "@/lib/ui/estados";
import { formatearFecha } from "@/lib/utils/timeHelpers";
import { Buscador, Cargando } from "@/components/ui/base";

const CLASE_CELDA = "w-11 h-11 rounded-lg inline-flex items-center justify-center text-sm font-bold border";

interface Props {
  comunidadId: number;
  comunidad: string;
  /** De la más reciente a la más antigua (como las da sesiones_de_comunidad) */
  sesiones: SesionCatequesis[];
  onAbrir: (sesionId: number) => void;
}

/** Tabla alumno × sesión (la más reciente primero) con su porcentaje, y el Excel */
export function ResumenCatequesis({ comunidadId, comunidad, sesiones, onAbrir }: Props) {
  const [datos, setDatos] = useState<{ comunidadId: number; filas: FilaResumenCatequesis[] } | null>(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [descargando, setDescargando] = useState(false);
  const [errorExcel, setErrorExcel] = useState("");

  useEffect(() => {
    let cancelado = false;
    resumenCatequesis(comunidadId)
      .then((filas) => {
        if (!cancelado) setDatos({ comunidadId, filas });
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDe(e, "No se pudo cargar el resumen."));
      });
    return () => {
      cancelado = true;
    };
  }, [comunidadId, sesiones]);

  const filas = datos?.comunidadId === comunidadId ? datos.filas : null;

  if (!filas) {
    return error ? (
      <p role="alert" className="text-sm text-error text-center py-10">
        {error}
      </p>
    ) : (
      <Cargando />
    );
  }

  const alumnos = marcasPorAlumno(filas);
  const visibles = alumnos.filter((a) => coincide(busqueda, a.nombre));

  const descargar = async () => {
    setDescargando(true);
    setErrorExcel("");
    try {
      await descargarExcel(`catequesis-${nombreArchivo(comunidad)}.xlsx`, [tablaCatequesis(sesiones, filas)]);
    } catch (e) {
      setErrorExcel(mensajeDe(e, "No se pudo armar el Excel."));
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Buscador valor={busqueda} onCambiar={setBusqueda} />
        </div>
        <button
          onClick={descargar}
          disabled={sesiones.length === 0 || descargando}
          className="min-h-11 px-4 rounded-xl bg-exito/15 hover:bg-exito/25 border border-exito/25
                     text-exito text-sm font-semibold transition-all disabled:opacity-40"
        >
          {descargando ? "Generando…" : "Descargar Excel"}
        </button>
      </div>
      {errorExcel && (
        <p role="alert" className="text-sm text-error">
          {errorExcel}
        </p>
      )}

      {alumnos.length === 0 ? (
        <p className="text-sm text-texto-tenue text-center py-10">Esta comunidad todavía no tiene alumnos.</p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-texto-tenue text-center py-6">Ningún alumno coincide con «{busqueda}».</p>
      ) : (
        <>
          <p className="text-sm text-texto-suave">
            Toca una fecha para abrir esa lista. Desliza la tabla hacia los lados para ver las sesiones anteriores.
          </p>
          <div className="tarjeta overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-xs text-texto-suave">
                  <th className="sticky left-0 z-10 bg-superficie text-left font-medium px-3 py-2.5 border-b border-borde">
                    Alumno
                  </th>
                  <th className="font-medium px-2 py-2.5 border-b border-borde whitespace-nowrap">Asistencia</th>
                  {sesiones.map((sesion) => (
                    <th key={sesion.id} scope="col" className="font-medium px-0.5 py-1 border-b border-borde">
                      <button
                        onClick={() => onAbrir(sesion.id)}
                        title={`${formatearFecha(sesion.fecha)} · ${sesion.titulo}`}
                        className="min-h-11 min-w-14 max-w-24 px-1 rounded-md hover:bg-superficie-2 leading-tight"
                      >
                        <span className="block whitespace-nowrap">{formatearFecha(sesion.fecha)}</span>
                        <span className="block truncate text-texto-tenue font-normal">{sesion.titulo}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((alumno) => {
                  const resumen = resumirCatequesis(sesiones.map((s) => alumno.marcas.get(s.id)?.estado ?? null));
                  return (
                    <tr key={alumno.id} className={alumno.activo ? "" : "opacity-50"}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-superficie text-left font-normal px-3 py-2 border-b border-borde min-w-36 max-w-44 sm:min-w-48 sm:max-w-none"
                      >
                        <span className="text-texto leading-tight">
                          {alumno.nombre}
                          {!alumno.activo && <span className="text-xs text-texto-tenue"> (inactivo)</span>}
                        </span>
                      </th>
                      <td className="px-2 py-2 border-b border-borde text-center whitespace-nowrap">
                        <span className="text-texto font-semibold">
                          {resumen.porcentaje === null ? "—" : `${resumen.porcentaje}%`}
                        </span>
                        <span className="block text-xs text-texto-tenue">
                          {resumen.asistio}/{resumen.asistio + resumen.faltas}
                        </span>
                      </td>
                      {sesiones.map((sesion) => {
                        const marca = alumno.marcas.get(sesion.id);
                        const estado: EstadoCatequesisVista = marca?.estado ?? "sin_marcar";
                        const info = ESTADOS_CATEQUESIS[estado];
                        const titulo = `${formatearFecha(sesion.fecha)} · ${sesion.titulo}: ${info.texto}${
                          marca?.motivo ? ` — ${marca.motivo}` : ""
                        }`;
                        return (
                          <td key={sesion.id} className="px-0.5 py-2 border-b border-borde text-center">
                            <span
                              role="img"
                              title={titulo}
                              aria-label={`${alumno.nombre}, ${titulo}`}
                              className={`${CLASE_CELDA} ${info.clases}`}
                            >
                              {info.simbolo}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="text-xs text-texto-suave flex flex-wrap gap-x-4 gap-y-2" aria-label="Leyenda">
            {(Object.keys(ESTADOS_CATEQUESIS) as EstadoCatequesisVista[]).map((estado) => (
              <li key={estado} className="inline-flex items-center gap-1.5">
                <span
                  className={`inline-flex w-6 h-6 rounded border items-center justify-center font-bold ${ESTADOS_CATEQUESIS[estado].clases}`}
                >
                  {ESTADOS_CATEQUESIS[estado].simbolo}
                </span>
                {ESTADOS_CATEQUESIS[estado].texto}
              </li>
            ))}
          </ul>
          <p className="text-xs text-texto-tenue">
            La tardanza cuenta como asistencia. El porcentaje no cuenta las justificadas ni las sin marcar.
          </p>
        </>
      )}
    </div>
  );
}
