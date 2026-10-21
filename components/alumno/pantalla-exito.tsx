"use client";

interface Props {
  alumnoNombre: string;
  comunidadNombre: string;
  semana: number;
  onVolver: () => void;
}

/**
 * Pantalla de confirmación de éxito tras enviar la asistencia.
 * Diseño limpio, animado y mobile-friendly.
 */
export function PantallaExito({ alumnoNombre, comunidadNombre, semana, onVolver }: Props) {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center animate-fade-in">
        {/* Icono de éxito animado */}
        <div className="relative w-28 h-28 mx-auto mb-8">
          {/* Anillo exterior pulsante */}
          <div className="absolute inset-0 rounded-full bg-exito/10 animate-pulse-glow" style={{ animationDuration: "2.5s" }} />
          {/* Anillo medio */}
          <div className="absolute inset-2 rounded-full bg-exito/10" />
          {/* Círculo central con check */}
          <div className="absolute inset-4 rounded-full bg-exito/15 border border-exito/25 flex items-center justify-center animate-fade-in-scale">
            <svg className="w-10 h-10 text-exito" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-texto mb-2">
          ¡Asistencia Registrada!
        </h1>
        <p className="text-texto-tenue text-sm mb-8">
          Tu foto ha sido enviada y está pendiente de validación.
        </p>

        {/* Detalles */}
        <div className="tarjeta p-6 text-left mb-8 animate-fade-in delay-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-texto-tenue">Alumno</span>
              <span className="text-sm font-medium text-texto-suave">{alumnoNombre}</span>
            </div>
            <div className="border-t border-borde" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-texto-tenue">Comunidad</span>
              <span className="text-sm font-medium text-texto-suave">{comunidadNombre}</span>
            </div>
            <div className="border-t border-borde" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-texto-tenue">Semana</span>
              <span className="text-sm font-bold text-marca">#{semana}</span>
            </div>
            <div className="border-t border-borde" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-texto-tenue">Estado</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aviso/10 border border-aviso/25">
                <span className="w-1.5 h-1.5 rounded-full bg-aviso" />
                <span className="text-xs font-medium text-aviso">Pendiente</span>
              </span>
            </div>
          </div>
        </div>

        {/* Mensaje final */}
        <div className="tarjeta p-4 animate-fade-in delay-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-marca/15 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-marca" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </div>
            <p className="text-xs text-texto-tenue text-left">
              Tu guía revisará la foto. Si la rechaza, podrás enviar otra hasta el miércoles.
            </p>
          </div>
        </div>

        <button
          onClick={onVolver}
          className="mt-8 px-8 py-3 rounded-xl bg-superficie-2 hover:bg-borde text-texto-tenue hover:text-texto-suave
                     text-sm font-medium transition-all"
        >
          Volver
        </button>
      </div>
    </main>
  );
}
