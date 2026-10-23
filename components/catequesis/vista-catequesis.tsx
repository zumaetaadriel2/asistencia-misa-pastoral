"use client";

import { useEffect, useState } from "react";
import { crearEvento, crearSesion, sesionesDeComunidad, type SesionCatequesis } from "@/lib/staff/catequesis";
import { obtenerComunidadesVisibles, type ComunidadStaff } from "@/lib/staff/comunidad";
import { mensajeDe } from "@/lib/staff/errores";
import type { PerfilStaff } from "@/lib/staff/revision";
import { ESTADOS_CATEQUESIS } from "@/lib/ui/estados";
import { formatearFecha } from "@/lib/utils/timeHelpers";
import { Boton, Cargando, claseInput } from "@/components/ui/base";
import { ModalEvento } from "./modal-evento";
import { ModalSesion } from "./modal-sesion";
import { PasarLista } from "./pasar-lista";
import { ResumenCatequesis } from "./resumen-catequesis";

const NOMBRE_PROGRAMA = { confirmacion: "Confirmación", primera_comunion: "Primera Comunión" } as const;

const PESTANAS = [
  { id: "sesiones", texto: "Pasar lista" },
  { id: "resumen", texto: "Resumen" },
] as const;

type Pestana = (typeof PESTANAS)[number]["id"];

