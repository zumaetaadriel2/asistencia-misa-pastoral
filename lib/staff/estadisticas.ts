// =============================================
// Cuentas de asistencia por alumno
// =============================================

import type { EstadoAsistencia } from "./revision";

export interface ResumenAlumno {
  asistio: number;
  justificadas: number;
  /** Faltó o su foto quedó rechazada */
  faltas: number;
  pendientes: number;
  /** Asistencias sobre las semanas que contaban (sin las justificadas); null si no hay ninguna */
  porcentaje: number | null;
}

/**
 * Resume las semanas 1..`hastaSemana` de un alumno.
 * Una semana sin registro todavía no cuenta como falta: el cierre del jueves la marca.
 */
export function resumirAlumno(
  estados: Map<number, EstadoAsistencia>,
  hastaSemana: number
): ResumenAlumno {
  const resumen = { asistio: 0, justificadas: 0, faltas: 0, pendientes: 0 };

  for (let semana = 1; semana <= hastaSemana; semana++) {
    switch (estados.get(semana)) {
      case "validado":
        resumen.asistio++;
        break;
      case "justificada":
        resumen.justificadas++;
        break;
      case "inasistencia":
      case "rechazado":
        resumen.faltas++;
        break;
      case "pendiente":
        resumen.pendientes++;
        break;
    }
  }

  const cuentan = resumen.asistio + resumen.faltas;
  return {
    ...resumen,
    porcentaje: cuentan > 0 ? Math.round((resumen.asistio / cuentan) * 100) : null,
  };
}
