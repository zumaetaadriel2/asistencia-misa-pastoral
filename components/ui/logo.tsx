import Image from "next/image";
import logoCompleto from "@/marca/web/logo-completo.webp";
import logoOvalo from "@/marca/web/logo-ovalo.webp";

// Logo de la Pastoral Mariana (generado con scripts/generar-iconos.mjs).
// `unoptimized`: ya son versiones livianas, no hace falta el optimizador de Vercel.

/** Logo completo sobre una placa blanca (se ve igual en tema claro y oscuro) */
export function LogoCompleto({ className = "h-28" }: { className?: string }) {
  return (
    <div className="inline-flex rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
      <Image src={logoCompleto} alt="Pastoral Mariana" className={`w-auto ${className}`} loading="eager" unoptimized />
    </div>
  );
}

/** Óvalo de la Virgen y el Niño. Decorativo: va junto al texto "Pastoral Mariana". */
export function LogoOvalo({ className = "h-10" }: { className?: string }) {
  return <Image src={logoOvalo} alt="" className={`w-auto ${className}`} loading="eager" unoptimized />;
}
