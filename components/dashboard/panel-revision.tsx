"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  obtenerCola,
  obtenerResumen,
  reasignarAsistencia,
  revisarAsistencia,
  type ItemCola,
  type PerfilStaff,
} from "@/lib/staff/revision";
import { obtenerUrlsFotos } from "@/lib/staff/fotos";
import { avisoFechaExif, avisoParecida, type Aviso } from "@/lib/staff/avisos";
import { mensajeDe } from "@/lib/staff/errores";
import { Metricas } from "@/components/dashboard/metricas";
import { TarjetaRevision } from "@/components/dashboard/tarjeta-revision";
import { ModalRechazo } from "@/components/dashboard/modal-rechazo";
import { ModalReasignar } from "@/components/dashboard/modal-reasignar";
import { ModalResumen } from "@/components/dashboard/modal-resumen";
import { AvisosFoto } from "@/components/dashboard/avisos-foto";
import { ComparacionFotos, type FotoComparada } from "@/components/dashboard/comparacion-fotos";

// =============================================
// Tipos y constantes
// =============================================

/** Tiempo durante el que se ofrece deshacer la última revisión (la base permite 2 min) */
const TIEMPO_DESHACER_MS = 8000;

function avisosDe(item: ItemCola): Aviso[] {
  const parecida = avisoParecida(item);
  return [...(parecida ? [parecida] : []), avisoFechaExif(item.fecha_exif, item.domingo)];
}

function fotosParaComparar(item: ItemCola, urls: Map<number, string>): FotoComparada[] {
  const fotos: FotoComparada[] = [];
  if (item.anterior_envio_id) {
    fotos.push({
      envioId: item.anterior_envio_id,
      etiqueta: `Su foto anterior (semana ${item.anterior_semana})`,
      url: urls.get(item.anterior_envio_id),
    });
  }
  if (item.similar_envio_id && item.similar_envio_id !== item.anterior_envio_id) {
    fotos.push({
      envioId: item.similar_envio_id,
      etiqueta: `Parecida: ${item.similar_alumno} (semana ${item.similar_semana})`,
      url: urls.get(item.similar_envio_id),
    });
  }
  return fotos;
}

// =============================================
// Componente principal
// =============================================

