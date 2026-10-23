"use client";

import { MarcoStaff } from "@/components/dashboard/marco-staff";
import { VistaCatequesis } from "@/components/catequesis/vista-catequesis";

export default function CatequesisPage() {
  return (
    <MarcoStaff titulo="Catequesis" ancho="ancho" requiere="lista">
      {(perfil) => <VistaCatequesis perfil={perfil} />}
    </MarcoStaff>
  );
}
