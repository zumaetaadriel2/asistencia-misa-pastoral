// =============================================
// Datos del panel de revisión (RPC con RLS: cada guía ve solo sus comunidades)
// =============================================

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export type RolStaff = Enums["rol_staff"];
export type Programa = Enums["programa"];
export type EstadoAsistencia = Enums["estado_asistencia"];

export interface PerfilStaff {
  id: number;
  nombre: string;
  rol: RolStaff;
  ciclo_nombre: string | null;
  /** Semana de la última misa (domingo más reciente); null si no hay ciclo activo */
  semana_reciente: number | null;
}

/** Una foto pendiente de revisión (RPC cola_revision) */
export interface ItemCola {
  asistencia_id: number;
  semana: number;
  /** Domingo de esa semana (YYYY-MM-DD) */
  domingo: string;
  alumno_id: number;
  alumno: string;
  comunidad_id: number;
  comunidad: string;
  programa: Programa;
  envio_id: number;
  enviado_en: string;
  fecha_exif: string | null;
  /** Foto confirmada de la misma comunidad cuya huella se parece (≤ 8 bits) */
  similar_envio_id: number | null;
  similar_alumno: string | null;
  similar_semana: number | null;
  distancia_similar: number | null;
  /** Foto anterior del mismo alumno, para comparar ropa y lugar */
  anterior_envio_id: number | null;
  anterior_semana: number | null;
}

/** Estado de un alumno en una semana (RPC resumen_semana) */
export interface FilaResumen {
  alumno_id: number;
  alumno: string;
  comunidad_id: number;
  comunidad: string;
  programa: Programa;
  estado: EstadoAsistencia | "sin_registro";
  motivo: string | null;
}

export async function obtenerPerfil(): Promise<PerfilStaff | null> {
  const { data, error } = await supabase.rpc("mi_perfil_staff");
  if (error) throw error;
  return ((data as PerfilStaff[] | null) ?? [])[0] ?? null;
}

export async function obtenerCola(): Promise<ItemCola[]> {
  const { data, error } = await supabase.rpc("cola_revision");
  if (error) throw error;
  return (data as ItemCola[] | null) ?? [];
}

export async function obtenerResumen(semana: number): Promise<FilaResumen[]> {
  const { data, error } = await supabase.rpc("resumen_semana", { p_semana: semana });
  if (error) throw error;
  return (data as FilaResumen[] | null) ?? [];
}

/** Valida, rechaza (con motivo) o deshace la revisión propia de hace menos de 2 minutos */
export async function revisarAsistencia(
  asistenciaId: number,
  accion: "validar" | "rechazar" | "deshacer",
  motivo?: string
): Promise<void> {
  const { error } = await supabase.rpc("revisar_asistencia", {
    p_asistencia_id: asistenciaId,
    p_accion: accion,
    p_motivo: motivo ?? null,
  });
  if (error) throw error;
}

/** Pasa una foto enviada con el código equivocado al alumno correcto */
export async function reasignarAsistencia(asistenciaId: number, alumnoDestinoId: number): Promise<void> {
  const { error } = await supabase.rpc("reasignar_asistencia", {
    p_asistencia_id: asistenciaId,
    p_alumno_destino_id: alumnoDestinoId,
  });
  if (error) throw error;
}

export async function obtenerAlumnosDeComunidad(
  comunidadId: number
): Promise<{ id: number; nombre_completo: string }[]> {
  const { data, error } = await supabase
    .from("alumnos")
    .select("id, nombre_completo")
    .eq("comunidad_id", comunidadId)
    .eq("activo", true)
    .order("nombre_completo");
  if (error) throw error;
  return data ?? [];
}
