"use client";

import { useEffect, useState } from "react";
import type { EstadoFormulario } from "@/lib/utils/timeHelpers";

interface Props {
  estado: EstadoFormulario;
}

/**
 * Pantalla que se muestra cuando el formulario de asistencia está cerrado.
 * Muestra la semana actual, cuándo abre y una cuenta regresiva visual.
 */
export function FormularioCerrado({ estado }: Props) {
  const [countdown, setCountdown] = useState("");

  const { proximoCambio } = estado;

  useEffect(() => {
    // Cierre manual: no hay apertura programada, no hay cuenta regresiva
    if (!proximoCambio) return;
    const apertura = proximoCambio;

    function actualizarCountdown() {
      const ahora = new Date();
      const diff = apertura.getTime() - ahora.getTime();

      if (diff <= 0) {
        // Ya abrió — recargar para mostrar el formulario
        window.location.reload();
        return;
      }

      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diff % (1000 * 60)) / 1000);

      const partes: string[] = [];
      if (dias > 0) partes.push(`${dias}d`);
      partes.push(`${horas.toString().padStart(2, "0")}h`);
      partes.push(`${minutos.toString().padStart(2, "0")}m`);
      partes.push(`${segundos.toString().padStart(2, "0")}s`);

      setCountdown(partes.join(" "));
    }

    actualizarCountdown();
    const interval = setInterval(actualizarCountdown, 1000);
    return () => clearInterval(interval);
  }, [proximoCambio]);

  // Formatear la fecha de próxima apertura
  const fechaApertura = proximoCambio?.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const horaApertura = proximoCambio?.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center animate-fade-in">
        {/* Icono de candado animado */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-primary-600/20 animate-pulse-glow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Formulario Cerrado
        </h1>
        <p className="text-white/50 text-sm mb-8">
          El registro de asistencia no está disponible en este momento.
        </p>

        {/* Info card */}
        <div className="glass-card p-6 mb-6 animate-fade-in delay-200">
          {/* Semana actual */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.06]">
            <span className="text-sm text-white/40">Semana actual</span>
            <span className="text-lg font-bold text-primary-400">
              #{estado.semanaActual}
            </span>
          </div>

          {/* Ciclo */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.06]">
            <span className="text-sm text-white/40">Ciclo</span>
            <span className="text-sm font-medium text-white/80">
              {estado.nombreCiclo}
            </span>
          </div>

          {/* Próxima apertura */}
          {proximoCambio ? (
            <div className="text-center">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">
                Abre el
              </p>
              <p className="text-sm font-medium text-white/70 capitalize">
                {fechaApertura}
              </p>
              <p className="text-sm text-white/50">a las {horaApertura}</p>
            </div>
          ) : (
            <p className="text-sm text-white/60 text-center">
              El administrador cerró el formulario manualmente. Consulta con tu
              guía cuándo volverá a abrirse.
            </p>
          )}
        </div>

        {/* Countdown */}
        {proximoCambio && (
          <div className="glass-card p-5 animate-fade-in delay-300">
            <p className="text-xs text-white/30 uppercase tracking-wider mb-3">
              Tiempo restante
            </p>
            <p className="text-3xl font-mono font-bold text-primary-400 animate-countdown">
              {countdown || "…"}
            </p>
          </div>
        )}

        {/* Horario */}
        <p className="mt-6 text-xs text-white/25">
          Horario de registro: Sábado 7:00 PM — Lunes 11:59 PM
        </p>
      </div>
    </main>
  );
}
