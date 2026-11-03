"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSesionStaff } from "@/lib/staff/sesion";
import type { PerfilStaff } from "@/lib/staff/revision";

/** A dónde entra cada uno al iniciar sesión: el admin al Resumen, el guía a Revisión */
function rutaDeInicio(perfil: PerfilStaff): string {
  if (perfil.rol === "admin") return "/dashboard/admin";
  if (perfil.es_guia) return "/dashboard";
  return "/dashboard/catequesis";
}

/**
 * Entrada del staff después del login. No es un menú: solo decide la página. Sin acceso o
 * con error va a /dashboard, que ya muestra el aviso que corresponde.
 */
export default function InicioStaff() {
  const router = useRouter();
  const sesion = useSesionStaff();

  useEffect(() => {
    if (sesion.estado === "cargando") return;
    router.replace(sesion.estado === "listo" ? rutaDeInicio(sesion.perfil) : "/dashboard");
  }, [sesion, router]);

  return (
    <main className="flex-1 flex items-center justify-center">
      <div role="status" className="w-10 h-10 rounded-full border-2 border-marca border-t-transparent animate-spin">
        <span className="sr-only">Cargando…</span>
      </div>
    </main>
  );
}
