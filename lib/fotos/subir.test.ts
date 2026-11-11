import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El cliente real de Supabase exige variables de entorno: se reemplaza por uno falso
const invoke = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ supabasePublico: { functions: { invoke } } }));
vi.mock("./procesar", () => ({
  TIPO_FOTO: "image/jpeg",
  procesarFoto: vi.fn(async () => ({ blob: new Blob(["x"]), huella: BigInt(-5), fechaExif: null })),
}));

const { enviarFotoLista, prepararFoto, ESPERAS_REINTENTO_MS, INTENTOS_MAXIMOS, TIEMPO_MAXIMO_SUBIDA_MS, VIGENCIA_URL_MS } =
  await import("./subir");
type ProgresoEnvio = import("./subir").ProgresoEnvio;

const foto = { blob: new Blob(["x"]), huella: "1", fechaExif: null };
const sinEsperar = async () => {};
const exito = () => new Response(null, { status: 200 });

/** Respuestas de subir-foto por acción; por defecto, todo sale bien */
function funcion(respuestas: { preparar?: unknown[]; confirmar?: unknown[] } = {}) {
  const colas = { preparar: [...(respuestas.preparar ?? [])], confirmar: [...(respuestas.confirmar ?? [])] };
  invoke.mockImplementation(async (_nombre: string, { body }: { body: { accion: "preparar" | "confirmar" } }) => {
    const siguiente = colas[body.accion].shift();
    if (siguiente === "sin_red") return { data: null, error: new Error("sin red") };
    if (siguiente) return { data: siguiente, error: null };
    return {
      data:
        body.accion === "preparar"
          ? { ok: true, envio_id: 7, semana: 34, url_subida: "https://r2.example/subida" }
          : { ok: true, similar: false },
      error: null,
    };
  });
}

const acciones = () => invoke.mock.calls.map(([, { body }]) => body.accion);

describe("prepararFoto", () => {
  it("deja la huella como texto para poder guardarla", async () => {
    expect(await prepararFoto(new File(["x"], "foto.jpg"))).toMatchObject({ huella: "-5", fechaExif: null });
  });
});

