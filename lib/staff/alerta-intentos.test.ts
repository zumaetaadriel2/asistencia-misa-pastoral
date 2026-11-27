import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ supabase: {} }));

const { armarAlertaIntentos, INTENTOS_PARA_ALERTA } = await import("./alerta-intentos");

describe("armarAlertaIntentos", () => {
  it("no avisa nada con los errores normales de tipeo", () => {
    expect(armarAlertaIntentos({ ultima_hora: 40, ips: 3, bloqueo_global: false })).toBeNull();
    expect(armarAlertaIntentos({ ultima_hora: INTENTOS_PARA_ALERTA - 1, ips: 50, bloqueo_global: false })).toBeNull();
  });

  it("avisa desde los intentos de alerta, sin decir que los alumnos estén bloqueados", () => {
    const alerta = armarAlertaIntentos({ ultima_hora: 4200, ips: 180, bloqueo_global: false });
    expect(alerta).toMatchObject({ grave: false, titulo: "Muchos intentos con códigos equivocados" });
    expect(alerta?.detalle).toContain(`${(4200).toLocaleString("es-PE")} códigos equivocados`);
    expect(alerta?.detalle).toContain("180 conexiones distintas");
    expect(alerta?.detalle).toContain("siguen entrando");
  });

  it("con el freno de emergencia dice que nadie puede entrar", () => {
    const alerta = armarAlertaIntentos({ ultima_hora: 25000, ips: 1, bloqueo_global: true });
    expect(alerta).toMatchObject({ grave: true, titulo: "Los alumnos no pueden entrar ahora" });
    expect(alerta?.detalle).toContain("desde 1 conexión");
  });
});
