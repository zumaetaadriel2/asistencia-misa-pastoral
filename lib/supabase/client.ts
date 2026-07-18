import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Revisa tu archivo .env.local"
  );
}

/**
 * Cliente de Supabase para uso en el lado del cliente (Client Components).
 * Utiliza la clave anónima (anon key) con Row Level Security (RLS).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
