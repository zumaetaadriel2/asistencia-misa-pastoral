const MAS_CONSEJOS = [
  "Con el altar o el interior de la iglesia detrás de ti.",
  "Tómala en la misa: nada de fotos viejas, de pantallas ni de internet (las repetidas se notan).",
  "Vale la misa del sábado desde las 7 p. m. o la del domingo.",
];

/** Lo que más hace que validen la foto va siempre a la vista; lo demás, al tocar "Ver más" */
export function ConsejosFoto() {
  return (
    <details className="group mb-2 text-sm text-texto-suave">
      <summary className="flex items-start gap-2 min-h-11 py-1 cursor-pointer list-none rounded-lg [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca/60">
        <svg className="w-4 h-4 mt-0.5 shrink-0 text-aviso" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
          />
        </svg>
        <span>
          Que se vea tu rostro dentro de la iglesia.{" "}
          <span className="font-semibold text-marca group-open:hidden">Ver más</span>
        </span>
      </summary>
      <ul className="mt-1 pl-6 space-y-1.5 list-disc">
        {MAS_CONSEJOS.map((consejo) => (
          <li key={consejo}>{consejo}</li>
        ))}
      </ul>
    </details>
  );
}