describe("enviarFotoLista", () => {
  beforeEach(() => {
    invoke.mockReset();
    funcion();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("avisa cada paso en orden y devuelve la semana", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => exito()));
    const etapas: string[] = [];

    const resultado = await enviarFotoLista("TEST22", foto, { alAvanzar: (etapa) => etapas.push(etapa) });

    expect(etapas).toEqual(["preparando", "subiendo", "confirmando"]);
    expect(resultado).toEqual({ ok: true, semana: 34, similar: false });
  });

  it("si se cae la señal al subir, reintenta solo la subida con la misma URL", async () => {
    const subir = vi.fn().mockRejectedValueOnce(new TypeError("sin red")).mockResolvedValue(exito());
    vi.stubGlobal("fetch", subir);
    const esperas: number[] = [];
    const intentos: number[] = [];

    const resultado = await enviarFotoLista("TEST22", foto, {
      esperar: async (ms) => void esperas.push(ms),
      alAvanzar: (etapa, intento) => etapa === "subiendo" && intentos.push(intento),
    });

    expect(resultado.ok).toBe(true);
    expect(acciones()).toEqual(["preparar", "confirmar"]);
    expect(subir).toHaveBeenCalledTimes(2);
    expect(esperas).toEqual([ESPERAS_REINTENTO_MS[0]]);
    expect(intentos).toEqual([1, 2]);
  });

  it("si la subida no termina a tiempo la corta y la cuenta como falta de señal", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, { signal }: RequestInit) =>
          new Promise((_, rechazar) => signal?.addEventListener("abort", () => rechazar(new Error("abortado"))))
      )
    );

    const promesa = enviarFotoLista("TEST22", foto, { esperar: sinEsperar });
    for (let i = 0; i < INTENTOS_MAXIMOS; i++) await vi.advanceTimersByTimeAsync(TIEMPO_MAXIMO_SUBIDA_MS);

    expect(await promesa).toMatchObject({ ok: false, error: "error_de_red", progreso: { envioId: 7, subida: false } });
  });

  it("si no hay señal, se rinde tras INTENTOS_MAXIMOS y devuelve lo que alcanzó a hacer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => exito()));
    funcion({ confirmar: Array(INTENTOS_MAXIMOS).fill("sin_red") });
    const guardados: (ProgresoEnvio | null)[] = [];

    const resultado = await enviarFotoLista("TEST22", foto, {
      esperar: sinEsperar,
      alProgresar: (progreso) => guardados.push(progreso),
    });

    expect(resultado).toMatchObject({ ok: false, error: "error_de_red", progreso: { envioId: 7, subida: true } });
    expect(acciones()).toEqual(["preparar", ...Array(INTENTOS_MAXIMOS).fill("confirmar")]);
    expect(guardados.map((p) => p?.subida)).toEqual([false, true]);
  });

  it("con la foto ya subida, solo la confirma", async () => {
    const subir = vi.fn();
    vi.stubGlobal("fetch", subir);
    const progreso = { envioId: 9, semana: 33, urlSubida: "https://r2.example/x", preparadoEn: 0, subida: true };

    const resultado = await enviarFotoLista("TEST22", foto, { progreso, ahora: () => 60 * 60_000 });

    expect(resultado).toEqual({ ok: true, semana: 33, similar: false });
    expect(acciones()).toEqual(["confirmar"]);
    expect(invoke.mock.calls[0][1].body).toMatchObject({ envio_id: 9 });
    expect(subir).not.toHaveBeenCalled();
  });

  it("si la confirmación anterior llegó pero se perdió la respuesta, cuenta como enviada", async () => {
    funcion({ confirmar: [{ ok: false, error: "envio_ya_confirmado" }] });
    const progreso = { envioId: 9, semana: 33, urlSubida: "https://r2.example/x", preparadoEn: 0, subida: true };

    expect(await enviarFotoLista("TEST22", foto, { progreso })).toEqual({ ok: true, semana: 33, similar: false });
  });

  it("si la URL de subida ya venció, prepara otra", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => exito()));
    const progreso = { envioId: 9, semana: 33, urlSubida: "https://r2.example/x", preparadoEn: 0, subida: false };

    const resultado = await enviarFotoLista("TEST22", foto, { progreso, ahora: () => VIGENCIA_URL_MS + 1 });

    expect(resultado).toEqual({ ok: true, semana: 34, similar: false });
    expect(acciones()).toEqual(["preparar", "confirmar"]);
  });

  it("si el envío preparado venció en la base, vuelve a empezar una sola vez", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => exito()));
    funcion({ confirmar: [{ ok: false, error: "envio_expirado" }] });
    const progreso = { envioId: 9, semana: 33, urlSubida: "https://r2.example/x", preparadoEn: 0, subida: true };

    expect(await enviarFotoLista("TEST22", foto, { progreso })).toEqual({ ok: true, semana: 34, similar: false });
    expect(acciones()).toEqual(["confirmar", "preparar", "confirmar"]);
  });

  it("si la base no encuentra la foto en R2, la vuelve a subir", async () => {
    const subir = vi.fn(async () => exito());
    vi.stubGlobal("fetch", subir);
    funcion({ confirmar: [{ ok: false, error: "foto_no_subida" }] });

    expect((await enviarFotoLista("TEST22", foto, { esperar: sinEsperar })).ok).toBe(true);
    expect(subir).toHaveBeenCalledTimes(2);
  });

  it("no reintenta lo que no es de señal, como una semana que ya tiene foto", async () => {
    funcion({ preparar: [{ ok: false, error: "ya_registrada" }] });
    const esperar = vi.fn(sinEsperar);
    const etapas: string[] = [];

    expect(await enviarFotoLista("TEST22", foto, { esperar, alAvanzar: (etapa) => etapas.push(etapa) })).toEqual({
      ok: false,
      error: "ya_registrada",
      progreso: null,
    });
    expect(etapas).toEqual(["preparando"]);
    expect(esperar).not.toHaveBeenCalled();
  });
});
