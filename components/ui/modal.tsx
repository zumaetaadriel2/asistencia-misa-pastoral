"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  titulo: ReactNode;
  /** Se llama al cerrar con Escape, tocando fuera o con dialog.close() */
  onCerrar: () => void;
  children: ReactNode;
  /** Mientras se envía algo: no se cierra con Escape ni tocando fuera */
  bloqueado?: boolean;
  tamano?: "sm" | "md";
}

/**
 * Ventana modal sobre <dialog> nativo: atrapa el foco, se cierra con Escape y
 * bloquea el scroll de la página (regla html:has(dialog[open]) en globals.css).
 * Renderízala solo mientras está abierta. Si un campo lleva `data-autofocus`,
 * recibe el foco al abrir.
 */
export function Modal({ titulo, onCerrar, children, bloqueado = false, tamano = "sm" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    // Sin close() en la limpieza: en StrictMode cerraría el modal recién abierto
    if (!dialogo.open) dialogo.showModal();
    dialogo.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onClose={onCerrar}
      onCancel={(e) => {
        if (bloqueado) e.preventDefault();
      }}
      onClick={(e) => {
        // El clic en el fondo llega al propio <dialog> (el contenido va en un div interior)
        if (e.target === e.currentTarget && !bloqueado) e.currentTarget.close();
      }}
      className={`m-auto p-0 w-[calc(100%-2rem)] ${tamano === "md" ? "max-w-md" : "max-w-sm"} bg-transparent text-texto`}
    >
      <div className="tarjeta p-6 max-h-[90dvh] overflow-y-auto animate-fade-in-scale">
        <h2 id={idTitulo} className="text-lg font-semibold text-texto">
          {titulo}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
