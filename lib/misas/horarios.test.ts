import { describe, expect, it } from "vitest";
import { formatearMisas, parsearMisas, unirHoras } from "./horarios";

describe("parsearMisas", () => {
  it("lee el formato de la plantilla", () => {
    expect(parsearMisas("Sáb 19:00; Dom 7:00, 9:00 y 11:00")).toEqual({
      misas: [
        { dia: 6, hora: "19:00" },
        { dia: 7, hora: "07:00" },
        { dia: 7, hora: "09:00" },
        { dia: 7, hora: "11:00" },
      ],
      errores: [],
    });
  });

  it("acepta nombres completos, sin tildes, am/pm y horas sin minutos", () => {
    expect(parsearMisas("domingo 7 a. m., 7:30 p. m.; sabado 6 pm").misas).toEqual([
      { dia: 6, hora: "18:00" },
      { dia: 7, hora: "07:00" },
      { dia: 7, hora: "19:30" },
    ]);
  });

  it("un grupo de días comparte las horas que le siguen", () => {
    expect(parsearMisas("Sáb y Dom 19:00").misas).toEqual([
      { dia: 6, hora: "19:00" },
      { dia: 7, hora: "19:00" },
    ]);
  });

  it("no repite misas", () => {
    expect(parsearMisas("Dom 8:00, 8:00; Dom 8").misas).toEqual([{ dia: 7, hora: "08:00" }]);
  });

  it("rechaza las misas del sábado antes de las 17:00", () => {
    const { misas, errores } = parsearMisas("Sáb 8:00, 19:00");
    expect(misas).toEqual([{ dia: 6, hora: "19:00" }]);
    expect(errores).toEqual(["El sábado solo cuentan las misas desde las 17:00 (8:00 no)."]);
  });

  it("rechaza los días entre semana y salta sus horas", () => {
    const { misas, errores } = parsearMisas("Lun a Vie 7:00, 19:00; Dom 9:00");
    expect(misas).toEqual([{ dia: 7, hora: "09:00" }]);
    expect(errores).toEqual(["Solo se cargan misas de sábado y domingo («lun» no).", "Solo se cargan misas de sábado y domingo («vie» no)."]);
  });

  it("avisa lo que no entiende y las horas sin día", () => {
    expect(parsearMisas("9:00 Dom 25:00 tarde").errores).toEqual([
      "Falta el día antes de 9:00.",
      "No se entiende «25:00».",
      "No se entiende «tarde».",
    ]);
  });

  it("vacío no es un error: la iglesia queda sin misas", () => {
    expect(parsearMisas("  ")).toEqual({ misas: [], errores: [] });
  });
});

describe("formatearMisas", () => {
  it("vuelve al texto canónico, que se puede leer de nuevo igual", () => {
    const texto = formatearMisas(parsearMisas("domingo 11, 7; sabado 7 pm; domingo 9").misas);
    expect(texto).toBe("Sáb 19:00; Dom 7:00, 9:00 y 11:00");
    expect(formatearMisas(parsearMisas(texto).misas)).toBe(texto);
  });

  it("solo los días con misas", () => {
    expect(formatearMisas([{ dia: 7, hora: "10:00" }])).toBe("Dom 10:00");
    expect(formatearMisas([])).toBe("");
  });
});

describe("unirHoras", () => {
  it("une con comas y «y»", () => {
    expect(unirHoras(["07:00"])).toBe("7:00");
    expect(unirHoras(["07:00", "19:00"])).toBe("7:00 y 19:00");
  });
});