/** Catequesis de una comunidad: sus sesiones, pasar lista y el resumen */
export function VistaCatequesis({ perfil }: { perfil: PerfilStaff }) {
  const esAdmin = perfil.rol === "admin";
  const [comunidades, setComunidades] = useState<ComunidadStaff[] | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [pestana, setPestana] = useState<Pestana>("sesiones");
  const [abierta, setAbierta] = useState<number | null>(null);
  const [datos, setDatos] = useState<{ comunidadId: number; sesiones: SesionCatequesis[] } | null>(null);
  const [creando, setCreando] = useState(false);
  const [creandoEvento, setCreandoEvento] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const comunidadId = elegida ?? comunidades?.[0]?.id ?? null;
  const comunidad = comunidades?.find((c) => c.id === comunidadId) ?? null;
  const nombreComunidad = comunidad ? `${comunidad.nombre} · ${NOMBRE_PROGRAMA[comunidad.programa]}` : "";

  useEffect(() => {
    let cancelado = false;
    obtenerComunidadesVisibles()
      .then((lista) => {
        if (!cancelado) setComunidades(lista);
      })
      .catch((e) => {
        if (cancelado) return;
        setError(mensajeDe(e, "No se pudieron cargar tus comunidades."));
        setComunidades([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!comunidadId) return;
    let cancelado = false;
    sesionesDeComunidad(comunidadId)
      .then((sesiones) => {
        if (!cancelado) setDatos({ comunidadId, sesiones });
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDe(e, "No se pudieron cargar las sesiones."));
      });
    return () => {
      cancelado = true;
    };
  }, [comunidadId]);

  const recargar = async () => {
    if (!comunidadId) return;
    setDatos({ comunidadId, sesiones: await sesionesDeComunidad(comunidadId) });
  };

  const cambiarComunidad = (id: number) => {
    setElegida(id);
    setAbierta(null);
    setError("");
    setAviso("");
  };

  const volverALaLista = () => {
    setAbierta(null);
    recargar().catch((e) => setError(mensajeDe(e, "No se pudieron cargar las sesiones.")));
  };

  if (comunidades === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Cargando />
      </div>
    );
  }

  if (!comunidad) {
    return (
      <p className="text-sm text-texto-tenue text-center py-12">
        {error || "No tienes comunidades asignadas en el ciclo activo. Pide a un administrador que te asigne una."}
      </p>
    );
  }

  const sesiones = datos?.comunidadId === comunidad.id ? datos.sesiones : null;
  const sesionAbierta = sesiones?.find((s) => s.id === abierta) ?? null;

  if (sesionAbierta) {
    return (
      <PasarLista
        key={sesionAbierta.id}
        sesion={sesionAbierta}
        comunidad={nombreComunidad}
        puedeBorrar={esAdmin || sesionAbierta.creada_por === perfil.id}
        onVolver={volverALaLista}
        onEditada={recargar}
        onBorrada={() => {
          setAviso(`Se borró «${sesionAbierta.titulo}» del ${formatearFecha(sesionAbierta.fecha)}.`);
          volverALaLista();
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* ── Comunidad ── */}
      {comunidades.length > 1 ? (
        <select
          value={comunidad.id}
          onChange={(e) => cambiarComunidad(Number(e.target.value))}
          aria-label="Comunidad"
          className={`${claseInput} cursor-pointer`}
        >
          {comunidades.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} · {NOMBRE_PROGRAMA[c.programa]}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-sm text-texto-suave">{nombreComunidad}</p>
      )}

      {/* ── Pestañas (← → para cambiar) ── */}
      <div
        role="tablist"
        aria-label="Catequesis"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const otra = pestana === "sesiones" ? "resumen" : "sesiones";
          setPestana(otra);
          document.getElementById(`pestana-${otra}`)?.focus();
        }}
        className="flex gap-1.5"
      >
        {PESTANAS.map((p) => {
          const elegida = pestana === p.id;
          return (
            <button
              key={p.id}
              id={`pestana-${p.id}`}
              role="tab"
              aria-selected={elegida}
              aria-controls="panel-catequesis"
              tabIndex={elegida ? 0 : -1}
              onClick={() => setPestana(p.id)}
              className={`min-h-11 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                elegida ? "bg-marca-solido text-white" : "bg-superficie-2 text-texto-suave hover:text-texto"
              }`}
            >
              {p.texto}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="pl-3 pr-1 py-1 rounded-xl bg-error/10 border border-error/25 flex items-center justify-between gap-2"
        >
          <p className="text-sm text-error">{error}</p>
          <button onClick={() => setError("")} className="min-h-11 px-3 text-error text-sm font-medium hover:underline">
            Cerrar
          </button>
        </div>
      )}
      {aviso && (
        <div
          role="status"
          className="pl-3 pr-1 py-1 rounded-xl bg-exito/10 border border-exito/25 flex items-center justify-between gap-2"
        >
          <p className="text-sm text-exito">{aviso}</p>
          <button onClick={() => setAviso("")} className="min-h-11 px-3 text-exito text-sm font-medium hover:underline">
            Cerrar
          </button>
        </div>
      )}

      <div role="tabpanel" id="panel-catequesis" aria-labelledby={`pestana-${pestana}`} className="flex flex-col gap-4">
        {!sesiones ? (
          <Cargando />
        ) : pestana === "resumen" ? (
          <ResumenCatequesis
            comunidadId={comunidad.id}
            comunidad={comunidad.nombre}
            sesiones={sesiones}
            onAbrir={setAbierta}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-2">
              <Boton onClick={() => setCreando(true)} className="sm:flex-1">
                Nueva sesión
              </Boton>
              {esAdmin && (
                <Boton variante="secundario" onClick={() => setCreandoEvento(true)} className="sm:flex-1">
                  Evento en varias comunidades
                </Boton>
              )}
            </div>

            {sesiones.length === 0 ? (
              <p className="text-sm text-texto-tenue text-center py-10">
                Todavía no hay sesiones. Crea la de hoy para pasar lista.
              </p>
            ) : (
              <ul className="space-y-2">
                {sesiones.map((sesion) => {
                  const marcadas = sesion.presentes + sesion.tardanzas + sesion.faltas + sesion.justificadas;
                  const sinMarcar = Math.max(0, sesion.alumnos_activos - marcadas);
                  const conteos = [
                    ["presente", sesion.presentes],
                    ["tardanza", sesion.tardanzas],
                    ["falta", sesion.faltas],
                    ["justificada", sesion.justificadas],
                  ] as const;
                  return (
                    <li key={sesion.id}>
                      <button
                        onClick={() => setAbierta(sesion.id)}
                        className="tarjeta w-full p-4 text-left transition-colors hover:border-marca/40
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca/50"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-texto break-words">{sesion.titulo}</span>
                            <span className="block text-xs text-texto-suave">{formatearFecha(sesion.fecha)}</span>
                          </span>
                          <span className={`shrink-0 text-xs font-medium ${sinMarcar > 0 ? "text-aviso" : "text-exito"}`}>
                            {sinMarcar > 0 ? `${sinMarcar} sin marcar` : "✓ Completa"}
                          </span>
                        </span>
                        <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-texto-suave">
                          {conteos.map(([estado, cantidad]) => (
                            <span key={estado} className="inline-flex items-center gap-1">
                              <span
                                aria-hidden="true"
                                className={`inline-flex w-5 h-5 rounded border items-center justify-center text-[11px] font-bold ${ESTADOS_CATEQUESIS[estado].clases}`}
                              >
                                {ESTADOS_CATEQUESIS[estado].simbolo}
                              </span>
                              <span>
                                <span className="sr-only">{ESTADOS_CATEQUESIS[estado].texto}: </span>
                                {cantidad}
                              </span>
                            </span>
                          ))}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {creando && (
        <ModalSesion
          titulo="Nueva sesión"
          detalle={nombreComunidad}
          textoGuardar="Crear y pasar lista"
          ayuda="Si ya hay una sesión con esa fecha y nombre, se abre esa."
          onCerrar={() => setCreando(false)}
          onGuardar={async (fecha, titulo) => {
            const id = await crearSesion(comunidad.id, fecha, titulo);
            await recargar();
            setCreando(false);
            setAviso("");
            setAbierta(id);
          }}
        />
      )}
      {creandoEvento && (
        <ModalEvento
          comunidades={comunidades}
          onCerrar={() => setCreandoEvento(false)}
          onCrear={async (elegidas, fecha, titulo) => {
            const creadas = await crearEvento(elegidas, fecha, titulo);
            await recargar();
            setCreandoEvento(false);
            const yaTenian = elegidas.length - creadas;
            setAviso(
              `Se creó «${titulo}» en ${creadas} ${creadas === 1 ? "comunidad" : "comunidades"}` +
                (yaTenian > 0 ? ` (${yaTenian} ya la tenían).` : ".")
            );
          }}
        />
      )}
    </div>
  );
}
