// =============================================
// Genera los íconos de la app y las versiones web del logo desde marca/
// =============================================
// Uso: node scripts/generar-iconos.mjs
// Usa `sharp`, que ya viene instalado con Next. Los archivos generados se suben
// al repo; vuelve a correrlo solo si cambia el logo (y sube CACHE_NAME en public/sw.js).
//
// Fuentes, en orden de preferencia:
//   marca/logo-completo.png   logo completo en alta resolución (fondo transparente)
//   marca/logo-ovalo.png      solo el óvalo de la Virgen y el Niño (fondo transparente)
//   marca/logo-original.jpg   JPG original: si faltan los PNG, de aquí se recorta el óvalo
// La versión para tema oscuro no se pide a una IA (cambiaba los colores del manto): se hace
// aquí desde logo-completo.png, pintando de blanco solo las letras que quedan fuera del óvalo.
//
// Los íconos de la app ("Mi Misa PS") llevan el óvalo sobre el azul de la marca y una insignia ✓,
// para no confundirlos con otras apps de la pastoral que usan el mismo óvalo sobre blanco.
// El logo dentro de la interfaz (marca/web/*) no cambia.

import { existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const ORIGINAL = "marca/logo-original.jpg";
const COMPLETO = "marca/logo-completo.png";
const OVALO = "marca/logo-ovalo.png";
// Recuadro del óvalo dentro de logo-original.jpg (555 × 613 px)
const OVALO_EN_ORIGINAL = { left: 91, top: 140, width: 315, height: 430 };
// Recuadro del óvalo dentro de logo-completo.png (2000 × 2000 px). Si cambia ese archivo, vuelve a medirlo.
const OVALO_EN_COMPLETO = { left: 364, top: 428, width: 1052, height: 1436 };

/** Óvalo con fondo transparente, recortado al borde */
async function ovalo() {
  if (existsSync(OVALO)) return sharp(OVALO).trim().png().toBuffer();

  // Del JPG: recorta y aplica una elipse como máscara (quita el blanco y restos de letras)
  const { width, height } = OVALO_EN_ORIGINAL;
  const elipse = Buffer.from(
    `<svg width="${width}" height="${height}"><ellipse cx="${width / 2}" cy="${height / 2}" ` +
      `rx="${width / 2 - 1}" ry="${height / 2 - 1}" fill="#fff"/></svg>`
  );
  return sharp(ORIGINAL)
    .extract(OVALO_EN_ORIGINAL)
    .ensureAlpha()
    .composite([{ input: elipse, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/** Logo completo para fondo oscuro: el óvalo intacto; "MARIANA" (azul) en blanco y "PASTORAL" (gris) en gris claro */
async function completoParaOscuro() {
  const { data, info } = await sharp(COMPLETO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { left, top, width, height } = OVALO_EN_COMPLETO;
  // Elipse un poco más grande que el óvalo, para no tocar su borde suavizado
  const cx = left + width / 2;
  const cy = top + height / 2;
  const rx = width / 2 + 10;
  const ry = height / 2 + 10;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const pixel = i / 4;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) continue;

    const azul = data[i + 2] - data[i] > 30;
    data[i] = azul ? 255 : 211;
    data[i + 1] = azul ? 255 : 216;
    data[i + 2] = azul ? 255 : 223;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

const BLANCO = "#ffffff";
const AZUL = "#1d598e";

/** Insignia de asistencia: círculo blanco con un ✓ azul */
function insignia(lado) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 100 100">` +
      `<circle cx="50" cy="50" r="49" fill="${BLANCO}"/>` +
      `<path d="M28 52 L44 67 L73 36" fill="none" stroke="${AZUL}" stroke-width="11" ` +
      `stroke-linecap="round" stroke-linejoin="round"/></svg>`
  );
}

/**
 * Ícono de la app: el óvalo centrado sobre el azul de la marca y la insignia ✓ abajo a la derecha.
 * - alto: fracción del lado que ocupa el óvalo
 * - insignia: diámetro de la insignia (fracción del lado)
 * - desvio: cuánto se corre el centro de la insignia hacia la esquina (fracción del lado)
 * - redondeo: radio de las esquinas (0 = de borde a borde; iOS y los launchers recortan solos)
 */
async function iconoApp(imagen, lado, salida, { alto, insignia: tamano, desvio, redondeo = 0 }) {
  const ovaloRedimensionado = await sharp(imagen).resize({ height: Math.round(lado * alto) }).toBuffer();
  const ladoInsignia = Math.round(lado * tamano);
  const centroInsignia = Math.round(lado * (0.5 + desvio));
  const fondo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">` +
      `<rect width="${lado}" height="${lado}" rx="${Math.round(lado * redondeo)}" fill="${AZUL}"/></svg>`
  );
  await sharp(fondo)
    .composite([
      { input: ovaloRedimensionado, gravity: "center" },
      {
        input: insignia(ladoInsignia),
        left: centroInsignia - Math.round(ladoInsignia / 2),
        top: centroInsignia - Math.round(ladoInsignia / 2),
      },
    ])
    .png({ palette: true, quality: 90, effort: 10 })
    .toFile(salida);
  console.log("✓", salida);
}

/** Ícono normal: el óvalo grande y la insignia en la esquina */
const NORMAL = { alto: 0.78, insignia: 0.3, desvio: 0.28 };
const imagenOvalo = await ovalo();

mkdirSync("public/icons", { recursive: true });
mkdirSync("marca/web", { recursive: true });

// Pestaña del navegador (Next lo enlaza solo desde app/icon.png)
await iconoApp(imagenOvalo, 192, "app/icon.png", { ...NORMAL, redondeo: 0.22 });
// iPhone: de borde a borde (iOS redondea las esquinas y pinta de negro lo transparente)
await iconoApp(imagenOvalo, 180, "app/apple-icon.png", NORMAL);
// Android / PWA (public/manifest.json)
await iconoApp(imagenOvalo, 192, "public/icons/icon-192.png", { ...NORMAL, redondeo: 0.22 });
await iconoApp(imagenOvalo, 512, "public/icons/icon-512.png", { ...NORMAL, redondeo: 0.22 });
// Maskable: el launcher puede recortar en círculo (zona segura: radio del 40 %), así que el óvalo
// y la insignia van más adentro: la insignia llega hasta 0.27 + 0.11 = 0.38 del centro
await iconoApp(imagenOvalo, 512, "public/icons/icon-maskable-512.png", { alto: 0.6, insignia: 0.22, desvio: 0.19 });

// Versiones web del logo para la interfaz (components/ui/logo.tsx)
// (WebP: pesa mucho menos que PNG para dibujos con degradados; Safari lo muestra desde iOS 14)
await sharp(imagenOvalo).resize({ height: 192 }).webp({ quality: 85, alphaQuality: 90 }).toFile("marca/web/logo-ovalo.webp");
console.log("✓ marca/web/logo-ovalo.webp");
/** Logo completo para la web: recortado al borde, 480 px de alto, con transparencia */
async function logoWeb(imagen, salida) {
  await sharp(await sharp(imagen).trim().toBuffer())
    .resize({ height: 480 })
    .webp({ quality: 85, alphaQuality: 90 })
    .toFile(salida);
  console.log("✓", salida);
}

if (existsSync(COMPLETO)) {
  await logoWeb(COMPLETO, "marca/web/logo-completo.webp");
  await logoWeb(await completoParaOscuro(), "marca/web/logo-completo-oscuro.webp");
} else {
  // Solo con el JPG (fondo blanco): la misma imagen sirve para los dos temas
  const jpg = await sharp(ORIGINAL).flatten({ background: BLANCO }).png().toBuffer();
  await logoWeb(jpg, "marca/web/logo-completo.webp");
  await logoWeb(jpg, "marca/web/logo-completo-oscuro.webp");
}
