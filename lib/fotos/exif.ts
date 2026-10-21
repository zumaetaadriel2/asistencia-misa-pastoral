// =============================================
// Fecha en que la cámara tomó la foto (EXIF)
// =============================================
// Se lee antes de comprimir, porque el canvas descarta los metadatos.
// Es solo un indicio para el guía: WhatsApp y las capturas de pantalla la
// borran, y se puede alterar.

import exifr from "exifr";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** Descarta fechas imposibles: cámaras sin hora configurada o fechas en el futuro */
export function fechaExifValida(valor: unknown, ahora: Date = new Date()): Date | null {
  if (!(valor instanceof Date) || Number.isNaN(valor.getTime())) return null;
  if (valor.getFullYear() < 2015) return null;
  if (valor.getTime() > ahora.getTime() + UN_DIA_MS) return null;
  return valor;
}

/**
 * Devuelve la fecha EXIF de la foto o null si no la tiene.
 * La fecha EXIF no trae zona horaria: exifr la interpreta en la hora local del
 * celular, que en Trujillo es la de Lima.
 */
export async function leerFechaExif(archivo: Blob): Promise<Date | null> {
  try {
    const datos = await exifr.parse(archivo, { pick: ["DateTimeOriginal", "CreateDate"] });
    return fechaExifValida(datos?.DateTimeOriginal ?? datos?.CreateDate);
  } catch {
    return null;
  }
}
