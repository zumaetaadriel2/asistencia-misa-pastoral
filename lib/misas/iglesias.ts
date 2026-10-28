// =============================================
// Iglesias y misas en la base
// =============================================
// Cualquiera lee las activas con misas (página pública /misas). El admin las lee directo
// (RLS); crear, editar e importar va por RPC, que valida y reemplaza las misas en una sola
// operación.

import { supabase, supabasePublico } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import type { DiaMisa, Misa } from "./horarios";
import type { DatosIglesia, Distrito } from "./importacion";

export interface IglesiaAdmin extends DatosIglesia {
  id: number;
  activa: boolean;
  /** "AAAA-MM-DD": la última vez que se guardaron sus misas */
  verificado_en: string | null;
}

/** Lo que devuelve iglesias_con_misas(): solo activas y con al menos una misa */
export type IglesiaPublica = Omit<IglesiaAdmin, "activa">;

export async function obtenerIglesiasPublicas(): Promise<IglesiaPublica[]> {
  const { data, error } = await supabasePublico.rpc("iglesias_con_misas");
  if (error) throw error;
  return data as unknown as IglesiaPublica[];
}

/** "19:00:00" (time de Postgres) → "19:00" */
const sinSegundos = (hora: string) => hora.slice(0, 5);

export async function listarIglesias(): Promise<IglesiaAdmin[]> {
  const { data, error } = await supabase
    .from("iglesias")
    .select(
      "id, nombre, distrito, direccion, latitud, longitud, telefono, notas, activa, verificado_en, horarios_misa(dia, hora)"
    )
    .order("nombre");
  if (error) throw error;
  return data.map(({ horarios_misa, distrito, ...iglesia }) => ({
    ...iglesia,
    distrito: distrito as Distrito,
    misas: horarios_misa
      .map((h): Misa => ({ dia: h.dia as DiaMisa, hora: sinSegundos(h.hora) }))
      .sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora)),
  }));
}

/** Crea (id null) o edita una iglesia; sus misas se reemplazan. Devuelve el id. */
export async function guardarIglesia(id: number | null, datos: DatosIglesia): Promise<number> {
  const { data, error } = await supabase.rpc("guardar_iglesia", {
    // La RPC acepta null para crear (los tipos generados no lo reflejan)
    p_id: id as number,
    p_datos: datos as unknown as Json,
  });
  if (error) throw error;
  return data;
}

/** Todo o nada: si una falla, no se importa ninguna y el error dice cuál */
export async function importarIglesias(iglesias: DatosIglesia[]): Promise<{ creadas: number; actualizadas: number }> {
  const { data, error } = await supabase.rpc("importar_iglesias", { p_filas: iglesias as unknown as Json });
  if (error) throw error;
  return data as { creadas: number; actualizadas: number };
}

export async function cambiarIglesiaActiva(id: number, activa: boolean): Promise<void> {
  const { error } = await supabase.from("iglesias").update({ activa }).eq("id", id);
  if (error) throw error;
}

export async function borrarIglesia(id: number): Promise<void> {
  const { error } = await supabase.from("iglesias").delete().eq("id", id);
  if (error) throw error;
}
