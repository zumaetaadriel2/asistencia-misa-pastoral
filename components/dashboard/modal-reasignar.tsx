"use client";

import { useEffect, useState } from "react";
import { Boton, Campo, claseInput } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";
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
    <Modal titulo="Cambiar alumno" onCerrar={onCerrar} bloqueado={enviando}>
      <p className="mt-1 mb-4 text-sm text-texto-suave">
        La foto está a nombre de {item.alumno}. Elige a quién corresponde realmente.
      </p>

      <Campo etiqueta="Alumno de la foto">
        <select
          value={destino ?? ""}
          onChange={(e) => setDestino(e.target.value ? Number(e.target.value) : null)}
          disabled={!alumnos || enviando}
          data-autofocus
          className={`${claseInput} cursor-pointer`}
        >
          <option value="">{alumnos ? "Elige un alumno…" : "Cargando alumnos…"}</option>
          {alumnos?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre_completo}
            </option>
          ))}
        </select>
      </Campo>

      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex gap-3 mt-5">
        <Boton variante="secundario" onClick={onCerrar} disabled={enviando} className="flex-1">
          Cancelar
        </Boton>
        <Boton onClick={confirmar} disabled={!destino || enviando} className="flex-[2]">
          {enviando ? "Cambiando…" : "Cambiar"}
        </Boton>
      </div>
    </Modal>
  );
}
