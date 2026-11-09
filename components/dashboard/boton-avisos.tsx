"use client";

import { useRef, useState } from "react";
import { IconoCampana } from "@/components/ui/icono-campana";
import { useAvisos, type EstadoAvisos } from "@/lib/push/avisos";

const TEXTOS: Partial<Record<EstadoAvisos, string>> = {
  activados: "Listo: te avisaremos los lunes a las 8 p. m. si tienes fotos por revisar.",
  desactivados: "Avisos desactivados.",
  bloqueados: "Tu celular tiene bloqueados los avisos de esta app. Puedes permitirlos en los ajustes del navegador.",
  instalar: "En iPhone, los avisos funcionan con la app instalada.",
};

/** Campana del encabezado: avisar al guía los lunes si tiene fotos por revisar */
export function BotonAvisos() {
  const { estado, ocupado, activar, desactivar } = useAvisos({ tipo: "staff" });
  const [nota, setNota] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (estado === "cargando" || estado === "no_disponible") return null;

  const mostrar = (texto: string) => {
    setNota(texto);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setNota(""), 6000);
  };

  const tocar = async () => {
    if (estado === "instalar" || estado === "bloqueados") {
      mostrar(TEXTOS[estado]!);
      return;
    }
    const nuevo = await (estado === "activados" ? desactivar() : activar());
    mostrar(nuevo ? (TEXTOS[nuevo] ?? "") : "No se pudo cambiar los avisos. Revisa tu señal e inténtalo otra vez.");
  };

  const activos = estado === "activados";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={tocar}
        disabled={ocupado}
        aria-label={activos ? "Desactivar los avisos de fotos por revisar" : "Avisarme los lunes si tengo fotos por revisar"}
        aria-pressed={activos}
        title={activos ? "Avisos activados" : "Avisarme los lunes si tengo fotos por revisar"}
        className={`relative min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl transition-all disabled:opacity-50 ${
          activos ? "text-marca bg-marca/10" : "text-texto-suave hover:text-texto"
        }`}
      >
        <IconoCampana className="w-5 h-5" />
        {activos && <span aria-hidden="true" className="absolute top-2 right-2 w-2 h-2 rounded-full bg-marca-solido" />}
      </button>
      {nota && (
        <p role="status" className="tarjeta absolute right-0 top-full mt-1 z-20 w-60 p-3 text-xs text-texto-suave animate-fade-in">
          {nota}
        </p>
      )}
    </div>
  );
}
