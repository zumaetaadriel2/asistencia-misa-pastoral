// =============================================
// Alerta de códigos equivocados (Administración → Resumen)
// =============================================
// La base ya no bloquea a todos los alumnos por muchos intentos repartidos entre IP (solo con el
// freno de emergencia de 20.000 en 15 minutos): en cambio, avisa al administrador.

import { supabase } from "@/lib/supabase/client";

/** Lo que devuelve la RPC alerta_intentos (solo admin) */
export interface DatosAlertaIntentos {
  /** Códigos equivocados en la última hora */
  ultima_hora: number;
  /** Desde cuántas IP distintas */
  ips: number;
  /** El freno de emergencia está bloqueando a todos ahora mismo */
  bloqueo_global: boolean;
}

/**
 * Desde cuántos códigos equivocados en una hora se avisa. Un salón que escribe sus códigos a la
 * vez se equivoca unas decenas de veces; cientos en una hora ya no son errores de tipeo.
 */
export const INTENTOS_PARA_ALERTA = 300;

export interface AlertaIntentos {
  grave: boolean;
  titulo: string;
  detalle: string;
}

export async function obtenerAlertaIntentos(): Promise<DatosAlertaIntentos> {
  const { data, error } = await supabase.rpc("alerta_intentos");
  if (error) throw error;
  return data as unknown as DatosAlertaIntentos;
}

const miles = (n: number) => n.toLocaleString("es-PE");

/** Qué mostrar, o null si todo está normal */
export function armarAlertaIntentos(datos: DatosAlertaIntentos): AlertaIntentos | null {
  const origen = `${miles(datos.ultima_hora)} códigos equivocados en la última hora, desde ${miles(datos.ips)} ${
    datos.ips === 1 ? "conexión" : "conexiones distintas"
  }`;

  if (datos.bloqueo_global) {
    return {
      grave: true,
      titulo: "Los alumnos no pueden entrar ahora",
      detalle: `Hay demasiados intentos con códigos equivocados (${origen}) y la app bloqueó la entrada a todos por 15 minutos. Se libera sola cuando bajan los intentos. Si se repite, avisa a quien mantiene la app.`,
    };
  }
  if (datos.ultima_hora >= INTENTOS_PARA_ALERTA) {
    return {
      grave: false,
      titulo: "Muchos intentos con códigos equivocados",
      detalle: `Hubo ${origen}. Puede ser alguien probando códigos al azar. Los alumnos siguen entrando con normalidad; cada conexión queda bloqueada tras 30 errores. Si sigue, avisa a quien mantiene la app.`,
    };
  }
  return null;
}
