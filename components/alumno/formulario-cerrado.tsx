"use client";

import { useEffect, useState } from "react";
import { formatearCuentaRegresiva, formatearDiaHora } from "@/lib/utils/timeHelpers";

interface Props {
  /** Cuándo abre el formulario (ISO); null si no hay apertura programada */
  proximaApertura: string | null;
  /** El administrador lo cerró a mano */
  manual: boolean;
  /** Se llama cuando la cuenta regresiva llega a cero, para volver a consultar */
  onAbrir: () => void;
}

/** Aviso de formulario cerrado con cuenta regresiva hasta la próxima apertura */
export function FormularioCerrado({ proximaApertura, manual, onAbrir }: Props) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    if (!proximaApertura) return;
    const apertura = new Date(proximaApertura).getTime();

    function actualizar() {
      const ms = apertura - Date.now();
      setRestante(ms);
      if (ms <= 0) {
        clearInterval(intervalo);
        onAbrir();
      }
    }

    const primero = setTimeout(actualizar, 0);
    const intervalo = setInterval(actualizar, 1000);
    return () => {
      clearTimeout(primero);
      clearInterval(intervalo);
    };
  }, [proximaApertura, onAbrir]);

  if (manual) {
    return (
      <p className="text-sm text-texto-suave text-center">
        La pastoral cerró el formulario por ahora. Consulta con tu guía cuándo volverá a abrirse.
      </p>
    );
  }

  if (!proximaApertura) {
    return <p className="text-sm text-texto-suave text-center">El ciclo de este año ya terminó.</p>;
  }

  return (
    <div className="text-center">
      <p className="text-xs text-texto-tenue uppercase tracking-wider mb-1">El formulario abre el</p>
      <p className="text-sm font-medium text-texto-suave mb-4">{formatearDiaHora(proximaApertura)}</p>
      <p className="text-3xl font-mono font-bold text-marca animate-countdown">
        {restante === null ? "…" : formatearCuentaRegresiva(restante)}
      </p>
      <p className="mt-4 text-xs text-texto-tenue">Horario de envío: sábado 7:00 p. m. a lunes 11:59 p. m.</p>
    </div>
  );
}
