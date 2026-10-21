import { describe, expect, it } from "vitest";
import { accionDeTecla, type TeclaPresionada } from "./atajos";

const tecla = (cambios: Partial<TeclaPresionada>): TeclaPresionada => ({
  key: "v",
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  objetivo: { tagName: "BODY" },
  hayModalAbierto: false,
  ...cambios,
});

describe("accionDeTecla", () => {
  it("traduce flechas y letras (sin importar mayúsculas)", () => {
    expect(accionDeTecla(tecla({ key: "ArrowRight" }))).toBe("validar");
    expect(accionDeTecla(tecla({ key: "V" }))).toBe("validar");
    expect(accionDeTecla(tecla({ key: "ArrowLeft" }))).toBe("rechazar");
    expect(accionDeTecla(tecla({ key: "r" }))).toBe("rechazar");
    expect(accionDeTecla(tecla({ key: "z" }))).toBe("deshacer");
    expect(accionDeTecla(tecla({ key: "x" }))).toBeNull();
  });

  it("no actúa mientras se escribe en un campo", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(accionDeTecla(tecla({ objetivo: { tagName } }))).toBeNull();
    }
    expect(accionDeTecla(tecla({ objetivo: { tagName: "DIV", isContentEditable: true } }))).toBeNull();
  });

  it("no actúa con un modal abierto", () => {
    expect(accionDeTecla(tecla({ hayModalAbierto: true }))).toBeNull();
  });

  it("respeta los atajos del navegador y la tecla mantenida", () => {
    expect(accionDeTecla(tecla({ key: "r", ctrlKey: true }))).toBeNull();
    expect(accionDeTecla(tecla({ key: "z", metaKey: true }))).toBeNull();
    expect(accionDeTecla(tecla({ key: "v", altKey: true }))).toBeNull();
    expect(accionDeTecla(tecla({ key: "ArrowRight", repeat: true }))).toBeNull();
  });
});
