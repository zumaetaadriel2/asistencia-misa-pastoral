"use client";

import { useEffect, useState } from "react";
import { coincide } from "@/lib/staff/busqueda";
import {
  darDeAltaDesdePastoral,
  detalleCatequista,
  listarCatequistasPastoral,
  type CatequistaPastoral,
} from "@/lib/staff/pastoral-digital";
import type { RolStaff } from "@/lib/staff/revision";
import { Boton, Buscador, Cargando, Mensaje } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";
import { Modal } from "@/components/ui/modal";

interface Props {
  onCerrar: () => void;
  /** Avisa a la sección Staff para que recargue y muestre el resultado */
  onDadoDeAlta: (texto: string) => void;
}

/**
 * Dar de alta al staff eligiéndolo de la lista de catequistas de Pastoral Digital (sin logística).
 * No hay autoaprovisionamiento: solo entra a la app quien se da de alta aquí.
 */
export function ModalAltaPastoral({ onCerrar, onDadoDeAlta }: Props) {
  // undefined mientras carga
  const [lista, setLista] = useState<CatequistaPastoral[] | undefined>(undefined);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [roles, setRoles] = useState<Record<string, RolStaff>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const { confirmar, dialogoConfirmar } = useConfirmar();

  useEffect(() => {
    let cancelado = false;
    listarCatequistasPastoral()
      .then((catequistas) => {
        if (!cancelado) setLista(catequistas);
      })
      .catch((e: Error) => {
        if (!cancelado) setError(e.message);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const darDeAlta = async (persona: CatequistaPastoral) => {
    const rol = roles[persona.id] ?? "guia";
    if (rol === "admin") {
      const seguro = await confirmar({
        titulo: `¿Dar de alta a ${persona.nombre} como administrador?`,
        mensaje: "Verá todas las comunidades y podrá cambiar ciclos, comunidades, staff y alumnos.",
        aceptar: "Dar de alta como administrador",
        peligro: true,
      });
      if (!seguro) return;
    }
    setOcupado(persona.id);
    setError("");
    try {
      const resultado = await darDeAltaDesdePastoral(persona.id, rol);
      setLista((prev) => prev?.map((c) => (c.id === persona.id ? { ...c, registrado: true, mismo_correo: false } : c)));
      onDadoDeAlta(
        resultado.vinculado
          ? `${resultado.nombre} ya estaba en el staff con ${resultado.email}: quedó vinculado a su Pastoral Digital ID, con el mismo rol.`
          : `${resultado.nombre} ya puede entrar con Pastoral Digital ID (${resultado.email}).` +
              (rol === "admin" ? "" : " Asígnale sus comunidades en la lista del staff.")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo dar de alta.");
    } finally {
      setOcupado(null);
    }
  };

  const visibles = (lista ?? []).filter((c) => coincide(busqueda, c.nombre, c.email));
  const pendientes = (lista ?? []).filter((c) => !c.registrado).length;

  return (
    <Modal titulo="Agregar desde Pastoral Digital" onCerrar={onCerrar} bloqueado={ocupado !== null} tamano="md">
      <p className="text-sm text-texto-suave">
        Elige a quién dar de alta y con qué rol. Entrará con su cuenta de Pastoral Digital ID. Los de logística no aparecen.
      </p>
      {error && (
        <div className="mt-3">
          <Mensaje mensaje={{ tipo: "error", texto: error }} />
        </div>
      )}

      {lista === undefined && !error && <Cargando />}

      {lista && (
        <>
          <div className="mt-3">
            <Buscador valor={busqueda} onCambiar={setBusqueda} etiqueta="Buscar por nombre o correo" />
          </div>
          <p className="mt-2 text-xs text-texto-tenue">
            {lista.length} en Pastoral Digital · {pendientes} sin dar de alta
          </p>
          {visibles.length === 0 && (
            <p className="mt-3 text-sm text-texto-tenue">
              {busqueda ? `Nadie coincide con «${busqueda}».` : "No hay catequistas para mostrar."}
            </p>
          )}
          <ul className="mt-2 divide-y divide-borde max-h-[60vh] overflow-y-auto">
            {visibles.map((persona) => (
              <li key={persona.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-texto break-words">{persona.nombre}</p>
                  <p className="text-xs text-texto-tenue break-all">{persona.email}</p>
                  <p className="text-xs text-texto-suave">{detalleCatequista(persona)}</p>
                  {persona.mismo_correo && (
                    <p className="text-xs text-info">Ya está en el staff con este correo: se vinculará, con su rol de siempre.</p>
                  )}
                </div>
                {persona.registrado ? (
                  <span className="text-xs font-medium text-exito">✓ Dado de alta</span>
                ) : (
                  <div className="flex gap-2">
                    {!persona.mismo_correo && (
                      <select
                        value={roles[persona.id] ?? "guia"}
                        onChange={(e) => setRoles((prev) => ({ ...prev, [persona.id]: e.target.value as RolStaff }))}
                        aria-label={`Rol de ${persona.nombre}`}
                        disabled={ocupado !== null}
                        className="min-h-11 px-3 rounded-lg bg-superficie-2 border border-borde text-texto text-sm cursor-pointer disabled:opacity-40"
                      >
                        <option value="guia">Guía o catequista</option>
                        <option value="admin">Administrador</option>
                      </select>
                    )}
                    <Boton tamano="pequeno" onClick={() => darDeAlta(persona)} disabled={ocupado !== null}>
                      {ocupado === persona.id ? "Dando de alta…" : persona.mismo_correo ? "Vincular" : "Dar de alta"}
                    </Boton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {dialogoConfirmar}
    </Modal>
  );
}
