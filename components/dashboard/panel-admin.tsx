"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { obtenerTodasLasFilas } from "@/lib/supabase/paginacion";

interface Props {
  semanaActual: number;
  onCicloActualizado: () => void;
}

interface CicloActivo {
  id: number;
  nombre_ciclo: string;
  fecha_inicio: string;
  activo: boolean;
  abierto_manual?: boolean | null;
}

interface ComunidadItem {
  id: number;
  nombre: string;
  pin: string;
  activa: boolean;
}

interface AlumnoItem {
  id: number;
  nombre_completo: string;
  comunidad_id: number;
  activo: boolean;
}

// =============================================
// Consultas (no tocan el estado de React)
// =============================================

async function consultarCicloActivo(): Promise<CicloActivo | null> {
  const { data, error } = await supabase
    .from("configuracion_ciclo")
    .select("*")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .single();

  return error ? null : (data as CicloActivo | null);
}

async function consultarComunidades(): Promise<ComunidadItem[] | null> {
  const { data } = await supabase
    .from("comunidades")
    .select("id, nombre, pin, activa")
    .order("nombre");
  return data as ComunidadItem[] | null;
}

async function consultarAlumnos(comunidadId: number): Promise<AlumnoItem[] | null> {
  const { data } = await supabase
    .from("alumnos")
    .select("id, nombre_completo, comunidad_id, activo")
    .eq("comunidad_id", comunidadId)
    .order("nombre_completo");
  return data as AlumnoItem[] | null;
}

