// =============================================
// enviar-avisos: manda los avisos push de la semana
// =============================================
// La llama pg_cron (public._pedir_avisos) con { "tipo": "apertura" | "recordatorio" |
// "cierre" | "revision" } y una clave secreta del proyecto en el header apikey. A quién avisar
// y qué decirle lo decide la base (avisos_para_enviar). Los textos no llevan datos del alumno.
// No se registran las direcciones de los celulares: quien las tiene puede mandarles avisos.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import webpush from "web-push";

const TIPOS = ["apertura", "recordatorio", "cierre", "revision"];
const AVISOS_A_LA_VEZ = 20;
// Si el celular está apagado, el servicio de avisos lo guarda 12 horas
const VIGENCIA_SEGUNDOS = 12 * 60 * 60;
const CONTACTO = "mailto:pastoral@ps.edu.pe";

function requerir(nombre: string): string {
  const valor = Deno.env.get(nombre);
  if (!valor) throw new Error(`Falta el secreto ${nombre}`);
  return valor;
}

interface Aviso {
  suscripcion_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  titulo: string;
  cuerpo: string;
  url: string;
}

async function mandar(aviso: Aviso, vapid: { subject: string; publicKey: string; privateKey: string }) {
  await webpush.sendNotification(
    { endpoint: aviso.endpoint, keys: { p256dh: aviso.p256dh, auth: aviso.auth } },
    JSON.stringify({ titulo: aviso.titulo, cuerpo: aviso.cuerpo, url: aviso.url }),
    { vapidDetails: vapid, TTL: VIGENCIA_SEGUNDOS },
  );
}

// "secret:*": cualquier clave secreta del proyecto, para poder cambiarla sin tocar las demás
export default {
  fetch: withSupabase({ auth: "secret:*", cors: "disabled" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "metodo_no_permitido" }, { status: 405 });
    }

    let tipo: unknown;
    try {
      ({ tipo } = await req.json());
    } catch {
      return Response.json({ error: "solicitud_invalida" }, { status: 400 });
    }
    if (typeof tipo !== "string" || !TIPOS.includes(tipo)) {
      return Response.json({ error: "solicitud_invalida" }, { status: 400 });
    }

    try {
      const vapid = {
        subject: CONTACTO,
        publicKey: requerir("VAPID_PUBLIC_KEY"),
        privateKey: requerir("VAPID_PRIVATE_KEY"),
      };

      const { data, error } = await ctx.supabaseAdmin.rpc("avisos_para_enviar", { p_tipo: tipo });
      if (error) throw error;
      const avisos = (data ?? []) as Aviso[];

      let enviados = 0;
      let fallidos = 0;
      const vencidas: number[] = [];

      for (let i = 0; i < avisos.length; i += AVISOS_A_LA_VEZ) {
        const grupo = avisos.slice(i, i + AVISOS_A_LA_VEZ);
        const resultados = await Promise.allSettled(grupo.map((aviso) => mandar(aviso, vapid)));
        resultados.forEach((resultado, j) => {
          if (resultado.status === "fulfilled") {
            enviados++;
            return;
          }
          // 404 o 410: el celular desactivó los avisos o desinstaló la app
          const estado = (resultado.reason as { statusCode?: number })?.statusCode;
          if (estado === 404 || estado === 410) {
            vencidas.push(grupo[j].suscripcion_id);
          } else {
            fallidos++;
            console.error("enviar-avisos: falló un aviso, estado", estado ?? "sin respuesta");
          }
        });
      }

      if (vencidas.length > 0) {
        const { error: errorAlBorrar } = await ctx.supabaseAdmin.rpc("quitar_suscripciones", { p_ids: vencidas });
        if (errorAlBorrar) throw errorAlBorrar;
      }

      return Response.json({ tipo, enviados, vencidos: vencidas.length, fallidos });
    } catch (error) {
      console.error("enviar-avisos:", error);
      return Response.json({ error: "error_interno" }, { status: 500 });
    }
  }),
};
