import type { ReactNode } from "react";

/**
 * Sección que muestra solo su título y un resumen de una línea, y se abre con un toque.
 * Con <details>: funciona con teclado y lector de pantalla sin JavaScript propio.
 */
export function Plegable({ titulo, resumen, children }: { titulo: string; resumen?: ReactNode; children: ReactNode }) {
  return (
    <details className="group tarjeta animate-fade-in delay-200">
      <summary className="flex items-center justify-between gap-3 min-h-13 px-5 py-2 cursor-pointer list-none rounded-2xl [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca/60">
        <h2 className="text-sm font-semibold text-texto">{titulo}</h2>
        <span className="flex items-center gap-2 min-w-0 text-xs text-texto-tenue">
          {resumen}
          <svg
            className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}
