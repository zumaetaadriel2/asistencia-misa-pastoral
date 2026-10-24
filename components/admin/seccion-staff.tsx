"use client";

import { useEffect, useState } from "react";
import {
  actualizarStaff,
  asignarComunidad,
  comunidadesDelCicloActivo,
  crearStaff,
  listarStaff,
  type Comunidad,
  type MiembroStaff,
} from "@/lib/staff/admin";
import { coincide } from "@/lib/staff/busqueda";
import type { FuncionComunidad } from "@/lib/staff/catequesis";
import { mensajeDe } from "@/lib/staff/errores";
import type { PerfilStaff, RolStaff } from "@/lib/staff/revision";
import { Boton, Buscador, Campo, Cargando, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";

// Lo que hace en cada comunidad: el guía también pasa lista; el catequista solo eso
const GRUPOS: { funcion: FuncionComunidad; titulo: string; elegida: string }[] = [
  { funcion: "guia", titulo: "Guía en", elegida: "bg-marca/15 border-marca/50 text-texto font-semibold" },
  { funcion: "catequista", titulo: "Catequista en", elegida: "bg-info/15 border-info/50 text-texto font-semibold" },
];

export function SeccionStaff({ perfil }: { perfil: PerfilStaff }) {
  const [staff, setStaff] = useState<MiembroStaff[] | null>(null);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [recargas, setRecargas] = useState(0);
  const [mensaje, setMensaje] = useState<MensajeAdmin | null>(null);
  const [nuevo, setNuevo] = useState<{ nombre: string; email: string; rol: RolStaff }>({
    nombre: "",
    email: "",
    rol: "guia",
  });
  const [agregando, setAgregando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const { confirmar, dialogoConfirmar } = useConfirmar();

  useEffect(() => {
    let cancelado = false;
    Promise.all([listarStaff(), comunidadesDelCicloActivo()])
      .then(([lista, { comunidades: delCiclo }]) => {
        if (cancelado) return;
        setStaff(lista);
        setComunidades(delCiclo.filter((c) => c.activa));
      })
      .catch((e) => {
        if (!cancelado) setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo cargar el staff.") });
      });
    return () => {
      cancelado = true;
    };
  }, [recargas]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgregando(true);
    try {
      await crearStaff(nuevo);
      setMensaje({
        tipo: "ok",
        texto:
          `${nuevo.nombre.trim()} ya puede entrar con "Entrar con Google" usando ${nuevo.email.trim()}.` +
          (nuevo.rol === "admin" ? "" : " Asígnale abajo sus comunidades."),
      });
      setNuevo({ nombre: "", email: "", rol: "guia" });
      setRecargas((n) => n + 1);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: mensajeDe(error, "No se pudo agregar.", { duplicado: "Ese correo ya está registrado." }),
      });
    } finally {
      setAgregando(false);
    }
  };

  const cambiar = async (miembro: MiembroStaff, cambios: Partial<Pick<MiembroStaff, "rol" | "activo">>) => {
    // Desactivar o dar acceso de administrador se confirma antes
    if (cambios.activo === false) {
      const seguro = await confirmar({
        titulo: `¿Desactivar a ${miembro.nombre}?`,
        mensaje: "Ya no podrá entrar al panel. Puedes volver a activarlo cuando quieras.",
        aceptar: "Desactivar",
        peligro: true,
      });
      if (!seguro) return;
    }
    if (cambios.rol === "admin") {
      const seguro = await confirmar({
        titulo: `¿Hacer administrador a ${miembro.nombre}?`,
        mensaje: "Verá todas las comunidades y podrá cambiar ciclos, comunidades, staff y alumnos.",
        aceptar: "Hacer administrador",
        peligro: true,
      });
      if (!seguro) return;
    }
    try {
      await actualizarStaff(miembro.id, cambios);
      setStaff((prev) => prev?.map((m) => (m.id === miembro.id ? { ...m, ...cambios } : m)) ?? prev);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo actualizar.") });
    }
  };

  /** Tocar una comunidad en "Guía en" o "Catequista en": la asigna con esa función, o se la quita si ya la tenía */
  const alternarComunidad = async (miembro: MiembroStaff, comunidad: Comunidad, funcion: FuncionComunidad) => {
    const actual = miembro.funciones[comunidad.id];
    const nueva = actual === funcion ? null : funcion;
    // De catequista a guía gana acceso a las fotos de menores y a los códigos
    if (actual === "catequista" && nueva === "guia") {
      const seguro = await confirmar({
        titulo: `¿Hacer guía a ${miembro.nombre} en ${comunidad.nombre}?`,
        mensaje: "Además de pasar lista, verá las fotos de misa, la asistencia y los códigos de esa comunidad.",
        aceptar: "Hacer guía",
      });
      if (!seguro) return;
    }
    try {
      await asignarComunidad(miembro.id, comunidad.id, nueva);
      setStaff(
        (prev) =>
          prev?.map((m) => {
            if (m.id !== miembro.id) return m;
            const funciones = { ...m.funciones };
            if (nueva) funciones[comunidad.id] = nueva;
            else delete funciones[comunidad.id];
            return { ...m, funciones };
          }) ?? prev
      );
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo cambiar la asignación.") });
    }
  };

  if (!staff) return <Cargando />;
  const visibles = staff.filter((m) => coincide(busqueda, m.nombre, m.email));

  return (
    <div className="space-y-4">
      <Mensaje mensaje={mensaje} />

      <Tarjeta
        titulo="Agregar guía, catequista o administrador"
        descripcion="Usa el correo de su cuenta de Google: con él entrará a la app. Solo los correos registrados aquí pueden entrar."
      >
        <form onSubmit={crear} className="grid gap-3 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end">
          <Campo etiqueta="Nombre">
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              required
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Correo de Google">
            <input
              type="email"
              value={nuevo.email}
              onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
              required
              placeholder="correo@gmail.com"
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Rol">
            <select
              value={nuevo.rol}
              onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as RolStaff })}
              className={`${claseInput} cursor-pointer`}
            >
              <option value="guia">Guía o catequista</option>
              <option value="admin">Administrador</option>
            </select>
          </Campo>
          <Boton type="submit" disabled={agregando}>
            {agregando ? "Agregando…" : "Agregar"}
          </Boton>
        </form>
      </Tarjeta>

      <Tarjeta
        titulo={`Staff (${staff.length})`}
        descripcion="Toca una comunidad para asignarla o quitarla. El guía revisa fotos, ve la misa y los códigos y pasa lista; el catequista solo pasa lista. El administrador ve todas."
      >
        <Buscador valor={busqueda} onCambiar={setBusqueda} etiqueta="Buscar por nombre o correo" />
        {visibles.length === 0 && <p className="mt-3 text-sm text-texto-tenue">Nadie coincide con «{busqueda}».</p>}
        <ul className="mt-2 divide-y divide-borde">
          {visibles.map((miembro) => {
            const esUnoMismo = miembro.id === perfil.id;
            return (
              <li key={miembro.id} className={`py-3 ${miembro.activo ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-texto">
                      {miembro.nombre}
                      {!miembro.activo && <span className="text-xs text-texto-tenue"> (inactivo)</span>}
                      {esUnoMismo && <span className="text-xs text-texto-tenue"> (tú)</span>}
                    </p>
                    <p className="text-xs text-texto-tenue">{miembro.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={miembro.rol}
                      disabled={esUnoMismo}
                      aria-label={`Rol de ${miembro.nombre}`}
                      onChange={(e) => cambiar(miembro, { rol: e.target.value as RolStaff })}
                      className="min-h-11 px-3 rounded-lg bg-superficie-2 border border-borde text-texto text-sm cursor-pointer disabled:opacity-40"
                    >
                      <option value="guia">Guía o catequista</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <Boton
                      variante="secundario"
                      tamano="pequeno"
                      onClick={() => cambiar(miembro, { activo: !miembro.activo })}
                      disabled={esUnoMismo}
                    >
                      {miembro.activo ? "Desactivar" : "Activar"}
                    </Boton>
                  </div>
                </div>
                {miembro.rol === "guia" &&
                  GRUPOS.map((grupo) => (
                    <div key={grupo.funcion} className="mt-2">
                      <p className="text-xs font-medium text-texto-suave">{grupo.titulo}</p>
                      <div
                        className="mt-1 flex flex-wrap gap-1.5"
                        role="group"
                        aria-label={`${miembro.nombre}: ${grupo.titulo.toLowerCase()}`}
                      >
                        {comunidades.map((comunidad) => {
                          const funcion = miembro.funciones[comunidad.id];
                          const elegida = funcion === grupo.funcion;
                          return (
                            <button
                              key={comunidad.id}
                              onClick={() => alternarComunidad(miembro, comunidad, grupo.funcion)}
                              aria-pressed={elegida}
                              title={
                                funcion && !elegida
                                  ? `Ahora es ${funcion === "guia" ? "guía" : "catequista"} aquí: tócala para cambiarlo`
                                  : undefined
                              }
                              className={`min-h-9 px-3 rounded-full border text-xs transition-all ${
                                elegida
                                  ? grupo.elegida
                                  : funcion
                                    ? "bg-superficie-2 border-dashed border-borde text-texto-tenue hover:text-texto"
                                    : "bg-superficie-2 border-borde text-texto-suave hover:text-texto"
                              }`}
                            >
                              {elegida && "✓ "}
                              {comunidad.nombre}
                              <span className="text-texto-tenue">
                                {" "}
                                · {comunidad.programa === "confirmacion" ? "Conf." : "Com."}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </li>
            );
          })}
        </ul>
      </Tarjeta>

      {dialogoConfirmar}
    </div>
  );
}
