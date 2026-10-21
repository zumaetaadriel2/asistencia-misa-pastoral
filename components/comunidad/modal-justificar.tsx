"use client";

import { useState } from "react";

interface Props {
  alumno: string;
  semana: number;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => Promise<void>;
}

/** Justifica la falta de un alumno en una semana; el motivo lo ve el alumno */
export function ModalJustificar({ alumno, semana, onCerrar, onConfirmar }: Props) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!motivo.trim()) return;
    setEnviando(true);
    await onConfirmar(motivo.trim());
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 print:hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !enviando && onCerrar()} />
      <div className="relative w-full max-w-sm glass-card p-6 animate-fade-in-scale">
        <h3 className="text-base font-semibold text-white">Justificar falta</h3>
        <p className="text-xs text-white/40 mt-1 mb-4">
          {alumno} · Semana {semana}
        </p>

        <label htmlFor="motivo-justificacion" className="block text-sm font-medium text-white/60 mb-1.5">
          Motivo <span className="text-sky-400">*</span>
        </label>
        <textarea
          id="motivo-justificacion"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Estuvo enfermo, avisó su familia."
          rows={3}
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                     placeholder:text-white/15 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
        <p className="mt-1 text-[10px] text-white/30">El alumno verá este motivo en su historial.</p>

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
            disabled={!motivo.trim() || enviando}
            className="flex-[2] py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-all disabled:opacity-30"
          >
            {enviando ? "Guardando…" : "Justificar"}
          </button>
        </div>
      </div>
    </div>
  );
}
