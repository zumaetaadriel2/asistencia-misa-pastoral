import { describe, expect, it } from "vitest";
import { parsearNombres } from "./importacion";

describe("parsearNombres", () => {
  it("toma la primera columna de lo copiado desde Excel y limpia espacios", () => {
    const texto = "Ana  Pérez\t1ro A\r\n  Bruno Díaz \t1ro B\n\nCarla Ruiz";
    expect(parsearNombres(texto)).toEqual({
      nombres: ["Ana Pérez", "Bruno Díaz", "Carla Ruiz"],
      repetidos: [],
    });
  });

  it("detecta repetidos sin importar mayúsculas", () => {
    expect(parsearNombres("Ana Pérez\nANA PÉREZ\nBruno")).toEqual({
      nombres: ["Ana Pérez", "Bruno"],
      repetidos: ["ANA PÉREZ"],
    });
  });
});
