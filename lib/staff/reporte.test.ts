import { describe, expect, it } from "vitest";
import { nombreArchivo, tablaAsistencia } from "./reporte";

describe("tablaAsistencia", () => {
  const tabla = tablaAsistencia(
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

  it("una columna por semana y los totales, con el alumno fijo a la izquierda", () => {
    expect(tabla.columnas.map((c) => c.titulo)).toEqual([
      "Alumno",
      "Comunidad",
      "Programa",
      "Semana 1",
      "Semana 2",
      "Asistió",
      "Justificadas",
      "Faltas",
      "En revisión",
      "% asistencia",
    ]);
    expect(tabla.columnasFijas).toBe(1);
  });

  it("escribe cada estado y los totales como números (el porcentaje de 0 a 1)", () => {
    expect(tabla.filas[0]).toEqual(["Ana Pérez", "San Pablo", "Confirmación", "Asistió", "Faltó", 1, 0, 1, 0, 0.5]);
  });

  it("deja vacías las semanas sin registro y el porcentaje sin semanas que cuenten", () => {
    expect(tabla.filas[1]).toEqual(['Bruno "Tito" Díaz', "San Pablo", "Confirmación", null, "Justificada", 0, 1, 0, 0, null]);
  });
});

describe("nombreArchivo", () => {
  it("quita tildes, espacios y signos", () => {
    expect(nombreArchivo("San José · Primera Comunión")).toBe("san-jose-primera-comunion");
  });
});
