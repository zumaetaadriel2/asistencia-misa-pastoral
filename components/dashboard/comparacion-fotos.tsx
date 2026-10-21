"use client";

import { useState } from "react";

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
    <section className="w-full max-w-xs mx-auto mt-4">
      <p className="text-xs text-white/40 mb-2">Para comparar</p>
      <div className="grid grid-cols-2 gap-2">
        {fotos.map((foto) => (
          <button
            key={foto.envioId}
            onClick={() => foto.url && setAmpliada(foto)}
            className="glass-card overflow-hidden text-left"
          >
            <div className="aspect-[3/4] bg-white/5">
              {foto.url ? (
                // URL firmada temporal de R2 (ver tarjeta-revision.tsx)
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto.url} alt={foto.etiqueta} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full animate-shimmer" />
              )}
            </div>
            <p className="px-2 py-1.5 text-[11px] text-white/60 leading-tight">{foto.etiqueta}</p>
          </button>
        ))}
      </div>

      {ampliada?.url && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setAmpliada(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ampliada.url} alt={ampliada.etiqueta} className="max-h-[80vh] max-w-full rounded-xl" />
          <p className="mt-3 text-sm text-white/70">{ampliada.etiqueta}</p>
          <p className="mt-1 text-xs text-white/30">Toca para cerrar</p>
        </div>
      )}
    </section>
  );
}
