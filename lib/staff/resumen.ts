// =============================================
// Resumen semanal para pegar en el grupo de WhatsApp de la comunidad
// =============================================

import type { FilaResumen, Programa } from "./revision";

const NOMBRE_PROGRAMA: Record<Programa, string> = {
  confirmacion: "Confirmación",
  primera_comunion: "Primera Comunión",
};

const GRUPOS: { estados: FilaResumen["estado"][]; titulo: string; conMotivo?: boolean }[] = [
  { estados: ["validado"], titulo: "✅ Asistieron" },
  { estados: ["pendiente"], titulo: "⏳ Foto en revisión" },
  { estados: ["rechazado"], titulo: "❌ Foto rechazada", conMotivo: true },
  { estados: ["justificada"], titulo: "📝 Falta justificada" },
  { estados: ["inasistencia", "sin_registro"], titulo: "⚠️ Sin foto" },
];

/** Texto con formato de WhatsApp (*negrita*), una sección por comunidad */
export function armarResumenWhatsApp(semana: number, filas: FilaResumen[]): string {
  const comunidades = new Map<number, FilaResumen[]>();
  for (const fila of filas) {
    comunidades.set(fila.comunidad_id, [...(comunidades.get(fila.comunidad_id) ?? []), fila]);
  }

  const bloques = [...comunidades.values()].map((alumnos) => {
    const { comunidad, programa } = alumnos[0];
    const lineas = [`*${comunidad}* (${NOMBRE_PROGRAMA[programa]})`];

    for (const grupo of GRUPOS) {
      const enGrupo = alumnos.filter((a) => grupo.estados.includes(a.estado));
      if (enGrupo.length === 0) continue;
      const nombres = enGrupo.map((a) =>
        grupo.conMotivo && a.motivo ? `${a.alumno} (${a.motivo})` : a.alumno
      );
      lineas.push(`${grupo.titulo} (${enGrupo.length}): ${nombres.join(", ")}`);
    }
    return lineas.join("\n");
  });

  return [`*Asistencia a misa · Semana ${semana}*`, ...bloques].join("\n\n");
}
