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

import { existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const ORIGINAL = "marca/logo-original.jpg";
const COMPLETO = "marca/logo-completo.png";
const OVALO = "marca/logo-ovalo.png";
// Recuadro del óvalo dentro de logo-original.jpg (555 × 613 px)
const OVALO_EN_ORIGINAL = { left: 91, top: 140, width: 315, height: 430 };

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
const completo = existsSync(COMPLETO) ? await sharp(COMPLETO).trim().toBuffer() : ORIGINAL;
await sharp(completo)
  .resize({ height: 480 })
  .flatten({ background: BLANCO })
  .webp({ quality: 85 })
  .toFile("marca/web/logo-completo.webp");
console.log("✓ marca/web/logo-completo.webp");
