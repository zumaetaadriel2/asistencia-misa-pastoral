"use client";

import { useEffect, useRef } from "react";

/**
 * Lleva el foco a un título cuando aparece una pantalla nueva, para que un lector
 * de pantalla anuncie el cambio. El elemento necesita tabIndex={-1}.
 */
export function useEnfocarAlAparecer<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}
