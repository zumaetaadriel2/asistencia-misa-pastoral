// =============================================
// Huella perceptual (dHash) para detectar fotos repetidas
// =============================================
// La imagen se reduce a 9×8 píxeles en grises y se compara cada píxel con su
// vecino de la derecha: 8 comparaciones × 8 filas = 64 bits. Dos copias de la
// misma foto (reenviada por WhatsApp, recomprimida o achicada) dan huellas casi
// idénticas; la base marca como "parecidas" las que difieren en 8 bits o menos.

export const ANCHO_HUELLA = 9;
export const ALTO_HUELLA = 8;

/**
 * Calcula el dHash a partir de los 72 valores de gris (fila por fila).
 * Devuelve un bigint con signo de 64 bits, igual que la columna `huella` de Postgres.
 */
export function dHash(grises: ArrayLike<number>): bigint {
  if (grises.length !== ANCHO_HUELLA * ALTO_HUELLA) {
    throw new Error(`Se esperaban ${ANCHO_HUELLA * ALTO_HUELLA} valores de gris y llegaron ${grises.length}.`);
  }

  let hash = BigInt(0);
  for (let y = 0; y < ALTO_HUELLA; y++) {
    for (let x = 0; x < ANCHO_HUELLA - 1; x++) {
      const i = y * ANCHO_HUELLA + x;
      hash = (hash << BigInt(1)) | (grises[i] < grises[i + 1] ? BigInt(1) : BigInt(0));
    }
  }
  return BigInt.asIntN(64, hash);
}

/** Cantidad de bits distintos entre dos huellas (la misma cuenta que hace la base) */
export function distanciaHamming(a: bigint, b: bigint): number {
  let diferencia = BigInt.asUintN(64, a ^ b);
  let bits = 0;
  while (diferencia > BigInt(0)) {
    bits += Number(diferencia & BigInt(1));
    diferencia >>= BigInt(1);
  }
  return bits;
}

/** Luminancia (0–255) de cada píxel de un arreglo RGBA */
export function aGrises(rgba: ArrayLike<number>): number[] {
  const grises: number[] = [];
  for (let i = 0; i < rgba.length; i += 4) {
    grises.push(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
  }
  return grises;
}

/** Calcula la huella dibujando la imagen en un canvas de 9×8 (solo en el navegador) */
export function calcularHuella(imagen: CanvasImageSource): bigint {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO_HUELLA;
  canvas.height = ALTO_HUELLA;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");

  ctx.drawImage(imagen, 0, 0, ANCHO_HUELLA, ALTO_HUELLA);
  return dHash(aGrises(ctx.getImageData(0, 0, ANCHO_HUELLA, ALTO_HUELLA).data));
}
