// =============================================
// Envío de la foto del alumno (Edge Function subir-foto + R2)
// =============================================
// Pensado para la señal débil de las iglesias: cada paso (preparar, subir, confirmar) se
// reintenta solo, y lo ya hecho no se repite. Si la foto ya subió, solo falta confirmarla; si la
// confirmación llegó pero se perdió la respuesta, la base contesta envio_ya_confirmado y eso
// también es un éxito.

import { supabasePublico } from "@/lib/supabase/client";
import { procesarFoto, TIPO_FOTO } from "./procesar";

/** Errores que devuelve la base o la Edge Function, más los del propio navegador */
export type ErrorEnvio =
  | "codigo_invalido"
  | "demasiados_intentos"
  | "fuera_de_ciclo"
  | "formulario_cerrado"
  | "semana_cerrada"
  | "ya_registrada"
  | "envio_no_existe"
  | "envio_expirado"
  | "envio_ya_confirmado"
  | "foto_no_subida"
  | "foto_invalida"
  | "error_interno"
  | "error_de_red";

/** La foto ya comprimida, lista para subir y para guardarse en el celular */
export interface FotoLista {
  blob: Blob;
  /** Huella dHash como texto (bigint con signo de 64 bits) */
  huella: string;
  /** Fecha EXIF en ISO, si la tenía */
  fechaExif: string | null;
}

/** Lo que ya se hizo del envío, para continuar sin repetirlo */
export interface ProgresoEnvio {
  envioId: number;
  semana: number;
  urlSubida: string;
  /** Cuándo se preparó (ms): la URL de subida vale 5 minutos */
  preparadoEn: number;
  subida: boolean;
}

export type ResultadoEnvio =
  | { ok: true; semana: number; similar: boolean }
  | { ok: false; error: ErrorEnvio; progreso: ProgresoEnvio | null };

/** Pasos del envío, para mostrarle al alumno en qué va */
export type EtapaEnvio = "preparando" | "subiendo" | "confirmando";

/** Tiempo máximo para subir la foto (≤ 1 MB) a R2 antes de darla por fallida */
export const TIEMPO_MAXIMO_SUBIDA_MS = 90_000;

/** Esperas entre reintentos: con 3 esperas, son 4 intentos en total */
export const ESPERAS_REINTENTO_MS = [2_000, 5_000, 10_000] as const;
export const INTENTOS_MAXIMOS = ESPERAS_REINTENTO_MS.length + 1;

/** Margen antes de que venza la URL firmada (5 min). El envío preparado vence a los 15 min, pero
 * eso lo dice la base al confirmar (envio_expirado) y entonces se prepara otro */
export const VIGENCIA_URL_MS = 4 * 60_000;

/** Fallos de señal o del servidor: vale la pena volver a intentar con la misma foto */
export const ERRORES_REINTENTABLES: readonly ErrorEnvio[] = ["error_de_red", "foto_no_subida", "error_interno"];

type RespuestaFuncion =
  | { ok: true; envio_id?: number; semana?: number; url_subida?: string; similar?: boolean }
  | { ok: false; error: ErrorEnvio };

async function llamarSubirFoto(cuerpo: Record<string, unknown>): Promise<RespuestaFuncion> {
  try {
    const { data, error } = await supabasePublico.functions.invoke<RespuestaFuncion>("subir-foto", {
      body: cuerpo,
    });
    if (error || !data) return { ok: false, error: "error_de_red" };
    return data;
  } catch {
    return { ok: false, error: "error_de_red" };
  }
}

/** Lee la fecha EXIF, calcula la huella y comprime la foto (ver procesarFoto) */
export async function prepararFoto(archivo: File): Promise<FotoLista> {
  const foto = await procesarFoto(archivo);
  return { blob: foto.blob, huella: foto.huella.toString(), fechaExif: foto.fechaExif?.toISOString() ?? null };
}

/** Sube el JPEG a R2 con la URL firmada; con señal muy débil, se corta a los 90 s */
async function subirARed(url: string, blob: Blob): Promise<boolean | "sin_red"> {
  // AbortController + setTimeout y no AbortSignal.timeout(), que no existe antes de iOS 16
  const limite = new AbortController();
  const temporizador = setTimeout(() => limite.abort(), TIEMPO_MAXIMO_SUBIDA_MS);
  try {
    const subida = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": TIPO_FOTO },
      body: blob,
      signal: limite.signal,
    });
    return subida.ok;
  } catch {
    // Sin conexión o se agotó el tiempo
    return "sin_red";
  } finally {
    clearTimeout(temporizador);
  }
}

