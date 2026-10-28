import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { crearLibro, leerExcel } from "./libro";
import { textoDeCelda, type Tabla } from "./tabla";

const tabla: Tabla = {
  nombre: "Prueba",
  columnas: [
    { titulo: "Nombre", ancho: 20 },
    { titulo: "Hora", formato: "texto" },
    { titulo: "Distrito", opciones: ["Trujillo", "Moche"], nota: "Elige de la lista." },
    { titulo: "Total" },
    { titulo: "%", formato: "porcentaje" },
  ],
  filas: [["Ana", "19:00", "Trujillo", 3, 0.75]],
  filasEditables: 5,
};

async function abrir(contenido: ArrayBuffer) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido as unknown as Parameters<typeof libro.xlsx.load>[0]);
  return libro;
}

describe("crearLibro y leerExcel", () => {
  it("lo que se escribe se vuelve a leer igual, con el encabezado", async () => {
    const contenido = await crearLibro([tabla]);
    const filas = await leerExcel(contenido, "Prueba");
    expect(filas.slice(0, 2)).toEqual([
      ["Nombre", "Hora", "Distrito", "Total", "%"],
      ["Ana", "19:00", "Trujillo", "3", "0.75"],
    ]);
  });

  it("encabezado fijo, formatos, nota y lista desplegable hasta las filas editables", async () => {
    const hoja = (await abrir(await crearLibro([tabla]))).getWorksheet("Prueba")!;
    expect(hoja.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(hoja.getColumn(2).numFmt).toBe("@");
    expect(hoja.getCell("E2").numFmt).toBe("0%");
    expect(hoja.getCell("C5").dataValidation).toMatchObject({ type: "list", formulae: ['"Trujillo,Moche"'] });
    expect(hoja.getCell("A1").font?.bold).toBe(true);
    expect(hoja.getCell("C1").note).toBeTruthy();
    expect(hoja.autoFilter).toBeTruthy();
  });

  it("un texto que empieza con = queda como texto, no como fórmula", async () => {
    const contenido = await crearLibro([{ nombre: "Motivos", columnas: [{ titulo: "Motivo" }], filas: [["=HYPERLINK(1)"]] }]);
    const celda = (await abrir(contenido)).getWorksheet("Motivos")!.getCell("A2");
    expect(celda.type).toBe(ExcelJS.ValueType.String);
    expect(celda.value).toBe("=HYPERLINK(1)");
  });

  it("lee las horas que Excel guardó como hora (celda que no era texto)", async () => {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Iglesias");
    hoja.addRow(["Sábado"]);
    hoja.addRow([new Date(Date.UTC(1899, 11, 30, 19, 0))]).getCell(1).numFmt = "h:mm";
    const contenido = (await libro.xlsx.writeBuffer()) as ArrayBuffer;
    expect(await leerExcel(contenido, "Iglesias")).toEqual([["Sábado"], ["19:00"]]);
  });

  it("si la hoja pedida no existe, lee la primera", async () => {
    const filas = await leerExcel(await crearLibro([tabla]), "Otra");
    expect(filas[1][0]).toBe("Ana");
  });
});

describe("textoDeCelda", () => {
  it("las horas que Excel convirtió solas vuelven como HH:MM", () => {
    expect(textoDeCelda(new Date(Date.UTC(1899, 11, 30, 19, 0)))).toBe("19:00");
    expect(textoDeCelda(new Date(Date.UTC(1899, 11, 30, 7, 30)))).toBe("07:30");
  });

  it("fechas, texto enriquecido, enlaces, fórmulas y vacíos", () => {
    expect(textoDeCelda(new Date(Date.UTC(2026, 9, 25)))).toBe("2026-10-25");
    expect(textoDeCelda({ richText: [{ text: "San " }, { text: "José" }] })).toBe("San José");
    expect(textoDeCelda({ text: "Mapa", hyperlink: "https://maps.google.com" })).toBe("Mapa");
    expect(textoDeCelda({ formula: "A1", result: 5 })).toBe("5");
    expect(textoDeCelda(null)).toBe("");
    expect(textoDeCelda("  Moche ")).toBe("Moche");
  });
});
