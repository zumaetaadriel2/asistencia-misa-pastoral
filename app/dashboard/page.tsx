"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Metricas } from "@/components/dashboard/metricas";
import {
  TarjetaRevision,
  type AsistenciaPendiente,
} from "@/components/dashboard/tarjeta-revision";
import { ModalRechazo } from "@/components/dashboard/modal-rechazo";
import { PanelAdmin } from "@/components/dashboard/panel-admin";
import { notificarRechazo } from "@/lib/services/notificaciones";

// =============================================
// Tipos
// =============================================

interface UsuarioStaff {
  id: string;
  nombre: string;
  rol: "admin" | "guia";
  comunidad_id: number | null;
}

interface Comunidad {
  id: number;
  nombre: string;
}

type PageState = "loading" | "ready" | "error" | "no-auth";

interface DatosRevision {
  pendientes: AsistenciaPendiente[];
  /** `null` cuando no hay semana activa y el contador no debe cambiar */
  validadas: number | null;
}

// =============================================
// Componente principal
// =============================================

export default function DashboardPage() {
  const router = useRouter();

  // --- Auth & User ---
  const [pageState, setPageState] = useState<PageState>("loading");
  const [usuario, setUsuario] = useState<UsuarioStaff | null>(null);

  // --- Datos ---
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [filtroComunidad, setFiltroComunidad] = useState<number | null>(null);
  const [pendientes, setPendientes] = useState<AsistenciaPendiente[]>([]);
  const [validadasCount, setValidadasCount] = useState(0);
  const [semanaActual, setSemanaActual] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  // --- UI ---
  const [activeTab, setActiveTab] = useState<"review" | "admin">("review");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [asistenciaRechazando, setAsistenciaRechazando] =
    useState<AsistenciaPendiente | null>(null);
  const [error, setError] = useState("");

  // Método para refrescar la semana basándose en la fecha del ciclo activo
  const actualizarCiclo = useCallback(async () => {
    const { data: ciclo } = await supabase
      .from("configuracion_ciclo")
      .select("fecha_inicio")
      .eq("activo", true)
      .order("fecha_inicio", { ascending: false })
      .limit(1)
      .single();

    if (ciclo) {
      const inicio = new Date(ciclo.fecha_inicio + "T00:00:00");
      const ahora = new Date();
      const domingoInicio = new Date(inicio);
      domingoInicio.setDate(domingoInicio.getDate() - domingoInicio.getDay());
      const diffMs = ahora.getTime() - domingoInicio.getTime();
      const semana = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)) + 1;
      setSemanaActual(semana);
    }
  }, []);

  // =============================================
  // Efecto: Auth check + cargar usuario
  // =============================================
  useEffect(() => {
    async function init() {
      // 1. Verificar sesión
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setPageState("no-auth");
        router.push("/login");
        return;
      }

      // 2. Obtener datos del staff
      const { data: staff, error: staffError } = await supabase
        .from("usuarios_staff")
        .select("id, nombre, rol, comunidad_id")
        .eq("id", session.user.id)
        .single();

      if (staffError || !staff) {
        console.error("Error al consultar usuarios_staff en Supabase:", {
          sessionUserId: session.user.id,
          staffError,
          staffData: staff,
        });
        setError(
          staffError?.message
            ? `Error de acceso (${staffError.message}). Verifica políticas RLS o que tu User ID en Auth (${session.user.id}) coincida con usuarios_staff.`
            : "Tu cuenta no está registrada como staff. Contacta al administrador."
        );
        setPageState("error");
        return;
      }

      setUsuario(staff as UsuarioStaff);

      // 3. Si es admin, cargar lista de comunidades para el filtro
      if (staff.rol === "admin") {
        const { data: coms } = await supabase
          .from("comunidades")
          .select("id, nombre")
          .eq("activa", true)
          .order("nombre");
        setComunidades(coms ?? []);
      }

      // 4. Obtener semana actual del ciclo
      await actualizarCiclo();

      setPageState("ready");
    }

    init();
  }, [router, actualizarCiclo]);

  // =============================================
  // Datos de revisión según rol y filtro
  // =============================================

  /** Consulta pendientes y validadas; no toca el estado (lo aplica `aplicarDatos`) */
  const obtenerDatos = useCallback(async (): Promise<DatosRevision> => {
    if (!usuario) return { pendientes: [], validadas: null };

    // Determinar comunidad a filtrar
    const comunidadFiltro =
      usuario.rol === "guia" ? usuario.comunidad_id : filtroComunidad;

    // --- Pendientes ---
    let queryPendientes = supabase
      .from("asistencias")
      .select(
        `
        id,
        alumno_id,
        semana_numero,
        foto_url,
        foto_public_id,
        fecha_subida,
        alumnos!inner (
          nombre_completo,
          comunidad_id,
          comunidades!inner (
            nombre
          )
        )
      `
      )
      .eq("estado", "pendiente")
      .order("fecha_subida", { ascending: true });

    if (comunidadFiltro) {
      queryPendientes = queryPendientes.eq(
        "alumnos.comunidad_id",
        comunidadFiltro
      );
    }

    const { data: pendientesData } = await queryPendientes;
    const pendientes =
      (pendientesData as unknown as AsistenciaPendiente[]) ?? [];

    // --- Count validadas esta semana ---
    if (semanaActual <= 0) return { pendientes, validadas: null };

    let queryValidadas = supabase
      .from("asistencias")
      .select("id", { count: "exact", head: true })
      .eq("estado", "validado")
      .eq("semana_numero", semanaActual);

    if (comunidadFiltro) {
      // Para contar validadas de una comunidad necesitamos un join
      // Usamos un approach diferente: filtrar por alumno_id IN (alumnos de la comunidad)
      const { data: alumnosDeCom } = await supabase
        .from("alumnos")
        .select("id")
        .eq("comunidad_id", comunidadFiltro);

      const ids = (alumnosDeCom ?? []).map((a) => a.id);

      // Comunidad sin alumnos: no puede tener validadas
      if (ids.length === 0) return { pendientes, validadas: 0 };

      queryValidadas = queryValidadas.in("alumno_id", ids);
    }

    const { count } = await queryValidadas;
    return { pendientes, validadas: count ?? 0 };
  }, [usuario, filtroComunidad, semanaActual]);

  const aplicarDatos = useCallback((datos: DatosRevision) => {
    setPendientes(datos.pendientes);
    if (datos.validadas !== null) setValidadasCount(datos.validadas);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (pageState !== "ready") return;

    // Ignorar respuestas viejas si el filtro cambia antes de que lleguen
    let cancelado = false;
    obtenerDatos().then((datos) => {
      if (!cancelado) aplicarDatos(datos);
    });
    return () => {
      cancelado = true;
    };
  }, [pageState, obtenerDatos, aplicarDatos]);

  const recargarDatos = useCallback(async () => {
    setLoadingData(true);
    aplicarDatos(await obtenerDatos());
  }, [obtenerDatos, aplicarDatos]);

  // =============================================
  // Handlers
  // =============================================

  const handleValidar = useCallback(
    async (asistencia: AsistenciaPendiente) => {
      const { error: updateError } = await supabase
        .from("asistencias")
        .update({
          estado: "validado",
          revisado_por: usuario?.id,
        })
        .eq("id", asistencia.id);

      if (updateError) {
        setError("Error al validar: " + updateError.message);
        return false;
      }

      // Actualizar estado local
      setPendientes((prev) => prev.filter((p) => p.id !== asistencia.id));
      setValidadasCount((prev) => prev + 1);
      return true;
    },
    [usuario]
  );

  const handleIniciarRechazo = useCallback(
    (asistencia: AsistenciaPendiente) => {
      setAsistenciaRechazando(asistencia);
      setModalAbierto(true);
    },
    []
  );

  const handleConfirmarRechazo = useCallback(
    async (motivo: string) => {
      if (!asistenciaRechazando) return;

      const { error: updateError } = await supabase
        .from("asistencias")
        .update({
          estado: "rechazado",
          motivo_rechazo: motivo,
          revisado_por: usuario?.id,
        })
        .eq("id", asistenciaRechazando.id);

      if (updateError) {
        setError("Error al rechazar: " + updateError.message);
        setModalAbierto(false);
        setAsistenciaRechazando(null);
        return;
      }

      // Disparar notificación (mock)
      await notificarRechazo({
        alumnoId: asistenciaRechazando.alumno_id,
        alumnoNombre: asistenciaRechazando.alumnos.nombre_completo,
        semana: asistenciaRechazando.semana_numero,
        motivo,
        comunidad: asistenciaRechazando.alumnos.comunidades.nombre,
      });

      // Actualizar estado local
      setPendientes((prev) =>
        prev.filter((p) => p.id !== asistenciaRechazando.id)
      );
      setModalAbierto(false);
      setAsistenciaRechazando(null);
    },
    [asistenciaRechazando, usuario]
  );

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  // =============================================
  // Render: estados de carga/error
  // =============================================

  if (pageState === "loading" || pageState === "no-auth") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-sm text-white/40">Cargando panel…</p>
        </div>
      </main>
    );
  }

  if (pageState === "error" || !usuario) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-sm w-full text-center animate-fade-in">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-semibold text-white mb-2">
            Acceso denegado
          </h1>
          <p className="text-sm text-white/50 mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            Ir al login
          </button>
        </div>
      </main>
    );
  }

  // =============================================
  // Render: Dashboard
  // =============================================

  const tarjetaActual = pendientes[0] ?? null;

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      {/* ── Header ── */}
      <header className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-lg font-bold text-white">
            {usuario.rol === "admin" ? "Panel Admin" : "Panel de Revisión"}
          </h1>
          <p className="text-xs text-white/40">
            {usuario.nombre} ·{" "}
            <span className="capitalize">{usuario.rol}</span>
            {semanaActual > 0 && ` · Semana ${semanaActual}`}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70
                     text-xs font-medium transition-all flex items-center gap-1.5"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
          Salir
        </button>
      </header>

      {/* ── Métricas ── */}
      <div className="mb-5">
        <Metricas
          pendientes={pendientes.length}
          validadas={validadasCount}
          loading={loadingData}
        />
      </div>

      {/* ── Tabs (Solo Admin) ── */}
      {usuario.rol === "admin" && (
        <div className="flex border-b border-white/10 mb-5 animate-fade-in delay-100">
          <button
            onClick={() => setActiveTab("review")}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "review"
                ? "border-primary-500 text-white"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            Cola de Revisión
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "admin"
                ? "border-primary-500 text-white"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            Administración y Reportes
          </button>
        </div>
      )}

      {activeTab === "review" ? (
        <>
          {/* ── Filtro de comunidad (solo admin) ── */}
          {usuario.rol === "admin" && (
            <div className="mb-5 animate-fade-in delay-200">
              <select
                id="filtro-comunidad"
                value={filtroComunidad ?? ""}
                onChange={(e) => {
                  setLoadingData(true);
                  setFiltroComunidad(
                    e.target.value ? Number(e.target.value) : null
                  );
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
                           appearance-none cursor-pointer transition-all"
              >
                <option value="" className="bg-neutral-900">
                  Todas las comunidades
                </option>
                {comunidades.map((c) => (
                  <option key={c.id} value={c.id} className="bg-neutral-900">
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Error global ── */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in-scale">
              <div className="flex items-center justify-between">
                <p className="text-sm text-rose-300">{error}</p>
                <button
                  onClick={() => setError("")}
                  className="text-rose-400 hover:text-rose-300 ml-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Zona de swipe ── */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {loadingData ? (
              <div className="text-center animate-fade-in">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                <p className="text-sm text-white/30">Cargando asistencias…</p>
              </div>
            ) : tarjetaActual ? (
              <div className="w-full max-w-xs mx-auto animate-fade-in-scale" key={tarjetaActual.id}>
                <TarjetaRevision
                  asistencia={tarjetaActual}
                  onValidar={() => handleValidar(tarjetaActual)}
                  onIniciarRechazo={() => handleIniciarRechazo(tarjetaActual)}
                />
              </div>
            ) : (
              /* ── Estado vacío ── */
              <div className="text-center animate-fade-in py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white mb-2">
                  ¡Todo al día!
                </h2>
                <p className="text-sm text-white/40 mb-6">
                  No hay fotos pendientes de revisión.
                </p>
                <button
                  onClick={recargarDatos}
                  className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm font-medium transition-all"
                >
                  Actualizar
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <PanelAdmin
          semanaActual={semanaActual}
          onCicloActualizado={actualizarCiclo}
        />
      )}

      {/* ── Modal de rechazo ── */}
      <ModalRechazo
        abierto={modalAbierto}
        alumnoNombre={
          asistenciaRechazando?.alumnos.nombre_completo ?? ""
        }
        onCerrar={() => {
          setModalAbierto(false);
          setAsistenciaRechazando(null);
        }}
        onConfirmar={handleConfirmarRechazo}
      />
    </main>
  );
}
