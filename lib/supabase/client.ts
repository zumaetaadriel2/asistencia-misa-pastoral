import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
      "Revisa tu archivo .env.local"
  );
}

/**
 * Cliente de Supabase para los Client Components.
 * Usa la clave publishable (no la anon legacy): las Edge Functions con
 * @supabase/server solo aceptan esa. Los permisos los decide RLS.
 * Tipado con el esquema generado (`npm run db:types`).
 */
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey);
