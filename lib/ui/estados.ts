// =============================================
// Cómo se muestra cada estado de una semana (alumno, matriz y leyendas)
// =============================================

import type { Database } from "@/lib/supabase/database.types";

export type EstadoSemana = "sin_registro" | Database["public"]["Enums"]["estado_asistencia"];

export interface InfoEstado {
  /** Texto que ve el alumno */
  alumno: string;
  /** Texto para el staff (matriz y leyenda) */
  staff: string;
  /** Símbolo corto de la matriz: junto al color, para no depender solo de él */
  simbolo: string;
  /** Fondo tenue, borde y texto con los colores de app/globals.css */
  clases: string;
}

export const ESTADOS: Record<EstadoSemana, InfoEstado> = {
  validado: { alumno: "Asistió", staff: "Asistió", simbolo: "✓", clases: "bg-exito/15 border-exito/25 text-exito" },
  pendiente: {
    alumno: "En revisión",
    staff: "Foto en revisión",
    simbolo: "…",
    clases: "bg-aviso/15 border-aviso/25 text-aviso",
  },
  rechazado: {
    alumno: "Rechazada",
    staff: "Foto rechazada",
    simbolo: "✕",
    clases: "bg-error/15 border-error/25 text-error",
  },
  justificada: { alumno: "Justificada", staff: "Justificada", simbolo: "J", clases: "bg-info/15 border-info/25 text-info" },
  inasistencia: { alumno: "Faltó", staff: "Faltó", simbolo: "F", clases: "bg-superficie-2 border-borde text-texto-suave" },
  sin_registro: {
    alumno: "Sin foto",
    staff: "Sin registro",
    simbolo: "·",
    clases: "bg-superficie-2 border-borde text-texto-tenue",
  },
};
