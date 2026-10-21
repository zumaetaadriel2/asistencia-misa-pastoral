"use client";

import { useEffect, useState } from "react";
import { HORARIO_ENVIO } from "@/lib/alumno/mensajes";
import { formatearCuentaRegresiva, formatearDiaHora } from "@/lib/utils/timeHelpers";

/** Espera mínima entre dos consultas al llegar a cero (si el reloj del celular va adelantado) */
const ESPERA_ENTRE_CONSULTAS_MS = 30_000;

// Fuera del componente: sobrevive a que el panel se vuelva a montar tras cada consulta
let ultimaConsulta = 0;

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
    let consulta: ReturnType<typeof setTimeout> | undefined;

    function actualizar() {
      const ms = apertura - Date.now();
      setRestante(ms);
      if (ms > 0) return;

      clearInterval(intervalo);
      // Si el servidor sigue cerrado (reloj adelantado), no consultar en bucle
      const espera = Math.max(0, ultimaConsulta + ESPERA_ENTRE_CONSULTAS_MS - Date.now());
      consulta = setTimeout(() => {
        ultimaConsulta = Date.now();
        onAbrir();
      }, espera);
    }

    const primero = setTimeout(actualizar, 0);
    const intervalo = setInterval(actualizar, 1000);
    return () => {
      clearTimeout(primero);
      clearInterval(intervalo);
      clearTimeout(consulta);
    };
  }, [proximaApertura, onAbrir]);

  if (manual) {
    return (
      <p className="text-sm text-texto-suave text-center">
        La pastoral cerró el envío de fotos por ahora. Consulta con tu guía cuándo volverá a abrirse.
      </p>
    );
  }

  if (!proximaApertura) {
    return <p className="text-sm text-texto-suave text-center">El año de pastoral ya terminó. ¡Gracias por participar!</p>;
  }

  return (
    <div className="text-center">
      <p className="text-sm text-texto-suave">El envío de fotos abre en</p>
      <p className="my-2 text-3xl font-bold text-marca text-balance">
        {restante === null ? "…" : restante > 0 ? formatearCuentaRegresiva(restante) : "un momento"}
      </p>
      <p className="text-sm text-texto-suave first-letter:uppercase">{formatearDiaHora(proximaApertura)}</p>
      <p className="mt-4 text-xs text-texto-tenue">Horario de envío: {HORARIO_ENVIO}</p>
    </div>
  );
}
