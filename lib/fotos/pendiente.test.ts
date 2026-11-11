import { describe, expect, it } from "vitest";
import { DIAS_DE_VIGENCIA, pendienteVigente } from "./pendiente";

const guardada = { codigo: "TEST22", semana: 34, guardadaEn: "2026-10-18T14:00:00.000Z" };
const despues = (horas: number) => new Date(new Date(guardada.guardadaEn).getTime() + horas * 60 * 60_000);

describe("pendienteVigente", () => {
  it("se ofrece al mismo alumno en la misma semana", () => {
    expect(pendienteVigente(guardada, "TEST22", 34, despues(5))).toBe(true);
  });

  it("no se ofrece a otro alumno ni en otra semana", () => {
    expect(pendienteVigente(guardada, "TEST23", 34, despues(5))).toBe(false);
    expect(pendienteVigente(guardada, "TEST22", 35, despues(5))).toBe(false);
  });

  it("vence a los DIAS_DE_VIGENCIA días", () => {
    expect(pendienteVigente(guardada, "TEST22", 34, despues(DIAS_DE_VIGENCIA * 24 - 1))).toBe(true);
    expect(pendienteVigente(guardada, "TEST22", 34, despues(DIAS_DE_VIGENCIA * 24))).toBe(false);
  });

  it("descarta una fecha que no se puede leer", () => {
    expect(pendienteVigente({ ...guardada, guardadaEn: "no-es-fecha" }, "TEST22", 34)).toBe(false);
  });
});
