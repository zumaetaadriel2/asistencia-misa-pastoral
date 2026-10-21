// =============================================
// subir-foto: el alumno (sin login) sube su foto en dos pasos
// =============================================
// 1. preparar:  valida código y horario (RPC preparar_envio) y devuelve una URL
//               firmada para subir el JPEG directo a R2.
// 2. confirmar: comprueba en R2 que la foto existe y es válida, y registra la
//               asistencia como pendiente (RPC confirmar_envio).

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { conCors } from "../_shared/cors.ts";
import {
  borrarObjeto,
  datosObjeto,
  TAMANO_MAXIMO_BYTES,
  TIPO_FOTO,
  urlFirmadaSubida,
} from "../_shared/r2.ts";

interface Solicitud {
  accion?: unknown;
  codigo?: unknown;
  envio_id?: unknown;
  huella?: unknown;
  fecha_exif?: unknown;
}

function responder(cuerpo: Record<string, unknown>, status = 200): Response {
  return Response.json(cuerpo, { status });
}

/** Mismo criterio que la base: mayúsculas y solo letras y números */
function normalizarCodigo(codigo: string): string {
  return codigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function ipCliente(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "desconocida"
  );
}

/** La huella llega como texto porque un bigint de 64 bits no cabe en un número de JSON */
function huellaValida(huella: unknown): string | null {
  return typeof huella === "string" && /^-?\d{1,20}$/.test(huella) ? huella : null;
}

function fechaValida(fecha: unknown): string | null {
  if (typeof fecha !== "string") return null;
  const ms = Date.parse(fecha);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

const manejador = withSupabase({ auth: "publishable", cors: "disabled" }, async (req, ctx) => {
  if (req.method !== "POST") return responder({ ok: false, error: "metodo_no_permitido" }, 405);

  let cuerpo: Solicitud;
  try {
    cuerpo = await req.json();
  } catch {
    return responder({ ok: false, error: "solicitud_invalida" }, 400);
  }
  if (typeof cuerpo.codigo !== "string") {
    return responder({ ok: false, error: "solicitud_invalida" }, 400);
  }

  try {
    if (cuerpo.accion === "preparar") {
      const { data, error } = await ctx.supabaseAdmin.rpc("preparar_envio", {
        p_codigo: cuerpo.codigo,
        p_ip: ipCliente(req),
        p_huella: huellaValida(cuerpo.huella),
        p_fecha_exif: fechaValida(cuerpo.fecha_exif),
      });
      if (error) throw error;
      if (!data.ok) return responder(data);

      return responder({
        ok: true,
        envio_id: data.envio_id,
        semana: data.semana,
        url_subida: await urlFirmadaSubida(data.foto_key),
      });
    }

    if (cuerpo.accion === "confirmar") {
      if (!Number.isInteger(cuerpo.envio_id)) {
        return responder({ ok: false, error: "solicitud_invalida" }, 400);
      }

      // Solo quien tiene el código del envío puede confirmarlo
      const { data: envio, error } = await ctx.supabaseAdmin
        .from("envios_foto")
        .select("foto_key, alumnos!inner(codigo)")
        .eq("id", cuerpo.envio_id)
        .maybeSingle();
      if (error) throw error;
      if (!envio || envio.alumnos.codigo !== normalizarCodigo(cuerpo.codigo)) {
        return responder({ ok: false, error: "envio_no_existe" });
      }

      const objeto = await datosObjeto(envio.foto_key);
      if (!objeto) return responder({ ok: false, error: "foto_no_subida" });
      if (objeto.tamano > TAMANO_MAXIMO_BYTES || objeto.tipo !== TIPO_FOTO) {
        await borrarObjeto(envio.foto_key);
        return responder({ ok: false, error: "foto_invalida" });
      }

      const { data, error: errorConfirmar } = await ctx.supabaseAdmin.rpc("confirmar_envio", {
        p_envio_id: cuerpo.envio_id,
        p_codigo: cuerpo.codigo,
        p_tamano_bytes: objeto.tamano,
      });
      if (errorConfirmar) throw errorConfirmar;
      return responder(data);
    }

    return responder({ ok: false, error: "accion_desconocida" }, 400);
  } catch (error) {
    console.error("subir-foto:", error);
    return responder({ ok: false, error: "error_interno" }, 500);
  }
});

export default { fetch: conCors(manejador) };
