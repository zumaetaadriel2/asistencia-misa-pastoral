"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/**
 * Página raíz (con la que abre la app instalada). La sesión del staff vive en el
 * celular (localStorage), así que el servidor no puede decidir: si este celular
 * tiene una sesión del staff va al panel; si no, a la vista del alumno.
 */
export default function Inicio() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => router.replace(data.session ? "/dashboard" : "/alumno"))
      .catch(() => router.replace("/alumno"));
  }, [router]);

  return (
    <main className="flex-1 flex items-center justify-center">
      <div role="status" className="w-10 h-10 rounded-full border-2 border-marca border-t-transparent animate-spin">
        <span className="sr-only">Cargando…</span>
      </div>
    </main>
  );
}
