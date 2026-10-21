// =============================================
// Mensajes legibles a partir de errores de Supabase
// =============================================
// Las RPC lanzan sus errores ya en español; los de Postgres (duplicados, RLS)
// se traducen aquí.

interface Opciones {
  /** Texto para cuando se viola una restricción única (código 23505) */
  duplicado?: string;
}

export function mensajeDe(error: unknown, porDefecto: string, opciones: Opciones = {}): string {
  if (!error || typeof error !== "object") return porDefecto;

  if ("code" in error) {
    if (error.code === "23505") return opciones.duplicado ?? "Ya existe un registro con esos datos.";
    if (error.code === "42501") return "No tienes permiso para hacer esto.";
  }
  return "message" in error && error.message ? String(error.message) : porDefecto;
}
