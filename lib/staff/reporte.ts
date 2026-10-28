// =============================================
// Reporte de asistencia a misa para Excel
// =============================================

import type { Tabla } from "@/lib/excel/tabla";
import { resumirAlumno } from "./estadisticas";
import type { EstadoAsistencia, Programa } from "./revision";

export interface AlumnoReporte {
  id: number;
  nombre: string;
  comunidad: string;
  programa: Programa;
}

export interface RegistroReporte {
  alumno_id: number;
  semana_numero: number;
  estado: EstadoAsistencia;
}

const ETIQUETA_ESTADO: Record<EstadoAsistencia, string> = {
  validado: "Asistió",
  pendiente: "En revisión",
  rechazado: "Rechazada",
  inasistencia: "Faltó",
  justificada: "Justificada",
};

export const NOMBRE_PROGRAMA: Record<Programa, string> = {
  confirmacion: "Confirmación",
  primera_comunion: "Primera Comunión",
};

/** Matriz alumno × semana (1..totalSemanas) con totales al final de cada fila */
export function tablaAsistencia(alumnos: AlumnoReporte[], registros: RegistroReporte[], totalSemanas: number): Tabla {
  const porAlumno = new Map<number, Map<number, EstadoAsistencia>>();
  for (const registro of registros) {
    const estados = porAlumno.get(registro.alumno_id) ?? new Map<number, EstadoAsistencia>();
    estados.set(registro.semana_numero, registro.estado);
    porAlumno.set(registro.alumno_id, estados);
  }

  const semanas = Array.from({ length: totalSemanas }, (_, i) => i + 1);
  return {
    nombre: "Asistencia a misa",
    columnasFijas: 1,
    columnas: [
      { titulo: "Alumno", ancho: 32 },
      { titulo: "Comunidad", ancho: 18 },
      { titulo: "Programa", ancho: 18 },
      ...semanas.map((s) => ({ titulo: `Semana ${s}`, ancho: 12 })),
      { titulo: "Asistió" },
      { titulo: "Justificadas", ancho: 13 },
      { titulo: "Faltas" },
      { titulo: "En revisión", ancho: 13 },
      { titulo: "% asistencia", ancho: 14, formato: "porcentaje" },
    ],
    filas: alumnos.map((alumno) => {
      const estados = porAlumno.get(alumno.id) ?? new Map<number, EstadoAsistencia>();
      const resumen = resumirAlumno(estados, totalSemanas);
      return [
        alumno.nombre,
        alumno.comunidad,
        NOMBRE_PROGRAMA[alumno.programa],
        ...semanas.map((s) => {
          const estado = estados.get(s);
          return estado ? ETIQUETA_ESTADO[estado] : null;
        }),
        resumen.asistio,
        resumen.justificadas,
        resumen.faltas,
        resumen.pendientes,
        resumen.porcentaje === null ? null : resumen.porcentaje / 100,
      ];
    }),
  };
}

/** Texto apto para nombre de archivo: "San José" → "san-jose" */
export function nombreArchivo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
