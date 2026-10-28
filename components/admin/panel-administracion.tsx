"use client";

import { useRef, useState } from "react";
import type { PerfilStaff } from "@/lib/staff/revision";
import { SeccionAlumnos } from "./seccion-alumnos";
import { SeccionCiclo } from "./seccion-ciclo";
import { SeccionComunidades } from "./seccion-comunidades";
import { SeccionMisas } from "./seccion-misas";
import { SeccionReportes } from "./seccion-reportes";
import { SeccionStaff } from "./seccion-staff";

const SECCIONES = [
  { id: "ciclo", texto: "Ciclo" },
  { id: "comunidades", texto: "Comunidades" },
  { id: "staff", texto: "Staff" },
  { id: "alumnos", texto: "Alumnos" },
  { id: "reportes", texto: "Reportes" },
  { id: "misas", texto: "Misas" },
] as const;

type Seccion = (typeof SECCIONES)[number]["id"];

/** Administración en pestañas (← → para moverse entre ellas); cada sección carga sus datos al abrirse */
export function PanelAdministracion({ perfil }: { perfil: PerfilStaff }) {
  const [seccion, setSeccion] = useState<Seccion>("ciclo");
  const pestanas = useRef<Partial<Record<Seccion, HTMLButtonElement | null>>>({});

  const moverCon = (e: React.KeyboardEvent) => {
    const paso = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const actual = SECCIONES.findIndex((s) => s.id === seccion);
    const siguiente = SECCIONES[(actual + paso + SECCIONES.length) % SECCIONES.length].id;
    setSeccion(siguiente);
    pestanas.current[siguiente]?.focus();
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div role="tablist" aria-label="Secciones de administración" onKeyDown={moverCon} className="flex gap-1.5 overflow-x-auto">
        {SECCIONES.map((s) => {
          const elegida = seccion === s.id;
          return (
            <button
              key={s.id}
              ref={(boton) => {
                pestanas.current[s.id] = boton;
              }}
              id={`pestana-${s.id}`}
              role="tab"
              aria-selected={elegida}
              aria-controls={`seccion-${s.id}`}
              tabIndex={elegida ? 0 : -1}
              onClick={() => setSeccion(s.id)}
              className={`min-h-11 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                elegida ? "bg-marca-solido text-white" : "bg-superficie-2 text-texto-suave hover:text-texto"
              }`}
            >
              {s.texto}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`seccion-${seccion}`} aria-labelledby={`pestana-${seccion}`}>
        {seccion === "ciclo" && <SeccionCiclo />}
        {seccion === "comunidades" && <SeccionComunidades />}
        {seccion === "staff" && <SeccionStaff perfil={perfil} />}
        {seccion === "alumnos" && <SeccionAlumnos />}
        {seccion === "reportes" && <SeccionReportes perfil={perfil} />}
        {seccion === "misas" && <SeccionMisas />}
      </div>
    </div>
  );
}