export function PanelAdmin({ semanaActual, onCicloActualizado }: Props) {
  // --- Estados de Ciclo ---
  const [ciclo, setCiclo] = useState<CicloActivo | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [nombreCiclo, setNombreCiclo] = useState("");
  const [abiertoManual, setAbiertoManual] = useState<"auto" | "open" | "closed">("auto");
  const [guardandoCiclo, setGuardandoCiclo] = useState(false);
  const [mensajeCiclo, setMensajeCiclo] = useState({ texto: "", tipo: "" });

  // --- Estados de Comunidades y Alumnos ---
  const [comunidades, setComunidades] = useState<ComunidadItem[]>([]);
  const [nombreComunidad, setNombreComunidad] = useState("");
  const [pinComunidad, setPinComunidad] = useState("");
  const [creandoComunidad, setCreandoComunidad] = useState(false);
  const [mensajeComunidad, setMensajeComunidad] = useState({ texto: "", tipo: "" });

  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [comunidadSeleccionadaAlumno, setComunidadSeleccionadaAlumno] = useState<number | null>(null);
  const [nombreAlumno, setNombreAlumno] = useState("");
  const [creandoAlumno, setCreandoAlumno] = useState(false);
  const [mensajeAlumno, setMensajeAlumno] = useState({ texto: "", tipo: "" });

  // --- Estados de Cierre de Semana ---
  // `null` = el admin no la ha editado: se usa la semana actual del ciclo
  const [semanaCierreEditada, setSemanaCierreEditada] = useState<number | null>(null);
  const semanaCierre = semanaCierreEditada ?? semanaActual;
  const [cerrandoSemana, setCerrandoSemana] = useState(false);
  const [mensajeCierre, setMensajeCierre] = useState({ texto: "", tipo: "" });

  // --- Estados de Exportación ---
  const [exportando, setExportando] = useState(false);
  const [mensajeExportacion, setMensajeExportacion] = useState("");

  // Pasar el ciclo activo a los campos del formulario
  const aplicarCiclo = useCallback((data: CicloActivo | null) => {
    if (!data) return;
    setCiclo(data);
    setFechaInicio(data.fecha_inicio);
    setNombreCiclo(data.nombre_ciclo || "Ciclo Actual");
    if (data.abierto_manual === true) setAbiertoManual("open");
    else if (data.abierto_manual === false) setAbiertoManual("closed");
    else setAbiertoManual("auto");
  }, []);

  const aplicarComunidades = useCallback((data: ComunidadItem[] | null) => {
    if (!data) return;
    setComunidades(data);
    // Preseleccionar la primera comunidad solo si aún no hay una elegida
    if (data.length > 0) {
      setComunidadSeleccionadaAlumno((actual) => actual ?? data[0].id);
    }
  }, []);

  // Recargas tras guardar cambios
  const cargarCiclo = useCallback(async () => {
    aplicarCiclo(await consultarCicloActivo());
  }, [aplicarCiclo]);

  const cargarComunidades = useCallback(async () => {
    aplicarComunidades(await consultarComunidades());
  }, [aplicarComunidades]);

  const cargarAlumnos = useCallback(async () => {
    if (!comunidadSeleccionadaAlumno) return;
    const data = await consultarAlumnos(comunidadSeleccionadaAlumno);
    if (data) setAlumnos(data);
  }, [comunidadSeleccionadaAlumno]);

  // Cargar ciclo activo y comunidades al montar
  useEffect(() => {
    consultarCicloActivo().then(aplicarCiclo);
    consultarComunidades().then(aplicarComunidades);
  }, [aplicarCiclo, aplicarComunidades]);

  // Cargar alumnos de la comunidad seleccionada
  useEffect(() => {
    if (!comunidadSeleccionadaAlumno) return;

    let cancelado = false;
    consultarAlumnos(comunidadSeleccionadaAlumno).then((data) => {
      if (!cancelado && data) setAlumnos(data);
    });
    return () => {
      cancelado = true;
    };
  }, [comunidadSeleccionadaAlumno]);

  // Actualizar configuración del ciclo
  const handleGuardarCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaInicio) return;
    setGuardandoCiclo(true);
    setMensajeCiclo({ texto: "", tipo: "" });

    const abiertoManualVal =
      abiertoManual === "open" ? true : abiertoManual === "closed" ? false : null;

    try {
      if (ciclo) {
        // Actualizar existente
        const { error } = await supabase
          .from("configuracion_ciclo")
          .update({
            fecha_inicio: fechaInicio,
            nombre_ciclo: nombreCiclo,
            abierto_manual: abiertoManualVal,
          })
          .eq("id", ciclo.id);

        if (error) throw error;
        setMensajeCiclo({ texto: "Configuración del ciclo actualizada correctamente.", tipo: "success" });
      } else {
        // Crear nuevo ciclo activo
        const { error } = await supabase
          .from("configuracion_ciclo")
          .insert({
            fecha_inicio: fechaInicio,
            nombre_ciclo: nombreCiclo,
            activo: true,
            abierto_manual: abiertoManualVal,
          });

        if (error) throw error;
        setMensajeCiclo({ texto: "Nuevo ciclo creado y activado correctamente.", tipo: "success" });
      }
      await cargarCiclo();
      onCicloActualizado();
    } catch (err) {
      setMensajeCiclo({
        texto: err instanceof Error ? err.message : "Error al guardar el ciclo.",
        tipo: "error",
      });
    } finally {
      setGuardandoCiclo(false);
    }
  };

  // Crear Comunidad
  const handleCrearComunidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreComunidad || pinComunidad.length !== 4) {
      setMensajeComunidad({ texto: "Ingresa un nombre y un PIN de 4 dígitos.", tipo: "error" });
      return;
    }
    setCreandoComunidad(true);
    setMensajeComunidad({ texto: "", tipo: "" });

    try {
      const { error } = await supabase
        .from("comunidades")
        .insert({
          nombre: nombreComunidad.trim(),
          pin: pinComunidad.trim(),
          activa: true,
        });

      if (error) throw error;

      setMensajeComunidad({ texto: `Comunidad "${nombreComunidad}" creada con éxito.`, tipo: "success" });
      setNombreComunidad("");
      setPinComunidad("");
      await cargarComunidades();
    } catch (err) {
      setMensajeComunidad({
        texto: err instanceof Error ? err.message : "Error al crear la comunidad.",
        tipo: "error",
      });
    } finally {
      setCreandoComunidad(false);
    }
  };

  // Crear Alumno
  const handleCrearAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreAlumno || !comunidadSeleccionadaAlumno) {
      setMensajeAlumno({ texto: "Selecciona una comunidad e ingresa el nombre del alumno.", tipo: "error" });
      return;
    }
    setCreandoAlumno(true);
    setMensajeAlumno({ texto: "", tipo: "" });

    try {
      const { error } = await supabase
        .from("alumnos")
        .insert({
          nombre_completo: nombreAlumno.trim(),
          comunidad_id: comunidadSeleccionadaAlumno,
          activo: true,
        });

      if (error) throw error;

      setMensajeAlumno({ texto: `Alumno "${nombreAlumno}" registrado con éxito.`, tipo: "success" });
      setNombreAlumno("");
      await cargarAlumnos();
    } catch (err) {
      setMensajeAlumno({
        texto: err instanceof Error ? err.message : "Error al registrar al alumno.",
        tipo: "error",
      });
    } finally {
      setCreandoAlumno(false);
    }
  };

  // Cierre manual de semana: Asignar inasistencias
  const handleCerrarSemana = async () => {
    if (semanaCierre <= 0) return;
    const confirmar = window.confirm(
      `¿Estás seguro de cerrar la Semana ${semanaCierre}? Se marcarán como Inasistencia a todos los alumnos sin registro para esta semana.`
    );
    if (!confirmar) return;

    setCerrandoSemana(true);
    setMensajeCierre({ texto: "", tipo: "" });

    try {
      // 1. Obtener alumnos activos
      const alumnos = await obtenerTodasLasFilas<{ id: number }>((desde, hasta) =>
        supabase
          .from("alumnos")
          .select("id")
          .eq("activo", true)
          .order("id")
          .range(desde, hasta)
      );

      if (alumnos.length === 0) {
        throw new Error("No hay alumnos activos registrados en la base de datos.");
      }

      // 2. Obtener asistencias ya registradas en esa semana
      const asistenciasExistentes = await obtenerTodasLasFilas<{ alumno_id: number }>(
        (desde, hasta) =>
          supabase
            .from("asistencias")
            .select("alumno_id")
            .eq("semana_numero", semanaCierre)
            .order("id")
            .range(desde, hasta)
      );

      const idsConRegistro = new Set(asistenciasExistentes.map((a) => a.alumno_id));

      // 3. Filtrar alumnos sin asistencia registrada
      const alumnosSinAsistencia = alumnos.filter((al) => !idsConRegistro.has(al.id));

      if (alumnosSinAsistencia.length === 0) {
        setMensajeCierre({
          texto: `Todos los alumnos tienen registro de asistencia para la Semana ${semanaCierre}. No se insertaron inasistencias.`,
          tipo: "info",
        });
        setCerrandoSemana(false);
        return;
      }

      // 4. Insertar inasistencias en lote
      const inasistenciasAInsertar = alumnosSinAsistencia.map((al) => ({
        alumno_id: al.id,
        semana_numero: semanaCierre,
        estado: "inasistencia",
      }));

      const { error: errInsert } = await supabase
        .from("asistencias")
        .insert(inasistenciasAInsertar);

      if (errInsert) throw errInsert;

      setMensajeCierre({
        texto: `Semana ${semanaCierre} cerrada exitosamente. Se registraron ${inasistenciasAInsertar.length} inasistencias.`,
        tipo: "success",
      });
    } catch (err) {
      setMensajeCierre({
        texto: err instanceof Error ? err.message : "Error al cerrar la semana.",
        tipo: "error",
      });
    } finally {
      setCerrandoSemana(false);
    }
  };

  // Exportar reporte de asistencias en CSV
  const handleExportarCSV = async () => {
    setExportando(true);
    setMensajeExportacion("");

    try {
      // 1. Obtener comunidades
      const { data: comunidades, error: errComunidades } = await supabase
        .from("comunidades")
        .select("id, nombre");
      if (errComunidades) throw errComunidades;

      const mapComunidades = new Map((comunidades ?? []).map((c) => [c.id, c.nombre]));

      // 2. Obtener alumnos activos
      const alumnos = await obtenerTodasLasFilas<{
        id: number;
        nombre_completo: string;
        comunidad_id: number | null;
      }>((desde, hasta) =>
        supabase
          .from("alumnos")
          .select("id, nombre_completo, comunidad_id")
          .eq("activo", true)
          .order("nombre_completo")
          .order("id")
          .range(desde, hasta)
      );

      if (alumnos.length === 0) {
        throw new Error("No hay alumnos activos para exportar.");
      }

      // 3. Obtener todas las asistencias registradas
      const asistencias = await obtenerTodasLasFilas<{
        alumno_id: number;
        semana_numero: number;
        estado: string;
      }>((desde, hasta) =>
        supabase
          .from("asistencias")
          .select("alumno_id, semana_numero, estado")
          .order("id")
          .range(desde, hasta)
      );

      // Calcular semanas máximas
      const maxSemanaBD = asistencias.reduce(
        (max, a) => Math.max(max, a.semana_numero),
        0
      );
      const totalSemanas = Math.max(maxSemanaBD, semanaActual, 1);

      // Mapear asistencias por alumno y semana
      const mapAsistencias = new Map<string, string>();
      asistencias.forEach((asist) => {
        mapAsistencias.set(`${asist.alumno_id}-${asist.semana_numero}`, asist.estado);
      });

      // 4. Construir las filas del CSV
      const encabezado = [
        "Alumno",
        "Comunidad",
        ...Array.from({ length: totalSemanas }, (_, i) => `Semana ${i + 1}`),
        "Validadas",
        "Rechazadas",
        "Inasistencias",
        "Pendientes",
      ];

      const filas: string[][] = [encabezado];

      const totalValidadasPorSemana = Array(totalSemanas).fill(0);
      const totalRechazadasPorSemana = Array(totalSemanas).fill(0);
      const totalInasistenciasPorSemana = Array(totalSemanas).fill(0);
      const totalPendientesPorSemana = Array(totalSemanas).fill(0);

      alumnos.forEach((al) => {
        const comNombre = mapComunidades.get(al.comunidad_id ?? -1) || "Sin comunidad";
        const fila: string[] = [al.nombre_completo, comNombre];

        let validadas = 0;
        let rechazadas = 0;
        let inasistencias = 0;
        let pendientes = 0;

        for (let sem = 1; sem <= totalSemanas; sem++) {
          const estado = mapAsistencias.get(`${al.id}-${sem}`) || "Sin registro";
          fila.push(estado);

          if (estado === "validado") {
            validadas++;
            totalValidadasPorSemana[sem - 1]++;
          } else if (estado === "rechazado") {
            rechazadas++;
            totalRechazadasPorSemana[sem - 1]++;
          } else if (estado === "inasistencia") {
            inasistencias++;
            totalInasistenciasPorSemana[sem - 1]++;
          } else if (estado === "pendiente") {
            pendientes++;
            totalPendientesPorSemana[sem - 1]++;
          }
        }

        fila.push(
          validadas.toString(),
          rechazadas.toString(),
          inasistencias.toString(),
          pendientes.toString()
        );
        filas.push(fila);
      });

      filas.push([]);
      
      const filaResumenValidadas = [
        "TOTAL VALIDADAS",
        "-",
        ...totalValidadasPorSemana.map(v => v.toString()),
        totalValidadasPorSemana.reduce((a, b) => a + b, 0).toString(),
        "-", "-", "-"
      ];
      filas.push(filaResumenValidadas);

      const filaResumenInasistencias = [
        "TOTAL INASISTENCIAS",
        "-",
        ...totalInasistenciasPorSemana.map(v => v.toString()),
        "-", "-", 
        totalInasistenciasPorSemana.reduce((a, b) => a + b, 0).toString(),
        "-"
      ];
      filas.push(filaResumenInasistencias);

      const csvContent =
        "\uFEFF" +
        filas
          .map((f) =>
            f
              .map((val) => {
                const limpio = val.replace(/"/g, '""');
                return `"${limpio}"`;
              })
              .join(",")
          )
          .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `reporte_asistencias_ciclo_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMensajeExportacion("Reporte descargado correctamente.");
    } catch (err) {
      setMensajeExportacion(
        err instanceof Error ? err.message : "Error al exportar el reporte."
      );
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Control de Ciclo y Estado del Formulario ── */}
      <section className="glass-card p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
          </svg>
          Configuración y Control del Formulario
        </h2>
        <p className="text-xs text-white/40 mb-4">
          Configura el ciclo activo y controla si el formulario está abierto para los alumnos.
        </p>

        <form onSubmit={handleGuardarCiclo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre-ciclo" className="block text-xs font-medium text-white/60 mb-1">
                Nombre del Ciclo
              </label>
              <input
                id="nombre-ciclo"
                type="text"
                value={nombreCiclo}
                onChange={(e) => setNombreCiclo(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs
                           focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
              />
            </div>
            <div>
              <label htmlFor="fecha-inicio" className="block text-xs font-medium text-white/60 mb-1">
                Fecha de Inicio (Semana 1)
              </label>
              <input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs
                           focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
              />
            </div>
          </div>

          {/* Apertura Manual Switch */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <label className="block text-xs font-medium text-white/70 mb-2">
              Estado del Formulario (Apertura)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAbiertoManual("auto")}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                  abiertoManual === "auto"
                    ? "bg-primary-600/30 border-primary-500 text-white"
                    : "bg-white/5 border-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                ⏰ Automático
                <span className="block text-[10px] opacity-60">Sáb 7PM - Lun 11:59PM</span>
              </button>
              <button
                type="button"
                onClick={() => setAbiertoManual("open")}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                  abiertoManual === "open"
                    ? "bg-emerald-600/30 border-emerald-500 text-emerald-300"
                    : "bg-white/5 border-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                🟢 Abierto Manual
                <span className="block text-[10px] opacity-60">Forzado (para pruebas)</span>
              </button>
              <button
                type="button"
                onClick={() => setAbiertoManual("closed")}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                  abiertoManual === "closed"
                    ? "bg-rose-600/30 border-rose-500 text-rose-300"
                    : "bg-white/5 border-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                🔴 Cerrado Manual
                <span className="block text-[10px] opacity-60">Forzado</span>
              </button>
            </div>
          </div>

          {mensajeCiclo.texto && (
            <p className={`text-xs ${mensajeCiclo.tipo === "success" ? "text-emerald-400" : "text-rose-400"}`}>
              {mensajeCiclo.texto}
            </p>
          )}

          <button
            type="submit"
            disabled={guardandoCiclo || !fechaInicio}
            className="w-full py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-30
                       text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            {guardandoCiclo ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar Configuración de Ciclo"
            )}
          </button>
        </form>
      </section>

      {/* ── Gestión de Comunidades ── */}
      <section className="glass-card p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a5.97 5.97 0 0 0-.942 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
          Crear Nueva Comunidad
        </h2>
        <p className="text-xs text-white/40 mb-4">
          Crea comunidades y asígnales un PIN de 4 dígitos para que sus alumnos puedan registrar asistencia.
        </p>

        <form onSubmit={handleCrearComunidad} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre-comunidad" className="block text-xs font-medium text-white/60 mb-1">
                Nombre de la Comunidad
              </label>
              <input
                id="nombre-comunidad"
                type="text"
                value={nombreComunidad}
                onChange={(e) => setNombreComunidad(e.target.value)}
                placeholder="Ej. San Pablo, San Pedro..."
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs
                           focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
            </div>
            <div>
              <label htmlFor="pin-comunidad" className="block text-xs font-medium text-white/60 mb-1">
                PIN de Acceso (4 dígitos)
              </label>
              <input
                id="pin-comunidad"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pinComunidad}
                onChange={(e) => setPinComunidad(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono text-center tracking-widest
                           focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
            </div>
          </div>

          {mensajeComunidad.texto && (
            <p className={`text-xs ${mensajeComunidad.tipo === "success" ? "text-emerald-400" : "text-rose-400"}`}>
              {mensajeComunidad.texto}
            </p>
          )}

          <button
            type="submit"
            disabled={creandoComunidad || !nombreComunidad || pinComunidad.length !== 4}
            className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-30
                       text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            {creandoComunidad ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Comunidad"
            )}
          </button>
        </form>

        {/* Lista de Comunidades */}
        {comunidades.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-xs font-medium text-white/60 mb-2">Comunidades Registradas ({comunidades.length}):</p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {comunidades.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/80">
                  <span>{c.nombre}</span>
                  <span className="font-mono text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded">PIN: {c.pin}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Registrar Alumno ── */}
      <section className="glass-card p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0M4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
          Registrar Nuevo Alumno
        </h2>
        <p className="text-xs text-white/40 mb-4">
          Agrega alumnos a cualquier comunidad para que puedan seleccionar su nombre al registrar asistencia.
        </p>

        <form onSubmit={handleCrearAlumno} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="select-comunidad-alumno" className="block text-xs font-medium text-white/60 mb-1">
                Comunidad
              </label>
              <select
                id="select-comunidad-alumno"
                value={comunidadSeleccionadaAlumno ?? ""}
                onChange={(e) => setComunidadSeleccionadaAlumno(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none cursor-pointer"
              >
                {comunidades.map((c) => (
                  <option key={c.id} value={c.id} className="bg-neutral-900">
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nombre-alumno" className="block text-xs font-medium text-white/60 mb-1">
                Nombre Completo del Alumno
              </label>
              <input
                id="nombre-alumno"
                type="text"
                value={nombreAlumno}
                onChange={(e) => setNombreAlumno(e.target.value)}
                placeholder="Ej. María López"
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>

          {mensajeAlumno.texto && (
            <p className={`text-xs ${mensajeAlumno.tipo === "success" ? "text-emerald-400" : "text-rose-400"}`}>
              {mensajeAlumno.texto}
            </p>
          )}

          <button
            type="submit"
            disabled={creandoAlumno || !nombreAlumno || !comunidadSeleccionadaAlumno}
            className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-30
                       text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            {creandoAlumno ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Registrando...
              </>
            ) : (
              "Registrar Alumno"
            )}
          </button>
        </form>

        {/* Lista de Alumnos de la Comunidad Seleccionada */}
        {comunidadSeleccionadaAlumno && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-xs font-medium text-white/60 mb-2">
              Alumnos Registrados en esta comunidad ({alumnos.length}):
            </p>
            {alumnos.length === 0 ? (
              <p className="text-xs text-white/30 italic">No hay alumnos registrados en esta comunidad.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {alumnos.map((a) => (
                  <div key={a.id} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/80">
                    {a.nombre_completo}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Cierre de Semana ── */}
      <section className="glass-card p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
          </svg>
          Cerrar Semana (Registrar Faltas)
        </h2>
        <p className="text-xs text-white/40 mb-4">
          Busca a todos los alumnos que no enviaron su foto de asistencia y márcalos como <strong>Inasistencia</strong>.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label htmlFor="semana-cierre" className="block text-xs font-medium text-white/60 mb-1">
              Seleccionar Semana
            </label>
            <input
              id="semana-cierre"
              type="number"
              min={1}
              value={semanaCierre || ""}
              onChange={(e) => setSemanaCierreEditada(Number(e.target.value))}
              required
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs
                         focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
            />
          </div>

          <button
            onClick={handleCerrarSemana}
            disabled={cerrandoSemana || semanaCierre <= 0}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-30
                       text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            {cerrandoSemana ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Cerrando…
              </>
            ) : (
              "Cerrar Semana"
            )}
          </button>
        </div>

        {mensajeCierre.texto && (
          <p className={`mt-3 text-xs ${
            mensajeCierre.tipo === "success"
              ? "text-emerald-400"
              : mensajeCierre.tipo === "info"
              ? "text-blue-400"
              : "text-rose-400"
          }`}>
            {mensajeCierre.texto}
          </p>
        )}
      </section>

      {/* ── Reportes ── */}
      <section className="glass-card p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          Exportación de Reportes
        </h2>
        <p className="text-xs text-white/40 mb-4">
          Descarga la matriz de asistencias del ciclo completo en formato CSV (compatible con Excel).
        </p>

        <button
          onClick={handleExportarCSV}
          disabled={exportando}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30
                     text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          {exportando ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Generando CSV…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Descargar Matriz (CSV)
            </>
          )}
        </button>

        {mensajeExportacion && (
          <p className="mt-3 text-xs text-white/50">{mensajeExportacion}</p>
        )}
      </section>
    </div>
  );
}
