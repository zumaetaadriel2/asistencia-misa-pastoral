"use client";

import { useEffect, useState } from "react";
import { armarResumenWhatsApp } from "@/lib/staff/resumen";
import { obtenerResumen, type FilaResumen } from "@/lib/staff/revision";

interface Props {
  semanaInicial: number;
  onCerrar: () => void;
}

/** Arma el resumen de una semana para copiarlo y pegarlo en el grupo de WhatsApp */
export function ModalResumen({ semanaInicial, onCerrar }: Props) {
  const [semana, setSemana] = useState(semanaInicial);
  const [carga, setCarga] = useState<{ semana: number; filas: FilaResumen[] } | null>(null);
  const [comunidad, setComunidad] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (semana < 1) return;
    let cancelado = false;
    obtenerResumen(semana).then((filas) => {
      if (!cancelado) setCarga({ semana, filas });
    });
    return () => {
      cancelado = true;
    };
  }, [semana]);

  const filas = carga?.semana === semana ? carga.filas : null;
  const comunidades = [...new Map((filas ?? []).map((f) => [f.comunidad_id, f.comunidad])).entries()];
  const filtradas = filas?.filter((f) => comunidad === null || f.comunidad_id === comunidad) ?? [];
  const texto = filas ? armarResumenWhatsApp(semana, filtradas) : "";

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCerrar} />
      <div className="relative w-full max-w-md glass-card p-6 animate-fade-in-scale max-h-[90vh] flex flex-col">
        <h3 className="text-base font-semibold text-white">Resumen para WhatsApp</h3>
        <p className="text-xs text-white/40 mt-1 mb-4">Cópialo y pégalo en el grupo de tu comunidad.</p>

        <div className="flex gap-2 mb-3">
          <label className="flex items-center gap-2 text-xs text-white/60">
            Semana
            <input
              type="number"
              min={1}
              value={semana}
              onChange={(e) => {
                setSemana(Number(e.target.value));
                setCopiado(false);
              }}
              className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            />
          </label>
          {comunidades.length > 1 && (
            <select
              value={comunidad ?? ""}
              onChange={(e) => setComunidad(e.target.value ? Number(e.target.value) : null)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm appearance-none"
            >
              <option value="" className="bg-neutral-900">
                Todas mis comunidades
              </option>
              {comunidades.map(([id, nombre]) => (
                <option key={id} value={id} className="bg-neutral-900">
                  {nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        <pre className="flex-1 overflow-y-auto whitespace-pre-wrap text-xs text-white/70 bg-white/[0.03] border border-white/10 rounded-xl p-3 min-h-32">
          {filas ? texto : "Cargando…"}
        </pre>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCerrar}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-all"
          >
            Cerrar
          </button>
          <button
            onClick={copiar}
            disabled={!filas || filtradas.length === 0}
            className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all disabled:opacity-30"
          >
            {copiado ? "¡Copiado!" : "Copiar resumen"}
          </button>
        </div>
      </div>
    </div>
  );
}
