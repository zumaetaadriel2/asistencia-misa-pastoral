import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El cliente real de Supabase exige variables de entorno: se reemplaza por uno falso
const invoke = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ supabasePublico: { functions: { invoke } } }));
vi.mock("./procesar", () => ({
  TIPO_FOTO: "image/jpeg",
  procesarFoto: vi.fn(async () => ({ blob: new Blob(["x"]), huella: BigInt(1), fechaExif: null })),
}));

const { enviarFoto, TIEMPO_MAXIMO_SUBIDA_MS } = await import("./subir");

const archivo = new File(["x"], "foto.jpg", { type: "image/jpeg" });

describe("enviarFoto", () => {
  beforeEach(() => {
    invoke.mockImplementation(async (_nombre: string, { body }: { body: { accion: string } }) => ({
      data:
        body.accion === "preparar"
          ? { ok: true, envio_id: 7, semana: 34, url_subida: "https://r2.example/subida" }
          : { ok: true, similar: false },
      error: null,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("avisa cada paso en orden y devuelve la semana", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    const etapas: string[] = [];

    const resultado = await enviarFoto("TEST22", archivo, (etapa) => etapas.push(etapa));

    expect(etapas).toEqual(["preparando", "subiendo", "confirmando"]);
    expect(resultado).toEqual({ ok: true, semana: 34, similar: false });
  });

  it("si la subida no termina a tiempo la corta y responde error_de_red", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, { signal }: RequestInit) =>
          new Promise((_, rechazar) => signal?.addEventListener("abort", () => rechazar(new Error("abortado"))))
      )
    );

    const promesa = enviarFoto("TEST22", archivo);
    await vi.advanceTimersByTimeAsync(TIEMPO_MAXIMO_SUBIDA_MS);

    expect(await promesa).toEqual({ ok: false, error: "error_de_red" });
  });

  it("no confirma si la base rechaza el envío", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: false, error: "ya_registrada" }, error: null });
    const etapas: string[] = [];

    expect(await enviarFoto("TEST22", archivo, (etapa) => etapas.push(etapa))).toEqual({
      ok: false,
      error: "ya_registrada",
    });
    expect(etapas).toEqual(["preparando"]);
  });
});
