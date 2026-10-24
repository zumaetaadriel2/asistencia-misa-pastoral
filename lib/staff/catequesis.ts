// =============================================
// Catequesis: sesiones por fecha y pasar lista
// =============================================
// Todo pasa por RPC (security definer): el catequista no puede leer la tabla de
// alumnos ni sus códigos, solo lo que estas funciones le devuelven.

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { formatearFecha } from "@/lib/utils/timeHelpers";
import { celda, NOMBRE_PROGRAMA } from "./reporte";
import type { Programa } from "./revision";

export type EstadoCatequesis = Database["public"]["Enums"]["estado_catequesis"];
export type FuncionComunidad = Database["public"]["Enums"]["funcion_comunidad"];

export interface SesionCatequesis {
  id: number;
  /** "AAAA-MM-DD" */
  fecha: string;
  titulo: string;
  creada_por: number | null;
  presentes: number;
  tardanzas: number;
  faltas: number;
  justificadas: number;
  alumnos_activos: number;
}

export interface AlumnoEnLista {
  alumno_id: number;
  nombre_completo: string;
  /** null = sin marcar */
  estado: EstadoCatequesis | null;
  motivo: string | null;
}

export interface FilaResumenCatequesis {
  alumno_id: number;
  nombre_completo: string;
  activo: boolean;
  /** null si el alumno aún no tiene ninguna marca */
  sesion_id: number | null;
  estado: EstadoCatequesis | null;
  motivo: string | null;
}

// ---------------------------------------------
// Consultas
// ---------------------------------------------

export async function sesionesDeComunidad(comunidadId: number): Promise<SesionCatequesis[]> {
  const { data, error } = await supabase.rpc("sesiones_de_comunidad", { p_comunidad_id: comunidadId });
  if (error) throw error;
  return data;
}

export async function listaDeSesion(sesionId: number): Promise<AlumnoEnLista[]> {
  const { data, error } = await supabase.rpc("lista_de_sesion", { p_sesion_id: sesionId });
  if (error) throw error;
  return data;
}

export async function resumenCatequesis(comunidadId: number): Promise<FilaResumenCatequesis[]> {
  const { data, error } = await supabase.rpc("resumen_catequesis", { p_comunidad_id: comunidadId });
  if (error) throw error;
  return data;
}

// ---------------------------------------------
// Sesiones
// ---------------------------------------------

/** Crea la sesión (o devuelve la que ya existe con esa fecha y nombre) */
export async function crearSesion(comunidadId: number, fecha: string, titulo: string): Promise<number> {
  const { data, error } = await supabase.rpc("crear_sesion_catequesis", {
    p_comunidad_id: comunidadId,
    p_fecha: fecha,
    p_titulo: titulo,
  });
  if (error) throw error;
  return data;
}

/** Solo admin: la misma sesión en varias comunidades. Devuelve cuántas creó. */
export async function crearEvento(comunidades: number[], fecha: string, titulo: string): Promise<number> {
  const { data, error } = await supabase.rpc("crear_evento_catequesis", {
    p_comunidades: comunidades,
    p_fecha: fecha,
    p_titulo: titulo,
  });
  if (error) throw error;
  return data;
}

export async function editarSesion(sesionId: number, fecha: string, titulo: string): Promise<void> {
  const { error } = await supabase.rpc("editar_sesion_catequesis", {
    p_sesion_id: sesionId,
    p_fecha: fecha,
    p_titulo: titulo,
  });
  if (error) throw error;
}

export async function borrarSesion(sesionId: number): Promise<void> {
  const { error } = await supabase.rpc("borrar_sesion_catequesis", { p_sesion_id: sesionId });
  if (error) throw error;
}

// ---------------------------------------------
// Marcas
// ---------------------------------------------

/** Marca o cambia la marca de un alumno; con `estado` null la borra ("sin marcar") */
export async function marcar(
  sesionId: number,
  alumnoId: number,
  estado: EstadoCatequesis | null,
  motivo?: string
): Promise<void> {
  const { error } = await supabase.rpc("marcar_catequesis", {
    p_sesion_id: sesionId,
    p_alumno_id: alumnoId,
    // La RPC acepta null para borrar la marca (los tipos generados no lo reflejan)
    p_estado: estado as EstadoCatequesis,
    p_motivo: motivo,
  });
  if (error) throw error;
}

/** Marca como presentes a los que aún no tienen marca. Devuelve cuántos marcó. */
export async function marcarTodosPresentes(sesionId: number): Promise<number> {
  const { data, error } = await supabase.rpc("marcar_todos_presentes", { p_sesion_id: sesionId });
  if (error) throw error;
  return data;
}

// ---------------------------------------------
// Resumen y Excel (lógica pura)
// ---------------------------------------------

export interface ResumenCatequesis {
  /** Presentes + tardanzas */
  asistio: number;
  tardanzas: number;
  faltas: number;
  justificadas: number;
  /** % de asistencia sin contar justificadas ni sin marcar; null si no hay marcas que cuenten */
  porcentaje: number | null;
}

