// =============================================
// Envío de la foto del alumno (Edge Function subir-foto + R2)
// =============================================

import { supabase } from "@/lib/supabase/client";
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

export type ResultadoEnvio =
  | { ok: true; semana: number; similar: boolean }
  | { ok: false; error: ErrorEnvio };

type RespuestaFuncion =
  | { ok: true; envio_id?: number; semana?: number; url_subida?: string; similar?: boolean }
  | { ok: false; error: ErrorEnvio };

async function llamarSubirFoto(cuerpo: Record<string, unknown>): Promise<RespuestaFuncion> {
  const { data, error } = await supabase.functions.invoke<RespuestaFuncion>("subir-foto", {
    body: cuerpo,
  });
  if (error || !data) return { ok: false, error: "error_de_red" };
  return data;
}

/**
 * Procesa la foto (fecha EXIF, huella, JPEG), la sube a R2 con una URL firmada
 * y confirma el envío. La asistencia queda pendiente de revisión.
 */
export async function enviarFoto(codigo: string, archivo: File): Promise<ResultadoEnvio> {
  const foto = await procesarFoto(archivo);

  const preparado = await llamarSubirFoto({
    accion: "preparar",
    codigo,
    huella: foto.huella.toString(),
    fecha_exif: foto.fechaExif?.toISOString() ?? null,
  });
  if (!preparado.ok) return preparado;
  if (!preparado.url_subida || !preparado.envio_id || !preparado.semana) {
    return { ok: false, error: "error_interno" };
  }

  try {
    const subida = await fetch(preparado.url_subida, {
      method: "PUT",
      headers: { "Content-Type": TIPO_FOTO },
      body: foto.blob,
    });
    if (!subida.ok) return { ok: false, error: "foto_no_subida" };
  } catch {
    return { ok: false, error: "error_de_red" };
  }

  const confirmado = await llamarSubirFoto({
    accion: "confirmar",
    codigo,
    envio_id: preparado.envio_id,
  });
  if (!confirmado.ok) return confirmado;

  return { ok: true, semana: preparado.semana, similar: confirmado.similar ?? false };
}
