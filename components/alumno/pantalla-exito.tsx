"use client";

import { Boton } from "@/components/ui/base";
import { useEnfocarAlAparecer } from "@/components/ui/enfoque";
import { ESTADOS } from "@/lib/ui/estados";
import { formatearDiaHora } from "@/lib/utils/timeHelpers";

interface Props {
  alumnoNombre: string;
  comunidadNombre: string;
  semana: number;
  /** Hasta cuándo puede reenviar si se la rechazan; null si el formulario está forzado a mano */
  cierreReenvio: string | null;
  onVolver: () => void;
}

/** Confirmación tras enviar la foto: queda en revisión hasta que el guía la vea */
export function PantallaExito({ alumnoNombre, comunidadNombre, semana, cierreReenvio, onVolver }: Props) {
  const titulo = useEnfocarAlAparecer<HTMLHeadingElement>();
  const enRevision = ESTADOS.pendiente;

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center animate-fade-in">
        {/* Ícono de éxito */}
        <div className="relative w-28 h-28 mx-auto mb-8" aria-hidden="true">
          <div className="absolute inset-0 rounded-full bg-exito/10 animate-pulse-glow" style={{ animationDuration: "2.5s" }} />
          <div className="absolute inset-2 rounded-full bg-exito/10" />
          <div className="absolute inset-4 rounded-full bg-exito/15 border border-exito/25 flex items-center justify-center animate-fade-in-scale">
            <svg className="w-10 h-10 text-exito" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
        </div>

        <h1 ref={titulo} tabIndex={-1} className="text-2xl font-bold text-texto mb-2 focus:outline-none">
          ¡Foto enviada!
        </h1>
        <p className="text-texto-suave text-sm mb-8">Tu guía la revisará. Vuelve a entrar en unos días para ver si fue aceptada.</p>

        {/* Detalles */}
        <dl className="tarjeta p-6 text-left mb-6 space-y-4 animate-fade-in delay-200">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-texto-tenue">Alumno</dt>
            <dd className="text-sm font-medium text-texto">{alumnoNombre}</dd>
          </div>
          <div className="border-t border-borde" />
          <div className="flex items-center justify-between">
            <dt className="text-sm text-texto-tenue">Comunidad</dt>
            <dd className="text-sm font-medium text-texto">{comunidadNombre}</dd>
          </div>
          <div className="border-t border-borde" />
          <div className="flex items-center justify-between">
            <dt className="text-sm text-texto-tenue">Semana</dt>
            <dd className="text-sm font-bold text-marca">{semana}</dd>
          </div>
          <div className="border-t border-borde" />
          <div className="flex items-center justify-between">
            <dt className="text-sm text-texto-tenue">Estado</dt>
            <dd>
              <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${enRevision.clases}`}>
                {enRevision.alumno}
              </span>
            </dd>
          </div>
        </dl>

        {cierreReenvio && (
          <p className="tarjeta p-4 text-xs text-texto-suave text-left animate-fade-in delay-300">
            Si tu guía la rechaza, verás el motivo aquí y podrás enviar otra hasta el {formatearDiaHora(cierreReenvio)}.
          </p>
        )}

        <Boton variante="secundario" onClick={onVolver} className="mt-8 min-w-48">
          Ver mi semana
        </Boton>
      </div>
    </main>
  );
}
