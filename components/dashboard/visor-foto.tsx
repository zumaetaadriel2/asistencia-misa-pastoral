"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** URL firmada de R2 (vence en minutos) */
  url: string;
  etiqueta: string;
  onCerrar: () => void;
}

const AUMENTO = 2.5;

/**
 * Foto a pantalla completa sobre <dialog> (Escape cierra, foco atrapado).
 * En el celular se acerca pellizcando; tocando o con clic se acerca ×2.5 en ese punto.
 * Renderízalo solo mientras está abierto.
 */
export function VisorFoto({ url, etiqueta, onCerrar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [acercada, setAcercada] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }, []);

  const cerrar = () => ref.current?.close();

  const alternarAcercamiento = (e: React.MouseEvent<HTMLImageElement>) => {
    if (acercada) {
      setAcercada(null);
      return;
    }
    const caja = e.currentTarget.getBoundingClientRect();
    setAcercada({
      x: ((e.clientX - caja.left) / caja.width) * 100,
      y: ((e.clientY - caja.top) / caja.height) * 100,
    });
  };

  return (
    <dialog
      ref={ref}
      aria-label={etiqueta}
      onClose={onCerrar}
      className="m-0 p-0 w-full h-full max-w-none max-h-none bg-black/95 text-white"
    >
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-3 p-4"
        // Tocar fuera de la foto cierra
        onClick={(e) => e.target === e.currentTarget && cerrar()}
      >
        <div className="max-w-full max-h-[80dvh] overflow-hidden rounded-xl">
          {/* URL firmada temporal de R2: sin next/image (ver tarjeta-revision.tsx) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={etiqueta}
            onClick={alternarAcercamiento}
            className={`max-w-full max-h-[80dvh] object-contain transition-transform duration-200 ${
              acercada ? "cursor-zoom-out" : "cursor-zoom-in"
            }`}
            style={
              acercada
                ? { transform: `scale(${AUMENTO})`, transformOrigin: `${acercada.x}% ${acercada.y}%` }
                : undefined
            }
          />
        </div>
        <p className="text-sm text-white/80 text-center">{etiqueta}</p>
        <p className="text-xs text-white/60">{acercada ? "Toca la foto para alejar" : "Toca la foto para acercar"}</p>
        <button
          onClick={cerrar}
          className="min-h-11 px-6 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold"
        >
          Cerrar
        </button>
      </div>
    </dialog>
  );
}
