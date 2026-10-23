"use client";

import { useEffect, useRef, useState } from "react";
import {
  borrarSesion,
  editarSesion,
  listaDeSesion,
  marcar,
  marcarTodosPresentes,
  type AlumnoEnLista,
  type EstadoCatequesis,
  type SesionCatequesis,
} from "@/lib/staff/catequesis";
import { coincide } from "@/lib/staff/busqueda";
import { mensajeDe } from "@/lib/staff/errores";
import { ESTADOS_CATEQUESIS } from "@/lib/ui/estados";
import { formatearFecha } from "@/lib/utils/timeHelpers";
import { Boton, Buscador, Cargando } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";
import { ModalMotivo } from "./modal-motivo";
import { ModalSesion } from "./modal-sesion";

const OPCIONES: EstadoCatequesis[] = ["presente", "tardanza", "falta", "justificada"];

/** Marca que se está guardando (o que falló) y se muestra mientras tanto en lugar de la guardada */
interface Pendiente {
  estado: EstadoCatequesis | null;
  motivo: string | null;
  fase: "guardando" | "error";
}

interface Props {
  sesion: SesionCatequesis;
  /** "San Pablo · Confirmación" */
  comunidad: string;
  /** Quien la creó o un admin */
  puedeBorrar: boolean;
  onVolver: () => void;
  /** Tras editar la fecha o el nombre: recargar las sesiones */
  onEditada: () => Promise<void>;
  onBorrada: () => void;
}

/**
 * Lista de una sesión: cada toque se guarda al instante. Volver a tocar la marca elegida
 * la borra; la J pide el motivo. Las marcas se pueden cambiar en cualquier momento.
 */
