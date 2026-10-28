// =============================================
// Misas del fin de semana escritas como texto: "Sáb 19:00; Dom 7:00, 9:00 y 11:00"
// =============================================
// Es el formato del campo del formulario y de la columna "Misas" del Excel (en la plantilla
// van separadas en Sábado y Domingo, y se leen igual anteponiendo el día). Solo se
// aceptan las misas del sábado desde las 17:00 (víspera) y las del domingo, igual que
// la base (horarios_misa).

/** Como extract(isodow) en la base: 6 sábado, 7 domingo */
export type DiaMisa = 6 | 7;

export interface Misa {
  dia: DiaMisa;
  /** "HH:MM" en 24 h */
  hora: string;
}

export const HORA_MINIMA_SABADO = "17:00";

export const NOMBRE_DIA: Record<DiaMisa, string> = { 6: "Sáb", 7: "Dom" };

const DIAS: Record<string, DiaMisa> = { sab: 6, sabado: 6, sabados: 6, dom: 7, domingo: 7, domingos: 7 };
const ENTRE_SEMANA = new Set([
  "lun", "lunes", "mar", "martes", "mie", "miercoles", "jue", "jueves", "vie", "viernes",
]);
/** Palabras que unen días u horas y no significan nada por sí solas ("Sáb y Dom", "Lun a Vie") */
const UNIONES = new Set(["y", "a", "al", "e", "de", "las", "hrs", "h"]);
// Los segundos ("19:00:00") son como copia Excel una celda con formato de hora
const HORA = /^(\d{1,2})(?:[:.h](\d{2})(?::00)?)?(am|pm)?$/;

/** Minúsculas y sin tildes; "p. m." → "pm" */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b([ap])\.?\s*m\b\.?/g, "$1m");
}

/** "7" → "07:00"; "7:30 pm" → "19:30"; null si no es una hora válida */
function leerHora(palabra: string, sufijo: string | undefined): string | null {
  const partes = HORA.exec(palabra);
  if (!partes) return null;
  let horas = Number(partes[1]);
  const minutos = Number(partes[2] ?? "0");
  const meridiano = partes[3] ?? sufijo;
  if (meridiano) {
    if (horas < 1 || horas > 12) return null;
    if (meridiano === "pm" && horas < 12) horas += 12;
    if (meridiano === "am" && horas === 12) horas = 0;
  }
  if (horas > 23 || minutos > 59) return null;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function ordenar(misas: Misa[]): Misa[] {
  return [...misas].sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora));
}

/**
 * Lee el texto de misas. Cada día vale para las horas que le siguen: "Sáb 19:00; Dom 7:00,
 * 9:00 y 11:00", "Sáb y Dom 19:00" o "Dom 7 am, 7 pm". Los errores dicen qué no se entendió.
 */
export function parsearMisas(texto: string): { misas: Misa[]; errores: string[] } {
  const palabras = normalizar(texto)
    .split(/[\s,;|/]+/)
    .map((p) => p.replace(/\.$/, ""))
    .filter(Boolean);
  const misas = new Map<string, Misa>();
  const errores: string[] = [];
  let dias: DiaMisa[] = [];
  let ultimaFueHora = false;
  // Tras un día entre semana se saltan sus horas (ya se avisó una vez)
  let saltando = false;

  for (let i = 0; i < palabras.length; i++) {
    const palabra = palabras[i];
    if (UNIONES.has(palabra)) continue;

    if (Object.hasOwn(DIAS, palabra)) {
      dias = ultimaFueHora || saltando ? [DIAS[palabra]] : [...dias, DIAS[palabra]];
      ultimaFueHora = false;
      saltando = false;
      continue;
    }
    if (ENTRE_SEMANA.has(palabra)) {
      errores.push(`Solo se cargan misas de sábado y domingo («${palabra}» no).`);
      dias = [];
      ultimaFueHora = false;
      saltando = true;
      continue;
    }

    if (palabra === "am" || palabra === "pm") continue; // ya se usó con la hora anterior
    const siguiente = palabras[i + 1];
    const hora = leerHora(palabra, siguiente === "am" || siguiente === "pm" ? siguiente : undefined);
    if (hora === null) {
      errores.push(`No se entiende «${palabra}».`);
      continue;
    }
    ultimaFueHora = true;
    if (dias.length === 0) {
      if (!saltando) errores.push(`Falta el día antes de ${horaCorta(hora)}.`);
      continue;
    }
    for (const dia of dias) {
      if (dia === 6 && hora < HORA_MINIMA_SABADO) {
        errores.push(`El sábado solo cuentan las misas desde las ${HORA_MINIMA_SABADO} (${horaCorta(hora)} no).`);
        continue;
      }
      misas.set(`${dia}-${hora}`, { dia, hora });
    }
  }

  return { misas: ordenar([...misas.values()]), errores: [...new Set(errores)] };
}

/** "07:00" → "7:00" */
export function horaCorta(hora: string): string {
  return hora.replace(/^0(\d)/, "$1");
}

/** Lista de horas en español: "7:00, 9:00 y 11:00" */
export function unirHoras(horas: string[]): string {
  const cortas = horas.map(horaCorta);
  return cortas.length > 1 ? `${cortas.slice(0, -1).join(", ")} y ${cortas[cortas.length - 1]}` : (cortas[0] ?? "");
}

/** Las horas de un día separadas por coma, como van en las columnas Sábado y Domingo del Excel: "7:00, 9:00, 11:00" */
export function horasDelDia(misas: Misa[], dia: DiaMisa): string {
  return ordenar(misas)
    .filter((m) => m.dia === dia)
    .map((m) => horaCorta(m.hora))
    .join(", ");
}

/** El texto canónico: "Sáb 19:00; Dom 7:00, 9:00 y 11:00" (vacío si no hay misas) */
export function formatearMisas(misas: Misa[]): string {
  return ([6, 7] as DiaMisa[])
    .map((dia) => {
      const horas = ordenar(misas)
        .filter((m) => m.dia === dia)
        .map((m) => m.hora);
      return horas.length ? `${NOMBRE_DIA[dia]} ${unirHoras(horas)}` : "";
    })
    .filter(Boolean)
    .join("; ");
}
