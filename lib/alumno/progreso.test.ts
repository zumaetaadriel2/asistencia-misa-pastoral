import { describe, expect, it } from "vitest";
import type { EstadoSemana } from "./identificar";
import { progresoAlumno, textoProgreso } from "./progreso";

// De la más nueva a la más antigua, como las devuelve identificar_alumno
const semanas = (...estados: EstadoSemana[]) =>
  estados.map((estado, i) => ({ semana: estados.length - i, estado, motivo: null }));

describe("progresoAlumno", () => {
  it("cuenta los domingos validados seguidos y el porcentaje como el guía", () => {
    // Semana 6 en curso sin foto; 5, 4 y 3 validadas; 2 falta; 1 validada
    const progreso = progresoAlumno(semanas("sin_registro", "validado", "validado", "validado", "inasistencia", "validado"), 6);
    expect(progreso).toEqual({ seguidas: 3, asistio: 4, cuentan: 5, porcentaje: 80 });
  });

  it("la justificada y la foto que nadie revisó no cortan la racha", () => {
    const progreso = progresoAlumno(semanas("validado", "justificada", "validado", "pendiente", "validado"), 5);
    expect(progreso.seguidas).toBe(3);
    // La justificada y la pendiente tampoco cuentan para el porcentaje
    expect(progreso.cuentan).toBe(3);
  });

  it("la semana en curso solo suma si ya está validada", () => {
    expect(progresoAlumno(semanas("validado", "validado"), 2).seguidas).toBe(2);
    expect(progresoAlumno(semanas("pendiente", "validado"), 2).seguidas).toBe(1);
    expect(progresoAlumno(semanas("rechazado", "validado"), 2).seguidas).toBe(1);
  });

  it("una foto rechazada o una semana pasada sin registro cortan la racha", () => {
    expect(progresoAlumno(semanas("validado", "rechazado", "validado"), 3).seguidas).toBe(1);
    expect(progresoAlumno(semanas("validado", "sin_registro", "validado"), 3).seguidas).toBe(1);
  });

  it("sin semanas que cuenten no hay porcentaje", () => {
    expect(progresoAlumno(semanas("sin_registro"), 1)).toEqual({ seguidas: 0, asistio: 0, cuentan: 0, porcentaje: null });
  });
});

describe("textoProgreso", () => {
  const con = (seguidas: number, cuentan: number, porcentaje: number | null) => ({ seguidas, asistio: seguidas, cuentan, porcentaje });

  it("los domingos seguidos y el porcentaje, en singular si es uno", () => {
    expect(textoProgreso(con(4, 5, 80))).toBe("4 domingos seguidos · 80%");
    expect(textoProgreso(con(1, 1, 100))).toBe("1 domingo seguido · 100%");
  });

  it("sin racha invita a empezarla, sin decir qué día", () => {
    expect(textoProgreso(con(0, 2, 50))).toBe("Empieza tu racha esta semana · 50%");
  });

  it("sin nada que contar no muestra nada", () => {
    expect(textoProgreso(con(0, 0, null))).toBeNull();
  });
});
