"use client";

import { useState } from "react";
import { cerrarSemana, datosReporte } from "@/lib/staff/admin";
import { mensajeDe } from "@/lib/staff/errores";
import { armarCsvAsistencia, descargarCsv } from "@/lib/staff/reporte";
import type { PerfilStaff } from "@/lib/staff/revision";
import { claseBoton, claseBotonSecundario, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "./ui";

export function SeccionReportes({ perfil }: { perfil: PerfilStaff }) {
  const semanas = perfil.semana_reciente ?? 0;
  const [descargando, setDescargando] = useState(false);
  const [semanaCierre, setSemanaCierre] = useState(Math.max(1, semanas - 1));
  const [cerrando, setCerrando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeAdmin | null>(null);

  const descargar = async () => {
    setDescargando(true);
    try {
      const { alumnos, registros } = await datosReporte();
      descargarCsv(`asistencia-ciclo-semana-${semanas}.csv`, armarCsvAsistencia(alumnos, registros, semanas));
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo generar el reporte.") });
    } finally {
      setDescargando(false);
    }
  };

  const cerrar = async () => {
    const confirmado = window.confirm(
      `¿Cerrar la semana ${semanaCierre}? Los alumnos que no enviaron foto quedarán con falta.`
    );
    if (!confirmado) return;
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
        descripcion={`Todos los alumnos activos, semana por semana hasta la semana ${semanas}, con sus totales. Se abre con Excel.`}
      >
        <button onClick={descargar} disabled={descargando || semanas < 1} className={claseBoton}>
          {descargando ? "Generando…" : "Descargar Excel (CSV)"}
        </button>
      </Tarjeta>

      <Tarjeta
        titulo="Cerrar una semana a mano"
        descripcion="Normalmente no hace falta: cada jueves a las 00:05 la semana anterior se cierra sola. Úsalo solo si el cierre automático no corrió."
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-white/60 flex items-center gap-2">
            Semana
            <input
              type="number"
              min={1}
              value={semanaCierre}
              onChange={(e) => setSemanaCierre(Number(e.target.value))}
              className={`${claseInput} w-20`}
            />
          </label>
          <button onClick={cerrar} disabled={cerrando || semanaCierre < 1} className={claseBotonSecundario}>
            {cerrando ? "Cerrando…" : "Cerrar semana"}
          </button>
        </div>
      </Tarjeta>
    </div>
  );
}
