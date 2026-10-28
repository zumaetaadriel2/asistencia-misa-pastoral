"use client";

import Link from "next/link";
import { useAppInstalada } from "@/lib/pwa/instalacion";

const CLASE_ENLACE = "inline-flex items-center min-h-11 px-2 underline underline-offset-4 hover:text-texto-suave";

/** Pie discreto "Cómo instalar · Privacidad" (lo de instalar se oculta si ya está instalada) */
export function EnlacesPie({ className = "" }: { className?: string }) {
  const instalada = useAppInstalada();

  return (
    <p className={`text-center text-xs text-texto-tenue ${className}`}>
      {instalada === false && (
        <>
          <Link href="/instalar" className={CLASE_ENLACE}>
            Cómo instalar
          </Link>
          <span aria-hidden="true">·</span>
        </>
      )}
      <Link href="/privacidad" className={CLASE_ENLACE}>
        Privacidad
      </Link>
    </p>
  );
}
