"use client";

import { useEffect, useState } from "react";
import {
  cambiarAlumnoActivo,
  comunidadesDelCicloActivo,
  importarAlumnos,
  listarAlumnos,
  type Alumno,
  type Comunidad,
} from "@/lib/staff/admin";
import { mensajeDe } from "@/lib/staff/errores";
import { parsearNombres } from "@/lib/staff/importacion";
import { Cargando, claseBoton, claseBotonSecundario, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "./ui";

export function SeccionAlumnos() {
  const [comunidades, setComunidades] = useState<Comunidad[] | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [alumnos, setAlumnos] = useState<{ clave: string; lista: Alumno[] } | null>(null);
  const [texto, setTexto] = useState("");
  const [importando, setImportando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeAdmin | null>(null);

  const comunidadId = elegida ?? comunidades?.[0]?.id ?? null;
  const clave = `${comunidadId}#${recargas}`;
  const lista = parsearNombres(texto);

  useEffect(() => {
    let cancelado = false;
    comunidadesDelCicloActivo()
      .then(({ comunidades: delCiclo }) => {
        if (!cancelado) setComunidades(delCiclo.filter((c) => c.activa));
      })
      .catch((e) => {
        if (!cancelado) setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudieron cargar las comunidades.") });
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!comunidadId) return;
    let cancelado = false;
    listarAlumnos(comunidadId)
      .then((resultado) => {
        if (!cancelado) setAlumnos({ clave, lista: resultado });
      })
      .catch((e) => {
        if (!cancelado) setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudieron cargar los alumnos.") });
      });
    return () => {
      cancelado = true;
    };
  }, [comunidadId, clave]);

  const importar = async () => {
    if (!comunidadId || lista.nombres.length === 0) return;
    setImportando(true);
    try {
      const { agregados, repetidos } = await importarAlumnos(comunidadId, lista.nombres);
      setMensaje({
        tipo: "ok",
        texto:
          `Se agregaron ${agregados} alumnos.` +
          (repetidos > 0 ? ` ${repetidos} ya estaban registrados y no se duplicaron.` : "") +
          " Sus códigos se imprimen desde «Asistencia», en el menú de arriba.",
      });
      setTexto("");
      setRecargas((n) => n + 1);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo importar la lista.") });
    } finally {
      setImportando(false);
    }
  };

  const alternar = async (alumno: Alumno) => {
    try {
      await cambiarAlumnoActivo(alumno.id, !alumno.activo);
      setRecargas((n) => n + 1);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo actualizar el alumno.") });
    }
  };

  if (!comunidades) return <Cargando />;
  if (comunidades.length === 0) {
    return <Mensaje mensaje={{ tipo: "error", texto: "Primero crea comunidades en la pestaña Comunidades." }} />;
  }

  return (
    <div className="space-y-4">
      <Mensaje mensaje={mensaje} />

      <select
        value={comunidadId ?? ""}
        onChange={(e) => setElegida(Number(e.target.value))}
        className={`${claseInput} appearance-none cursor-pointer`}
      >
        {comunidades.map((c) => (
          <option key={c.id} value={c.id} className="bg-neutral-900">
            {c.nombre} · {c.programa === "confirmacion" ? "Confirmación" : "Primera Comunión"}
          </option>
        ))}
      </select>

      <Tarjeta
        titulo="Importar desde Excel"
        descripcion="Copia la columna de nombres en Excel y pégala aquí, un alumno por línea. Si copias varias columnas se usa la primera."
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          placeholder={"Ana Pérez Torres\nBruno Díaz Ruiz\n…"}
          className={`${claseInput} resize-y font-mono text-xs`}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-white/50">
            {lista.nombres.length} nombres para importar
            {lista.repetidos.length > 0 && ` · ${lista.repetidos.length} repetidos en lo pegado (se importan una vez)`}
          </p>
          <button onClick={importar} disabled={importando || lista.nombres.length === 0} className={claseBoton}>
            {importando ? "Importando…" : "Importar alumnos"}
          </button>
        </div>
      </Tarjeta>

      <Tarjeta titulo={`Alumnos de la comunidad (${alumnos?.clave === clave ? alumnos.lista.length : "…"})`}>
        {alumnos?.clave !== clave ? (
          <Cargando />
        ) : alumnos.lista.length === 0 ? (
          <p className="text-xs text-white/40">Todavía no hay alumnos.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {alumnos.lista.map((alumno) => (
              <li key={alumno.id} className="py-2 flex items-center justify-between gap-2">
                <span className={`text-sm ${alumno.activo ? "text-white/80" : "text-white/30 line-through"}`}>
                  {alumno.nombre_completo}
                  <span className="ml-2 font-mono text-xs text-primary-300/80">{alumno.codigo}</span>
                </span>
                <button onClick={() => alternar(alumno)} className={claseBotonSecundario}>
                  {alumno.activo ? "Dar de baja" : "Reactivar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
