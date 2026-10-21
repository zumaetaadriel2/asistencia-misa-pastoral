"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import { formatearDiaHora } from "@/lib/utils/timeHelpers";

// =============================================
// Tipos
// =============================================

interface Props {
  /** URL firmada de la foto; null mientras se pide */
  urlFoto: string | null;
  alumno: string;
  comunidad: string;
  semana: number;
  enviadoEn: string;
  /** Avisos que se muestran bajo el nombre (fecha de la foto, foto parecida) */
  children?: ReactNode;
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
export function TarjetaRevision({
  urlFoto,
  alumno,
  comunidad,
  semana,
  enviadoEn,
  children,
  onValidar,
  onIniciarRechazo,
}: Props) {
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
        className="tarjeta overflow-hidden cursor-grab active:cursor-grabbing"
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
          className="absolute inset-0 bg-exito/25 z-10 pointer-events-none flex items-center justify-center"
          style={{ opacity: dragX > 0 ? getOpacityOverlay(dragX) : 0, transition: isDragging ? "none" : "opacity 0.2s" }}
        >
          <div className="bg-exito-solido text-white text-xl font-black px-6 py-2 rounded-xl border-4 border-exito rotate-[-15deg] shadow-2xl">
            VALIDAR
          </div>
        </div>
        {/* Rojo (izquierda = rechazar) */}
        <div
          className="absolute inset-0 bg-error/25 z-10 pointer-events-none flex items-center justify-center"
          style={{ opacity: dragX < 0 ? getOpacityOverlay(dragX) : 0, transition: isDragging ? "none" : "opacity 0.2s" }}
        >
          <div className="bg-error-solido text-white text-xl font-black px-6 py-2 rounded-xl border-4 border-error rotate-[15deg] shadow-2xl">
            RECHAZAR
          </div>
        </div>

        {/* Foto */}
        <div className="aspect-[3/4] bg-superficie-2 relative overflow-hidden">
          {urlFoto ? (
            // URL firmada de R2 que vence en minutos: sin next/image, para que ninguna
            // foto de menores pase por el optimizador ni quede en otra caché
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlFoto}
              alt={`Foto de ${alumno}`}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full animate-shimmer" />
          )}
          {/* Badge de semana */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            <span className="text-xs font-semibold text-white">Semana {semana}</span>
          </div>
          {/* Badge de comunidad */}
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-marca-solido/85 backdrop-blur-md border border-white/20">
            <span className="text-xs font-medium text-white">{comunidad}</span>
          </div>
        </div>

        {/* Info del alumno */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-texto">{alumno}</h3>
          <p className="text-xs text-texto-tenue mt-0.5">Enviada el {formatearDiaHora(enviadoEn)}</p>
          {children}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-center gap-6 mt-6">
        {/* Rechazar */}
        <button
          onClick={handleRechazar}
          disabled={isFlying}
          className="w-16 h-16 rounded-full bg-error/10 border-2 border-error/25
                     hover:bg-error/15 hover:border-error/50 hover:scale-110
                     active:scale-95 disabled:opacity-30
                     flex items-center justify-center transition-all duration-200"
          title="Rechazar"
        >
          <svg className="w-7 h-7 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Indicador de swipe */}
        <div className="text-[10px] text-texto-tenue text-center">
          <p>← desliza →</p>
        </div>

        {/* Validar */}
        <button
          onClick={handleValidar}
          disabled={isFlying}
          className="w-16 h-16 rounded-full bg-exito/10 border-2 border-exito/25
                     hover:bg-exito/15 hover:border-exito/50 hover:scale-110
                     active:scale-95 disabled:opacity-30
                     flex items-center justify-center transition-all duration-200"
          title="Validar"
        >
          <svg className="w-7 h-7 text-exito" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
