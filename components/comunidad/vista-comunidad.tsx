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
import { coincide } from "@/lib/staff/busqueda";
import { mensajeDe } from "@/lib/staff/errores";
import { descargarExcel } from "@/lib/excel/libro";
import { nombreArchivo, tablaAsistencia } from "@/lib/staff/reporte";
import type { PerfilStaff } from "@/lib/staff/revision";
import { Boton, Buscador, claseInput } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";
import { CodigosImprimibles } from "./codigos-imprimibles";
import { MatrizAsistencia } from "./matriz-asistencia";
import { ModalJustificar } from "./modal-justificar";

const NOMBRE_PROGRAMA = { confirmacion: "Confirmación", primera_comunion: "Primera Comunión" } as const;

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
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const { confirmar, dialogoConfirmar } = useConfirmar();

  const semanas = perfil.semana_reciente ?? 0;
  const comunidadId = elegida ?? comunidades?.[0]?.id ?? null;
  const comunidad = comunidades?.find((c) => c.id === comunidadId) ?? null;
  const clave = `${comunidadId}#${recargas}`;

  useEffect(() => {
    let cancelado = false;
    obtenerMisComunidades(perfil)
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
  }, [perfil]);

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
    const seguro = await confirmar({
      titulo: `¿Dar un código nuevo a ${alumno.nombre_completo}?`,
      mensaje: "El código actual dejará de funcionar y tendrás que darle el nuevo.",
      aceptar: "Dar código nuevo",
      peligro: true,
    });
    if (!seguro) return;
    try {
      const codigo = await regenerarCodigo(alumno.id);
      setDatos((prev) =>
        prev && { ...prev, alumnos: prev.alumnos.map((a) => (a.id === alumno.id ? { ...a, codigo } : a)) }
      );
      setAviso(`Nuevo código de ${alumno.nombre_completo}: ${codigo}`);
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
      await descargarExcel(`asistencia-${nombreArchivo(comunidad.nombre)}-semana-${semanas}.xlsx`, [
        tablaAsistencia(alumnos, registros, semanas),
      ]);
    } catch (e) {
      setError(mensajeDe(e, "No se pudo generar el reporte."));
    } finally {
      setDescargando(false);
    }
  };

  if (comunidades === null) {
    return (
      <div role="status" className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-marca border-t-transparent animate-spin" />
        <span className="sr-only">Cargando…</span>
      </div>
    );
  }

  if (!comunidad) {
    return (
      <p className="text-sm text-texto-tenue text-center py-12">
        No tienes comunidades asignadas en el ciclo activo. Pide a un administrador que te asigne una.
      </p>
    );
  }

  const listos = datos?.clave === clave ? datos : null;
  const alumnosVisibles = listos?.alumnos.filter((a) => coincide(busqueda, a.nombre_completo)) ?? [];

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* ── Herramientas ── */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {comunidades.length > 1 ? (
          <select
            value={comunidad.id}
            onChange={(e) => setElegida(Number(e.target.value))}
            aria-label="Comunidad"
            className={`${claseInput} flex-1 min-w-48 w-auto cursor-pointer`}
          >
            {comunidades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {NOMBRE_PROGRAMA[c.programa]}
              </option>
            ))}
          </select>
        ) : (
          <p className="flex-1 text-sm text-texto-suave">
            {comunidad.nombre} · {NOMBRE_PROGRAMA[comunidad.programa]}
          </p>
        )}
        <Boton variante="secundario" onClick={() => window.print()} disabled={!listos}>
          Imprimir códigos
        </Boton>
        <button
          onClick={descargar}
          disabled={descargando || semanas < 1}
          className="min-h-11 px-4 rounded-xl bg-exito/15 hover:bg-exito/25 border border-exito/25
                     text-exito text-sm font-semibold transition-all disabled:opacity-40"
        >
          {descargando ? "Generando…" : "Descargar Excel"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="pl-3 pr-1 py-1 rounded-xl bg-error/10 border border-error/25 flex items-center justify-between gap-2 print:hidden"
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
          className="pl-3 pr-1 py-1 rounded-xl bg-exito/10 border border-exito/25 flex items-center justify-between gap-2 print:hidden"
        >
          <p className="text-sm text-exito">{aviso}</p>
          <button onClick={() => setAviso("")} className="min-h-11 px-3 text-exito text-sm font-medium hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* ── Matriz ── */}
      {listos ? (
        <>
          <div className="print:hidden space-y-3">
            {listos.alumnos.length === 0 ? (
              <p className="text-sm text-texto-tenue text-center py-10">Esta comunidad todavía no tiene alumnos.</p>
            ) : (
              <>
                <Buscador valor={busqueda} onCambiar={setBusqueda} />
                {alumnosVisibles.length === 0 ? (
                  <p className="text-sm text-texto-tenue text-center py-6">Ningún alumno coincide con «{busqueda}».</p>
                ) : (
                  <MatrizAsistencia
                    alumnos={alumnosVisibles}
                    registros={listos.registros}
                    semanas={semanas}
                    onJustificar={(alumno, semana) => setJustificando({ alumno, semana })}
                    onNuevoCodigo={nuevoCodigo}
                  />
                )}
              </>
            )}
          </div>
          <CodigosImprimibles comunidad={comunidad.nombre} alumnos={listos.alumnos} />
        </>
      ) : (
        <div role="status" className="flex justify-center py-12">
          <div className="w-10 h-10 rounded-full border-2 border-marca border-t-transparent animate-spin" />
          <span className="sr-only">Cargando asistencia…</span>
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

      {dialogoConfirmar}
    </div>
  );
}
