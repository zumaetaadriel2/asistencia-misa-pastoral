"use client";

import { useEffect, useState } from "react";
import {
  cambiarComunidadActiva,
  comunidadesDelCicloActivo,
  crearComunidad,
  type Ciclo,
  type Comunidad,
} from "@/lib/staff/admin";
import { mensajeDe } from "@/lib/staff/errores";
import type { Programa } from "@/lib/staff/revision";
import { Boton, Campo, Cargando, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";

const PROGRAMAS: { valor: Programa; texto: string }[] = [
  { valor: "confirmacion", texto: "Confirmación" },
  { valor: "primera_comunion", texto: "Primera Comunión" },
];

export function SeccionComunidades() {
  const [datos, setDatos] = useState<{ ciclo: Ciclo | null; comunidades: Comunidad[] } | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [mensaje, setMensaje] = useState<MensajeAdmin | null>(null);
  const [programa, setPrograma] = useState<Programa>("confirmacion");
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const { confirmar, dialogoConfirmar } = useConfirmar();

  useEffect(() => {
    let cancelado = false;
    comunidadesDelCicloActivo()
      .then((resultado) => {
        if (!cancelado) setDatos(resultado);
      })
      .catch((e) => {
        if (!cancelado) setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudieron cargar las comunidades.") });
      });
    return () => {
      cancelado = true;
    };
  }, [recargas]);

  if (!datos) return <Cargando />;
  const { ciclo, comunidades } = datos;
  if (!ciclo) return <Mensaje mensaje={{ tipo: "error", texto: "No hay un ciclo activo. Créalo en la pestaña Ciclo." }} />;

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreando(true);
    try {
      await crearComunidad(ciclo.id, programa, nombre);
      setMensaje({ tipo: "ok", texto: `Comunidad "${nombre.trim()}" creada.` });
      setNombre("");
      setRecargas((n) => n + 1);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: mensajeDe(error, "No se pudo crear la comunidad.", {
          duplicado: "Ya existe una comunidad con ese nombre en ese programa.",
        }),
      });
    } finally {
      setCreando(false);
    }
  };

  const alternar = async (comunidad: Comunidad) => {
    if (comunidad.activa) {
      const seguro = await confirmar({
        titulo: `¿Desactivar "${comunidad.nombre}"?`,
        mensaje: "Sus alumnos no podrán entrar a enviar fotos hasta que la vuelvas a activar. Sus registros se conservan.",
        aceptar: "Desactivar",
        peligro: true,
      });
      if (!seguro) return;
    }
    try {
      await cambiarComunidadActiva(comunidad.id, !comunidad.activa);
      setMensaje({ tipo: "ok", texto: `"${comunidad.nombre}" ${comunidad.activa ? "desactivada" : "activada"}.` });
      setRecargas((n) => n + 1);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo actualizar la comunidad.") });
    }
  };

  return (
    <div className="space-y-4">
      <Mensaje mensaje={mensaje} />

      <Tarjeta titulo="Nueva comunidad" descripcion={`Se crea en el ${ciclo.nombre}.`}>
        <form onSubmit={crear} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <Campo etiqueta="Programa">
            <select
              value={programa}
              onChange={(e) => setPrograma(e.target.value as Programa)}
              className={`${claseInput} cursor-pointer`}
            >
              {PROGRAMAS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.texto}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Nombre">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. San Pablo"
              className={claseInput}
            />
          </Campo>
          <Boton type="submit" disabled={creando}>
            {creando ? "Creando…" : "Crear"}
          </Boton>
        </form>
      </Tarjeta>

      {PROGRAMAS.map((p) => {
        const delPrograma = comunidades.filter((c) => c.programa === p.valor);
        return (
          <Tarjeta key={p.valor} titulo={`${p.texto} (${delPrograma.length})`}>
            {delPrograma.length === 0 ? (
              <p className="text-sm text-texto-tenue">Sin comunidades.</p>
            ) : (
              <ul className="divide-y divide-borde">
                {delPrograma.map((comunidad) => (
                  <li key={comunidad.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                    {comunidad.activa ? (
                      <span className="text-texto">{comunidad.nombre}</span>
                    ) : (
                      <span className="text-texto-tenue">
                        <span className="line-through">{comunidad.nombre}</span> (inactiva)
                      </span>
                    )}
                    <Boton variante="secundario" tamano="pequeno" onClick={() => alternar(comunidad)}>
                      {comunidad.activa ? "Desactivar" : "Activar"}
                    </Boton>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        );
      })}

      {dialogoConfirmar}
    </div>
  );
}
