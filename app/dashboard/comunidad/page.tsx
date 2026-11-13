"use client";

import { Suspense } from "react";
import { MarcoStaff } from "@/components/dashboard/marco-staff";
import { PestanasComunidad } from "@/components/comunidad/pestanas-comunidad";
import { Cargando } from "@/components/ui/base";

// PestanasComunidad y VistaComunidad leen ?comunidad= con useSearchParams: por eso van dentro de <Suspense>
export default function ComunidadPage() {
  return (
    <MarcoStaff
      titulo={(perfil) => (perfil.rol === "admin" ? "Asistencia por comunidad" : "Mi comunidad")}
      ancho="ancho"
    >
      {(perfil) => (
        <Suspense fallback={<Cargando />}>
          <PestanasComunidad perfil={perfil} />
        </Suspense>
      )}
    </MarcoStaff>
  );
}