/** Cola de revisión del staff (la sesión y el menú los maneja MarcoStaff) */
export function PanelRevision({ perfil }: { perfil: PerfilStaff }) {
  const [cola, setCola] = useState<ItemCola[] | null>(null);
  const [validadas, setValidadas] = useState<number | null>(null);
  const [filtroComunidad, setFiltroComunidad] = useState<number | null>(null);
  const [urls, setUrls] = useState<Map<number, string>>(new Map());

  const [rechazando, setRechazando] = useState<ItemCola | null>(null);
  const [reasignando, setReasignando] = useState<ItemCola | null>(null);
  const [verResumen, setVerResumen] = useState(false);
  const [ultimaRevision, setUltimaRevision] = useState<{
    item: ItemCola;
    accion: "validado" | "rechazado";
  } | null>(null);
  const [error, setError] = useState("");

  // --- Datos iniciales ---
  useEffect(() => {
    let cancelado = false;
    Promise.all([
      obtenerCola(),
      perfil.semana_reciente ? obtenerResumen(perfil.semana_reciente) : Promise.resolve([]),
    ])
      .then(([colaInicial, resumen]) => {
        if (cancelado) return;
        setCola(colaInicial);
        setValidadas(resumen.filter((fila) => fila.estado === "validado").length);
      })
      .catch((e) => {
        if (cancelado) return;
        setError(mensajeDe(e, "No se pudo cargar la cola."));
        setCola([]);
      });
    return () => {
      cancelado = true;
    };
  }, [perfil.semana_reciente]);

  // --- Cola filtrada y foto actual ---
  const comunidades = useMemo(
    () => [...new Map((cola ?? []).map((item) => [item.comunidad_id, item.comunidad])).entries()],
    [cola]
  );
  const visibles = useMemo(
    () => (cola ?? []).filter((item) => filtroComunidad === null || item.comunidad_id === filtroComunidad),
    [cola, filtroComunidad]
  );
  const actual = visibles[0] ?? null;
  const siguiente = visibles[1] ?? null;

  // URLs firmadas de la foto actual, sus comparaciones y la siguiente (para que cargue rápido)
  useEffect(() => {
    if (!actual) return;
    const ids = [actual.envio_id, actual.anterior_envio_id, actual.similar_envio_id, siguiente?.envio_id].filter(
      (id): id is number => id != null
    );

    let cancelado = false;
    obtenerUrlsFotos(ids)
      .then((nuevas) => {
        if (!cancelado) setUrls(nuevas);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudieron cargar las fotos. Revisa tu conexión.");
      });
    return () => {
      cancelado = true;
    };
  }, [actual, siguiente]);

  // Ocultar "Deshacer" pasado el tiempo límite
  useEffect(() => {
    if (!ultimaRevision) return;
    const timer = setTimeout(() => setUltimaRevision(null), TIEMPO_DESHACER_MS);
    return () => clearTimeout(timer);
  }, [ultimaRevision]);

  // --- Acciones ---
  const quitarDeLaCola = (asistenciaId: number) =>
    setCola((prev) => prev?.filter((item) => item.asistencia_id !== asistenciaId) ?? prev);

  const recargarCola = useCallback(async () => {
    setCola(null);
    try {
      setCola(await obtenerCola());
    } catch (e) {
      setError(mensajeDe(e, "No se pudo actualizar la cola."));
      setCola([]);
    }
  }, []);

  const validar = async (item: ItemCola): Promise<boolean> => {
    try {
      await revisarAsistencia(item.asistencia_id, "validar");
    } catch (e) {
      setError(mensajeDe(e, "No se pudo validar."));
      return false;
    }
    quitarDeLaCola(item.asistencia_id);
    if (item.semana === perfil.semana_reciente) setValidadas((n) => (n ?? 0) + 1);
    setUltimaRevision({ item, accion: "validado" });
    return true;
  };

  const confirmarRechazo = async (motivo: string) => {
    if (!rechazando) return;
    const item = rechazando;
    try {
      await revisarAsistencia(item.asistencia_id, "rechazar", motivo);
    } catch (e) {
      setError(mensajeDe(e, "No se pudo rechazar."));
      setRechazando(null);
      return;
    }
    quitarDeLaCola(item.asistencia_id);
    setRechazando(null);
    setUltimaRevision({ item, accion: "rechazado" });
  };

  const deshacer = async () => {
    if (!ultimaRevision) return;
    const { item, accion } = ultimaRevision;
    setUltimaRevision(null);
    try {
      await revisarAsistencia(item.asistencia_id, "deshacer");
    } catch (e) {
      setError(mensajeDe(e, "No se pudo deshacer."));
      return;
    }
    // Era la primera de la cola: vuelve al frente
    setCola((prev) => [item, ...(prev ?? []).filter((i) => i.asistencia_id !== item.asistencia_id)]);
    if (accion === "validado" && item.semana === perfil.semana_reciente) {
      setValidadas((n) => Math.max(0, (n ?? 1) - 1));
    }
  };

  const confirmarReasignacion = async (alumnoDestinoId: number) => {
    if (!reasignando) return;
    try {
      await reasignarAsistencia(reasignando.asistencia_id, alumnoDestinoId);
      setReasignando(null);
      await recargarCola();
    } catch (e) {
      setError(mensajeDe(e, "No se pudo cambiar el alumno."));
      setReasignando(null);
    }
  };

  // =============================================
  // Render: panel
  // =============================================

  return (
    <div className="flex-1 flex flex-col">
      {/* ── Métricas ── */}
      <div className="mb-5">
        <Metricas pendientes={cola?.length ?? 0} validadas={validadas ?? 0} loading={cola === null} />
      </div>

      {/* ── Herramientas ── */}
      <div className="flex gap-2 mb-5 animate-fade-in delay-100">
        {comunidades.length > 1 && (
          <select
            value={filtroComunidad ?? ""}
            onChange={(e) => setFiltroComunidad(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-superficie-2 border border-borde text-texto text-sm
                       focus:outline-none focus:ring-2 focus:ring-marca/40 appearance-none cursor-pointer"
          >
            <option value="">
              Todas mis comunidades
            </option>
            {comunidades.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => setVerResumen(true)}
          disabled={!perfil.semana_reciente}
          className="px-3 py-2.5 rounded-xl bg-exito/15 hover:bg-exito/25 border border-exito/25
                     text-exito text-xs font-semibold transition-all disabled:opacity-30 whitespace-nowrap"
        >
          Resumen WhatsApp
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 flex items-center justify-between gap-2 animate-fade-in-scale">
          <p className="text-sm text-error">{error}</p>
          <button onClick={() => setError("")} className="text-error hover:underline text-xs">
            Cerrar
          </button>
        </div>
      )}

      {/* ── Deshacer la última revisión ── */}
      {ultimaRevision && (
        <div
          role="status"
          className={`mb-4 px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 animate-fade-in-scale ${
            ultimaRevision.accion === "validado"
              ? "bg-exito/10 border-exito/25"
              : "bg-error/10 border-error/25"
          }`}
        >
          <p className={`text-sm truncate ${ultimaRevision.accion === "validado" ? "text-exito" : "text-error"}`}>
            {ultimaRevision.accion === "validado" ? "Validada" : "Rechazada"}: {ultimaRevision.item.alumno}
          </p>
          <button
            onClick={deshacer}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-superficie hover:bg-superficie-2 border border-borde text-texto text-xs font-semibold transition-all"
          >
            Deshacer
          </button>
        </div>
      )}

      {/* ── Zona de revisión ── */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {cola === null ? (
          <div className="text-center animate-fade-in">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-marca border-t-transparent animate-spin" />
            <p className="text-sm text-texto-tenue">Cargando fotos…</p>
          </div>
        ) : actual ? (
          <div className="w-full animate-fade-in-scale" key={actual.asistencia_id}>
            <div className="w-full max-w-xs mx-auto">
              <TarjetaRevision
                urlFoto={urls.get(actual.envio_id) ?? null}
                alumno={actual.alumno}
                comunidad={actual.comunidad}
                semana={actual.semana}
                enviadoEn={actual.enviado_en}
                onValidar={() => validar(actual)}
                onIniciarRechazo={() => setRechazando(actual)}
              >
                <AvisosFoto avisos={avisosDe(actual)} />
              </TarjetaRevision>
            </div>
            <div className="text-center mt-3">
              <button
                onClick={() => setReasignando(actual)}
                className="text-xs text-texto-tenue hover:text-texto-suave underline underline-offset-4"
              >
                ¿Es de otro alumno? Cambiar alumno
              </button>
            </div>
            <ComparacionFotos fotos={fotosParaComparar(actual, urls)} />
          </div>
        ) : (
          <div className="text-center animate-fade-in py-12">
            <h2 className="text-lg font-bold text-texto mb-2">¡Todo al día!</h2>
            <p className="text-sm text-texto-tenue mb-6">
              {filtroComunidad === null
                ? "No hay fotos pendientes de revisión."
                : "No hay fotos pendientes en esta comunidad."}
            </p>
            <button
              onClick={recargarCola}
              className="px-6 py-2.5 rounded-xl bg-superficie-2 hover:bg-borde text-texto-tenue text-sm font-medium transition-all"
            >
              Actualizar
            </button>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      <ModalRechazo
        abierto={rechazando !== null}
        alumnoNombre={rechazando?.alumno ?? ""}
        onCerrar={() => setRechazando(null)}
        onConfirmar={confirmarRechazo}
      />
      {reasignando && (
        <ModalReasignar
          item={reasignando}
          onCerrar={() => setReasignando(null)}
          onConfirmar={confirmarReasignacion}
        />
      )}
      {verResumen && perfil.semana_reciente && (
        <ModalResumen semanaInicial={perfil.semana_reciente} onCerrar={() => setVerResumen(false)} />
      )}
    </div>
  );
}
