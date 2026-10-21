import { describe, expect, it } from "vitest";
import { coincide } from "./busqueda";

describe("coincide", () => {
  it("con la consulta vacía muestra todo", () => {
    expect(coincide("", "Ana Pérez Torres")).toBe(true);
    expect(coincide("   ", "Ana Pérez Torres")).toBe(true);
  });

  it("no distingue mayúsculas ni tildes", () => {
    expect(coincide("PEREZ", "Ana Pérez Torres")).toBe(true);
    expect(coincide("josé", "Jose Díaz")).toBe(true);
  });

  it("acepta las palabras en cualquier orden, pero todas deben aparecer", () => {
    expect(coincide("torres ana", "Ana Pérez Torres")).toBe(true);
    expect(coincide("ana ruiz", "Ana Pérez Torres")).toBe(false);
  });

  it("busca también en los demás textos (p. ej. el correo)", () => {
    expect(coincide("gmail", "Guía Uno", "guia.uno@gmail.com")).toBe(true);
  });
});
