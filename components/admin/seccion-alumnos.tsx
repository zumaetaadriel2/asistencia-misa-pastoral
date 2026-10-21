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
import { coincide } from "@/lib/staff/busqueda";
import { mensajeDe } from "@/lib/staff/errores";
import { parsearNombres } from "@/lib/staff/importacion";
import { Boton, Buscador, Campo, Cargando, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";

export function SeccionAlumnos() {
  const [comunidades, setComunidades] = useState<Comunidad[] | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [alumnos, setAlumnos] = useState<{ clave: string; lista: Alumno[] } | null>(null);
  const [texto, setTexto] = useState("");
  const [importando, setImportando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeAdmin | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const { confirmar, dialogoConfirmar } = useConfirmar();

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
    if (alumno.activo) {
      const seguro = await confirmar({
        titulo: `¿Dar de baja a ${alumno.nombre_completo}?`,
        mensaje: "Su código dejará de funcionar. Su historial se conserva y puedes reactivarlo cuando quieras.",
        aceptar: "Dar de baja",
        peligro: true,
      });
      if (!seguro) return;
    }
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

      <Campo etiqueta="Comunidad">
        <select
          value={comunidadId ?? ""}
          onChange={(e) => setElegida(Number(e.target.value))}
          className={`${claseInput} cursor-pointer`}
        >
          {comunidades.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} · {c.programa === "confirmacion" ? "Confirmación" : "Primera Comunión"}
            </option>
          ))}
        </select>
      </Campo>

      <Tarjeta
        titulo="Importar desde Excel"
        descripcion="Copia la columna de nombres en Excel y pégala aquí, un alumno por línea. Si copias varias columnas se usa la primera."
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          aria-label="Nombres de los alumnos, uno por línea"
          placeholder={"Ana Pérez Torres\nBruno Díaz Ruiz\n…"}
          className={`${claseInput} resize-y font-mono`}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-texto-suave" aria-live="polite">
            {lista.nombres.length} nombres para importar
            {lista.repetidos.length > 0 && ` · ${lista.repetidos.length} repetidos en lo pegado (se importan una vez)`}
          </p>
          <Boton onClick={importar} disabled={importando || lista.nombres.length === 0}>
            {importando ? "Importando…" : "Importar alumnos"}
          </Boton>
        </div>
      </Tarjeta>

      <Tarjeta titulo={`Alumnos de la comunidad (${alumnos?.clave === clave ? alumnos.lista.length : "…"})`}>
        {alumnos?.clave !== clave ? (
          <Cargando />
        ) : alumnos.lista.length === 0 ? (
          <p className="text-sm text-texto-tenue">Todavía no hay alumnos.</p>
        ) : (
          <>
            <Buscador valor={busqueda} onCambiar={setBusqueda} />
            <ListaAlumnos
              alumnos={alumnos.lista.filter((a) => coincide(busqueda, a.nombre_completo))}
              busqueda={busqueda}
              onAlternar={alternar}
            />
          </>
        )}
      </Tarjeta>

      {dialogoConfirmar}
    </div>
  );
}

function ListaAlumnos({
  alumnos,
  busqueda,
  onAlternar,
}: {
  alumnos: Alumno[];
  busqueda: string;
  onAlternar: (alumno: Alumno) => void;
}) {
  if (alumnos.length === 0) return <p className="mt-3 text-sm text-texto-tenue">Ningún alumno coincide con «{busqueda}».</p>;

  return (
    <ul className="mt-2 divide-y divide-borde">
      {alumnos.map((alumno) => (
        <li key={alumno.id} className="py-2 flex items-center justify-between gap-2">
          <span className={`text-sm ${alumno.activo ? "text-texto" : "text-texto-tenue"}`}>
            <span className={alumno.activo ? "" : "line-through"}>{alumno.nombre_completo}</span>
            {!alumno.activo && " (de baja)"}
            <span className="ml-2 font-mono text-xs text-marca">{alumno.codigo}</span>
          </span>
          <Boton variante="secundario" tamano="pequeno" onClick={() => onAlternar(alumno)}>
            {alumno.activo ? "Dar de baja" : "Reactivar"}
          </Boton>
        </li>
      ))}
    </ul>
  );
}
