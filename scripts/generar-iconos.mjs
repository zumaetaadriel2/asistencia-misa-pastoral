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

/** Ícono cuadrado con el óvalo centrado, que ocupa `proporcion` del alto */
async function icono(imagen, lado, proporcion, salida, fondo) {
  const centro = await sharp(imagen).resize({ height: Math.round(lado * proporcion) }).toBuffer();
  await sharp({ create: { width: lado, height: lado, channels: 4, background: fondo ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: centro, gravity: "center" }])
    .png({ palette: true, quality: 90, effort: 10 })
    .toFile(salida);
  console.log("✓", salida);
}

const BLANCO = "#ffffff";
const imagenOvalo = await ovalo();

mkdirSync("public/icons", { recursive: true });
mkdirSync("marca/web", { recursive: true });

// Pestaña del navegador (Next lo enlaza solo desde app/icon.png)
await icono(imagenOvalo, 192, 1, "app/icon.png");
// iPhone: sin transparencia (iOS pinta de negro lo transparente) y con margen por las esquinas redondas
await icono(imagenOvalo, 180, 0.86, "app/apple-icon.png", BLANCO);
// Android / PWA (public/manifest.json)
await icono(imagenOvalo, 192, 0.94, "public/icons/icon-192.png");
await icono(imagenOvalo, 512, 0.94, "public/icons/icon-512.png");
// Maskable: el launcher recorta en círculo, así que el óvalo va en la zona segura (~60 %)
await icono(imagenOvalo, 512, 0.6, "public/icons/icon-maskable-512.png", BLANCO);

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
