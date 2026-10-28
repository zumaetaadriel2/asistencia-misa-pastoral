"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { instalar, useAppInstalada, usePlataforma, usePuedeInstalar } from "@/lib/pwa/instalacion";
import { Boton, claseDeBoton } from "@/components/ui/base";
import { LogoOvalo } from "@/components/ui/logo";

/** Ícono de "Compartir" de Safari: un cuadrado con una flecha hacia arriba */
function IconoCompartir() {
  return (
    <svg className="inline w-4 h-4 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" />
    </svg>
  );
}

function Pasos({ titulo, pasos }: { titulo: string; pasos: ReactNode[] }) {
  return (
    <section className="tarjeta p-5">
      <h2 className="text-base font-semibold text-texto">{titulo}</h2>
      <ol className="mt-3 space-y-2.5">
        {pasos.map((paso, i) => (
          <li key={i} className="flex gap-3 text-sm text-texto-suave leading-relaxed">
            <span className="shrink-0 w-6 h-6 rounded-full bg-marca/10 text-marca text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span>{paso}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const ANDROID = (
  <Pasos
    titulo="En Android"
    pasos={[
      <>Abre la app en <strong className="text-texto">Chrome</strong>.</>,
      <>
        Toca <strong className="text-texto">«Instalar»</strong> en el aviso que aparece, o el menú{" "}
        <strong className="text-texto">⋮</strong> (arriba a la derecha) y luego{" "}
        <strong className="text-texto">«Instalar app»</strong> o{" "}
        <strong className="text-texto">«Agregar a la pantalla principal»</strong>.
      </>,
      <>Confirma con <strong className="text-texto">«Instalar»</strong>. El ícono azul de Mi Misa PS aparece entre tus apps.</>,
    ]}
  />
);

const IPHONE = (
  <Pasos
    titulo="En iPhone"
    pasos={[
      <>Abre la app en <strong className="text-texto">Safari</strong>.</>,
      <>
        Toca <strong className="text-texto">Compartir</strong> <IconoCompartir /> (abajo, o arriba en iPad).
      </>,
      <>
        Baja y toca <strong className="text-texto">«Agregar a Inicio»</strong>. Si no lo ves, toca «Editar acciones»
        para agregarlo.
      </>,
      <>Toca <strong className="text-texto">«Agregar»</strong>. El ícono azul de Mi Misa PS aparece en tu pantalla de inicio.</>,
    ]}
  />
);

/** Pasos para instalar la app; en Chrome/Edge, además, un botón que abre la ventana del sistema */
export function PaginaInstalar() {
  const instalada = useAppInstalada();
  const plataforma = usePlataforma();
  const puedeInstalar = usePuedeInstalar();
  const [resultado, setResultado] = useState<"aceptada" | "cancelada" | null>(null);

  const alInstalar = async () => {
    setResultado((await instalar()) ? "aceptada" : "cancelada");
  };

  return (
    <main className="flex-1 flex flex-col max-w-md md:max-w-2xl mx-auto w-full px-4 py-6 gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <LogoOvalo className="h-12 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-texto">Instala Mi Misa PS</h1>
            <p className="text-xs text-texto-tenue">Queda como una app en tu pantalla de inicio</p>
          </div>
        </div>
        <Link href="/alumno" className={`${claseDeBoton("secundario", "pequeno")} shrink-0`}>
          Volver
        </Link>
      </header>

      {instalada || resultado === "aceptada" ? (
        <section role="status" className="tarjeta p-5 text-center">
          <p className="text-base font-semibold text-exito">Ya tienes Mi Misa PS instalada</p>
          <p className="mt-1 text-sm text-texto-suave">Ábrela desde el ícono azul de tu pantalla de inicio.</p>
        </section>
      ) : (
        <>
          <p className="text-sm text-texto-suave leading-relaxed">
            No hace falta Play Store ni App Store y casi no ocupa espacio. Así entras más rápido y tu código queda
            guardado.
          </p>

          {puedeInstalar && (
            <Boton onClick={alInstalar} className="w-full">
              Instalar Mi Misa PS
            </Boton>
          )}
          {resultado === "cancelada" && (
            <p role="status" className="text-sm text-texto-suave text-center">
              No se instaló. Puedes hacerlo con los pasos de abajo cuando quieras.
            </p>
          )}

          {/* Primero los pasos del celular que se está usando; debajo, los del otro (para ayudar a un compañero) */}
          {plataforma === "ios" ? (
            <>
              {IPHONE}
              {ANDROID}
            </>
          ) : (
            <>
              {ANDROID}
              {IPHONE}
            </>
          )}

          <section className="tarjeta p-5">
            <h2 className="text-base font-semibold text-texto">¿Te llegó el enlace por WhatsApp o Instagram?</h2>
            <p className="mt-2 text-sm text-texto-suave leading-relaxed">
              Esas apps abren las páginas en su propio navegador, desde donde no se puede instalar. Toca el menú (⋮ o
              ···) y elige <strong className="text-texto">«Abrir en el navegador»</strong> (o en Safari), y sigue los
              pasos.
            </p>
          </section>
        </>
      )}

      <p className="mt-auto pt-2 text-center text-xs text-texto-tenue">
        <Link href="/privacidad" className="inline-flex items-center min-h-11 px-2 underline underline-offset-4">
          Privacidad
        </Link>
      </p>
    </main>
  );
}
