"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { accionDeTecla, leerTecla } from "@/lib/staff/atajos";
import { formatearDiaHora } from "@/lib/utils/timeHelpers";
import { VisorFoto } from "./visor-foto";

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
  /** Va junto a los botones: a la derecha en PC y debajo en el celular (fotos para comparar…) */
  lateral?: ReactNode;
  /** Debe resolver `true` si la validación se guardó y `false` si falló */
  onValidar: () => Promise<boolean>;
  onIniciarRechazo: () => void;
}

// =============================================
// Constantes
// =============================================

const SWIPE_THRESHOLD = 100;
const FLY_OUT_DURATION = 400;
/** Si el dedo o el mouse se movió menos que esto, fue un toque (abre la foto en grande) */
const MOVIMIENTO_MAXIMO_TOQUE = 10;

// =============================================
// Componente
// =============================================

/**
 * Tarjeta de revisión estilo "Tinder": deslizar (dedo o mouse), botones y, en PC,
 * atajos de teclado (lib/staff/atajos.ts). Tocar la foto la abre en grande.
 */
export function TarjetaRevision({
  urlFoto,
  alumno,
  comunidad,
  semana,
  enviadoEn,
  children,
  lateral,
  onValidar,
  onIniciarRechazo,
}: Props) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flyDirection, setFlyDirection] = useState<"left" | "right" | null>(null);
  const [ampliada, setAmpliada] = useState(false);

  // Dónde empezó el gesto, si fue sobre la foto y si ya se movió lo bastante para no ser un toque
  const inicioRef = useRef({ x: 0, y: 0 });
  const desdeFotoRef = useRef(false);
  const seMovioRef = useRef(false);
  const fotoRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const getRotation = (x: number) => x * 0.08;
  const getOpacityOverlay = (x: number) => Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1) * 0.6;
  const isFlying = flyDirection !== null;

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
    // No anima: se abre el modal del motivo. La tarjeta vuelve al centro por si se cancela.
    setDragX(0);
    onIniciarRechazo();
  }, [onIniciarRechazo]);

  // --- Atajos de teclado (Z para deshacer lo maneja PanelRevision) ---
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (isFlying || ampliada) return;
      const accion = accionDeTecla(leerTecla(e));
      if (accion === "validar") handleValidar();
      else if (accion === "rechazar") handleRechazar();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [isFlying, ampliada, handleValidar, handleRechazar]);

  // --- Gesto (dedo o mouse) ---
  const empezar = (x: number, y: number, objetivo: EventTarget) => {
    inicioRef.current = { x, y };
    desdeFotoRef.current = objetivo instanceof Node && Boolean(fotoRef.current?.contains(objetivo));
    seMovioRef.current = false;
    setIsDragging(true);
  };

  const mover = (x: number, y: number) => {
    const dx = x - inicioRef.current.x;
    const dy = y - inicioRef.current.y;
    if (Math.abs(dx) > MOVIMIENTO_MAXIMO_TOQUE || Math.abs(dy) > MOVIMIENTO_MAXIMO_TOQUE) seMovioRef.current = true;
    setDragX(dx);
  };

  /** Devuelve true si fue un toque (sin arrastrar) */
  const terminar = () => {
    setIsDragging(false);
    if (!seMovioRef.current) {
      setDragX(0);
      return true;
    }
    if (dragX > SWIPE_THRESHOLD) handleValidar();
    else if (dragX < -SWIPE_THRESHOLD) handleRechazar();
    else setDragX(0);
    return false;
  };

  const abrirSiFueToque = (fueToque: boolean) => {
    if (fueToque && desdeFotoRef.current && urlFoto) setAmpliada(true);
  };

  // --- Transform styles ---
  const translateX = isFlying ? (flyDirection === "right" ? "120%" : "-120%") : `${dragX}px`;
  const rotation = isFlying ? (flyDirection === "right" ? 15 : -15) : getRotation(dragX);

  return (
    // En PC: la tarjeta a la izquierda y los botones arriba a la derecha, siempre a la vista
    <div className="w-full lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-10 lg:items-start">
      {/* Tarjeta principal */}
      <div
        className="tarjeta relative overflow-hidden select-none cursor-grab active:cursor-grabbing w-full max-w-sm mx-auto lg:max-w-none"
        style={{
          transform: `translateX(${translateX}) rotate(${rotation}deg)`,
          transition: isDragging ? "none" : `all ${FLY_OUT_DURATION}ms ease-out`,
          opacity: isFlying ? 0 : 1,
          touchAction: "pan-y",
        }}
        onTouchStart={(e) => empezar(e.touches[0].clientX, e.touches[0].clientY, e.target)}
        onTouchMove={(e) => isDragging && mover(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={(e) => {
          const fueToque = terminar();
          // Evita que el navegador repita el toque como clic del mouse (abriría dos veces)
          if (fueToque && desdeFotoRef.current) e.preventDefault();
          abrirSiFueToque(fueToque);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          empezar(e.clientX, e.clientY, e.target);
        }}
        onMouseMove={(e) => isDragging && mover(e.clientX, e.clientY)}
        onMouseUp={() => isDragging && abrirSiFueToque(terminar())}
        onMouseLeave={() => {
          if (isDragging) {
            setIsDragging(false);
            setDragX(0);
          }
        }}
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

        {/* Foto completa (object-contain): se ve entera aunque sea horizontal. En PC su alto
            se ajusta a la pantalla, para que la tarjeta entre sin hacer scroll en una laptop */}
        <div
          ref={fotoRef}
          className="aspect-[3/4] lg:aspect-auto lg:h-[clamp(16rem,calc(100dvh-30rem),36rem)] bg-superficie-2 relative overflow-hidden"
        >
          {urlFoto ? (
            // URL firmada de R2 que vence en minutos: sin next/image, para que ninguna
            // foto de menores pase por el optimizador ni quede en otra caché
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlFoto}
              alt={`Foto de ${alumno}`}
              className="w-full h-full object-contain pointer-events-none"
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
          {/* Ver en grande (también se abre tocando la foto) */}
          {urlFoto && (
            <button
              onClick={() => setAmpliada(true)}
              // Que no empiece un arrastre de la tarjeta
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              aria-label="Ver la foto en grande"
              className="absolute bottom-3 right-3 z-20 w-11 h-11 rounded-full bg-black/55 hover:bg-black/70 text-white
                         flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Info del alumno */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-texto">{alumno}</h3>
          <p className="text-xs text-texto-tenue mt-0.5">Enviada el {formatearDiaHora(enviadoEn)}</p>
          {children}
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto lg:max-w-none">
        {/* Botones de acción */}
        <div className="flex items-start justify-center lg:justify-start gap-10 mt-6 lg:mt-0">
          <BotonAccion tipo="rechazar" onClick={handleRechazar} disabled={isFlying} />
          <BotonAccion tipo="validar" onClick={handleValidar} disabled={isFlying} />
        </div>
        <p className="mt-3 text-xs text-texto-tenue text-center lg:text-left">
          <span className="lg:hidden">También puedes deslizar la foto: derecha valida, izquierda rechaza.</span>
          <span className="hidden lg:inline">
            Atajos: <kbd className="font-mono">→</kbd> o <kbd className="font-mono">V</kbd> valida ·{" "}
            <kbd className="font-mono">←</kbd> o <kbd className="font-mono">R</kbd> rechaza ·{" "}
            <kbd className="font-mono">Z</kbd> deshace
          </span>
        </p>
        {lateral && <div className="mt-6 space-y-4">{lateral}</div>}
      </div>

      {ampliada && urlFoto && (
        <VisorFoto url={urlFoto} etiqueta={`Foto de ${alumno} (semana ${semana})`} onCerrar={() => setAmpliada(false)} />
      )}
    </div>
  );
}

function BotonAccion({ tipo, onClick, disabled }: { tipo: "validar" | "rechazar"; onClick: () => void; disabled: boolean }) {
  const validar = tipo === "validar";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-1.5 disabled:opacity-30 focus-visible:outline-none"
    >
      <span
        className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-200
                    group-hover:scale-110 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-marca/50 ${
                      validar
                        ? "bg-exito/10 border-exito/25 group-hover:bg-exito/15 group-hover:border-exito/50"
                        : "bg-error/10 border-error/25 group-hover:bg-error/15 group-hover:border-error/50"
                    }`}
      >
        <svg
          className={`w-7 h-7 ${validar ? "text-exito" : "text-error"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={validar ? "m4.5 12.75 6 6 9-13.5" : "M6 18 18 6M6 6l12 12"} />
        </svg>
      </span>
      <span className={`text-sm font-semibold ${validar ? "text-exito" : "text-error"}`}>
        {validar ? "Validar" : "Rechazar"}
      </span>
    </button>
  );
}
