"use client";

import { useEffect, useState } from "react";
import { armarAlertaIntentos, obtenerAlertaIntentos, type AlertaIntentos } from "@/lib/staff/alerta-intentos";

/** Arriba del Resumen del admin: solo aparece si hay muchos códigos equivocados (ver alerta_intentos) */
export function AvisoIntentos() {
  const [alerta, setAlerta] = useState<AlertaIntentos | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerAlertaIntentos()
      .then((datos) => {
        if (!cancelado) setAlerta(armarAlertaIntentos(datos));
      })
      // Si falla, no se muestra nada: el Resumen de abajo ya avisa sus propios errores
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  if (!alerta) return null;
  return (
    <div
      role={alerta.grave ? "alert" : "status"}
      className={`mb-4 rounded-xl border px-4 py-3 ${
        alerta.grave ? "bg-error/10 border-error/25" : "bg-aviso/10 border-aviso/25"
      }`}
    >
      <p className={`text-sm font-semibold ${alerta.grave ? "text-error" : "text-aviso"}`}>{alerta.titulo}</p>
      <p className="mt-1 text-xs text-texto-suave">{alerta.detalle}</p>
    </div>
  );
}
