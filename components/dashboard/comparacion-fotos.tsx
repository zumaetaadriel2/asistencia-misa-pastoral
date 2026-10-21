"use client";

import { useState } from "react";
import { VisorFoto } from "./visor-foto";

export interface FotoComparada {
  envioId: number;
  etiqueta: string;
  url: string | undefined;
}

/**
 * Fotos para comparar con la actual: la anterior del alumno y la parecida.
 * Al tocarlas se ven en grande para fijarse en la ropa y el lugar.
 */
export function ComparacionFotos({ fotos }: { fotos: FotoComparada[] }) {
  const [ampliada, setAmpliada] = useState<FotoComparada | null>(null);
  if (fotos.length === 0) return null;

  return (
    <section className="w-full">
      <h2 className="text-xs font-medium text-texto-suave mb-2">Para comparar (tócalas para verlas en grande)</h2>
      <div className="grid grid-cols-2 gap-2">
        {fotos.map((foto) => (
          <button
            key={foto.envioId}
            onClick={() => foto.url && setAmpliada(foto)}
            disabled={!foto.url}
            aria-label={`Ver en grande: ${foto.etiqueta}`}
            className="tarjeta overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca/50"
          >
            <div className="aspect-[3/4] bg-superficie-2">
              {foto.url ? (
                // URL firmada temporal de R2 (ver tarjeta-revision.tsx)
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full animate-shimmer" />
              )}
            </div>
            <p className="px-2 py-1.5 text-xs text-texto-suave leading-tight">{foto.etiqueta}</p>
          </button>
        ))}
      </div>

      {ampliada?.url && <VisorFoto url={ampliada.url} etiqueta={ampliada.etiqueta} onCerrar={() => setAmpliada(null)} />}
    </section>
  );
}
