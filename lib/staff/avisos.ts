// =============================================
// Avisos para el guía sobre una foto: fecha de la cámara y fotos parecidas
// =============================================
// Son indicios, no pruebas: la decisión la toma el guía mirando la foto.

import { formatearDiaHora } from "@/lib/utils/timeHelpers";
import type { ItemCola } from "./revision";

export interface Aviso {
  nivel: "info" | "alerta";
  texto: string;
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Compara la fecha de la cámara con el fin de semana de esa misa: alerta si la
 * foto es anterior al sábado (la misa de sábado en la noche también vale).
 */
export function avisoFechaExif(fechaExif: string | null, domingoSemana: string): Aviso {
  if (!fechaExif) {
    return {
      nivel: "info",
      texto: "La foto no trae fecha de la cámara (pasa si se reenvió por WhatsApp o es una captura).",
    };
  }

  const inicioFinDeSemana = new Date(`${domingoSemana}T00:00:00-05:00`).getTime() - UN_DIA_MS;
  if (new Date(fechaExif).getTime() < inicioFinDeSemana) {
    return {
      nivel: "alerta",
      texto: `Tomada antes de ese fin de semana: ${formatearDiaHora(fechaExif)}`,
    };
  }

  return { nivel: "info", texto: `Tomada el ${formatearDiaHora(fechaExif)}` };
}

export function avisoParecida(item: ItemCola): Aviso | null {
  if (!item.similar_envio_id) return null;
  return {
    nivel: "alerta",
    texto:
      item.similar_alumno === item.alumno
        ? `Se parece mucho a su foto de la semana ${item.similar_semana}.`
        : `Se parece mucho a la foto de ${item.similar_alumno} (semana ${item.similar_semana}).`,
  };
}
