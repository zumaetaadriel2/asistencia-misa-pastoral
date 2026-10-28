import { horaCorta, type DiaMisa } from "@/lib/misas/horarios";
import type { IglesiaPublica } from "@/lib/misas/iglesias";
import { marcarMisas, momentoEnLima } from "@/lib/misas/proxima";
import { enlaceComoLlegar, formatearDistancia } from "@/lib/misas/ubicacion";
import { formatearMesAnio } from "@/lib/utils/timeHelpers";
import { claseDeBoton } from "@/components/ui/base";

interface Props {
  iglesia: IglesiaPublica;
  /** Distancia desde el alumno; null si no compartió su ubicación */
  km: number | null;
  ahora: Date;
}

const NOMBRE_DIA: Record<DiaMisa, string> = { 6: "Sábado", 7: "Domingo" };

/** Una iglesia con sus misas del fin de semana: la próxima resaltada y las que ya pasaron en tenue */
export function TarjetaIglesia({ iglesia, km, ahora }: Props) {
  const misas = marcarMisas(iglesia.misas, ahora);
  const { dia: hoy } = momentoEnLima(ahora);
  const cuando = (dia: DiaMisa) => (dia === hoy ? " · hoy" : hoy === 6 && dia === 7 ? " · mañana" : "");

  return (
    <li className="tarjeta p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-texto break-words">{iglesia.nombre}</h2>
          <p className="text-xs text-texto-tenue">
            {iglesia.direccion && `${iglesia.direccion} · `}
            {iglesia.distrito}
          </p>
        </div>
        {km !== null && (
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-marca/10 text-marca text-xs font-semibold">
            a {formatearDistancia(km)}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {([6, 7] as DiaMisa[]).map((dia) => {
          const delDia = misas.filter((m) => m.dia === dia);
          if (delDia.length === 0) return null;
          return (
            <div key={dia}>
              <p className="text-xs font-medium text-texto-suave">
                {NOMBRE_DIA[dia]}
                {cuando(dia)}
              </p>
              <ul className="mt-1 flex flex-wrap gap-1.5" aria-label={`Misas del ${NOMBRE_DIA[dia].toLowerCase()}`}>
                {delDia.map((m) => (
                  <li
                    key={m.hora}
                    className={`px-2.5 py-1 rounded-lg border text-sm tabular-nums ${
                      m.proxima
                        ? "bg-marca-solido border-marca-solido text-white font-semibold"
                        : m.pasada
                          ? "bg-superficie-2 border-borde text-texto-tenue"
                          : "bg-superficie-2 border-borde text-texto"
                    }`}
                  >
                    {horaCorta(m.hora)}
                    {m.proxima && " · próxima"}
                    {m.pasada && <span className="sr-only"> (ya empezó)</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {iglesia.notas && <p className="mt-2 text-xs text-texto-suave break-words">{iglesia.notas}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={enlaceComoLlegar(iglesia)}
          target="_blank"
          rel="noopener noreferrer"
          className={claseDeBoton("primario", "pequeno")}
        >
          Cómo llegar
        </a>
        {iglesia.telefono && (
          <a href={`tel:${iglesia.telefono.replace(/[^\d+]/g, "")}`} className={claseDeBoton("secundario", "pequeno")}>
            Llamar
          </a>
        )}
      </div>

      {iglesia.verificado_en && (
        <p className="mt-2 text-xs text-texto-tenue">Horarios revisados en {formatearMesAnio(iglesia.verificado_en)}</p>
      )}
    </li>
  );
}
