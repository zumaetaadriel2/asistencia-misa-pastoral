import { describe, expect, it } from "vitest";
import { resumirAlumno } from "./estadisticas";
import type { EstadoAsistencia } from "./revision";

const estados = (pares: [number, EstadoAsistencia][]) => new Map(pares);

describe("resumirAlumno", () => {
  it("cuenta cada estado y calcula el porcentaje sin las justificadas", () => {
    const resumen = resumirAlumno(
      estados([
        [1, "validado"],
        [2, "validado"],
        [3, "inasistencia"],
        [4, "justificada"],
        [5, "rechazado"],
        [6, "validado"],
        [7, "pendiente"],
      ]),
      7
    );
    // 3 asistió de 5 que cuentan (3 + 2 faltas); la justificada y la pendiente no cuentan
    expect(resumen).toEqual({ asistio: 3, justificadas: 1, faltas: 2, pendientes: 1, porcentaje: 60 });
  });

  it("solo mira hasta la semana indicada", () => {
    expect(resumirAlumno(estados([[1, "validado"], [5, "inasistencia"]]), 3).faltas).toBe(0);
  });

  it("sin semanas que cuenten no hay porcentaje", () => {
    expect(resumirAlumno(estados([[1, "justificada"]]), 2).porcentaje).toBeNull();
  });
});
