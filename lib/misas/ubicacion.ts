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

const RADIO_TIERRA_KM = 6371;
const aRadianes = (grados: number) => (grados * Math.PI) / 180;

/** Distancia en línea recta (fórmula de Haversine). Se calcula en el celular: la ubicación no sale de ahí. */
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const dLatitud = aRadianes(b.latitud - a.latitud);
  const dLongitud = aRadianes(b.longitud - a.longitud);
  const h =
    Math.sin(dLatitud / 2) ** 2 +
    Math.cos(aRadianes(a.latitud)) * Math.cos(aRadianes(b.latitud)) * Math.sin(dLongitud / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

const formatoKm = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });

/** "350 m", "1.2 km" o "15 km" (en Perú el decimal es punto) */
export function formatearDistancia(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${formatoKm.format(km)} km`;
  return `${Math.round(km)} km`;
}

/** Enlace de Google Maps con la ruta hasta la iglesia (Maps usa su propia ubicación del celular) */
export function enlaceComoLlegar({ latitud, longitud }: Coordenadas): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;
}
