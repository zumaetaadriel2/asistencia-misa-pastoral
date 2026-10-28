// =============================================
// Qué misas del fin de semana ya pasaron y cuál es la próxima (hora de Lima)
// =============================================

import { ZONA_HORARIA } from "@/lib/utils/timeHelpers";
import type { Misa } from "./horarios";

const ISODOW: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const formatoLima = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Día de la semana (isodow: 1 lunes … 7 domingo) y hora "HH:MM" en Lima */
export function momentoEnLima(ahora: Date): { dia: number; hora: string } {
  const partes = Object.fromEntries(formatoLima.formatToParts(ahora).map((p) => [p.type, p.value]));
  return { dia: ISODOW[partes.weekday], hora: `${partes.hour}:${partes.minute}` };
}

export interface MisaMarcada extends Misa {
  /** Ya empezó (este fin de semana) */
  pasada: boolean;
  /** La primera que falta */
  proxima: boolean;
}

/**
 * Marca las misas del fin de semana en curso. De lunes a viernes ninguna pasó (son las del
 * próximo fin de semana); el sábado pasan las del sábado ya empezadas; el domingo, todas las
 * del sábado y las del domingo ya empezadas. Tras la última del domingo no queda próxima.
 */
export function marcarMisas(misas: Misa[], ahora: Date): MisaMarcada[] {
  const { dia, hora } = momentoEnLima(ahora);
  const yaPaso = (m: Misa) =>
    (dia === 6 && m.dia === 6 && m.hora <= hora) || (dia === 7 && (m.dia === 6 || m.hora <= hora));

  let hayProxima = false;
  return [...misas]
    .sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora))
    .map((m) => {
      const pasada = yaPaso(m);
      const proxima = !pasada && !hayProxima;
      if (proxima) hayProxima = true;
      return { ...m, pasada, proxima };
    });
}
