import { describe, expect, it, vi } from "vitest";

// El cliente real de Supabase exige variables de entorno: se reemplaza por uno falso
const invoke = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ supabase: { functions: { invoke } } }));

const { darDeAltaDesdePastoral, detalleCatequista, listarCatequistasPastoral } = await import("./pastoral-digital");

describe("detalleCatequista", () => {
  it("traduce el horario y la categoría de Pastoral Digital", () => {
    expect(detalleCatequista({ horario: "confirmacion", categoria: "teacher" })).toBe("Confirmación · Docente");
    expect(detalleCatequista({ horario: "primera-comunion", categoria: "alumni" })).toBe("Primera Comunión · Exalumno");
  });

  it("deja tal cual lo que no conoce", () => {
    expect(detalleCatequista({ horario: "nuevo", categoria: "" })).toBe("nuevo");
  });
});

describe("listarCatequistasPastoral", () => {
  it("ordena por nombre", async () => {
    invoke.mockResolvedValueOnce({
      data: { ok: true, catequistas: [{ nombre: "Zoe" }, { nombre: "Álvaro" }, { nombre: "Beto" }] },
      error: null,
    });
    expect((await listarCatequistasPastoral()).map((c) => c.nombre)).toEqual(["Álvaro", "Beto", "Zoe"]);
  });

  it("muestra el motivo del error aunque la función responda 4xx o 5xx", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { context: new Response(JSON.stringify({ ok: false, error: "api_no_autorizada" }), { status: 502 }) },
    });
    await expect(listarCatequistasPastoral()).rejects.toThrow("rechazó el token");
  });
});

describe("darDeAltaDesdePastoral", () => {
  it("manda el ID de Pastoral Digital y el rol", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true, nombre: "Ana", email: "ana@x.pe", vinculado: false }, error: null });
    expect(await darDeAltaDesdePastoral("user_1", "admin")).toMatchObject({ nombre: "Ana" });
    expect(invoke).toHaveBeenLastCalledWith("catequistas-pastoral", {
      body: { accion: "dar_de_alta", pastoral_id: "user_1", rol: "admin" },
    });
  });

  it("explica si la persona ya está dada de alta", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: false, error: "ya_registrado" }, error: null });
    await expect(darDeAltaDesdePastoral("user_1", "guia")).rejects.toThrow("ya está dada de alta");
  });
});
