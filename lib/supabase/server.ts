import { createClient } from "@supabase/supabase-js";

/**
 * Crea un cliente de Supabase para uso en el lado del servidor (Server Components, Route Handlers, Server Actions).
 * Utiliza la clave anónima por defecto; usa la service role key para operaciones con privilegios elevados.
 */
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Crea un cliente de Supabase con la Service Role Key (acceso total, sin RLS).
 * ⚠️ SOLO usar en el servidor para operaciones administrativas.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
