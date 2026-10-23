// =============================================
// "Mi comunidad": alumnos, códigos y asistencia semana a semana
// =============================================
// Todo pasa por RLS: un guía solo obtiene sus comunidades.

import { supabase } from "@/lib/supabase/client";
import { obtenerTodasLasFilas } from "@/lib/supabase/paginacion";
import type { EstadoAsistencia, PerfilStaff, Programa } from "./revision";

export interface ComunidadStaff {
  id: number;
  nombre: string;
  programa: Programa;
}

export interface AlumnoComunidad {
  id: number;
  nombre_completo: string;
  codigo: string;
  activo: boolean;
}

export interface RegistroSemana {
  alumno_id: number;
  semana_numero: number;
  estado: EstadoAsistencia;
  motivo: string | null;
}

/**
 * Comunidades activas del ciclo activo que el staff ve (RLS): donde es guía o catequista;
 * el admin, todas. Es la lista para pasar lista en catequesis.
 */
export async function obtenerComunidadesVisibles(): Promise<ComunidadStaff[]> {
  const { data, error } = await supabase
    .from("comunidades")
    .select("id, nombre, programa, ciclos!inner(activo)")
    .eq("ciclos.activo", true)
    .eq("activa", true)
    .order("nombre");
  if (error) throw error;
  return data.map(({ id, nombre, programa }) => ({ id, nombre, programa }));
}

/**
 * Comunidades donde es guía (misa, fotos y códigos); el admin, todas. Las de catequista
 * se dejan fuera: ahí RLS no le muestra alumnos ni asistencias de misa.
 */
export async function obtenerMisComunidades(perfil: Pick<PerfilStaff, "id" | "rol">): Promise<ComunidadStaff[]> {
  if (perfil.rol === "admin") return obtenerComunidadesVisibles();

  const { data, error } = await supabase
    .from("comunidades")
    .select("id, nombre, programa, ciclos!inner(activo), staff_comunidades!inner(staff_id, funcion)")
    .eq("ciclos.activo", true)
    .eq("activa", true)
    .eq("staff_comunidades.staff_id", perfil.id)
    .eq("staff_comunidades.funcion", "guia")
    .order("nombre");
  if (error) throw error;
  return data.map(({ id, nombre, programa }) => ({ id, nombre, programa }));
}

export async function obtenerAlumnos(comunidadId: number): Promise<AlumnoComunidad[]> {
  const { data, error } = await supabase
    .from("alumnos")
    .select("id, nombre_completo, codigo, activo")
    .eq("comunidad_id", comunidadId)
    .order("nombre_completo");
  if (error) throw error;
  return data;
}

/** Todas las asistencias de misa de los alumnos de una comunidad */
export function obtenerRegistros(comunidadId: number): Promise<RegistroSemana[]> {
  return obtenerTodasLasFilas((desde, hasta) =>
    supabase
      .from("asistencias")
      .select("alumno_id, semana_numero, estado, motivo, alumnos!inner(comunidad_id)")
      .eq("alumnos.comunidad_id", comunidadId)
      .eq("actividad", "misa")
      .order("id")
      .range(desde, hasta)
  ).then((filas) =>
    filas.map(({ alumno_id, semana_numero, estado, motivo }) => ({ alumno_id, semana_numero, estado, motivo }))
  );
}

export async function regenerarCodigo(alumnoId: number): Promise<string> {
  const { data, error } = await supabase.rpc("regenerar_codigo", { p_alumno_id: alumnoId });
  if (error) throw error;
  return data;
}

export async function justificarFalta(alumnoId: number, semana: number, motivo: string): Promise<void> {
  const { error } = await supabase.rpc("justificar_falta", {
    p_alumno_id: alumnoId,
    p_semana: semana,
    p_motivo: motivo,
  });
  if (error) throw error;
}
