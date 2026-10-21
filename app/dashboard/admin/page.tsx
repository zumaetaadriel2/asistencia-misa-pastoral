"use client";

import { MarcoStaff } from "@/components/dashboard/marco-staff";
import { PanelAdministracion } from "@/components/admin/panel-administracion";

export default function AdminPage() {
  return (
    <MarcoStaff titulo="Administración" ancho="ancho" soloAdmin>
      {(perfil) => <PanelAdministracion perfil={perfil} />}
    </MarcoStaff>
  );
}
