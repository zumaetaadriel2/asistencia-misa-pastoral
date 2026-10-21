// =============================================
// Preparar la foto en el navegador antes de subirla
// =============================================
// JPEG y no WebP: Safari (iPhone) no sabe generar WebP desde un canvas y
// devuelve PNG en su lugar.

import { leerFechaExif } from "./exif";
import { calcularHuella } from "./huella";

/** Suficiente para que el guía distinga la ropa y el lugar; ~80 KB por foto */
export const ANCHO_MAXIMO = 720;
export const CALIDAD_JPEG = 0.75;
export const TIPO_FOTO = "image/jpeg";

export interface FotoProcesada {
  blob: Blob;
  huella: bigint;
  fechaExif: Date | null;
}

/** Reduce el ancho a `anchoMaximo` manteniendo la proporción (nunca agranda) */
export function dimensionesReducidas(
  ancho: number,
  alto: number,
  anchoMaximo: number = ANCHO_MAXIMO
): { ancho: number; alto: number } {
  if (ancho <= anchoMaximo) return { ancho, alto };
  return { ancho: anchoMaximo, alto: Math.round((alto * anchoMaximo) / ancho) };
}

function canvasABlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob?.type === TIPO_FOTO) resolve(blob);
        else reject(new Error("El navegador no pudo comprimir la foto."));
      },
      TIPO_FOTO,
      CALIDAD_JPEG
    );
  });
}

/**
 * Lee la fecha EXIF, calcula la huella y comprime la foto a JPEG de 720 px.
 * `createImageBitmap` respeta la orientación EXIF, así que la foto no sale girada.
 */
export async function procesarFoto(archivo: File): Promise<FotoProcesada> {
  const [imagen, fechaExif] = await Promise.all([
    createImageBitmap(archivo),
    leerFechaExif(archivo),
  ]);

  try {
    const { ancho, alto } = dimensionesReducidas(imagen.width, imagen.height);
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");
    ctx.drawImage(imagen, 0, 0, ancho, alto);

    return {
      blob: await canvasABlob(canvas),
      huella: calcularHuella(imagen),
      fechaExif,
    };
  } finally {
    imagen.close();
  }
}
