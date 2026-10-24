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
    alumno: "Foto rechazada",
    staff: "Foto rechazada",
    simbolo: "✕",
    clases: "bg-error/15 border-error/25 text-error",
  },
  justificada: { alumno: "Justificada", staff: "Justificada", simbolo: "J", clases: "bg-info/15 border-info/25 text-info" },
  inasistencia: {
    alumno: "No asistió",
    staff: "Faltó",
    simbolo: "F",
    clases: "bg-superficie-2 border-borde text-texto-suave",
  },
  sin_registro: {
    alumno: "Sin foto",
    staff: "Sin registro",
    simbolo: "·",
    clases: "bg-superficie-2 border-borde text-texto-tenue",
  },
};

// ---------------------------------------------
// Catequesis (se pasa lista por sesión)
// ---------------------------------------------

export type EstadoCatequesisVista = "sin_marcar" | Database["public"]["Enums"]["estado_catequesis"];

export interface InfoEstadoCatequesis {
  /** Texto completo (lista, leyenda y alumno) */
  texto: string;
  /** Letra del botón y de la tabla: junto al color, para no depender solo de él */
  simbolo: string;
  /** Fondo tenue, borde y texto */
  clases: string;
  /** Botón elegido al pasar lista (fondo sólido) */
  clasesActivo: string;
}

export const ESTADOS_CATEQUESIS: Record<EstadoCatequesisVista, InfoEstadoCatequesis> = {
  presente: {
    texto: "Presente",
    simbolo: "P",
    clases: "bg-exito/15 border-exito/25 text-exito",
    clasesActivo: "bg-exito-solido border-exito-solido text-white",
  },
  tardanza: {
    texto: "Tardanza",
    simbolo: "T",
    clases: "bg-aviso/15 border-aviso/25 text-aviso",
    clasesActivo: "bg-aviso-solido border-aviso-solido text-white",
  },
  falta: {
    texto: "Falta",
    simbolo: "F",
    clases: "bg-error/15 border-error/25 text-error",
    clasesActivo: "bg-error-solido border-error-solido text-white",
  },
  justificada: {
    texto: "Justificada",
    simbolo: "J",
    clases: "bg-info/15 border-info/25 text-info",
    clasesActivo: "bg-info-solido border-info-solido text-white",
  },
  sin_marcar: {
    texto: "Sin marcar",
    simbolo: "·",
    clases: "bg-superficie-2 border-borde text-texto-tenue",
    clasesActivo: "bg-superficie-2 border-borde text-texto-tenue",
  },
};
