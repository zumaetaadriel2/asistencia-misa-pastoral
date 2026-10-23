"use client";

import { useState } from "react";
import { mensajeDe } from "@/lib/staff/errores";
import { hoyEnLima } from "@/lib/utils/timeHelpers";
import { Boton, Campo, claseInput } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";

/** Nombres habituales que aparecen como sugerencia al escribir */
export const SUGERENCIAS_TITULO = ["Catequesis", "Retiro", "Convivencia", "Jornada", "Misa de la comunidad"];

interface Props {
  titulo: string;
  /** Texto bajo el título del modal (p. ej. la comunidad) */
  detalle?: string;
  inicial?: { fecha: string; titulo: string };
  textoGuardar: string;
  ayuda?: string;
  onCerrar: () => void;
  /** Lanza el error de la RPC para mostrarlo aquí mismo */
  onGuardar: (fecha: string, titulo: string) => Promise<void>;
}

/** Fecha y nombre de una sesión de catequesis (para crearla o corregirla) */
export function ModalSesion({ titulo, detalle, inicial, textoGuardar, ayuda, onCerrar, onGuardar }: Props) {
  const hoy = hoyEnLima();
  const [fecha, setFecha] = useState(inicial?.fecha ?? hoy);
  const [nombre, setNombre] = useState(inicial?.titulo ?? "Catequesis");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !nombre.trim()) return;
    setEnviando(true);
    setError("");
    try {
      await onGuardar(fecha, nombre.trim());
    } catch (err) {
      setError(mensajeDe(err, "No se pudo guardar la sesión.", { duplicado: "Ya hay una sesión con ese nombre en esa fecha." }));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={titulo} onCerrar={onCerrar} bloqueado={enviando}>
      {detalle && <p className="mt-1 text-sm text-texto-suave">{detalle}</p>}

      <form onSubmit={guardar} className="mt-4 space-y-4">
        <Campo etiqueta="Fecha">
          <input
            type="date"
            value={fecha}
            max={hoy}
            onChange={(e) => setFecha(e.target.value)}
            required
            className={claseInput}
          />
        </Campo>
        <Campo etiqueta="Nombre" ayuda={ayuda}>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            list="sugerencias-sesion"
            maxLength={80}
            required
            data-autofocus
            className={claseInput}
          />
          <datalist id="sugerencias-sesion">
            {SUGERENCIAS_TITULO.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Campo>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando} className="flex-1">
            Cancelar
          </Boton>
          <Boton type="submit" disabled={!fecha || !nombre.trim() || enviando} className="flex-[2]">
            {enviando ? "Guardando…" : textoGuardar}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
