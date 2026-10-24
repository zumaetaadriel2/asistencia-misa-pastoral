"use client";

import { useState } from "react";
import { Boton, claseInput } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";

const MAXIMO = 300;

interface Props {
  alumno: string;
  /** "sáb 17 oct · Catequesis" */
  sesion: string;
  /** Si ya estaba justificada: su motivo, y aparece "Quitar justificación" */
  motivoActual?: string;
  onCerrar: () => void;
  onJustificar: (motivo: string) => void;
  onQuitar?: () => void;
}

/** Motivo de una falta justificada en catequesis; lo ve el alumno */
export function ModalMotivo({ alumno, sesion, motivoActual, onCerrar, onJustificar, onQuitar }: Props) {
  const [motivo, setMotivo] = useState(motivoActual ?? "");

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (motivo.trim()) onJustificar(motivo.trim());
  };

  return (
    <Modal titulo="Justificar" onCerrar={onCerrar}>
      <p className="mt-1 text-sm text-texto-suave">
        {alumno} · {sesion}
      </p>

      <form onSubmit={confirmar} className="mt-4">
        <label htmlFor="motivo-catequesis" className="block text-sm font-medium text-texto-suave mb-1.5">
          Motivo <span className="text-info">*</span>
        </label>
        <textarea
          id="motivo-catequesis"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej.: Estuvo enfermo, avisó su familia."
          rows={3}
          maxLength={MAXIMO}
          required
          data-autofocus
          aria-describedby="motivo-catequesis-ayuda"
          className={`${claseInput} resize-none`}
        />
        <p id="motivo-catequesis-ayuda" className="mt-1 text-xs text-texto-tenue">
          El alumno verá este motivo. Una falta justificada no cuenta en contra.
        </p>

        <div className="flex gap-3 mt-5">
          <Boton variante="secundario" onClick={onCerrar} className="flex-1">
            Cancelar
          </Boton>
          <Boton type="submit" disabled={!motivo.trim()} className="flex-[2]">
            {motivoActual ? "Guardar motivo" : "Justificar"}
          </Boton>
        </div>
        {onQuitar && (
          <Boton variante="fantasma" onClick={onQuitar} className="w-full mt-2">
            Quitar justificación
          </Boton>
        )}
      </form>
    </Modal>
  );
}
