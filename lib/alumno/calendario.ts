// =============================================
// Recordatorio semanal para el calendario del celular (.ics)
// =============================================
// Un evento que se repite cada sábado a las 7:00 p. m. de Lima, cuando abre el envío de
// fotos. Se sirve como archivo fijo (app/recordatorio-misa.ics): el iPhone lo abre en
// «Agregar al calendario» y Android lo importa en Google Calendar. No guarda nada del alumno.

/** Sábado 28 de febrero de 2026 a las 7:00 p. m. en Lima (UTC-5 todo el año): la primera vez */
const PRIMER_SABADO = "20260301T000000Z";
const FIN_PRIMER_SABADO = "20260301T003000Z";
const SELLO = "20261108T000000Z";

/** Texto de iCalendar: se escapan \ ; , y los saltos de línea (RFC 5545, 3.3.11) */
function texto(valor: string): string {
  return valor.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Las líneas de más de 75 caracteres siguen en la siguiente, empezando con un espacio */
function doblar(linea: string): string {
  const partes: string[] = [];
  for (let i = 0; i < linea.length; i += i === 0 ? 75 : 74) {
    partes.push((i === 0 ? "" : " ") + linea.slice(i, i === 0 ? 75 : i + 74));
  }
  return partes.join("\r\n");
}

export function armarIcs(urlApp: string): string {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pastoral Mariana//Mi Misa PS//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:recordatorio-misa@mi-misa-ps",
    `DTSTAMP:${SELLO}`,
    `DTSTART:${PRIMER_SABADO}`,
    `DTEND:${FIN_PRIMER_SABADO}`,
    "RRULE:FREQ=WEEKLY",
    `SUMMARY:${texto("Subir mi foto de misa (Mi Misa PS)")}`,
    `DESCRIPTION:${texto(`Ya puedes subir tu foto de misa: hasta el lunes a las 11:59 p. m.\n${urlApp}`)}`,
    `URL:${urlApp}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${texto("Subir mi foto de misa")}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lineas.map(doblar).join("\r\n") + "\r\n";
}
