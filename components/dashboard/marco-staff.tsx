"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cerrarSesion, useSesionStaff } from "@/lib/staff/sesion";
import type { PerfilStaff } from "@/lib/staff/revision";
import { Boton } from "@/components/ui/base";
import { LogoOvalo } from "@/components/ui/logo";

interface Props {
  /** Texto fijo o según el perfil (p. ej. "Mi comunidad" para guías y "Asistencia" para admins) */
  titulo: string | ((perfil: PerfilStaff) => string);
  /** Las tablas de comunidad y administración necesitan más espacio que la revisión */
  ancho?: "angosto" | "ancho";
  soloAdmin?: boolean;
  /**
   * "guia": revisión de fotos, misa y códigos (admin o guía en alguna comunidad).
   * "lista": pasar lista de catequesis (también el catequista). Quien no cumple
   * "guia" pero es catequista va a /dashboard/catequesis sin cargar la página.
   */
  requiere?: "guia" | "lista";
  children: (perfil: PerfilStaff) => ReactNode;
}

// Íconos del menú (Heroicons, trazo)
const ICONOS = {
  catequesis:
    "M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75",
  revision: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  asistencia:
    "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5",
  administracion:
    "M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
} as const;

function Icono({ d }: { d: string }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/** Puede abrir una página que pide "guia" o "lista" */
function cumple(perfil: PerfilStaff, requiere: "guia" | "lista"): boolean {
  return requiere === "guia" ? perfil.es_guia : perfil.es_guia || perfil.es_catequista;
}

function etiquetaDe(perfil: PerfilStaff): string {
  if (perfil.rol === "admin") return "Administrador";
  if (perfil.es_guia && perfil.es_catequista) return "Guía y catequista";
  if (perfil.es_catequista) return "Catequista";
  return "Guía";
}

function Cargando() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <div role="status" className="text-center animate-fade-in">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-marca border-t-transparent animate-spin" />
        <p className="text-sm text-texto-tenue">Cargando panel…</p>
      </div>
    </main>
  );
}

function Aviso({ titulo, texto, accion }: { titulo: string; texto: string; accion: ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="tarjeta p-8 max-w-sm w-full text-center animate-fade-in">
        <h1 className="text-lg font-semibold text-texto mb-2">{titulo}</h1>
        <p className="text-sm text-texto-suave mb-6">{texto}</p>
        {accion}
      </div>
    </main>
  );
}

/**
 * Marco de las páginas del staff: valida la sesión, muestra el encabezado y el menú
 * (abajo en el celular, arriba en pantallas grandes) y entrega el perfil a la página.
 */
export function MarcoStaff({ titulo, ancho = "angosto", soloAdmin = false, requiere = "guia", children }: Props) {
  const sesion = useSesionStaff();
  const router = useRouter();
  const ruta = usePathname();

  // Quien solo es catequista no ve fotos ni misa: va directo a pasar lista
  const irACatequesis =
    sesion.estado === "listo" && !cumple(sesion.perfil, requiere) && sesion.perfil.es_catequista;
  useEffect(() => {
    if (irACatequesis) router.replace("/dashboard/catequesis");
  }, [irACatequesis, router]);

  const salir = async () => {
    await cerrarSesion();
    router.push("/login");
  };

  if (sesion.estado === "cargando" || irACatequesis) return <Cargando />;

  const botonSalir = <Boton onClick={salir}>Volver al inicio de sesión</Boton>;

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

  if (!cumple(perfil, requiere)) {
    return (
      <Aviso
        titulo="Sin comunidades"
        texto="Todavía no tienes comunidades asignadas en el ciclo actual. Habla con un administrador."
        accion={botonSalir}
      />
    );
  }

  if (soloAdmin && !esAdmin) {
    return (
      <Aviso
        titulo="Solo administradores"
        texto="Esta sección es solo para los administradores de la pastoral."
        accion={
          <Link href="/dashboard" className="text-sm text-marca underline underline-offset-4">
            Volver al panel
          </Link>
        }
      />
    );
  }

  // "corto" va en el menú del celular: con cuatro secciones no cabe "Administración" en 320 px
  const enlaces = [
    ...(perfil.es_guia ? [{ href: "/dashboard", texto: "Revisión", corto: "Revisión", icono: ICONOS.revision }] : []),
    { href: "/dashboard/catequesis", texto: "Catequesis", corto: "Catequesis", icono: ICONOS.catequesis },
    ...(perfil.es_guia
      ? [
          {
            href: "/dashboard/comunidad",
            texto: esAdmin ? "Asistencia" : "Mi comunidad",
            corto: esAdmin ? "Asistencia" : "Mi comunidad",
            icono: ICONOS.asistencia,
          },
        ]
      : []),
    ...(esAdmin
      ? [{ href: "/dashboard/admin", texto: "Administración", corto: "Admin", icono: ICONOS.administracion }]
      : []),
  ];
  // El catequista solo tiene una sección: sin menú
  const conMenu = enlaces.length > 1;

  return (
    <main
      className={`flex-1 flex flex-col mx-auto w-full px-4 pt-6 md:pb-6 ${
        ancho === "ancho" ? "max-w-5xl" : "max-w-lg lg:max-w-4xl"
      } ${
        conMenu ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]" : "pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      } print:max-w-none print:p-0`}
    >
      <header className="flex items-center justify-between gap-3 mb-4 animate-fade-in print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <LogoOvalo className="h-11 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-texto">{typeof titulo === "function" ? titulo(perfil) : titulo}</h1>
            <p className="text-xs text-texto-tenue">
              {perfil.nombre} · {etiquetaDe(perfil)}
              {perfil.es_guia && perfil.semana_reciente ? ` · Semana ${perfil.semana_reciente}` : ""}
            </p>
          </div>
        </div>
        <Boton variante="secundario" tamano="pequeno" onClick={salir} className="shrink-0">
          Salir
        </Boton>
      </header>

      {/* Menú arriba (pantallas medianas y grandes) */}
      {conMenu && (
        <nav aria-label="Secciones" className="hidden md:flex gap-1 mb-6 border-b border-borde overflow-x-auto print:hidden">
          {enlaces.map((enlace) => {
            const activo = ruta === enlace.href;
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={`px-3 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                  activo ? "border-marca text-texto" : "border-transparent text-texto-tenue hover:text-texto-suave"
                }`}
              >
                {enlace.texto}
              </Link>
            );
          })}
        </nav>
      )}

      {children(perfil)}

      {/* Menú abajo (celular): a mano del pulgar, sobre la zona segura del iPhone */}
      {conMenu && (
        <nav
          aria-label="Secciones"
          className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-superficie/95 backdrop-blur-md border-t border-borde
                     pb-[env(safe-area-inset-bottom)] print:hidden"
        >
          <ul className="flex max-w-lg mx-auto">
            {enlaces.map((enlace) => {
              const activo = ruta === enlace.href;
              return (
                <li key={enlace.href} className="flex-1 min-w-0">
                  <Link
                    href={enlace.href}
                    aria-current={activo ? "page" : undefined}
                    className={`min-h-16 flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                      activo ? "text-marca" : "text-texto-tenue hover:text-texto-suave"
                    }`}
                  >
                    <Icono d={enlace.icono} />
                    {enlace.corto}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </main>
  );
}
