import { describe, expect, it } from "vitest";
import { formatearCuentaRegresiva, formatearDiaHora, formatearDomingo } from "./timeHelpers";

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

describe("formatearCuentaRegresiva", () => {
  it("con días muestra días y horas", () => {
    expect(formatearCuentaRegresiva(2 * DIA + 3 * HORA + 5 * MINUTO)).toBe("2 días y 3 h");
  });

  it("usa singular y omite las horas en cero", () => {
    expect(formatearCuentaRegresiva(DIA + 20 * MINUTO)).toBe("1 día");
  });

  it("con menos de un día muestra horas y minutos", () => {
    expect(formatearCuentaRegresiva(3 * HORA + 5 * MINUTO + 9 * SEGUNDO)).toBe("3 h y 5 min");
  });

  it("con menos de una hora muestra solo minutos", () => {
    expect(formatearCuentaRegresiva(5 * MINUTO + 30 * SEGUNDO)).toBe("5 min");
  });

  it("los segundos solo aparecen en el último minuto", () => {
    expect(formatearCuentaRegresiva(59 * SEGUNDO)).toBe("59 s");
  });

  it("nunca es negativa", () => {
    expect(formatearCuentaRegresiva(-5000)).toBe("0 s");
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

describe("formatearDomingo", () => {
  it("muestra el mismo día que viene de la base (sin correrse al anterior)", () => {
    expect(formatearDomingo("2026-10-18")).toBe("dom 18 oct");
    expect(formatearDomingo("2026-03-01")).toBe("dom 1 mar");
  });
});
