// =============================================
// Sesión del staff compartida por las páginas del panel
// =============================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { mensajeDe } from "./errores";
import { obtenerPerfil, type PerfilStaff } from "./revision";

export type SesionStaff =
  | { estado: "cargando" }
  | { estado: "sin-acceso" }
  | { estado: "error"; mensaje: string }
  | { estado: "listo"; perfil: PerfilStaff };

/** Sin sesión manda a /login; con sesión carga el perfil del staff (o "sin-acceso") */
export function useSesionStaff(): SesionStaff {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionStaff>({ estado: "cargando" });

  useEffect(() => {
    let cancelado = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      try {
        const perfil = await obtenerPerfil();
        if (!cancelado) setSesion(perfil ? { estado: "listo", perfil } : { estado: "sin-acceso" });
      } catch (e) {
        if (!cancelado) setSesion({ estado: "error", mensaje: mensajeDe(e, "No se pudo cargar tu perfil.") });
      }
    });

    return () => {
      cancelado = true;
    };
  }, [router]);

  return sesion;
}

export async function cerrarSesion(): Promise<void> {
  await supabase.auth.signOut();
}
