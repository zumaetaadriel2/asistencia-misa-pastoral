// =============================================
// Identificación del alumno con su código (RPC identificar_alumno)
// =============================================

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export type Programa = Enums["programa"];
export type EstadoSemana = "sin_registro" | Enums["estado_asistencia"];

/** Resultado de `estado_formulario()`; las fechas son null cuando no aplican */
export interface EstadoFormulario {
  ciclo_id: number;
  ciclo_nombre: string;
  semana: number;
  en_curso: boolean;
  abierto: boolean;
  reenvio_abierto: boolean;
  manual: boolean;
  cierre_envio: string | null;
  cierre_reenvio: string | null;
  proxima_apertura: string | null;
}

export interface SemanaAlumno {
  semana: number;
  estado: EstadoSemana;
  /** Motivo del rechazo o de la justificación */
  motivo: string | null;
}

export interface AlumnoIdentificado {
  ok: true;
  alumno: { nombre_corto: string; comunidad: string; programa: Programa };
  formulario: EstadoFormulario;
  /** Qué puede hacer ahora con la semana actual */
  accion: "enviar" | "reenviar" | null;
  /** De la más reciente a la más antigua */
  semanas: SemanaAlumno[];
}

export type ErrorIdentificacion =
  | "codigo_invalido"
  | "demasiados_intentos"
  | "sin_ciclo_activo"
  | "error_de_red";

export type ResultadoIdentificacion = AlumnoIdentificado | { ok: false; error: ErrorIdentificacion };

export const NOMBRE_PROGRAMA: Record<Programa, string> = {
  confirmacion: "Confirmación",
  primera_comunion: "Primera Comunión",
};

export async function identificarAlumno(codigo: string): Promise<ResultadoIdentificacion> {
  const { data, error } = await supabase.rpc("identificar_alumno", { p_codigo: codigo });
  if (error || !data) return { ok: false, error: "error_de_red" };
  return data as unknown as ResultadoIdentificacion;
}
