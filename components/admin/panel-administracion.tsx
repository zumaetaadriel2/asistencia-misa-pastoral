"use client";

import { useState } from "react";
import type { PerfilStaff } from "@/lib/staff/revision";
import { SeccionAlumnos } from "./seccion-alumnos";
import { SeccionCiclo } from "./seccion-ciclo";
import { SeccionComunidades } from "./seccion-comunidades";
import { SeccionReportes } from "./seccion-reportes";
import { SeccionStaff } from "./seccion-staff";

const SECCIONES = [
  { id: "ciclo", texto: "Ciclo" },
  { id: "comunidades", texto: "Comunidades" },
  { id: "staff", texto: "Staff" },
  { id: "alumnos", texto: "Alumnos" },
  { id: "reportes", texto: "Reportes" },
] as const;

type Seccion = (typeof SECCIONES)[number]["id"];

/** Administración en pestañas; cada sección carga sus datos al abrirse */
export function PanelAdministracion({ perfil }: { perfil: PerfilStaff }) {
  const [seccion, setSeccion] = useState<Seccion>("ciclo");

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              seccion === s.id ? "bg-primary-600 text-white" : "bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            {s.texto}
          </button>
        ))}
      </div>

      {seccion === "ciclo" && <SeccionCiclo />}
      {seccion === "comunidades" && <SeccionComunidades />}
      {seccion === "staff" && <SeccionStaff perfil={perfil} />}
      {seccion === "alumnos" && <SeccionAlumnos />}
      {seccion === "reportes" && <SeccionReportes perfil={perfil} />}
    </div>
  );
}
