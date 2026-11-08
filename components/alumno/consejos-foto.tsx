"use client";

import { crearMarcaVista } from "@/lib/utils/marca-vista";

// Abiertos hasta que elige su primera foto; después quedan plegados en "Ver consejos"
const consejos = crearMarcaVista("alumno.consejosFotoVistos");
export const marcarConsejosVistos = consejos.marcar;

const CONSEJOS = [
  "Que se vea tu rostro y que estás dentro de la iglesia, con el altar o el interior detrás.",
  "Tómala en la misa: nada de fotos viejas, de pantallas ni de internet (las repetidas se notan).",
  "Vale la misa del sábado desde las 7 p. m. o la del domingo.",
];

/** Qué debe tener la foto para que el guía la valide */
export function ConsejosFoto() {
  const vistos = consejos.useVista();

  return (
    <details open={!vistos} className="group mb-4 rounded-xl bg-info/10 border border-info/25 px-3 py-2.5">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-2 min-h-8 text-sm font-semibold text-info">
        Para que validen tu foto
        <span aria-hidden="true" className="text-xs font-normal group-open:hidden">
          Ver consejos
        </span>
      </summary>
      <ul className="mt-2 space-y-1.5 text-sm text-texto-suave list-disc pl-5">
        {CONSEJOS.map((consejo) => (
          <li key={consejo}>{consejo}</li>
        ))}
      </ul>
    </details>
  );
}
