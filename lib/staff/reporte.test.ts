import { describe, expect, it } from "vitest";
import { armarCsvAsistencia, celda, nombreArchivo } from "./reporte";

describe("armarCsvAsistencia", () => {
  const csv = armarCsvAsistencia(
    [
      { id: 1, nombre: "Ana Pérez", comunidad: "San Pablo", programa: "confirmacion" },
      { id: 2, nombre: 'Bruno "Tito" Díaz', comunidad: "San Pablo", programa: "confirmacion" },
    ],
    [
      { alumno_id: 1, semana_numero: 1, estado: "validado" },
      { alumno_id: 1, semana_numero: 2, estado: "inasistencia" },
      { alumno_id: 2, semana_numero: 2, estado: "justificada" },
    ],
    2
  );
  const lineas = csv.replace("﻿", "").split("\r\n");

  it("empieza con BOM para que Excel lea las tildes", () => {
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("arma el encabezado con una columna por semana y los totales", () => {
    expect(lineas[0]).toBe(
      '"Alumno","Comunidad","Programa","Semana 1","Semana 2","Asistió","Justificadas","Faltas","En revisión","% asistencia"'
    );
  });

  it("escribe cada estado y los totales del alumno", () => {
    expect(lineas[1]).toBe('"Ana Pérez","San Pablo","Confirmación","Asistió","Faltó","1","0","1","0","50%"');
  });

  it("escapa comillas y deja vacías las semanas sin registro", () => {
    expect(lineas[2]).toBe('"Bruno ""Tito"" Díaz","San Pablo","Confirmación","","Justificada","0","1","0","0",""');
  });
});

describe("celda", () => {
  it("no deja que un texto se abra en Excel como fórmula", () => {
    expect(celda("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(celda("-2+3")).toBe(`"'-2+3"`);
    expect(celda("@usuario")).toBe(`"'@usuario"`);
  });

  it("deja igual los números y el texto normal, y duplica las comillas", () => {
    expect(celda(-3)).toBe(`"-3"`);
    expect(celda('Dijo "hola"')).toBe(`"Dijo ""hola"""`);
  });
});

describe("nombreArchivo", () => {
  it("quita tildes, espacios y signos", () => {
    expect(nombreArchivo("San José · Primera Comunión")).toBe("san-jose-primera-comunion");
  });
});
