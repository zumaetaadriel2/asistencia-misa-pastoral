"use client";

interface Props {
  alumnoNombre: string;
  comunidadNombre: string;
  semana: number;
}

/**
 * Pantalla de confirmación de éxito tras enviar la asistencia.
 * Diseño limpio, animado y mobile-friendly.
 */
export function PantallaExito({ alumnoNombre, comunidadNombre, semana }: Props) {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center animate-fade-in">
        {/* Icono de éxito animado */}
        <div className="relative w-28 h-28 mx-auto mb-8">
          {/* Anillo exterior pulsante */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse-glow" style={{ animationDuration: "2.5s" }} />
          {/* Anillo medio */}
          <div className="absolute inset-2 rounded-full bg-emerald-500/10" />
          {/* Círculo central con check */}
          <div className="absolute inset-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-fade-in-scale">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-white mb-2">
          ¡Asistencia Registrada!
        </h1>
        <p className="text-white/50 text-sm mb-8">
          Tu foto ha sido enviada y está pendiente de validación.
        </p>

        {/* Detalles */}
        <div className="glass-card p-6 text-left mb-8 animate-fade-in delay-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Alumno</span>
              <span className="text-sm font-medium text-white/90">{alumnoNombre}</span>
            </div>
            <div className="border-t border-white/[0.06]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Comunidad</span>
              <span className="text-sm font-medium text-white/90">{comunidadNombre}</span>
            </div>
            <div className="border-t border-white/[0.06]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Semana</span>
              <span className="text-sm font-bold text-primary-400">#{semana}</span>
            </div>
            <div className="border-t border-white/[0.06]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Estado</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs font-medium text-amber-300">Pendiente</span>
              </span>
            </div>
          </div>
        </div>

        {/* Mensaje final */}
        <div className="glass-card p-4 animate-fade-in delay-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </div>
            <p className="text-xs text-white/40 text-left">
              Tu coordinador revisará la foto. Si es rechazada, podrás enviarla nuevamente.
            </p>
          </div>
        </div>

        {/* Botón para registrar otro (opcional) */}
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70
                     text-sm font-medium transition-all"
        >
          Registrar otro alumno
        </button>
      </div>
    </main>
  );
}
