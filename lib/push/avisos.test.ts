import { describe, expect, it, vi } from "vitest";

// El cliente real de Supabase exige variables de entorno: aquí solo se prueba la lógica pura
vi.mock("@/lib/supabase/client", () => ({ supabase: {}, supabasePublico: {} }));

const { claveABytes, soporteDeAvisos } = await import("./avisos");

describe("soporteDeAvisos", () => {
  const entorno = { claveConfigurada: true, apisPresentes: true, plataforma: "android" as const, instalada: false };

  it("disponible en un navegador con avisos", () => {
    expect(soporteDeAvisos(entorno)).toBe("disponible");
  });

  it("en iPhone hay que instalar la app primero", () => {
    expect(soporteDeAvisos({ ...entorno, plataforma: "ios", apisPresentes: false })).toBe("instalar");
    expect(soporteDeAvisos({ ...entorno, plataforma: "ios", instalada: true })).toBe("disponible");
  });

  it("no disponible sin la clave o sin las funciones del navegador", () => {
    expect(soporteDeAvisos({ ...entorno, claveConfigurada: false })).toBe("no_disponible");
    expect(soporteDeAvisos({ ...entorno, claveConfigurada: false, plataforma: "ios" })).toBe("no_disponible");
    expect(soporteDeAvisos({ ...entorno, apisPresentes: false })).toBe("no_disponible");
  });
});

describe("claveABytes", () => {
  it("convierte base64url a bytes, con los caracteres propios de ese formato", () => {
    expect([...claveABytes("-_8")]).toEqual([251, 255]);
    expect([...claveABytes("AQID")]).toEqual([1, 2, 3]);
  });

  it("una clave VAPID son 65 bytes y empieza con 4", () => {
    const clave = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString("base64url");
    const bytes = claveABytes(clave);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
  });
});
