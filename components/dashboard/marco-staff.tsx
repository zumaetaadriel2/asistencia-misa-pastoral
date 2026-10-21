"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cerrarSesion, useSesionStaff } from "@/lib/staff/sesion";
import type { PerfilStaff } from "@/lib/staff/revision";
import { LogoOvalo } from "@/components/ui/logo";

interface Props {
  /** Texto fijo o según el perfil (p. ej. "Mi comunidad" para guías y "Asistencia" para admins) */
  titulo: string | ((perfil: PerfilStaff) => string);
  /** Las tablas de comunidad y administración necesitan más espacio que la revisión */
  ancho?: "angosto" | "ancho";
  soloAdmin?: boolean;
  children: (perfil: PerfilStaff) => ReactNode;
}

function Aviso({ titulo, texto, accion }: { titulo: string; texto: string; accion: ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="tarjeta p-8 max-w-sm w-full text-center animate-fade-in">
        <h1 className="text-lg font-semibold text-texto mb-2">{titulo}</h1>
        <p className="text-sm text-texto-tenue mb-6">{texto}</p>
        {accion}
      </div>
    </main>
  );
}

/**
 * Marco de las páginas del staff: valida la sesión, muestra el encabezado y el menú,
 * y entrega el perfil a la página.
 */
export function MarcoStaff({ titulo, ancho = "angosto", soloAdmin = false, children }: Props) {
  const sesion = useSesionStaff();
  const router = useRouter();
  const ruta = usePathname();

  const salir = async () => {
    await cerrarSesion();
    router.push("/login");
  };

  if (sesion.estado === "cargando") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-marca border-t-transparent animate-spin" />
          <p className="text-sm text-texto-tenue">Cargando panel…</p>
        </div>
      </main>
    );
  }

  const botonSalir = (
    <button
      onClick={salir}
      className="px-6 py-2.5 rounded-xl bg-marca-solido hover:bg-marca-solido/85 text-white text-sm font-medium transition-colors"
    >
      Volver al inicio de sesión
    </button>
  );

  if (sesion.estado === "sin-acceso") {
    return (
      <Aviso
        titulo="Sin acceso"
        texto="Tu cuenta no está registrada como staff activo de la pastoral. Habla con un administrador."
        accion={botonSalir}
      />
    );
  }
  if (sesion.estado === "error") {
    return <Aviso titulo="Error" texto={sesion.mensaje} accion={botonSalir} />;
  }

  const { perfil } = sesion;
  const esAdmin = perfil.rol === "admin";

  if (soloAdmin && !esAdmin) {
    return (
      <Aviso
        titulo="Solo administradores"
        texto="Esta sección es solo para los administradores de la pastoral."
        accion={
          <Link href="/dashboard" className="text-sm text-marca underline underline-offset-4">
            Ir a la revisión
          </Link>
        }
      />
    );
  }

  const enlaces = [
    { href: "/dashboard", texto: "Revisión" },
    { href: "/dashboard/comunidad", texto: esAdmin ? "Asistencia" : "Mi comunidad" },
    ...(esAdmin ? [{ href: "/dashboard/admin", texto: "Administración" }] : []),
  ];

  return (
    <main
      className={`flex-1 flex flex-col mx-auto w-full px-4 py-6 ${
        ancho === "ancho" ? "max-w-5xl" : "max-w-lg"
      } print:max-w-none print:p-0`}
    >
      <header className="flex items-center justify-between mb-4 animate-fade-in print:hidden">
        <div className="flex items-center gap-3">
          <LogoOvalo className="h-11" />
          <div>
            <h1 className="text-lg font-bold text-texto">{typeof titulo === "function" ? titulo(perfil) : titulo}</h1>
            <p className="text-xs text-texto-tenue">
              {perfil.nombre} · {esAdmin ? "Administrador" : "Guía"}
              {perfil.semana_reciente ? ` · Semana ${perfil.semana_reciente}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={salir}
          className="px-3 py-2 rounded-xl bg-superficie-2 hover:bg-borde text-texto-tenue hover:text-texto-suave text-xs font-medium transition-all"
        >
          Salir
        </button>
      </header>

      <nav className="flex gap-1 mb-6 border-b border-borde overflow-x-auto print:hidden">
        {enlaces.map((enlace) => (
          <Link
            key={enlace.href}
            href={enlace.href}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              ruta === enlace.href
                ? "border-marca text-texto"
                : "border-transparent text-texto-tenue hover:text-texto-suave"
            }`}
          >
            {enlace.texto}
          </Link>
        ))}
      </nav>

      {children(perfil)}
    </main>
  );
}
