// =============================================
// Cloudflare R2 (API compatible con S3): URLs firmadas que vencen en 5 minutos
// =============================================

import { AwsClient } from "aws4fetch";

const VIGENCIA_SEGUNDOS = 300;
export const TAMANO_MAXIMO_BYTES = 1024 * 1024;
export const TIPO_FOTO = "image/jpeg";

function requerir(nombre: string): string {
  const valor = Deno.env.get(nombre);
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

// Se crea al primer uso: así un error de configuración de R2 no tumba las rutas que no lo necesitan
let configuracion: { cliente: AwsClient; base: string } | null = null;

function r2() {
  configuracion ??= {
    cliente: new AwsClient({
      accessKeyId: requerir("R2_ACCESS_KEY_ID"),
      secretAccessKey: requerir("R2_SECRET_ACCESS_KEY"),
      service: "s3",
      region: "auto",
    }),
    base: `https://${requerir("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${requerir("R2_BUCKET")}`,
  };
  return configuracion;
}

function urlObjeto(key: string): URL {
  const ruta = key.split("/").map(encodeURIComponent).join("/");
  return new URL(`${r2().base}/${ruta}`);
}

async function firmar(key: string, method: "GET" | "PUT", headers?: HeadersInit): Promise<string> {
  const url = urlObjeto(key);
  url.searchParams.set("X-Amz-Expires", String(VIGENCIA_SEGUNDOS));
  // allHeaders: firma también content-type, así el navegador solo puede subir JPEG
  const firmada = await r2().cliente.sign(new Request(url, { method, headers }), {
    aws: { signQuery: true, allHeaders: true },
  });
  return firmada.url;
}

/** URL para que el navegador suba la foto con PUT (Content-Type: image/jpeg) */
export function urlFirmadaSubida(key: string): Promise<string> {
  return firmar(key, "PUT", { "content-type": TIPO_FOTO });
}

/** URL para que el staff vea la foto */
export function urlFirmadaLectura(key: string): Promise<string> {
  return firmar(key, "GET");
}

/** Tamaño y tipo del objeto subido, o null si no existe */
export async function datosObjeto(key: string): Promise<{ tamano: number; tipo: string | null } | null> {
  const respuesta = await r2().cliente.fetch(urlObjeto(key), { method: "HEAD" });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`R2 respondió ${respuesta.status} al consultar ${key}`);
  return {
    tamano: Number(respuesta.headers.get("content-length") ?? 0),
    tipo: respuesta.headers.get("content-type"),
  };
}

/** Solo para descartar archivos inválidos (demasiado grandes o de otro tipo) */
export async function borrarObjeto(key: string): Promise<void> {
  await r2().cliente.fetch(urlObjeto(key), { method: "DELETE" });
}
