import { describe, expect, it } from "vitest";
import { ESTADOS, ESTADOS_CATEQUESIS } from "./estados";

describe("ESTADOS", () => {
  const infos = Object.values(ESTADOS);

  it("cubre los cinco estados de asistencia y la semana sin registro", () => {
    expect(Object.keys(ESTADOS).sort()).toEqual(
      ["inasistencia", "justificada", "pendiente", "rechazado", "sin_registro", "validado"].sort()
    );
  });

  it("cada estado tiene un símbolo distinto (no depende solo del color)", () => {
    expect(new Set(infos.map((e) => e.simbolo)).size).toBe(infos.length);
  });

  it("usa solo colores con nombre, no colores fijos de Tailwind", () => {
    for (const { clases } of infos) expect(clases).not.toMatch(/white|black|rose|emerald|amber|sky|neutral|primary/);
  });
});

describe("ESTADOS_CATEQUESIS", () => {
  const infos = Object.values(ESTADOS_CATEQUESIS);

  it("cubre los cuatro estados y el sin marcar", () => {
    expect(Object.keys(ESTADOS_CATEQUESIS).sort()).toEqual(
      ["falta", "justificada", "presente", "sin_marcar", "tardanza"].sort()
    );
  });

  it("cada estado tiene una letra distinta (no depende solo del color)", () => {
    expect(new Set(infos.map((e) => e.simbolo)).size).toBe(infos.length);
  });

  it("usa solo colores con nombre (text-white solo sobre los botones sólidos)", () => {
    for (const { clases, clasesActivo } of infos) {
      expect(clases).not.toMatch(/white|black|rose|emerald|amber|sky|neutral|primary/);
      expect(clasesActivo).not.toMatch(/black|rose|emerald|amber|sky|neutral|primary/);
    }
  });
});
