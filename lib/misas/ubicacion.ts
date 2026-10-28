// =============================================
// Ubicación de una iglesia: "-8.1116, -79.0287" (como la copia Google Maps)
// =============================================

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/** La provincia de Trujillo, con margen (lo mismo que comprueba la base) */
const LATITUD = { min: -8.5, max: -7.5 };
const LONGITUD = { min: -79.5, max: -78.5 };

const dentro = (valor: number, { min, max }: { min: number; max: number }) => valor >= min && valor <= max;
const redondear = (valor: number) => Math.round(valor * 1e6) / 1e6;

/**
 * Lee "latitud, longitud". Acepta el formato de Google Maps ("-8.1116, -79.0287") y el de un
 * Excel en español con coma decimal ("-8,1116; -79,0287" o separado por espacios).
 */
export function parsearUbicacion(texto: string): Coordenadas | { error: string } {
  const limpio = texto.trim();
  if (!limpio) return { error: "Falta la ubicación (clic derecho en Google Maps y copia las coordenadas)." };

  const conPunto = /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/.exec(limpio);
  const conComa = /^(-?\d+(?:,\d+)?)\s*[;\s]\s*(-?\d+(?:,\d+)?)$/.exec(limpio);
  const partes = conPunto ?? conComa;
  if (!partes) return { error: `La ubicación «${limpio}» no tiene el formato «-8.1116, -79.0287».` };

  const latitud = Number(partes[1].replace(",", "."));
  const longitud = Number(partes[2].replace(",", "."));
  if (dentro(latitud, LONGITUD) && dentro(longitud, LATITUD)) {
    return { error: "La latitud y la longitud están al revés: primero va la latitud (-8.…)." };
  }
  if (!dentro(latitud, LATITUD) || !dentro(longitud, LONGITUD)) {
    return { error: "La ubicación no está en la provincia de Trujillo." };
  }
  return { latitud: redondear(latitud), longitud: redondear(longitud) };
}

/** "-8.111600, -79.028700" para mostrar o editar */
export function formatearUbicacion({ latitud, longitud }: Coordenadas): string {
  return `${latitud.toFixed(6)}, ${longitud.toFixed(6)}`;
}
