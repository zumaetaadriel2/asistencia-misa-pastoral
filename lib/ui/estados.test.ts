import { describe, expect, it } from "vitest";
import { ESTADOS } from "./estados";

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
