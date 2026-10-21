"use client";

import { useEffect, useState } from "react";
import {
  justificarFalta,
  obtenerAlumnos,
  obtenerMisComunidades,
  obtenerRegistros,
  regenerarCodigo,
  type AlumnoComunidad,
  type ComunidadStaff,
  type RegistroSemana,
} from "@/lib/staff/comunidad";
import { datosReporte } from "@/lib/staff/admin";
import { mensajeDe } from "@/lib/staff/errores";
import { armarCsvAsistencia, descargarCsv } from "@/lib/staff/reporte";
import type { PerfilStaff } from "@/lib/staff/revision";
import { CodigosImprimibles } from "./codigos-imprimibles";
import { MatrizAsistencia } from "./matriz-asistencia";
import { ModalJustificar } from "./modal-justificar";

const NOMBRE_PROGRAMA = { confirmacion: "Confirmación", primera_comunion: "Primera Comunión" } as const;

function nombreArchivo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Alumnos de una comunidad: asistencia semana a semana, códigos y justificaciones */
export function VistaComunidad({ perfil }: { perfil: PerfilStaff }) {
  const [comunidades, setComunidades] = useState<ComunidadStaff[] | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [datos, setDatos] = useState<{
    clave: string;
    alumnos: AlumnoComunidad[];
    registros: RegistroSemana[];
  } | null>(null);
  const [justificando, setJustificando] = useState<{ alumno: AlumnoComunidad; semana: number } | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  const semanas = perfil.semana_reciente ?? 0;
  const comunidadId = elegida ?? comunidades?.[0]?.id ?? null;
  const comunidad = comunidades?.find((c) => c.id === comunidadId) ?? null;
  const clave = `${comunidadId}#${recargas}`;

  useEffect(() => {
    let cancelado = false;
    obtenerMisComunidades()
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
    Promise.all([obtenerAlumnos(comunidadId), obtenerRegistros(comunidadId)])
      .then(([alumnos, registros]) => {
        if (!cancelado) setDatos({ clave, alumnos, registros });
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDe(e, "No se pudo cargar la asistencia."));
      });
    return () => {
      cancelado = true;
    };
  }, [comunidadId, clave]);

  const nuevoCodigo = async (alumno: AlumnoComunidad) => {
    const confirmado = window.confirm(
      `¿Dar un código nuevo a ${alumno.nombre_completo}? El código actual dejará de funcionar.`
    );
    if (!confirmado) return;
    try {
      const codigo = await regenerarCodigo(alumno.id);
      setDatos((prev) =>
        prev && { ...prev, alumnos: prev.alumnos.map((a) => (a.id === alumno.id ? { ...a, codigo } : a)) }
      );
    } catch (e) {
      setError(mensajeDe(e, "No se pudo generar el código."));
    }
  };

  const confirmarJustificacion = async (motivo: string) => {
    if (!justificando) return;
    try {
      await justificarFalta(justificando.alumno.id, justificando.semana, motivo);
      setJustificando(null);
      setRecargas((n) => n + 1);
    } catch (e) {
      setError(mensajeDe(e, "No se pudo justificar."));
      setJustificando(null);
    }
  };

  const descargar = async () => {
    if (!comunidad) return;
    setDescargando(true);
    try {
      const { alumnos, registros } = await datosReporte(comunidad.id);
      descargarCsv(
        `asistencia-${nombreArchivo(comunidad.nombre)}-semana-${semanas}.csv`,
        armarCsvAsistencia(alumnos, registros, semanas)
      );
    } catch (e) {
      setError(mensajeDe(e, "No se pudo generar el reporte."));
    } finally {
      setDescargando(false);
    }
  };

  if (comunidades === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!comunidad) {
    return (
      <p className="text-sm text-white/50 text-center py-12">
        No tienes comunidades asignadas en el ciclo activo. Pide a un administrador que te asigne una.
      </p>
    );
  }

  const listos = datos?.clave === clave ? datos : null;

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* ── Herramientas ── */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {comunidades.length > 1 ? (
          <select
            value={comunidad.id}
            onChange={(e) => setElegida(Number(e.target.value))}
            className="flex-1 min-w-48 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none cursor-pointer"
          >
            {comunidades.map((c) => (
              <option key={c.id} value={c.id} className="bg-neutral-900">
                {c.nombre} · {NOMBRE_PROGRAMA[c.programa]}
              </option>
            ))}
          </select>
        ) : (
          <p className="flex-1 text-sm text-white/70">
            {comunidad.nombre} · {NOMBRE_PROGRAMA[comunidad.programa]}
          </p>
        )}
        <button
          onClick={() => window.print()}
          disabled={!listos}
          className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold transition-all disabled:opacity-30"
        >
          Imprimir códigos
        </button>
        <button
          onClick={descargar}
          disabled={descargando || semanas < 1}
          className="px-3 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20
                     text-emerald-300 text-xs font-semibold transition-all disabled:opacity-30"
        >
          {descargando ? "Generando…" : "Descargar Excel"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2 print:hidden">
          <p className="text-sm text-rose-300">{error}</p>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-300 text-xs">
            Cerrar
          </button>
        </div>
      )}

      {/* ── Matriz ── */}
      {listos ? (
        <>
          <div className="print:hidden">
            <MatrizAsistencia
              alumnos={listos.alumnos}
              registros={listos.registros}
              semanas={semanas}
              onJustificar={(alumno, semana) => setJustificando({ alumno, semana })}
              onNuevoCodigo={nuevoCodigo}
            />
          </div>
          <CodigosImprimibles comunidad={comunidad.nombre} alumnos={listos.alumnos} />
        </>
      ) : (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      )}

      {justificando && (
        <ModalJustificar
          alumno={justificando.alumno.nombre_completo}
          semana={justificando.semana}
          onCerrar={() => setJustificando(null)}
          onConfirmar={confirmarJustificacion}
        />
      )}
    </div>
  );
}
