import { describe, expect, it } from "vitest";
import { esCodigoValido, normalizarCodigo } from "./codigo";

describe("normalizarCodigo", () => {
  it("quita espacios y guiones y pasa a mayúsculas", () => {
    expect(normalizarCodigo(" test-22 ")).toBe("TEST22");
  });
});

describe("esCodigoValido", () => {
  it("acepta 6 caracteres del alfabeto sin confusiones", () => {
    expect(esCodigoValido("K7P2QM")).toBe(true);
    expect(esCodigoValido("k7p-2qm")).toBe(true);
  });

  it("rechaza letras y números que se confunden (0, O, 1, I, L)", () => {
    expect(esCodigoValido("K7P0QM")).toBe(false);
    expect(esCodigoValido("K7POQM")).toBe(false);
    expect(esCodigoValido("K7P1QM")).toBe(false);
    expect(esCodigoValido("K7PIQM")).toBe(false);
    expect(esCodigoValido("K7PLQM")).toBe(false);
  });

  it("rechaza largos distintos de 6", () => {
    expect(esCodigoValido("K7P2Q")).toBe(false);
    expect(esCodigoValido("K7P2QMM")).toBe(false);
  });
});