export function resumirCatequesis(estados: Iterable<EstadoCatequesis | null>): ResumenCatequesis {
  const resumen: ResumenCatequesis = { asistio: 0, tardanzas: 0, faltas: 0, justificadas: 0, porcentaje: null };
  for (const estado of estados) {
    if (estado === "presente") resumen.asistio++;
    else if (estado === "tardanza") {
      resumen.asistio++;
      resumen.tardanzas++;
    } else if (estado === "falta") resumen.faltas++;
    else if (estado === "justificada") resumen.justificadas++;
  }
  const cuentan = resumen.asistio + resumen.faltas;
  resumen.porcentaje = cuentan === 0 ? null : Math.round((resumen.asistio / cuentan) * 100);
  return resumen;
}

/** Agrupa las filas de resumen_catequesis por alumno: sus marcas por sesión */
export function marcasPorAlumno(filas: FilaResumenCatequesis[]) {
  const alumnos = new Map<
    number,
    { id: number; nombre: string; activo: boolean; marcas: Map<number, { estado: EstadoCatequesis; motivo: string | null }> }
  >();
  for (const fila of filas) {
    const alumno = alumnos.get(fila.alumno_id) ?? {
      id: fila.alumno_id,
      nombre: fila.nombre_completo,
      activo: fila.activo,
      marcas: new Map(),
    };
    if (fila.sesion_id !== null && fila.estado !== null) {
      alumno.marcas.set(fila.sesion_id, { estado: fila.estado, motivo: fila.motivo });
    }
    alumnos.set(fila.alumno_id, alumno);
  }
  return [...alumnos.values()];
}

const ETIQUETA_CSV: Record<EstadoCatequesis, string> = {
  presente: "Presente",
  tardanza: "Tardanza",
  falta: "Falta",
  justificada: "Justificada",
};

/**
 * Matriz alumno × sesión (de la más antigua a la más reciente) con totales, para Excel.
 * Lleva BOM para que Excel reconozca las tildes.
 */
export function armarCsvCatequesis(
  sesiones: Pick<SesionCatequesis, "id" | "fecha" | "titulo">[],
  filas: FilaResumenCatequesis[]
): string {
  const ordenadas = [...sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
  const encabezado = [
    "Alumno",
    ...ordenadas.map((s) => `${formatearFecha(s.fecha)} · ${s.titulo}`),
    "Asistió",
    "Tardanzas",
    "Faltas",
    "Justificadas",
    "% asistencia",
  ];

  const lineas = marcasPorAlumno(filas).map((alumno) => {
    const estados = ordenadas.map((s) => alumno.marcas.get(s.id)?.estado ?? null);
    const resumen = resumirCatequesis(estados);
    return [
      alumno.activo ? alumno.nombre : `${alumno.nombre} (inactivo)`,
      ...estados.map((estado) => (estado ? ETIQUETA_CSV[estado] : "")),
      resumen.asistio,
      resumen.tardanzas,
      resumen.faltas,
      resumen.justificadas,
      resumen.porcentaje === null ? "" : `${resumen.porcentaje}%`,
    ];
  });

  return "﻿" + [encabezado, ...lineas].map((fila) => fila.map(celda).join(",")).join("\r\n");
}

// ---------------------------------------------
// Reporte de todo el ciclo (Administración → Reportes)
// ---------------------------------------------

export interface SesionCiclo {
  id: number;
  comunidad_id: number;
  comunidad: string;
  programa: Programa;
  /** "AAAA-MM-DD" */
  fecha: string;
  titulo: string;
}

export interface AlumnoCiclo {
  id: number;
  nombre: string;
  activo: boolean;
  comunidad_id: number;
}

export interface MarcaCiclo {
  sesion_id: number;
  alumno_id: number;
  estado: EstadoCatequesis;
  motivo: string | null;
}

/**
 * Una fila por alumno y sesión de todas las comunidades (formato largo, para filtrar
 * en Excel), ordenadas por comunidad, fecha y alumno. Los inactivos solo aparecen en
 * las sesiones donde tienen marca. La fecha va como AAAA-MM-DD para que Excel la ordene.
 */
export function armarCsvCatequesisCiclo(sesiones: SesionCiclo[], alumnos: AlumnoCiclo[], marcas: MarcaCiclo[]): string {
  const marcaDe = new Map(marcas.map((m) => [`${m.sesion_id}:${m.alumno_id}`, m]));
  const alumnosDe = new Map<number, AlumnoCiclo[]>();
  for (const alumno of [...alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))) {
    alumnosDe.set(alumno.comunidad_id, [...(alumnosDe.get(alumno.comunidad_id) ?? []), alumno]);
  }

  const ordenadas = [...sesiones].sort(
    (a, b) => a.comunidad.localeCompare(b.comunidad, "es") || a.fecha.localeCompare(b.fecha) || a.id - b.id
  );
  const filas = ordenadas.flatMap((sesion) =>
    (alumnosDe.get(sesion.comunidad_id) ?? []).flatMap((alumno) => {
      const marca = marcaDe.get(`${sesion.id}:${alumno.id}`);
      if (!marca && !alumno.activo) return [];
      return [
        [
          sesion.comunidad,
          NOMBRE_PROGRAMA[sesion.programa],
          sesion.fecha,
          sesion.titulo,
          alumno.activo ? alumno.nombre : `${alumno.nombre} (inactivo)`,
          marca ? ETIQUETA_CSV[marca.estado] : "Sin marcar",
          marca?.motivo ?? "",
        ],
      ];
    })
  );

  const encabezado = ["Comunidad", "Programa", "Fecha", "Sesión", "Alumno", "Estado", "Motivo"];
  return "﻿" + [encabezado, ...filas].map((fila) => fila.map(celda).join(",")).join("\r\n");
}
