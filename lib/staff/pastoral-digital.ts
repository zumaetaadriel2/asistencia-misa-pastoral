// =============================================
// Pastoral Digital ID: login del staff y alta desde su lista de catequistas
// =============================================
// El login es el proveedor OIDC propio configurado en Supabase (Authentication → Providers): el
// nombre tiene que coincidir con el "identifier" de allí. Desde la v2.0.0 es la única forma de
// entrar, y solo para quien el administrador dio de alta antes (el hook lo comprueba).
// El alta pasa por la Edge Function catequistas-pastoral, que consulta la API interna de Pastoral
// Digital con su token: el navegador nunca lo ve.

import { supabase } from "@/lib/supabase/client";
import type { RolStaff } from "./revision";

export const PROVEEDOR_PASTORAL_DIGITAL = "custom:pastoral-digital-id" as const;

/** Mensajes del hook de Auth (hook_antes_de_crear_usuario), que Supabase devuelve en la URL */
export const MENSAJES_LOGIN = {
  sinAcceso: "Todavía no tienes acceso. Pide al administrador de la pastoral que te dé de alta.",
  soloPastoral: "Solo se puede entrar con Pastoral Digital ID.",
  fallo: "No se pudo entrar con Pastoral Digital ID. Vuelve a intentarlo en unos minutos.",
} as const;

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Qué mostrar cuando el login vuelve con un error en la URL. Nunca se muestra el texto de la URL:
 * cualquiera podría armar un enlace a /login con un mensaje falso («llama a este número…») y se
 * vería en el dominio de la app. Solo se reconoce cuál de nuestros mensajes es.
 */
export function mensajeDeErrorLogin(parametros: URLSearchParams): string {
  const error = parametros.get("error") ?? parametros.get("error_code");
  const descripcion = parametros.get("error_description");
  if (!error && !descripcion) return "";
  const texto = normalizar(descripcion ?? "");
  if (texto.includes(normalizar(MENSAJES_LOGIN.sinAcceso))) return MENSAJES_LOGIN.sinAcceso;
  if (texto.includes(normalizar(MENSAJES_LOGIN.soloPastoral))) return MENSAJES_LOGIN.soloPastoral;
  return MENSAJES_LOGIN.fallo;
}

/** Un catequista de Pastoral Digital que se puede dar de alta (los de logística ya vienen fuera) */
export interface CatequistaPastoral {
  id: string;
  nombre: string;
  email: string;
  categoria: string;
  horario: string;
  /** Ya está dado de alta aquí */
  registrado: boolean;
  /** Su correo ya estaba en el staff de antes: al darlo de alta se vincula, sin cambiar su rol */
  mismo_correo: boolean;
}

const HORARIOS: Record<string, string> = {
  "full-time": "Tiempo completo",
  "primera-comunion": "Primera Comunión",
  confirmacion: "Confirmación",
  logistica: "Logística",
  semilleros: "Semilleros",
  coordinador: "Coordinador",
};

const CATEGORIAS: Record<string, string> = {
  student: "Alumno",
  alumni: "Exalumno",
  teacher: "Docente",
};

/** "Confirmación · Docente" */
export function detalleCatequista(c: Pick<CatequistaPastoral, "horario" | "categoria">): string {
  return [HORARIOS[c.horario] ?? c.horario, CATEGORIAS[c.categoria] ?? c.categoria].filter(Boolean).join(" · ");
}

const MENSAJES: Record<string, string> = {
  solo_admin: "Solo un administrador puede dar de alta al staff.",
  api_no_configurada: "Falta configurar la conexión con Pastoral Digital (PASTORAL_API_TOKEN).",
  api_no_autorizada: "Pastoral Digital rechazó el token de la conexión. Revisa PASTORAL_API_TOKEN.",
  api_no_disponible: "No se pudo consultar Pastoral Digital. Inténtalo en unos minutos.",
  no_esta_en_la_lista: "Esa persona ya no está en la lista de catequistas de Pastoral Digital.",
  ya_registrado: "Esa persona ya está dada de alta.",
  datos_invalidos: "Pastoral Digital no tiene un nombre o correo válido para esa persona.",
};

/** Llama a catequistas-pastoral y traduce sus errores (vienen en el cuerpo aunque sea un 4xx/5xx) */
async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("catequistas-pastoral", { body: cuerpo });
  let respuesta = data as ({ ok: boolean; error?: string } & T) | null;
  if (error) {
    const contexto = (error as { context?: Response }).context;
    respuesta = contexto ? await contexto.json().catch(() => null) : null;
  }
  if (!respuesta?.ok) {
    throw new Error(MENSAJES[respuesta?.error ?? ""] ?? "No se pudo conectar con Pastoral Digital.");
  }
  return respuesta;
}

/** Los catequistas válidos de Pastoral Digital, ordenados por nombre */
export async function listarCatequistasPastoral(): Promise<CatequistaPastoral[]> {
  const { catequistas } = await llamar<{ catequistas: CatequistaPastoral[] }>({ accion: "listar" });
  return catequistas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Da de alta a una persona de la lista con el rol elegido */
export function darDeAltaDesdePastoral(
  id: string,
  rol: RolStaff
): Promise<{ nombre: string; email: string; vinculado: boolean }> {
  return llamar({ accion: "dar_de_alta", pastoral_id: id, rol });
}
