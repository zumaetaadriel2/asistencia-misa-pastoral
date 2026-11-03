"use client";

import { Suspense } from "react";
import { MarcoStaff } from "@/components/dashboard/marco-staff";
import { VistaComunidad } from "@/components/comunidad/vista-comunidad";
import { Cargando } from "@/components/ui/base";

// VistaComunidad lee ?comunidad= con useSearchParams: por eso va dentro de <Suspense>
export default function ComunidadPage() {
  return (
    <MarcoStaff
      titulo={(perfil) => (perfil.rol === "admin" ? "Asistencia por comunidad" : "Mi comunidad")}
      ancho="ancho"
    >
      {(perfil) => (
        <Suspense fallback={<Cargando />}>
          <VistaComunidad perfil={perfil} />
        </Suspense>
      )}
    </MarcoStaff>
  );
}
