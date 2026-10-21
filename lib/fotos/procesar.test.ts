import { describe, expect, it } from "vitest";
import { dimensionesReducidas } from "./procesar";

describe("dimensionesReducidas", () => {
  it("reduce una foto vertical de celular a 720 px de ancho", () => {
    expect(dimensionesReducidas(3024, 4032)).toEqual({ ancho: 720, alto: 960 });
  });

  it("reduce una foto horizontal manteniendo la proporción", () => {
    expect(dimensionesReducidas(4000, 3000)).toEqual({ ancho: 720, alto: 540 });
  });

  it("nunca agranda una foto pequeña", () => {
    expect(dimensionesReducidas(640, 480)).toEqual({ ancho: 640, alto: 480 });
  });
});
