"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PerfilStaff } from "@/lib/staff/revision";
import { SeccionResumen } from "@/components/admin/seccion-resumen";
import { VistaComunidad } from "./vista-comunidad";

const PESTANAS = [
  { id: "resumen", texto: "Resumen" },
  { id: "asistencia", texto: "Asistencia" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

/**
 * Mi comunidad del guía: "Resumen" (cómo va su grupo y a quién buscar, solo de las comunidades
 * donde es guía) y "Asistencia" (la matriz). El admin tiene su Resumen en Administración, así
 * que va directo a la matriz. `?comunidad=ID` abre Asistencia en esa comunidad.
 * Va dentro de <Suspense> por useSearchParams.
 */
export function PestanasComunidad({ perfil }: { perfil: PerfilStaff }) {
  const router = useRouter();
  const pedida = useSearchParams().get("comunidad");
  const [pestana, setPestana] = useState<Pestana>(pedida ? "asistencia" : "resumen");
  const botones = useRef<Partial<Record<Pestana, HTMLButtonElement | null>>>({});

  if (perfil.rol === "admin") return <VistaComunidad perfil={perfil} />;

  const moverCon = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const siguiente = pestana === "resumen" ? "asistencia" : "resumen";
    setPestana(siguiente);
    botones.current[siguiente]?.focus();
  };

  const verComunidad = (id: number) => {
    router.replace(`/dashboard/comunidad?comunidad=${id}`, { scroll: false });
    setPestana("asistencia");
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div role="tablist" aria-label="Mi comunidad" onKeyDown={moverCon} className="flex gap-1.5 print:hidden">
        {PESTANAS.map((p) => {
          const elegida = pestana === p.id;
          return (
            <button
              key={p.id}
              ref={(boton) => {
                botones.current[p.id] = boton;
              }}
              id={`pestana-${p.id}`}
              role="tab"
              aria-selected={elegida}
              aria-controls={`seccion-${p.id}`}
              tabIndex={elegida ? 0 : -1}
              onClick={() => setPestana(p.id)}
              className={`min-h-11 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                elegida ? "bg-marca-solido text-white" : "bg-superficie-2 text-texto-suave hover:text-texto"
              }`}
            >
              {p.texto}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`seccion-${pestana}`} aria-labelledby={`pestana-${pestana}`} className="flex-1 flex flex-col">
        {pestana === "resumen" ? (
          <SeccionResumen alcance="guia" onVerComunidad={verComunidad} />
        ) : (
          <VistaComunidad perfil={perfil} />
        )}
      </div>
    </div>
  );
}
