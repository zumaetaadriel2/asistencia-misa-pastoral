// =============================================
// Login del staff con el botón de Google (Google Identity Services)
// =============================================
// Google dibuja el botón en nuestra página y devuelve un ID token, que se canjea
// en Supabase con signInWithIdToken. Así su ventana muestra el dominio de la app
// y no el del proyecto de Supabase (como pasa con el login por redirección).

/** Client ID de OAuth (público: Google lo ve en la página). Sin él, se usa la redirección. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** SHA-256 en hexadecimal */
export async function sha256Hex(texto: string): Promise<string> {
  const resumen = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Nonce de un solo uso contra la reutilización de tokens: Google recibe el cifrado
 * y lo guarda dentro del token; Supabase recibe el original y comprueba que coincidan.
 */
export async function crearNonce(): Promise<{ nonce: string; cifrado: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return { nonce, cifrado: await sha256Hex(nonce) };
}

/** Los errores del hook de Auth ya vienen en español; los demás se resumen */
export function mensajeLoginGoogle(mensaje: string): string {
  if (mensaje.startsWith("Tu correo") || mensaje.startsWith("Solo se puede")) return mensaje;
  return "No se pudo comprobar tu cuenta de Google. Vuelve a intentarlo o usa «Entrar de otra forma».";
}
