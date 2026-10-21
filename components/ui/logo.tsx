import Image from "next/image";
import logoCompleto from "@/marca/web/logo-completo.webp";
import logoCompletoOscuro from "@/marca/web/logo-completo-oscuro.webp";
import logoOvalo from "@/marca/web/logo-ovalo.webp";

// Logo de la Pastoral Mariana (generado con scripts/generar-iconos.mjs).
// `unoptimized`: ya son versiones livianas, no hace falta el optimizador de Vercel.

/**
 * Logo completo. En tema oscuro va la versión con las letras en blanco (el óvalo
 * es el mismo); el navegador solo muestra una de las dos según el tema.
 */
export function LogoCompleto({ className = "h-28" }: { className?: string }) {
  return (
    <>
      <Image
        src={logoCompleto}
        alt="Pastoral Mariana"
        className={`w-auto dark:hidden ${className}`}
        loading="eager"
        unoptimized
      />
      <Image
        src={logoCompletoOscuro}
        alt="Pastoral Mariana"
        className={`w-auto hidden dark:block ${className}`}
        loading="eager"
        unoptimized
      />
    </>
  );
}

/** Óvalo de la Virgen y el Niño. Decorativo: va junto al texto "Pastoral Mariana". */
export function LogoOvalo({ className = "h-10" }: { className?: string }) {
  return <Image src={logoOvalo} alt="" className={`w-auto ${className}`} loading="eager" unoptimized />;
}
