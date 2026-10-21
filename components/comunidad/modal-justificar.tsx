"use client";

import { useState } from "react";
import { Boton, claseInput } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";

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

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) return;
    setEnviando(true);
    await onConfirmar(motivo.trim());
    setEnviando(false);
  };

  return (
    <Modal titulo="Justificar falta" onCerrar={onCerrar} bloqueado={enviando}>
      <p className="mt-1 text-sm text-texto-suave">
        {alumno} · Semana {semana}
      </p>

      <form onSubmit={confirmar} className="mt-4">
        <label htmlFor="motivo-justificacion" className="block text-sm font-medium text-texto-suave mb-1.5">
          Motivo <span className="text-info">*</span>
        </label>
        <textarea
          id="motivo-justificacion"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej.: Estuvo enfermo, avisó su familia."
          rows={3}
          required
          data-autofocus
          aria-describedby="motivo-justificacion-ayuda"
          className={`${claseInput} resize-none`}
        />
        <p id="motivo-justificacion-ayuda" className="mt-1 text-xs text-texto-tenue">
          El alumno verá este motivo en su historial. La semana no cuenta como falta.
        </p>

        <div className="flex gap-3 mt-5">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando} className="flex-1">
            Cancelar
          </Boton>
          <Boton type="submit" disabled={!motivo.trim() || enviando} className="flex-[2]">
            {enviando ? "Guardando…" : "Justificar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
