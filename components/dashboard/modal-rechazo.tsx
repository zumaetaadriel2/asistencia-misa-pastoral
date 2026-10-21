"use client";

import { useState } from "react";
import { Boton, claseInput } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";

interface Props {
  alumnoNombre: string;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => Promise<void>;
}

/**
 * Pide el motivo para rechazar una foto (el alumno lo verá en su historial).
 * Renderízalo solo mientras se está rechazando.
 */
export function ModalRechazo({ alumnoNombre, onCerrar, onConfirmar }: Props) {
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
    <Modal titulo="Rechazar foto" onCerrar={onCerrar} bloqueado={enviando}>
      <p className="mt-1 text-sm text-texto-suave">{alumnoNombre}</p>

      <form onSubmit={confirmar} className="mt-4">
        <label htmlFor="motivo-rechazo" className="block text-sm font-medium text-texto-suave mb-1.5">
          Motivo del rechazo <span className="text-error">*</span>
        </label>
        <textarea
          id="motivo-rechazo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej.: La foto está borrosa y no se ve que estés en la misa."
          rows={3}
          required
          data-autofocus
          aria-describedby="motivo-rechazo-ayuda"
          className={`${claseInput} resize-none`}
        />
        <p id="motivo-rechazo-ayuda" className="mt-1 text-xs text-texto-tenue">
          El alumno verá este motivo y podrá enviar otra foto hasta el miércoles.
        </p>

        <div className="flex gap-3 mt-5">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando} className="flex-1">
            Cancelar
          </Boton>
          <Boton type="submit" variante="peligro" disabled={!motivo.trim() || enviando} className="flex-[2]">
            {enviando ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Rechazando…
              </>
            ) : (
              "Confirmar rechazo"
            )}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
