// =============================================
// Reporte de asistencia en CSV (se abre con Excel)
// =============================================

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

/**
 * Valor de una celda CSV entre comillas. Un texto que empieza con = + - @ (por ejemplo,
 * un motivo escrito a mano) se antepone con ' para que Excel no lo ejecute como fórmula.
 */
export function celda(valor: string | number): string {
  const texto = typeof valor === "string" && /^[=+\-@]/.test(valor) ? `'${valor}` : String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Matriz alumno × semana (1..totalSemanas) con totales al final de cada fila.
 * Lleva BOM para que Excel reconozca las tildes.
 */
export function armarCsvAsistencia(
  alumnos: AlumnoReporte[],
  registros: RegistroReporte[],
  totalSemanas: number
): string {
  const porAlumno = new Map<number, Map<number, EstadoAsistencia>>();
  for (const registro of registros) {
    const estados = porAlumno.get(registro.alumno_id) ?? new Map<number, EstadoAsistencia>();
    estados.set(registro.semana_numero, registro.estado);
    porAlumno.set(registro.alumno_id, estados);
  }

  const semanas = Array.from({ length: totalSemanas }, (_, i) => i + 1);
  const encabezado = [
    "Alumno",
    "Comunidad",
    "Programa",
    ...semanas.map((s) => `Semana ${s}`),
    "Asistió",
    "Justificadas",
    "Faltas",
    "En revisión",
    "% asistencia",
  ];

  const filas = alumnos.map((alumno) => {
    const estados = porAlumno.get(alumno.id) ?? new Map<number, EstadoAsistencia>();
    const resumen = resumirAlumno(estados, totalSemanas);
    return [
      alumno.nombre,
      alumno.comunidad,
      NOMBRE_PROGRAMA[alumno.programa],
      ...semanas.map((s) => {
        const estado = estados.get(s);
        return estado ? ETIQUETA_ESTADO[estado] : "";
      }),
      resumen.asistio,
      resumen.justificadas,
      resumen.faltas,
      resumen.pendientes,
      resumen.porcentaje === null ? "" : `${resumen.porcentaje}%`,
    ];
  });

  return "﻿" + [encabezado, ...filas].map((fila) => fila.map(celda).join(",")).join("\r\n");
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

/** Descarga un texto como archivo .csv (solo en el navegador) */
export function descargarCsv(nombreArchivo: string, contenido: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
