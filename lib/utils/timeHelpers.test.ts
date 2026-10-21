import { describe, expect, it } from "vitest";
import { formatearCuentaRegresiva, formatearDiaHora } from "./timeHelpers";

describe("formatearCuentaRegresiva", () => {
  it("muestra días cuando falta más de uno", () => {
    const ms = ((2 * 24 + 3) * 60 * 60 + 5 * 60 + 9) * 1000;
    expect(formatearCuentaRegresiva(ms)).toBe("2d 03h 05m 09s");
  });

  it("omite los días si falta menos de uno", () => {
    expect(formatearCuentaRegresiva(59 * 1000)).toBe("00h 00m 59s");
  });

  it("nunca es negativa", () => {
    expect(formatearCuentaRegresiva(-5000)).toBe("00h 00m 00s");
  });
});

describe("formatearDiaHora", () => {
  it("formatea en hora de Lima aunque la fecha venga en UTC", () => {
    // 2026-10-25 00:00 UTC = sábado 24, 19:00 en Lima
    const texto = formatearDiaHora("2026-10-25T00:00:00Z");
    expect(texto).toMatch(/sábado/);
    expect(texto).toMatch(/24 de octubre/);
    expect(texto).toMatch(/7:00/);
  });
});
