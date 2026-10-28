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

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`;

/**
 * Tiempo que falta en palabras, con las dos unidades más grandes: "2 días y 3 h",
 * "3 h y 5 min", "5 min". Los segundos solo aparecen en el último minuto. Nunca negativo.
 */
export function formatearCuentaRegresiva(ms: number): string {
  const restante = Math.max(0, ms);
  const dias = Math.floor(restante / MS_DIA);
  const horas = Math.floor((restante % MS_DIA) / MS_HORA);
  const minutos = Math.floor((restante % MS_HORA) / MS_MINUTO);
  const segundos = Math.ceil((restante % MS_MINUTO) / MS_SEGUNDO);

  const unir = (mayor: string, menor: number, texto: string) => (menor > 0 ? `${mayor} y ${menor} ${texto}` : mayor);
  if (dias > 0) return unir(plural(dias, "día", "días"), horas, "h");
  if (horas > 0) return unir(`${horas} h`, minutos, "min");
  if (minutos > 0) return `${minutos} min`;
  return `${segundos} s`;
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

const formatoFechaCorta = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA_HORARIA,
  weekday: "short",
  day: "numeric",
  month: "short",
});

/**
 * Fecha "AAAA-MM-DD" (como la da la base) → "sáb 17 oct" o "dom 18 oct".
 * Se lee al mediodía de Lima: new Date("AAAA-MM-DD") es medianoche UTC y en Lima
 * todavía sería el día anterior.
 */
export function formatearFecha(fecha: string): string {
  return formatoFechaCorta
    .format(new Date(`${fecha}T12:00:00-05:00`))
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

const formatoFechaConAnio = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA_HORARIA,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Fecha "AAAA-MM-DD" → "25 oct 2026" (al mediodía de Lima, como formatearFecha) */
export function formatearFechaConAnio(fecha: string): string {
  return formatoFechaConAnio
    .format(new Date(`${fecha}T12:00:00-05:00`))
    .replace(/[.,]/g, "")
    .replace(/\s+de\s+/g, " ")
    .replace(/\s+/g, " ");
}

const formatoMesAnio = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA_HORARIA, month: "short", year: "numeric" });

/** Fecha "AAAA-MM-DD" → "oct 2026" */
export function formatearMesAnio(fecha: string): string {
  return formatoMesAnio
    .format(new Date(`${fecha}T12:00:00-05:00`))
    .replace(/[.,]/g, "")
    .replace(/\s+de\s+/g, " ")
    .replace(/\s+/g, " ");
}

/** Hoy en Lima como "AAAA-MM-DD" (para el valor por defecto de un campo de fecha) */
export function hoyEnLima(ahora: Date = new Date()): string {
  // en-CA da el formato AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(ahora);
}
