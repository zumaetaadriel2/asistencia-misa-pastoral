// =============================================
// Formateo de fechas y tiempos para mostrar
// =============================================
// El horario del formulario y la semana se calculan en la base (estado_formulario);
// aquí solo se da formato, siempre en hora de Lima.

export const ZONA_HORARIA = "America/Lima";

const MS_SEGUNDO = 1000;
const MS_MINUTO = 60 * MS_SEGUNDO;
const MS_HORA = 60 * MS_MINUTO;
const MS_DIA = 24 * MS_HORA;

const dos = (n: number) => n.toString().padStart(2, "0");

/** "2d 03h 05m 09s", o sin días si falta menos de uno. Nunca negativo. */
export function formatearCuentaRegresiva(ms: number): string {
  const restante = Math.max(0, ms);
  const dias = Math.floor(restante / MS_DIA);
  const horas = Math.floor((restante % MS_DIA) / MS_HORA);
  const minutos = Math.floor((restante % MS_HORA) / MS_MINUTO);
  const segundos = Math.floor((restante % MS_MINUTO) / MS_SEGUNDO);

  const partes = [`${dos(horas)}h`, `${dos(minutos)}m`, `${dos(segundos)}s`];
  if (dias > 0) partes.unshift(`${dias}d`);
  return partes.join(" ");
}

const formatoDiaHora = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA_HORARIA,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "sábado, 24 de octubre, 7:00 p. m." en hora de Lima */
export function formatearDiaHora(fecha: Date | string): string {
  return formatoDiaHora.format(typeof fecha === "string" ? new Date(fecha) : fecha);
}
