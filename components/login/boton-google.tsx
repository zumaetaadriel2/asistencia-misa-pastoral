"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { crearNonce, GOOGLE_CLIENT_ID } from "@/lib/staff/google";

/** Si el script de Google no carga en este tiempo (bloqueado o sin conexión), se usa la redirección */
const ESPERA_MAXIMA_MS = 8000;

interface Props {
  /** Google devolvió el ID token: canjearlo en Supabase junto con el nonce original */
  onToken: (token: string, nonce: string) => void;
  /** No se pudo mostrar el botón */
  onNoDisponible: () => void;
  /** Súbelo tras un intento fallido: se vuelve a dibujar con un nonce nuevo */
  intento: number;
}

/** Botón oficial "Iniciar sesión con Google", dibujado por Google dentro de la página */
export function BotonGoogle({ onToken, onNoDisponible, intento }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [cargado, setCargado] = useState(false);

  // Las funciones del padre cambian en cada render: se guardan las últimas
  const alToken = useRef(onToken);
  const alNoDisponible = useRef(onNoDisponible);
  useEffect(() => {
    alToken.current = onToken;
    alNoDisponible.current = onNoDisponible;
  });

  useEffect(() => {
    if (cargado) return;
    const espera = setTimeout(() => alNoDisponible.current(), ESPERA_MAXIMA_MS);
    return () => clearTimeout(espera);
  }, [cargado]);

  useEffect(() => {
    const div = contenedor.current;
    if (!cargado || !div) return;
    let cancelado = false;

    crearNonce().then(({ nonce, cifrado }) => {
      const id = window.google?.accounts.id;
      if (cancelado || !id) return;
      id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => alToken.current(credential, nonce),
        nonce: cifrado,
        ux_mode: "popup",
        context: "signin",
        itp_support: true,
      });
      id.renderButton(div, {
        type: "standard",
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "filled_black" : "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
        logo_alignment: "center",
        width: Math.min(400, div.offsetWidth),
        locale: "es",
      });
    });

    return () => {
      cancelado = true;
    };
  }, [cargado, intento]);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onReady={() => setCargado(true)}
        onError={() => alNoDisponible.current()}
      />
      {/* Reserva el alto del botón para que la tarjeta no salte al aparecer. El iframe de Google
          es de tema claro: con color-scheme light en su contenedor, el navegador no le pinta
          un fondo opaco cuando la página está en tema oscuro. */}
      <div ref={contenedor} className="min-h-11 flex items-center justify-center [color-scheme:light]" />
    </>
  );
}
