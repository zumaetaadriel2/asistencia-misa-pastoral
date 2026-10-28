// =============================================
// Tablas para Excel (lógica pura, sin ExcelJS)
// =============================================
// Los reportes y la plantilla de iglesias se arman como una Tabla y lib/excel/libro.ts
// la convierte en una hoja de un .xlsx. Así los datos se prueban sin generar archivos.

export type ValorCelda = string | number | null;

export interface Columna {
  titulo: string;
  /** Ancho en caracteres */
  ancho?: number;
  /**
   * "texto": lo escrito queda tal cual (Excel no convierte "19:00" en hora ni quita ceros).
   * "porcentaje": el valor va de 0 a 1 y se ve como "85%".
   */
  formato?: "texto" | "porcentaje";
  /** Texto largo en varias líneas dentro de la celda */
  ajustar?: boolean;
  /** Lista desplegable con estas opciones (en las filas vacías también) */
  opciones?: readonly string[];
  /** Nota de ayuda en el encabezado (se ve al pasar el mouse o tocar la celda) */
  nota?: string;
}

export interface Tabla {
  /** Nombre de la hoja (máximo 31 caracteres) */
  nombre: string;
  columnas: Columna[];
  filas: ValorCelda[][];
  /** Hasta qué fila llevar el formato y las listas desplegables (para que se llene a mano) */
  filasEditables?: number;
  /** Flechas de filtro en el encabezado (por defecto sí, si hay más de una columna) */
  filtros?: boolean;
  /** Columnas de la izquierda que no se mueven al desplazarse (p. ej. el nombre del alumno) */
  columnasFijas?: number;
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * Valor de una celda leída de Excel → texto. Las horas que Excel convirtió solas (escribir
 * "19:00" en una celda normal la vuelve hora) se devuelven como "19:00"; las fechas, como
 * "AAAA-MM-DD"; el texto enriquecido, los enlaces y las fórmulas, como su texto o resultado.
 */
export function textoDeCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  if (valor instanceof Date) {
    // Una hora sola se guarda como el 30/12/1899 a esa hora (en UTC)
    if (valor.getUTCFullYear() < 1901) return `${dosDigitos(valor.getUTCHours())}:${dosDigitos(valor.getUTCMinutes())}`;
    return valor.toISOString().slice(0, 10);
  }
  if (typeof valor === "object") {
    const objeto = valor as { richText?: { text: string }[]; text?: unknown; result?: unknown; error?: unknown };
    if (Array.isArray(objeto.richText)) return objeto.richText.map((parte) => parte.text).join("").trim();
    if (objeto.text !== undefined) return textoDeCelda(objeto.text);
    if (objeto.result !== undefined) return textoDeCelda(objeto.result);
  }
  return "";
}
