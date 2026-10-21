"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  obtenerCola,
  obtenerPerfil,
  obtenerResumen,
  reasignarAsistencia,
  revisarAsistencia,
  type ItemCola,
  type PerfilStaff,
} from "@/lib/staff/revision";
import { obtenerUrlsFotos } from "@/lib/staff/fotos";
import { avisoFechaExif, avisoParecida, type Aviso } from "@/lib/staff/avisos";
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

type Acceso =
  | { estado: "cargando" }
  | { estado: "sin-acceso" }
  | { estado: "error"; mensaje: string }
  | { estado: "listo"; perfil: PerfilStaff };

/** Tiempo durante el que se ofrece deshacer la última revisión (la base permite 2 min) */
const TIEMPO_DESHACER_MS = 8000;

/** Mensaje legible de un error de Supabase (las RPC devuelven textos en español) */
function mensajeDe(error: unknown, porDefecto: string): string {
  return error && typeof error === "object" && "message" in error ? String(error.message) : porDefecto;
}

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

export default function DashboardPage() {
  const router = useRouter();

  const [acceso, setAcceso] = useState<Acceso>({ estado: "cargando" });
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

  const perfil = acceso.estado === "listo" ? acceso.perfil : null;

  // --- Sesión, perfil y datos iniciales ---
  useEffect(() => {
    let cancelado = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      try {
        const perfilStaff = await obtenerPerfil();
        if (cancelado) return;
        if (!perfilStaff) {
          setAcceso({ estado: "sin-acceso" });
          return;
        }
        setAcceso({ estado: "listo", perfil: perfilStaff });

        const [colaInicial, resumen] = await Promise.all([
          obtenerCola(),
          perfilStaff.semana_reciente ? obtenerResumen(perfilStaff.semana_reciente) : Promise.resolve([]),
        ]);
        if (cancelado) return;
        setCola(colaInicial);
        setValidadas(resumen.filter((fila) => fila.estado === "validado").length);
      } catch (e) {
        if (!cancelado) setAcceso({ estado: "error", mensaje: mensajeDe(e, "No se pudo cargar el panel.") });
      }
    });

    return () => {
      cancelado = true;
    };
  }, [router]);

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
    if (item.semana === perfil?.semana_reciente) setValidadas((n) => (n ?? 0) + 1);
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
    if (accion === "validado" && item.semana === perfil?.semana_reciente) {
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

  const salir = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // =============================================
  // Render: estados de carga y acceso
  // =============================================

  if (acceso.estado === "cargando") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-sm text-white/40">Cargando panel…</p>
        </div>
      </main>
    );
  }

  if (acceso.estado !== "listo") {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-sm w-full text-center animate-fade-in">
          <h1 className="text-lg font-semibold text-white mb-2">
            {acceso.estado === "sin-acceso" ? "Sin acceso" : "Error"}
          </h1>
          <p className="text-sm text-white/50 mb-6">
            {acceso.estado === "sin-acceso"
              ? "Tu cuenta no está registrada como staff activo de la pastoral. Habla con un administrador."
              : acceso.mensaje}
          </p>
          <button
            onClick={salir}
            className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </main>
    );
  }

  const { perfil: staff } = acceso;

  // =============================================
  // Render: panel
  // =============================================

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      {/* ── Encabezado ── */}
      <header className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-lg font-bold text-white">Panel de Revisión</h1>
          <p className="text-xs text-white/40">
            {staff.nombre} · {staff.rol === "admin" ? "Administrador" : "Guía"}
            {staff.semana_reciente ? ` · Semana ${staff.semana_reciente}` : ""}
          </p>
        </div>
        <button
          onClick={salir}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs font-medium transition-all"
        >
          Salir
        </button>
      </header>

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
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
          >
            <option value="" className="bg-neutral-900">
              Todas mis comunidades
            </option>
            {comunidades.map(([id, nombre]) => (
              <option key={id} value={id} className="bg-neutral-900">
                {nombre}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => setVerResumen(true)}
          disabled={!staff.semana_reciente}
          className="px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20
                     text-emerald-300 text-xs font-semibold transition-all disabled:opacity-30 whitespace-nowrap"
        >
          Resumen WhatsApp
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2 animate-fade-in-scale">
          <p className="text-sm text-rose-300">{error}</p>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-300 text-xs">
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
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-rose-500/10 border-rose-500/20"
          }`}
        >
          <p className={`text-sm truncate ${ultimaRevision.accion === "validado" ? "text-emerald-300" : "text-rose-300"}`}>
            {ultimaRevision.accion === "validado" ? "Validada" : "Rechazada"}: {ultimaRevision.item.alumno}
          </p>
          <button
            onClick={deshacer}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            Deshacer
          </button>
        </div>
      )}

      {/* ── Zona de revisión ── */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {cola === null ? (
          <div className="text-center animate-fade-in">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            <p className="text-sm text-white/30">Cargando fotos…</p>
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
                className="text-xs text-white/40 hover:text-white/70 underline underline-offset-4"
              >
                ¿Es de otro alumno? Cambiar alumno
              </button>
            </div>
            <ComparacionFotos fotos={fotosParaComparar(actual, urls)} />
          </div>
        ) : (
          <div className="text-center animate-fade-in py-12">
            <h2 className="text-lg font-bold text-white mb-2">¡Todo al día!</h2>
            <p className="text-sm text-white/40 mb-6">
              {filtroComunidad === null
                ? "No hay fotos pendientes de revisión."
                : "No hay fotos pendientes en esta comunidad."}
            </p>
            <button
              onClick={recargarCola}
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm font-medium transition-all"
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
      {verResumen && staff.semana_reciente && (
        <ModalResumen semanaInicial={staff.semana_reciente} onCerrar={() => setVerResumen(false)} />
      )}
    </main>
  );
}
