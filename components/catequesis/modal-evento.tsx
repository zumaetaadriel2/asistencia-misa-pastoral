"use client";

import { useState } from "react";
import type { ComunidadStaff } from "@/lib/staff/comunidad";
import { mensajeDe } from "@/lib/staff/errores";
import type { Programa } from "@/lib/staff/revision";
import { hoyEnLima } from "@/lib/utils/timeHelpers";
import { Boton, Campo, claseInput } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";
import { SUGERENCIAS_TITULO } from "./modal-sesion";

const GRUPOS: { programa: Programa; titulo: string }[] = [
  { programa: "confirmacion", titulo: "Confirmación" },
  { programa: "primera_comunion", titulo: "Primera Comunión" },
];

interface Props {
  comunidades: ComunidadStaff[];
  onCerrar: () => void;
  /** Lanza el error de la RPC para mostrarlo aquí mismo */
  onCrear: (comunidades: number[], fecha: string, titulo: string) => Promise<void>;
}

/** Solo admin: la misma sesión (un retiro, una jornada) en varias comunidades a la vez */
export function ModalEvento({ comunidades, onCerrar, onCrear }: Props) {
  const hoy = hoyEnLima();
  const [elegidas, setElegidas] = useState<Set<number>>(() => new Set(comunidades.map((c) => c.id)));
  const [fecha, setFecha] = useState(hoy);
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const alternar = (id: number) =>
    setElegidas((prev) => {
      const nuevas = new Set(prev);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });

  const elegirGrupo = (programa: Programa, marcar: boolean) =>
    setElegidas((prev) => {
      const nuevas = new Set(prev);
      for (const c of comunidades) {
        if (c.programa !== programa) continue;
        if (marcar) nuevas.add(c.id);
        else nuevas.delete(c.id);
      }
      return nuevas;
    });

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (elegidas.size === 0 || !fecha || !nombre.trim()) return;
    setEnviando(true);
    setError("");
    try {
      await onCrear([...elegidas], fecha, nombre.trim());
    } catch (err) {
      setError(mensajeDe(err, "No se pudo crear el evento."));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Nuevo evento para varias comunidades" onCerrar={onCerrar} bloqueado={enviando} tamano="md">
      <p className="mt-1 text-sm text-texto-suave">
        Se crea una sesión en cada comunidad elegida, y cada guía o catequista pasa lista a los suyos.
      </p>

      <form onSubmit={crear} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Campo etiqueta="Nombre">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              list="sugerencias-evento"
              placeholder="Ej.: Retiro"
              maxLength={80}
              required
              data-autofocus
              className={claseInput}
            />
            <datalist id="sugerencias-evento">
              {SUGERENCIAS_TITULO.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Campo>
        </div>

        {GRUPOS.map(({ programa, titulo }) => {
          const delGrupo = comunidades.filter((c) => c.programa === programa);
          if (delGrupo.length === 0) return null;
          const todas = delGrupo.every((c) => elegidas.has(c.id));
          return (
            <div key={programa} role="group" aria-label={titulo}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-texto-suave">{titulo}</p>
                <Boton variante="fantasma" tamano="pequeno" onClick={() => elegirGrupo(programa, !todas)}>
                  {todas ? "Quitar todas" : "Elegir todas"}
                </Boton>
              </div>
              <ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {delGrupo.map((c) => (
                  <li key={c.id}>
                    <label className="min-h-11 px-2 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-superficie-2">
                      <input
                        type="checkbox"
                        checked={elegidas.has(c.id)}
                        onChange={() => alternar(c.id)}
                        className="w-5 h-5 accent-marca-solido"
                      />
                      <span className="text-sm text-texto">{c.nombre}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Boton variante="secundario" onClick={onCerrar} disabled={enviando} className="flex-1">
            Cancelar
          </Boton>
          <Boton
            type="submit"
            disabled={elegidas.size === 0 || !fecha || !nombre.trim() || enviando}
            className="flex-[2]"
          >
            {enviando
              ? "Creando…"
              : `Crear en ${elegidas.size} ${elegidas.size === 1 ? "comunidad" : "comunidades"}`}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
