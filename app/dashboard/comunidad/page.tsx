"use client";

import { MarcoStaff } from "@/components/dashboard/marco-staff";
import { VistaComunidad } from "@/components/comunidad/vista-comunidad";

export default function ComunidadPage() {
  return (
    <MarcoStaff
      titulo={(perfil) => (perfil.rol === "admin" ? "Asistencia por comunidad" : "Mi comunidad")}
      ancho="ancho"
    >
      {(perfil) => <VistaComunidad perfil={perfil} />}
    </MarcoStaff>
  );
}
