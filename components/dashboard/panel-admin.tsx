"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

interface Props {
  semanaActual: number;
  onCicloActualizado: () => void;
}

interface CicloActivo {
  id: number;
  nombre_ciclo: string;
  fecha_inicio: string;
  activo: boolean;
}

export function PanelAdmin({ semanaActual, onCicloActualizado }: Props) {
  // --- Estados de Ciclo ---
  const [ciclo, setCiclo] = useState<CicloActivo | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [nombreCiclo, setNombreCiclo] = useState("");
  const [guardandoCiclo, setGuardandoCiclo] = useState(false);
  const [mensajeCiclo, setMensajeCiclo] = useState({ texto: "", tipo: "" });

  // --- Estados de Cierre de Semana ---
  const [semanaCierre, setSemanaCierre] = useState(semanaActual);
  const [cerrandoSemana, setCerrandoSemana] = useState(false);
  const [mensajeCierre, setMensajeCierre] = useState({ texto: "", tipo: "" });

  // --- Estados de Exportación ---
  const [exportando, setExportando] = useState(false);
  const [mensajeExportacion, setMensajeExportacion] = useState("");

  // Cargar ciclo activo al montar
  const cargarCiclo = useCallback(async () => {
    const { data, error } = await supabase
      .from("configuracion_ciclo")
      .select("*")
      .eq("activo", true)
      .order("fecha_inicio", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setCiclo(data as CicloActivo);
      setFechaInicio(data.fecha_inicio);
      setNombreCiclo(data.nombre_ciclo || "Ciclo Actual");
    }
  }, []);

  useEffect(() => {
    cargarCiclo();
  }, [cargarCiclo]);

  useEffect(() => {
    if (semanaActual > 0 && semanaCierre === 0) {
      setSemanaCierre(semanaActual);
    }
  }, [semanaActual, semanaCierre]);

  // Actualizar configuración del ciclo
  const handleGuardarCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaInicio) return;
    setGuardandoCiclo(true);
    setMensajeCiclo({ texto: "", tipo: "" });

    try {
      if (ciclo) {
        // Actualizar existente
        const { error } = await supabase
          .from("configuracion_ciclo")
          .update({
            fecha_inicio: fechaInicio,
            nombre_ciclo: nombreCiclo,
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
      const { data: alumnos, error: errAlumnos } = await supabase
        .from("alumnos")
        .select("id")
        .eq("activo", true);

      if (errAlumnos) throw errAlumnos;
      if (!alumnos || alumnos.length === 0) {
        throw new Error("No hay alumnos activos registrados en la base de datos.");
      }

      // 2. Obtener asistencias ya registradas en esa semana
      const { data: asistenciasExistentes, error: errAsistencias } = await supabase
        .from("asistencias")
        .select("alumno_id")
        .eq("semana_numero", semanaCierre);

      if (errAsistencias) throw errAsistencias;

      const idsConRegistro = new Set((asistenciasExistentes ?? []).map((a) => a.alumno_id));

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
      const { data: alumnos, error: errAlumnos } = await supabase
        .from("alumnos")
        .select("id, nombre_completo, comunidad_id")
        .eq("activo", true)
        .order("nombre_completo");
      if (errAlumnos) throw errAlumnos;

      if (!alumnos || alumnos.length === 0) {
        throw new Error("No hay alumnos activos para exportar.");
      }

      // 3. Obtener todas las asistencias registradas
      const { data: asistencias, error: errAsistencias } = await supabase
        .from("asistencias")
        .select("alumno_id, semana_numero, estado");
      if (errAsistencias) throw errAsistencias;

      // Calcular semanas máximas
      const maxSemanaBD = (asistencias ?? []).reduce(
        (max, a) => Math.max(max, a.semana_numero),
        0
      );
      const totalSemanas = Math.max(maxSemanaBD, semanaActual, 1);

      // Mapear asistencias por alumno y semana
      // Llave: "alumnoId-semanaNumero", Valor: estado
      const mapAsistencias = new Map<string, string>();
      (asistencias ?? []).forEach((asist) => {
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

      // Contadores globales para la fila de resumen
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

          // Contar
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

        // Totales del alumno
        fila.push(
          validadas.toString(),
          rechazadas.toString(),
          inasistencias.toString(),
          pendientes.toString()
        );
        filas.push(fila);
      });

      // 5. Agregar filas de resumen
      filas.push([]); // Fila vacía de separación
      
      // Resumen: Validadas
      const filaResumenValidadas = [
        "TOTAL VALIDADAS",
        "-",
        ...totalValidadasPorSemana.map(v => v.toString()),
        totalValidadasPorSemana.reduce((a, b) => a + b, 0).toString(),
        "-", "-", "-"
      ];
      filas.push(filaResumenValidadas);

      // Resumen: Inasistencias
      const filaResumenInasistencias = [
        "TOTAL INASISTENCIAS",
        "-",
        ...totalInasistenciasPorSemana.map(v => v.toString()),
        "-", "-", 
        totalInasistenciasPorSemana.reduce((a, b) => a + b, 0).toString(),
        "-"
      ];
      filas.push(filaResumenInasistencias);

      // 6. Generar el archivo CSV
      const csvContent =
        "\uFEFF" + // BOM para UTF-8 (soporte acentos en Excel)
        filas
          .map((f) =>
            f
              .map((val) => {
                // Escapar comillas dobles y englobar en comillas
                const limpio = val.replace(/"/g, '""');
                return `"${limpio}"`;
              })
              .join(",")
          )
          .join("\n");

      // 7. Descargar el archivo
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
      {/* ── Control de Ciclo ── */}
      <section className="glass-card p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
          </svg>
          Configuración del Ciclo Activo
        </h2>
        <p className="text-xs text-white/40 mb-4">
          Modifica la fecha de inicio del ciclo (el sábado en el que inicia la Semana 1).
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
              "Guardar Configuración"
            )}
          </button>
        </form>
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
              onChange={(e) => setSemanaCierre(Number(e.target.value))}
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
