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
import { mensajeDe } from "@/lib/staff/errores";
import type { PerfilStaff, RolStaff } from "@/lib/staff/revision";
import { Cargando, claseBoton, claseBotonSecundario, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "./ui";

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
    try {
      await crearStaff(nuevo);
      setMensaje({
        tipo: "ok",
        texto: `${nuevo.nombre.trim()} ya puede entrar con "Entrar con Google" usando ${nuevo.email.trim()}.`,
      });
      setNuevo({ nombre: "", email: "", rol: "guia" });
      setRecargas((n) => n + 1);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: mensajeDe(error, "No se pudo agregar.", { duplicado: "Ese correo ya está registrado." }),
      });
    }
  };

  const cambiar = async (miembro: MiembroStaff, cambios: Partial<Pick<MiembroStaff, "rol" | "activo">>) => {
    try {
      await actualizarStaff(miembro.id, cambios);
      setStaff((prev) => prev?.map((m) => (m.id === miembro.id ? { ...m, ...cambios } : m)) ?? prev);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo actualizar.") });
    }
  };

  const alternarComunidad = async (miembro: MiembroStaff, comunidadId: number) => {
    const asignado = !miembro.comunidades.includes(comunidadId);
    try {
      await asignarComunidad(miembro.id, comunidadId, asignado);
      setStaff(
        (prev) =>
          prev?.map((m) =>
            m.id === miembro.id
              ? {
                  ...m,
                  comunidades: asignado ? [...m.comunidades, comunidadId] : m.comunidades.filter((id) => id !== comunidadId),
                }
              : m
          ) ?? prev
      );
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo cambiar la asignación.") });
    }
  };

  if (!staff) return <Cargando />;

  return (
    <div className="space-y-4">
      <Mensaje mensaje={mensaje} />

      <Tarjeta
        titulo="Agregar guía o administrador"
        descripcion="Usa el correo de su cuenta de Google: con él entrará a la app. Solo los correos registrados aquí pueden entrar."
      >
        <form onSubmit={crear} className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto]">
          <input
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            required
            placeholder="Nombre"
            className={claseInput}
          />
          <input
            type="email"
            value={nuevo.email}
            onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
            required
            placeholder="correo@gmail.com"
            className={claseInput}
          />
          <select
            value={nuevo.rol}
            onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as RolStaff })}
            className={`${claseInput} appearance-none cursor-pointer`}
          >
            <option value="guia" className="bg-neutral-900">
              Guía
            </option>
            <option value="admin" className="bg-neutral-900">
              Administrador
            </option>
          </select>
          <button type="submit" className={claseBoton}>
            Agregar
          </button>
        </form>
      </Tarjeta>

      <Tarjeta titulo={`Staff (${staff.length})`} descripcion="Toca una comunidad para asignarla o quitarla. El administrador ve todas.">
        <ul className="divide-y divide-white/5">
          {staff.map((miembro) => {
            const esUnoMismo = miembro.id === perfil.id;
            return (
              <li key={miembro.id} className={`py-3 ${miembro.activo ? "" : "opacity-50"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-white/90">
                      {miembro.nombre}
                      {!miembro.activo && <span className="text-xs text-white/40"> (inactivo)</span>}
                    </p>
                    <p className="text-xs text-white/40">{miembro.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={miembro.rol}
                      disabled={esUnoMismo}
                      onChange={(e) => cambiar(miembro, { rol: e.target.value as RolStaff })}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs appearance-none disabled:opacity-40"
                    >
                      <option value="guia" className="bg-neutral-900">
                        Guía
                      </option>
                      <option value="admin" className="bg-neutral-900">
                        Administrador
                      </option>
                    </select>
                    <button
                      onClick={() => cambiar(miembro, { activo: !miembro.activo })}
                      disabled={esUnoMismo}
                      className={claseBotonSecundario}
                    >
                      {miembro.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
                {miembro.rol === "guia" && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {comunidades.map((comunidad) => {
                      const asignada = miembro.comunidades.includes(comunidad.id);
                      return (
                        <button
                          key={comunidad.id}
                          onClick={() => alternarComunidad(miembro, comunidad.id)}
                          className={`px-2.5 py-1 rounded-full border text-[11px] transition-all ${
                            asignada
                              ? "bg-primary-600/30 border-primary-500/50 text-white"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                          }`}
                        >
                          {comunidad.nombre}
                          <span className="opacity-60"> · {comunidad.programa === "confirmacion" ? "Conf." : "Com."}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Tarjeta>
    </div>
  );
}