export interface OpcionesEnvio {
  /** Lo que ya se hizo en un intento anterior (por ejemplo, antes de cerrar la app) */
  progreso?: ProgresoEnvio | null;
  /** Avisa cada paso y el número de intento (1 la primera vez) */
  alAvanzar?: (etapa: EtapaEnvio, intento: number) => void;
  /** Avisa cada vez que cambia lo hecho, para guardarlo; null cuando ya no sirve */
  alProgresar?: (progreso: ProgresoEnvio | null) => void;
  /** Para las pruebas */
  esperar?: (ms: number) => Promise<void>;
  ahora?: () => number;
}

type Paso = "sigue" | ResultadoEnvio;

/**
 * Prepara el envío, sube la foto a R2 y lo confirma, reintentando cada paso hasta
 * INTENTOS_MAXIMOS veces si falla la señal. La asistencia queda pendiente de revisión.
 * Si no lo logra, devuelve el error y lo que alcanzó a hacer, para seguir después.
 */
export async function enviarFotoLista(codigo: string, foto: FotoLista, opciones: OpcionesEnvio = {}): Promise<ResultadoEnvio> {
  const { alAvanzar, alProgresar } = opciones;
  const esperar = opciones.esperar ?? ((ms: number) => new Promise<void>((listo) => setTimeout(listo, ms)));
  const ahora = opciones.ahora ?? Date.now;

  let progreso = opciones.progreso ?? null;
  let fallos = 0;
  // Si el envío preparado ya venció en la base, se vuelve a preparar una sola vez
  let reiniciado = false;

  const cambiar = (nuevo: ProgresoEnvio | null) => {
    progreso = nuevo;
    alProgresar?.(nuevo);
  };

  const unPaso = async (): Promise<Paso> => {
    // Si la foto ya subió, se intenta confirmar aunque haya pasado tiempo: así no queda suelta en R2
    const urlVencida = progreso !== null && !progreso.subida && ahora() - progreso.preparadoEn > VIGENCIA_URL_MS;

    if (!progreso || urlVencida) {
      alAvanzar?.("preparando", fallos + 1);
      const preparado = await llamarSubirFoto({
        accion: "preparar",
        codigo,
        huella: foto.huella,
        fecha_exif: foto.fechaExif,
      });
      if (!preparado.ok) return { ok: false, error: preparado.error, progreso: null };
      if (!preparado.url_subida || !preparado.envio_id || !preparado.semana) {
        return { ok: false, error: "error_interno", progreso: null };
      }
      cambiar({
        envioId: preparado.envio_id,
        semana: preparado.semana,
        urlSubida: preparado.url_subida,
        preparadoEn: ahora(),
        subida: false,
      });
      return "sigue";
    }

    if (!progreso.subida) {
      alAvanzar?.("subiendo", fallos + 1);
      const subida = await subirARed(progreso.urlSubida, foto.blob);
      if (subida !== true) {
        return { ok: false, error: subida === "sin_red" ? "error_de_red" : "foto_no_subida", progreso };
      }
      cambiar({ ...progreso, subida: true });
      return "sigue";
    }

    alAvanzar?.("confirmando", fallos + 1);
    const confirmado = await llamarSubirFoto({ accion: "confirmar", codigo, envio_id: progreso.envioId });
    const semana = progreso.semana;
    if (confirmado.ok) {
      cambiar(null);
      return { ok: true, semana, similar: confirmado.similar ?? false };
    }
    switch (confirmado.error) {
      case "envio_ya_confirmado":
        // Una confirmación anterior sí llegó, pero se perdió la respuesta
        cambiar(null);
        return { ok: true, semana, similar: false };
      case "foto_no_subida":
        // La base no encontró la foto en R2: hay que volver a subirla
        cambiar({ ...progreso, subida: false });
        return { ok: false, error: "foto_no_subida", progreso };
      case "envio_expirado":
      case "envio_no_existe":
        cambiar(null);
        if (!reiniciado) {
          reiniciado = true;
          return "sigue";
        }
        return { ok: false, error: confirmado.error, progreso: null };
      default:
        return { ok: false, error: confirmado.error, progreso };
    }
  };

  for (;;) {
    const paso = await unPaso();
    if (paso === "sigue") continue;
    if (paso.ok || !ERRORES_REINTENTABLES.includes(paso.error) || fallos >= ESPERAS_REINTENTO_MS.length) {
      return paso.ok ? paso : { ...paso, progreso };
    }
    await esperar(ESPERAS_REINTENTO_MS[fallos]);
    fallos++;
  }
}