export function PasarLista({ sesion, comunidad, puedeBorrar, onVolver, onEditada, onBorrada }: Props) {
  const [datos, setDatos] = useState<{ sesionId: number; alumnos: AlumnoEnLista[] } | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [pendientes, setPendientes] = useState<Record<number, Pendiente>>({});
  const [huboCambios, setHuboCambios] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [justificando, setJustificando] = useState<AlumnoEnLista | null>(null);
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const { confirmar, dialogoConfirmar } = useConfirmar();

  // Las marcas de un mismo alumno se envían en orden: si toca P y luego F, la última gana.
  // `versiones` descarta las respuestas viejas.
  const colas = useRef(new Map<number, Promise<unknown>>());
  const versiones = useRef(new Map<number, number>());

  useEffect(() => {
    let cancelado = false;
    listaDeSesion(sesion.id)
      .then((alumnos) => {
        if (!cancelado) setDatos({ sesionId: sesion.id, alumnos });
      })
      .catch((e) => {
        if (!cancelado) setErrorCarga(mensajeDe(e, "No se pudo cargar la lista."));
      });
    return () => {
      cancelado = true;
    };
  }, [sesion.id]);

  const hayPendientes = Object.keys(pendientes).length > 0;

  // Avisa antes de cerrar la pestaña con marcas sin guardar
  useEffect(() => {
    if (!hayPendientes) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [hayPendientes]);

  const alumnos = datos?.sesionId === sesion.id ? datos.alumnos : null;
  const nombreSesion = `${formatearFecha(sesion.fecha)} · ${sesion.titulo}`;

  const visible = (alumno: AlumnoEnLista) => {
    const pendiente = pendientes[alumno.alumno_id];
    return pendiente ? { estado: pendiente.estado, motivo: pendiente.motivo, fase: pendiente.fase } : { ...alumno, fase: null };
  };

  const guardar = (alumnoId: number, estado: EstadoCatequesis | null, motivo: string | null) => {
    const version = (versiones.current.get(alumnoId) ?? 0) + 1;
    versiones.current.set(alumnoId, version);
    setHuboCambios(true);
    setPendientes((prev) => ({ ...prev, [alumnoId]: { estado, motivo, fase: "guardando" } }));

    const anterior = colas.current.get(alumnoId) ?? Promise.resolve();
    const actual = anterior
      .catch(() => undefined)
      .then(() => marcar(sesion.id, alumnoId, estado, motivo ?? undefined));
    colas.current.set(alumnoId, actual);

    actual.then(
      () => {
        if (versiones.current.get(alumnoId) !== version) return;
        setDatos(
          (prev) =>
            prev && {
              ...prev,
              alumnos: prev.alumnos.map((a) => (a.alumno_id === alumnoId ? { ...a, estado, motivo } : a)),
            }
        );
        setPendientes((prev) => {
          const resto = { ...prev };
          delete resto[alumnoId];
          return resto;
        });
      },
      () => {
        if (versiones.current.get(alumnoId) !== version) return;
        setPendientes((prev) => ({ ...prev, [alumnoId]: { estado, motivo, fase: "error" } }));
      }
    );
  };

  const tocar = (alumno: AlumnoEnLista, opcion: EstadoCatequesis) => {
    if (opcion === "justificada") {
      setJustificando(alumno);
      return;
    }
    guardar(alumno.alumno_id, visible(alumno).estado === opcion ? null : opcion, null);
  };

  const marcarTodos = async (sinMarcar: number) => {
    const seguro = await confirmar({
      titulo: sinMarcar === 1 ? "¿Marcar presente al que no tiene marca?" : `¿Marcar presentes a los ${sinMarcar} sin marca?`,
      mensaje: "Solo a quienes aún no tienen marca. Después puedes cambiar a cualquiera.",
      aceptar: "Marcar presentes",
    });
    if (!seguro) return;
    setOcupado(true);
    setError("");
    try {
      const marcados = await marcarTodosPresentes(sesion.id);
      setDatos({ sesionId: sesion.id, alumnos: await listaDeSesion(sesion.id) });
      setHuboCambios(true);
      setAviso(`${marcados} ${marcados === 1 ? "marcado como presente" : "marcados como presentes"}.`);
    } catch (e) {
      setError(mensajeDe(e, "No se pudo marcar a todos."));
    } finally {
      setOcupado(false);
    }
  };

  const volver = async () => {
    if (hayPendientes) {
      const salir = await confirmar({
        titulo: "Hay marcas sin guardar",
        mensaje: "Si sales ahora, puede que no se guarden. Espera a que terminen o toca «Reintentar».",
        aceptar: "Salir igual",
        peligro: true,
      });
      if (!salir) return;
    }
    onVolver();
  };

  const borrar = async () => {
    const marcadas = alumnos
      ? alumnos.filter((a) => visible(a).estado !== null).length
      : sesion.presentes + sesion.tardanzas + sesion.faltas + sesion.justificadas;
    const seguro = await confirmar({
      titulo: `¿Borrar «${sesion.titulo}» del ${formatearFecha(sesion.fecha)}?`,
      mensaje:
        marcadas > 0
          ? `Se borrarán también sus ${marcadas} ${marcadas === 1 ? "marca" : "marcas"}. No se puede deshacer.`
          : "No se puede deshacer.",
      aceptar: "Borrar sesión",
      peligro: true,
    });
    if (!seguro) return;
    setOcupado(true);
    try {
      await borrarSesion(sesion.id);
      onBorrada();
    } catch (e) {
      setError(mensajeDe(e, "No se pudo borrar la sesión."));
      setOcupado(false);
    }
  };

  const encabezado = (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <Boton variante="fantasma" tamano="pequeno" onClick={volver} className="-ml-3">
          ← Sesiones
        </Boton>
        <h2 className="mt-1 text-xl font-bold text-texto break-words">{sesion.titulo}</h2>
        <p className="text-sm text-texto-suave">
          {formatearFecha(sesion.fecha)} · {comunidad}
        </p>
      </div>
      <div className="flex gap-2">
        <Boton variante="secundario" tamano="pequeno" onClick={() => setEditando(true)} disabled={ocupado}>
          Editar
        </Boton>
        {puedeBorrar && (
          <Boton variante="fantasma" tamano="pequeno" onClick={borrar} disabled={ocupado}>
            Borrar
          </Boton>
        )}
      </div>
    </div>
  );

  const modales = (
    <>
      {editando && (
        <ModalSesion
          titulo="Editar sesión"
          detalle={comunidad}
          inicial={{ fecha: sesion.fecha, titulo: sesion.titulo }}
          textoGuardar="Guardar cambios"
          onCerrar={() => setEditando(false)}
          onGuardar={async (fecha, titulo) => {
            await editarSesion(sesion.id, fecha, titulo);
            await onEditada();
            setEditando(false);
          }}
        />
      )}
      {justificando && (
        <ModalMotivo
          alumno={justificando.nombre_completo}
          sesion={nombreSesion}
          motivoActual={visible(justificando).estado === "justificada" ? (visible(justificando).motivo ?? "") : undefined}
          onCerrar={() => setJustificando(null)}
          onJustificar={(motivo) => {
            guardar(justificando.alumno_id, "justificada", motivo);
            setJustificando(null);
          }}
          onQuitar={
            visible(justificando).estado === "justificada"
              ? () => {
                  guardar(justificando.alumno_id, null, null);
                  setJustificando(null);
                }
              : undefined
          }
        />
      )}
      {dialogoConfirmar}
    </>
  );

  if (!alumnos) {
    return (
      <div className="flex-1 flex flex-col gap-4">
        {encabezado}
        {errorCarga ? (
          <p role="alert" className="text-sm text-error text-center py-10">
            {errorCarga}
          </p>
        ) : (
          <Cargando />
        )}
        {modales}
      </div>
    );
  }

  const conteo = { presente: 0, tardanza: 0, falta: 0, justificada: 0 };
  for (const alumno of alumnos) {
    const { estado } = visible(alumno);
    if (estado) conteo[estado]++;
  }
  const marcados = conteo.presente + conteo.tardanza + conteo.falta + conteo.justificada;
  const sinMarcar = alumnos.length - marcados;
  const guardando = Object.values(pendientes).filter((p) => p.fase === "guardando").length;
  const conError = Object.values(pendientes).filter((p) => p.fase === "error").length;
  const filtrados = alumnos.filter((a) => coincide(busqueda, a.nombre_completo));

  return (
    <div className="flex-1 flex flex-col gap-4">
      {encabezado}

      {alumnos.length === 0 ? (
        <p className="text-sm text-texto-tenue text-center py-10">Esta comunidad todavía no tiene alumnos activos.</p>
      ) : (
        <>
          {/* ── Avance ── */}
          <div className="tarjeta p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-texto">
                {marcados} de {alumnos.length} marcados
              </p>
              <p aria-live="polite" className="text-xs text-texto-tenue">
                {conError > 0 ? (
                  <span className="text-error font-medium">
                    {conError} sin guardar
                  </span>
                ) : guardando > 0 ? (
                  "Guardando…"
                ) : huboCambios ? (
                  <span className="text-exito font-medium">✓ Todo guardado</span>
                ) : (
                  ""
                )}
              </p>
            </div>
            <div
              className="mt-2 h-2 rounded-full bg-superficie-2 overflow-hidden"
              role="progressbar"
              aria-label="Alumnos marcados"
              aria-valuemin={0}
              aria-valuemax={alumnos.length}
              aria-valuenow={marcados}
            >
              <div
                className="h-full rounded-full bg-marca-solido transition-all"
                style={{ width: `${(marcados / alumnos.length) * 100}%` }}
              />
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-suave" aria-label="Conteo">
              {OPCIONES.map((op) => (
                <li key={op} className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-flex w-6 h-6 rounded border items-center justify-center font-bold ${ESTADOS_CATEQUESIS[op].clases}`}
                  >
                    {ESTADOS_CATEQUESIS[op].simbolo}
                  </span>
                  {ESTADOS_CATEQUESIS[op].texto}: {conteo[op]}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          {aviso && (
            <p role="status" className="text-sm text-exito">
              {aviso}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Buscador valor={busqueda} onCambiar={setBusqueda} />
            </div>
            <Boton
              variante="exito"
              onClick={() => marcarTodos(sinMarcar)}
              disabled={sinMarcar === 0 || hayPendientes || ocupado}
              title={hayPendientes ? "Espera a que se guarden las marcas" : undefined}
            >
              {sinMarcar === 0 ? "Todos tienen marca" : `Marcar presentes (${sinMarcar} sin marca)`}
            </Boton>
          </div>

          {/* ── Lista ── */}
          {filtrados.length === 0 ? (
            <p className="text-sm text-texto-tenue text-center py-6">Ningún alumno coincide con «{busqueda}».</p>
          ) : (
            <ul className="tarjeta divide-y divide-borde">
              {filtrados.map((alumno) => {
                const { estado, motivo, fase } = visible(alumno);
                return (
                  <li key={alumno.alumno_id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-texto break-words">{alumno.nombre_completo}</p>
                      {estado === "justificada" && motivo && (
                        <button
                          onClick={() => setJustificando(alumno)}
                          className="mt-0.5 text-left text-xs text-info hover:underline break-words"
                        >
                          Motivo: {motivo}
                        </button>
                      )}
                      {fase === "guardando" && <p className="mt-0.5 text-xs text-texto-tenue">Guardando…</p>}
                      {fase === "error" && (
                        <p className="mt-0.5 text-xs text-error">
                          No se guardó.{" "}
                          <button
                            onClick={() => guardar(alumno.alumno_id, estado, motivo)}
                            className="min-h-8 font-semibold underline underline-offset-2"
                          >
                            Reintentar
                          </button>
                        </p>
                      )}
                    </div>
                    <div
                      role="group"
                      aria-label={`Asistencia de ${alumno.nombre_completo}`}
                      className="grid grid-cols-4 gap-2 sm:flex shrink-0"
                    >
                      {OPCIONES.map((opcion) => {
                        const info = ESTADOS_CATEQUESIS[opcion];
                        const activo = estado === opcion;
                        return (
                          <button
                            key={opcion}
                            onClick={() => tocar(alumno, opcion)}
                            aria-pressed={activo}
                            aria-label={info.texto}
                            title={activo && opcion !== "justificada" ? `${info.texto} (toca para quitar)` : info.texto}
                            className={`min-h-11 sm:w-11 rounded-lg border text-base font-bold transition-colors
                                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca/60 ${
                                          activo
                                            ? info.clasesActivo
                                            : "bg-superficie-2 border-borde text-texto-suave hover:bg-borde"
                                        }`}
                          >
                            {info.simbolo}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-xs text-texto-tenue">
            Cada toque se guarda al instante. Toca otra vez la marca elegida para quitarla. La tardanza cuenta como
            asistencia; la justificada no cuenta en contra.
          </p>
        </>
      )}

      {modales}
    </div>
  );
}
