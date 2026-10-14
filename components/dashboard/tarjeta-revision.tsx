"use client";

import { useRef, useState, useCallback } from "react";

// =============================================
// Tipos
// =============================================

export interface AsistenciaPendiente {
  id: number;
  alumno_id: number;
  semana_numero: number;
  foto_url: string;
  foto_public_id: string;
  fecha_subida: string;
  alumnos: {
    nombre_completo: string;
    comunidad_id: number;
    comunidades: {
      nombre: string;
    };
  };
}

interface Props {
  asistencia: AsistenciaPendiente;
  /** Debe resolver `true` si la validación se guardó y `false` si falló */
  onValidar: () => Promise<boolean>;
  onIniciarRechazo: () => void;
}

// =============================================
// Constantes
// =============================================

const SWIPE_THRESHOLD = 100;
const FLY_OUT_DURATION = 400;

// =============================================
// Componente
// =============================================

/**
 * Tarjeta de revisión estilo "Tinder" con soporte para swipe táctil,
 * arrastre con mouse y botones de acción.
 */
export function TarjetaRevision({ asistencia, onValidar, onIniciarRechazo }: Props) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flyDirection, setFlyDirection] = useState<"left" | "right" | null>(null);

  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const getRotation = (x: number) => x * 0.08;
  const getOpacityOverlay = (x: number) => Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1) * 0.6;

  // --- Acciones ---
  const handleValidar = useCallback(() => {
    setFlyDirection("right");
    setTimeout(async () => {
      const validada = await onValidar();
      // Si falló, devolver la tarjeta a su sitio para poder reintentar
      if (!validada) {
        setFlyDirection(null);
        setDragX(0);
      }
    }, FLY_OUT_DURATION);
  }, [onValidar]);

  const handleRechazar = useCallback(() => {
    // No anima — el modal se abre y la animación ocurre al confirmar desde el dashboard.
    // La tarjeta vuelve al centro por si el modal se cancela.
    setDragX(0);
    onIniciarRechazo();
  }, [onIniciarRechazo]);

  const procesarSwipe = useCallback(
    (deltaX: number) => {
      if (deltaX > SWIPE_THRESHOLD) {
        handleValidar();
      } else if (deltaX < -SWIPE_THRESHOLD) {
        handleRechazar();
      }
    },
    [handleValidar, handleRechazar]
  );

  // --- Touch handlers ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientX - startXRef.current;
    setDragX(delta);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    procesarSwipe(dragX);
    if (Math.abs(dragX) <= SWIPE_THRESHOLD) {
      setDragX(0);
    }
  }, [dragX, procesarSwipe]);

  // --- Mouse handlers ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const delta = e.clientX - startXRef.current;
      setDragX(delta);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    procesarSwipe(dragX);
    if (Math.abs(dragX) <= SWIPE_THRESHOLD) {
      setDragX(0);
    }
  }, [isDragging, dragX, procesarSwipe]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragX(0);
    }
  }, [isDragging]);

  // --- Transform styles ---
  const isFlying = flyDirection !== null;
  const translateX = isFlying
    ? flyDirection === "right"
      ? "120%"
      : "-120%"
    : `${dragX}px`;
  const rotation = isFlying
    ? flyDirection === "right"
      ? 15
      : -15
    : getRotation(dragX);

  return (
    <div className="relative select-none">
      {/* Tarjeta principal */}
      <div
        ref={cardRef}
        className="glass-card overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${translateX}) rotate(${rotation}deg)`,
          transition: isDragging ? "none" : `all ${FLY_OUT_DURATION}ms ease-out`,
          opacity: isFlying ? 0 : 1,
          touchAction: "pan-y",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Overlays de swipe */}
        {/* Verde (derecha = validar) */}
        <div
          className="absolute inset-0 bg-emerald-500/30 z-10 pointer-events-none flex items-center justify-center"
          style={{ opacity: dragX > 0 ? getOpacityOverlay(dragX) : 0, transition: isDragging ? "none" : "opacity 0.2s" }}
        >
          <div className="bg-emerald-500 text-white text-xl font-black px-6 py-2 rounded-xl border-4 border-emerald-400 rotate-[-15deg] shadow-2xl">
            VALIDAR
          </div>
        </div>
        {/* Rojo (izquierda = rechazar) */}
        <div
          className="absolute inset-0 bg-rose-500/30 z-10 pointer-events-none flex items-center justify-center"
          style={{ opacity: dragX < 0 ? getOpacityOverlay(dragX) : 0, transition: isDragging ? "none" : "opacity 0.2s" }}
        >
          <div className="bg-rose-500 text-white text-xl font-black px-6 py-2 rounded-xl border-4 border-rose-400 rotate-[15deg] shadow-2xl">
            RECHAZAR
          </div>
        </div>

        {/* Foto */}
        <div className="aspect-[3/4] bg-white/5 relative overflow-hidden">
          <img
            src={asistencia.foto_url}
            alt={`Foto de ${asistencia.alumnos.nombre_completo}`}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          {/* Badge de semana */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            <span className="text-xs font-semibold text-white">
              Semana {asistencia.semana_numero}
            </span>
          </div>
          {/* Badge de comunidad */}
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-primary-600/60 backdrop-blur-md border border-primary-500/20">
            <span className="text-xs font-medium text-white">
              {asistencia.alumnos.comunidades.nombre}
            </span>
          </div>
        </div>

        {/* Info del alumno */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-white">
            {asistencia.alumnos.nombre_completo}
          </h3>
          <p className="text-xs text-white/30 mt-0.5">
            {new Date(asistencia.fecha_subida).toLocaleDateString("es-ES", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-center gap-6 mt-6">
        {/* Rechazar */}
        <button
          onClick={handleRechazar}
          disabled={isFlying}
          className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/30
                     hover:bg-rose-500/20 hover:border-rose-500/50 hover:scale-110
                     active:scale-95 disabled:opacity-30
                     flex items-center justify-center transition-all duration-200"
          title="Rechazar"
        >
          <svg className="w-7 h-7 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Indicador de swipe */}
        <div className="text-[10px] text-white/15 text-center">
          <p>← desliza →</p>
        </div>

        {/* Validar */}
        <button
          onClick={handleValidar}
          disabled={isFlying}
          className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30
                     hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:scale-110
                     active:scale-95 disabled:opacity-30
                     flex items-center justify-center transition-all duration-200"
          title="Validar"
        >
          <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
