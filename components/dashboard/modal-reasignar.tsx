"use client";

import { useEffect, useState } from "react";
import { obtenerAlumnosDeComunidad, type ItemCola } from "@/lib/staff/revision";

interface Props {
  item: ItemCola;
  onCerrar: () => void;
  onConfirmar: (alumnoDestinoId: number) => Promise<void>;
}

/** Corrige una foto enviada con el código de otro compañero de la misma comunidad */
export function ModalReasignar({ item, onCerrar, onConfirmar }: Props) {
  const [alumnos, setAlumnos] = useState<{ id: number; nombre_completo: string }[] | null>(null);
  const [destino, setDestino] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    obtenerAlumnosDeComunidad(item.comunidad_id)
      .then((lista) => {
        if (!cancelado) setAlumnos(lista.filter((a) => a.id !== item.alumno_id));
      })
      .catch(() => {
        if (!cancelado) setError("No se pudieron cargar los alumnos. Revisa tu conexión.");
      });
    return () => {
      cancelado = true;
    };
  }, [item.comunidad_id, item.alumno_id]);

  const confirmar = async () => {
    if (!destino) return;
    setEnviando(true);
    await onConfirmar(destino);
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !enviando && onCerrar()} />
      <div className="relative w-full max-w-sm glass-card p-6 animate-fade-in-scale">
        <h3 className="text-base font-semibold text-white">Cambiar alumno</h3>
        <p className="text-xs text-white/40 mt-1 mb-4">
          La foto está a nombre de {item.alumno}. Elige a quién corresponde realmente.
        </p>

        <select
          value={destino ?? ""}
          onChange={(e) => setDestino(e.target.value ? Number(e.target.value) : null)}
          disabled={!alumnos || enviando}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
        >
          <option value="" className="bg-neutral-900">
            {alumnos ? "Elige un alumno…" : "Cargando alumnos…"}
          </option>
          {alumnos?.map((a) => (
            <option key={a.id} value={a.id} className="bg-neutral-900">
              {a.nombre_completo}
            </option>
          ))}
        </select>

        {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCerrar}
            disabled={enviando}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-all disabled:opacity-30"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!destino || enviando}
            className="flex-[2] py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-all disabled:opacity-30"
          >
            {enviando ? "Cambiando…" : "Cambiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
