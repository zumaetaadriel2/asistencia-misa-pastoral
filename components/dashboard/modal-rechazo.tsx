"use client";

import { useState } from "react";

interface Props {
  abierto: boolean;
  alumnoNombre: string;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => void;
}

/**
 * Modal flotante para ingresar el motivo de rechazo de una foto.
 * Se muestra cuando el guía/admin rechaza una asistencia.
 */
export function ModalRechazo({ abierto, alumnoNombre, onCerrar, onConfirmar }: Props) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!abierto) return null;

  const handleConfirmar = async () => {
    if (!motivo.trim()) return;
    setEnviando(true);
    await onConfirmar(motivo.trim());
    setMotivo("");
    setEnviando(false);
  };

  const handleCerrar = () => {
    if (enviando) return;
    setMotivo("");
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        style={{ animationDuration: "0.2s" }}
        onClick={handleCerrar}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm tarjeta p-6 animate-fade-in-scale" style={{ animationDuration: "0.25s" }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/25 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-texto">Rechazar foto</h3>
            <p className="text-xs text-texto-tenue">{alumnoNombre}</p>
          </div>
        </div>

        {/* Campo de motivo */}
        <label htmlFor="motivo-rechazo" className="block text-sm font-medium text-texto-suave mb-1.5">
          Motivo del rechazo <span className="text-error">*</span>
        </label>
        <textarea
          id="motivo-rechazo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: La foto está borrosa, no se puede verificar la asistencia…"
          rows={3}
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-superficie-2 border border-borde text-texto text-sm
                     placeholder:text-texto-tenue resize-none
                     focus:outline-none focus:ring-2 focus:ring-error/30 focus:border-error/25 transition-all"
        />
        <p className="mt-1 text-[10px] text-texto-tenue">
          Este mensaje se le mostrará al alumno.
        </p>

        {/* Botones */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={handleCerrar}
            disabled={enviando}
            className="flex-1 py-2.5 rounded-xl bg-superficie-2 hover:bg-borde text-texto-suave text-sm font-medium transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!motivo.trim() || enviando}
            className="flex-[2] py-2.5 rounded-xl bg-error-solido hover:bg-error-solido/85 text-white text-sm font-semibold transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Rechazando…
              </>
            ) : (
              "Confirmar rechazo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
