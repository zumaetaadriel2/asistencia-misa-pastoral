// =============================================
// ver-fotos: el staff obtiene URLs temporales (5 min) de las fotos que puede ver
// =============================================
// La consulta usa el JWT del usuario, así que RLS decide qué fotos devuelve:
// un guía solo recibe las de sus comunidades.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { conCors } from "../_shared/cors.ts";
import { urlFirmadaLectura } from "../_shared/r2.ts";

const MAXIMO_POR_SOLICITUD = 50;

const manejador = withSupabase({ auth: "user", cors: "disabled" }, async (req, ctx) => {
  if (req.method !== "POST") {
    return Response.json({ error: "metodo_no_permitido" }, { status: 405 });
  }

  let ids: unknown;
  try {
    ({ envio_ids: ids } = await req.json());
  } catch {
    return Response.json({ error: "solicitud_invalida" }, { status: 400 });
  }
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAXIMO_POR_SOLICITUD ||
    !ids.every(Number.isInteger)
  ) {
    return Response.json({ error: "solicitud_invalida" }, { status: 400 });
  }

  try {
    const { data, error } = await ctx.supabase
      .from("envios_foto")
      .select("id, foto_key")
      .in("id", ids)
      .eq("confirmado", true);
    if (error) throw error;

    const fotos = await Promise.all(
      data.map(async (envio) => ({
        envio_id: envio.id,
        url: await urlFirmadaLectura(envio.foto_key),
      })),
    );
    return Response.json({ fotos });
  } catch (error) {
    console.error("ver-fotos:", error);
    return Response.json({ error: "error_interno" }, { status: 500 });
  }
});

export default { fetch: conCors(manejador) };
