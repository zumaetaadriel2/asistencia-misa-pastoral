import type { PostgrestError } from "@supabase/supabase-js";

/** Máximo de filas que Supabase devuelve por consulta (config por defecto `max_rows`) */
const TAMANO_PAGINA = 1000;

/**
 * Trae todas las filas de una consulta pidiéndolas por páginas con `.range()`.
 * Sin esto, Supabase corta el resultado en 1000 filas sin avisar.
 *
 * La consulta debe tener un `.order()` estable (p. ej. por `id`) para que
 * las páginas no se solapen.
 *
 * @example
 * ```ts
 * const asistencias = await obtenerTodasLasFilas((desde, hasta) =>
 *   supabase.from("asistencias").select("id, estado").order("id").range(desde, hasta)
 * );
 * ```
 */
export async function obtenerTodasLasFilas<T>(
  consultar: (
    desde: number,
    hasta: number
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
): Promise<T[]> {
  const filas: T[] = [];

  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await consultar(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;

    filas.push(...(data ?? []));
    if (!data || data.length < TAMANO_PAGINA) return filas;
  }
}
