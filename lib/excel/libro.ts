// =============================================
// Archivos .xlsx con ExcelJS (solo en el navegador del admin o del guía)
// =============================================
// ExcelJS pesa unos 250 KB: se importa recién al descargar o subir un Excel, así que no
// llega al alumno ni a la carga normal del panel.

import type { Columna, Tabla } from "./tabla";
import { textoDeCelda } from "./tabla";

const AZUL_MARCA = "FF1D598E";
const BLANCO = "FFFFFFFF";
const NUMFMT: Record<NonNullable<Columna["formato"]>, string> = { texto: "@", porcentaje: "0%" };

async function cargarExcelJS() {
  return (await import("exceljs")).default;
}

function validacionDe(columna: Columna) {
  return {
    type: "list" as const,
    allowBlank: true,
    formulae: [`"${columna.opciones!.join(",")}"`],
    showErrorMessage: true,
    errorTitle: columna.titulo,
    error: `Elige una opción de la lista: ${columna.opciones!.join(", ")}.`,
  };
}

/** Un libro con una hoja por tabla: encabezado azul fijo, filtros, anchos y formatos */
export async function crearLibro(tablas: Tabla[]): Promise<ArrayBuffer> {
  const ExcelJS = await cargarExcelJS();
  const libro = new ExcelJS.Workbook();
  libro.creator = "Mi Misa PS";

  for (const tabla of tablas) {
    const hoja = libro.addWorksheet(tabla.nombre.slice(0, 31), {
      views: [{ state: "frozen", ySplit: 1, xSplit: tabla.columnasFijas ?? 0 }],
    });
    hoja.columns = tabla.columnas.map((columna) => ({
      header: columna.titulo,
      width: columna.ancho ?? Math.max(10, columna.titulo.length + 2),
      style: {
        ...(columna.formato && { numFmt: NUMFMT[columna.formato] }),
        ...(columna.ajustar && { alignment: { wrapText: true, vertical: "top" as const } }),
      },
    }));
    tabla.filas.forEach((fila) => hoja.addRow(fila));

    // Solo las celdas del encabezado (con la fila entera, Excel pinta de azul hasta el infinito)
    tabla.columnas.forEach((columna, indice) => {
      const celda = hoja.getCell(1, indice + 1);
      celda.font = { bold: true, color: { argb: BLANCO } };
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_MARCA } };
      celda.alignment = { vertical: "middle" };
      if (columna.nota) celda.note = columna.nota;
    });
    if (tabla.filtros !== false && tabla.columnas.length > 1) {
      hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: tabla.columnas.length } };
    }

    // Listas desplegables, también en las filas vacías donde se va a escribir
    const ultimaFila = Math.max(tabla.filas.length + 1, tabla.filasEditables ?? 0);
    tabla.columnas.forEach((columna, indice) => {
      if (!columna.opciones) return;
      const validacion = validacionDe(columna);
      for (let fila = 2; fila <= ultimaFila; fila++) hoja.getCell(fila, indice + 1).dataValidation = validacion;
    });
  }

  return (await libro.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Arma el .xlsx y lo descarga (solo en el navegador) */
export async function descargarExcel(nombreArchivo: string, tablas: Tabla[]): Promise<void> {
  const contenido = await crearLibro(tablas);
  const url = URL.createObjectURL(
    new Blob([contenido], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}

/**
 * Lee la hoja `hoja` (o la primera, si no existe) como texto: una fila por línea, sin las
 * filas vacías del final. La fila 0 es la fila 1 de Excel.
 */
export async function leerExcel(contenido: ArrayBuffer, hoja?: string): Promise<string[][]> {
  const ExcelJS = await cargarExcelJS();
  const libro = new ExcelJS.Workbook();
  // En el navegador ExcelJS acepta un ArrayBuffer (los tipos piden Buffer de Node)
  await libro.xlsx.load(contenido as unknown as Parameters<typeof libro.xlsx.load>[0]);
  const hojaElegida = (hoja && libro.getWorksheet(hoja)) || libro.worksheets[0];
  if (!hojaElegida) return [];

  const filas: string[][] = [];
  hojaElegida.eachRow({ includeEmpty: true }, (fila, numero) => {
    const celdas: string[] = [];
    for (let columna = 1; columna <= hojaElegida.columnCount; columna++) {
      celdas.push(textoDeCelda(fila.getCell(columna).value));
    }
    filas[numero - 1] = celdas;
  });
  return Array.from(filas, (fila) => fila ?? []);
}
