// =============================================
// Progreso del alumno: domingos seguidos y porcentaje
// =============================================
// El porcentaje usa las mismas reglas que ve su guía (resumirAlumno): las justificadas y
// las fotos en revisión no cuentan, y una foto rechazada cuenta como falta.

import { resumirAlumno } from "@/lib/staff/estadisticas";
import type { EstadoAsistencia } from "@/lib/staff/revision";
import type { SemanaAlumno } from "./identificar";

export interface ProgresoAlumno {
  /** Domingos validados seguidos, contando hacia atrás */
  seguidas: number;
  asistio: number;
  /** Semanas que cuentan para el porcentaje: asistió + faltas */
  cuentan: number;
  porcentaje: number | null;
}

/**
 * La semana en curso solo suma si ya está validada: sin foto, en revisión o rechazada
 * todavía puede cambiar. Las justificadas y las fotos que nadie revisó no suman ni cortan
 * la racha; una falta, una foto rechazada o una semana pasada sin registro sí la cortan.
 */
export function progresoAlumno(semanas: SemanaAlumno[], semanaActual: number): ProgresoAlumno {
  let seguidas = 0;
  for (const s of [...semanas].sort((a, b) => b.semana - a.semana)) {
    if (s.semana > semanaActual) continue;
    if (s.semana === semanaActual && s.estado !== "validado") continue;
    if (s.estado === "justificada" || s.estado === "pendiente") continue;
    if (s.estado !== "validado") break;
    seguidas++;
  }

  const estados = new Map<number, EstadoAsistencia>();
  for (const s of semanas) {
    if (s.estado !== "sin_registro") estados.set(s.semana, s.estado);
  }
  const resumen = resumirAlumno(estados, semanaActual);
  return {
    seguidas,
    asistio: resumen.asistio,
    cuentan: resumen.asistio + resumen.faltas,
    porcentaje: resumen.porcentaje,
  };
}

/** La línea junto al saludo; null si todavía no hay nada que contar */
export function textoProgreso({ seguidas, cuentan, porcentaje }: ProgresoAlumno): string | null {
  if (seguidas === 0 && cuentan === 0) return null;
  const racha =
    seguidas > 0 ? `${seguidas} ${seguidas === 1 ? "domingo seguido" : "domingos seguidos"}` : "Empieza tu racha esta semana";
  return porcentaje === null ? racha : `${racha} · ${porcentaje}%`;
}
