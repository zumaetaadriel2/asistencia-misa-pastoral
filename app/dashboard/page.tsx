"use client";

import { MarcoStaff } from "@/components/dashboard/marco-staff";
import { PanelRevision } from "@/components/dashboard/panel-revision";

export default function DashboardPage() {
  return <MarcoStaff titulo="Panel de Revisión">{(perfil) => <PanelRevision perfil={perfil} />}</MarcoStaff>;
}
