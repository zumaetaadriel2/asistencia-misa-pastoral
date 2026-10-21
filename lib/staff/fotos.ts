// =============================================
// URLs temporales de las fotos (Edge Function ver-fotos)
// =============================================
// Las URLs firmadas duran 5 minutos; se guardan 4 para no pedir la misma foto
// varias veces mientras el guía revisa.

import { supabase } from "@/lib/supabase/client";

const VIGENCIA_MS = 4 * 60 * 1000;
const MAXIMO_POR_SOLICITUD = 50;

const cache = new Map<number, { url: string; vence: number }>();

/** Devuelve las URLs de las fotos que el staff puede ver (RLS descarta las ajenas) */
export async function obtenerUrlsFotos(envioIds: number[]): Promise<Map<number, string>> {
  const ahora = Date.now();
  const urls = new Map<number, string>();
  const faltantes: number[] = [];

  for (const id of new Set(envioIds)) {
    const guardada = cache.get(id);
    if (guardada && guardada.vence > ahora) urls.set(id, guardada.url);
    else faltantes.push(id);
  }

  for (let i = 0; i < faltantes.length; i += MAXIMO_POR_SOLICITUD) {
    const { data, error } = await supabase.functions.invoke<{
      fotos: { envio_id: number; url: string }[];
    }>("ver-fotos", { body: { envio_ids: faltantes.slice(i, i + MAXIMO_POR_SOLICITUD) } });
    if (error || !data) throw error ?? new Error("ver-fotos no respondió.");

    for (const foto of data.fotos) {
      cache.set(foto.envio_id, { url: foto.url, vence: ahora + VIGENCIA_MS });
      urls.set(foto.envio_id, foto.url);
    }
  }

  return urls;
}
