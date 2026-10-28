"use client";

import { useState } from "react";
import { cerrarSemana, datosCatequesisCiclo, datosReporte } from "@/lib/staff/admin";
import { descargarExcel } from "@/lib/excel/libro";
import { tablaCatequesisCiclo } from "@/lib/staff/catequesis";
import { mensajeDe } from "@/lib/staff/errores";
import { tablaAsistencia } from "@/lib/staff/reporte";
import type { PerfilStaff } from "@/lib/staff/revision";
import { hoyEnLima } from "@/lib/utils/timeHelpers";
import { Boton, Campo, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";

export function SeccionReportes({ perfil }: { perfil: PerfilStaff }) {
  const semanas = perfil.semana_reciente ?? 0;
  const [descargando, setDescargando] = useState(false);
  const [descargandoCatequesis, setDescargandoCatequesis] = useState(false);
  const [semanaCierre, setSemanaCierre] = useState(Math.max(1, semanas - 1));
  const [cerrando, setCerrando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeAdmin | null>(null);
  const { confirmar, dialogoConfirmar } = useConfirmar();

  const descargar = async () => {
    setDescargando(true);
    try {
      const { alumnos, registros } = await datosReporte();
      await descargarExcel(`asistencia-ciclo-semana-${semanas}.xlsx`, [tablaAsistencia(alumnos, registros, semanas)]);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo generar el reporte.") });
    } finally {
      setDescargando(false);
    }
  };

  const descargarCatequesis = async () => {
    setDescargandoCatequesis(true);
    try {
      const { sesiones, alumnos, marcas } = await datosCatequesisCiclo();
      if (sesiones.length === 0) {
        setMensaje({ tipo: "error", texto: "Todavía no hay sesiones de catequesis en este ciclo." });
        return;
      }
      await descargarExcel(`catequesis-ciclo-${hoyEnLima()}.xlsx`, [tablaCatequesisCiclo(sesiones, alumnos, marcas)]);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo generar el reporte de catequesis.") });
    } finally {
      setDescargandoCatequesis(false);
    }
  };

  const cerrar = async () => {
    const seguro = await confirmar({
      titulo: `¿Cerrar la semana ${semanaCierre}?`,
      mensaje: "Los alumnos que no enviaron foto quedarán con falta.",
      aceptar: "Cerrar semana",
      peligro: true,
    });
    if (!seguro) return;
    setCerrando(true);
    try {
      const marcadas = await cerrarSemana(semanaCierre);
      setMensaje({ tipo: "ok", texto: `Semana ${semanaCierre} cerrada: ${marcadas} faltas registradas.` });
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo cerrar la semana.") });
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Mensaje mensaje={mensaje} />

      <Tarjeta
        titulo="Reporte del ciclo"
        descripcion={`Todos los alumnos activos, semana por semana hasta la semana ${semanas}, con sus totales.`}
      >
        <Boton onClick={descargar} disabled={descargando || semanas < 1}>
          {descargando ? "Generando…" : "Descargar Excel"}
        </Boton>
      </Tarjeta>

      <Tarjeta
        titulo="Catequesis del ciclo"
        descripcion="Una fila por alumno y sesión de todas las comunidades, con fecha, estado y motivo. En Excel puedes filtrar por comunidad, fecha o estado."
      >
        <Boton onClick={descargarCatequesis} disabled={descargandoCatequesis}>
          {descargandoCatequesis ? "Generando…" : "Descargar catequesis (Excel)"}
        </Boton>
      </Tarjeta>

      <Tarjeta
        titulo="Cerrar una semana a mano"
        descripcion="Normalmente no hace falta: cada jueves a las 00:05 la semana anterior se cierra sola. Úsalo solo si el cierre automático no corrió."
      >
        <div className="flex flex-wrap items-end gap-2">
          {/* Solo semanas que ya pasaron: no se puede cerrar una semana futura */}
          <Campo etiqueta="Semana">
            <select
              value={semanaCierre}
              onChange={(e) => setSemanaCierre(Number(e.target.value))}
              disabled={semanas < 1}
              className={`${claseInput} w-40 cursor-pointer`}
            >
              {Array.from({ length: semanas }, (_, i) => semanas - i).map((n) => (
                <option key={n} value={n}>
                  Semana {n}
                </option>
              ))}
            </select>
          </Campo>
          <Boton variante="secundario" onClick={cerrar} disabled={cerrando || semanas < 1}>
            {cerrando ? "Cerrando…" : "Cerrar semana"}
          </Boton>
        </div>
      </Tarjeta>

      {dialogoConfirmar}
    </div>
  );
}
