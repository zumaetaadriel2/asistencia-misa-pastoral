"use client";

interface Props {
  pendientes: number;
  validadas: number;
  loading: boolean;
}

/**
 * Tarjetas de métricas rápidas para el dashboard.
 * Muestra contadores de fotos pendientes y validadas.
 */
export function Metricas({ pendientes, validadas, loading }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Pendientes */}
      <div className="tarjeta p-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-aviso/10 border border-aviso/25 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-aviso" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-texto">
              {loading ? (
                <span className="inline-block w-8 h-6 rounded bg-superficie-2 animate-shimmer" />
              ) : (
                pendientes
              )}
            </p>
            <p className="text-[10px] text-texto-tenue uppercase tracking-wider">
              Pendientes
            </p>
          </div>
        </div>
      </div>

      {/* Validadas */}
      <div className="tarjeta p-4 animate-fade-in delay-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-exito/10 border border-exito/25 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-exito" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-texto">
              {loading ? (
                <span className="inline-block w-8 h-6 rounded bg-superficie-2 animate-shimmer" />
              ) : (
                validadas
              )}
            </p>
            <p className="text-[10px] text-texto-tenue uppercase tracking-wider">
              Validadas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
