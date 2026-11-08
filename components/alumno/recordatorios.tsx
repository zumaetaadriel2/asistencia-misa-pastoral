"use client";

import { claseDeBoton } from "@/components/ui/base";

/** Para no olvidarse del sábado: un recordatorio semanal en el calendario del celular */
export function Recordatorios() {
  return (
    <section className="tarjeta p-5 animate-fade-in delay-300">
      <h2 className="text-sm font-semibold text-texto">Recordatorio</h2>
      <p className="mt-1 text-xs text-texto-tenue">Te avisa cada sábado a las 7 p. m., cuando ya puedes subir tu foto.</p>
      {/* Archivo .ics: el iPhone lo abre en «Agregar al calendario» y Android en su calendario */}
      <a href="/recordatorio-misa.ics" className={`${claseDeBoton("secundario")} mt-3 w-full`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008Z"
          />
        </svg>
        Agregar al calendario
      </a>
    </section>
  );
}
