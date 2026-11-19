// =============================================
// catequistas-pastoral: alta del staff desde la lista de Pastoral Digital
// =============================================
// Solo para administradores (se comprueba con su JWT, mi_perfil_staff).
//   { "accion": "listar" }  → catequistas válidos de Pastoral Digital, sin los de HORARIOS_EXCLUIDOS,
//                              marcando quién ya está dado de alta aquí.
//   { "accion": "dar_de_alta", "pastoral_id": "...", "rol": "guia" | "admin" }
//                            → vuelve a pedir la lista, comprueba que la persona esté y la da de alta
//                              con dar_de_alta_staff. Así nadie entra si no está en esa lista.
// La API interna de Pastoral Digital solo se llama desde aquí: su token (PASTORAL_API_TOKEN) nunca
// llega al navegador. No se registran correos en los logs.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { conCors } from "../_shared/cors.ts";

const API = (Deno.env.get("PASTORAL_API_URL") ?? "https://id.pastoralmarianaps.net.pe").replace(/\/+$/, "");
const TOKEN = Deno.env.get("PASTORAL_API_TOKEN") ?? "";

/** Horarios de Pastoral Digital que no se pueden dar de alta aquí (ni siquiera se muestran) */
const HORARIOS_EXCLUIDOS = new Set(["logistica"]);

const POR_PAGINA = 100;
const PAGINAS_MAXIMAS = 50;
const TIEMPO_MAXIMO_MS = 10_000;

interface CatequistaApi {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  category: string;
  schedule: string;
}

class ErrorApi extends Error {}

/** Toda la lista de Pastoral Digital, página por página */
async function traerCatequistas(): Promise<CatequistaApi[]> {
  if (!TOKEN) throw new ErrorApi("api_no_configurada");
  const todos: CatequistaApi[] = [];
  for (let pagina = 0; pagina < PAGINAS_MAXIMAS; pagina++) {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${API}/api/internal/catechists?limit=${POR_PAGINA}&offset=${pagina * POR_PAGINA}`, {
        headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });
    } catch {
      throw new ErrorApi("api_no_disponible");
    }
    if (respuesta.status === 401) throw new ErrorApi("api_no_autorizada");
    if (respuesta.status === 503) throw new ErrorApi("api_no_configurada");
    if (!respuesta.ok) throw new ErrorApi("api_no_disponible");

    const cuerpo = await respuesta.json();
    if (!cuerpo?.success || !Array.isArray(cuerpo.data)) throw new ErrorApi("api_no_disponible");
    todos.push(...cuerpo.data);
    if (!cuerpo.pagination?.hasMore) return todos;
  }
  return todos;
}

const esValido = (c: CatequistaApi) =>
  typeof c?.userId === "string" &&
  c.userId !== "" &&
  typeof c.email === "string" &&
  c.email.includes("@") &&
  !HORARIOS_EXCLUIDOS.has(c.schedule);

const nombreCompleto = (c: CatequistaApi) => `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email;

const manejador = withSupabase({ auth: "user", cors: "disabled" }, async (req, ctx) => {
  if (req.method !== "POST") return Response.json({ ok: false, error: "metodo_no_permitido" }, { status: 405 });

  let cuerpo: { accion?: unknown; pastoral_id?: unknown; rol?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return Response.json({ ok: false, error: "solicitud_invalida" }, { status: 400 });
  }

  // Solo el administrador, según su propia sesión
  const { data: perfil, error: errorPerfil } = await ctx.supabase.rpc("mi_perfil_staff").maybeSingle();
  if (errorPerfil || (perfil as { rol?: string } | null)?.rol !== "admin") {
    return Response.json({ ok: false, error: "solo_admin" }, { status: 403 });
  }

  try {
    if (cuerpo.accion === "listar") {
      const [catequistas, { data: staff, error }] = await Promise.all([
        traerCatequistas(),
        ctx.supabaseAdmin.from("staff").select("email, pastoral_id"),
      ]);
      if (error) throw error;
      const ids = new Set(staff.map((s) => s.pastoral_id).filter(Boolean));
      const correos = new Set(staff.map((s) => s.email.toLowerCase()));

      return Response.json({
        ok: true,
        catequistas: catequistas.filter(esValido).map((c) => ({
          id: c.userId,
          nombre: nombreCompleto(c),
          email: c.email.toLowerCase(),
          categoria: c.category,
          horario: c.schedule,
          // Ya dado de alta, o en el staff de antes con el mismo correo (se vincula al darlo de alta)
          registrado: ids.has(c.userId),
          mismo_correo: !ids.has(c.userId) && correos.has(c.email.toLowerCase()),
        })),
      });
    }

    if (cuerpo.accion === "dar_de_alta") {
      const { pastoral_id: id, rol } = cuerpo;
      if (typeof id !== "string" || (rol !== "guia" && rol !== "admin")) {
        return Response.json({ ok: false, error: "solicitud_invalida" }, { status: 400 });
      }
      const persona = (await traerCatequistas()).find((c) => c.userId === id);
      if (!persona || !esValido(persona)) {
        return Response.json({ ok: false, error: "no_esta_en_la_lista" }, { status: 404 });
      }
      const { data, error } = await ctx.supabaseAdmin.rpc("dar_de_alta_staff", {
        p_pastoral_id: persona.userId,
        p_email: persona.email,
        p_nombre: nombreCompleto(persona),
        p_rol: rol,
      });
      if (error) throw error;
      return Response.json({ ...data, nombre: nombreCompleto(persona), email: persona.email.toLowerCase() });
    }

    return Response.json({ ok: false, error: "accion_desconocida" }, { status: 400 });
  } catch (error) {
    if (error instanceof ErrorApi) return Response.json({ ok: false, error: error.message }, { status: 502 });
    console.error("catequistas-pastoral:", error instanceof Error ? error.message : "error");
    return Response.json({ ok: false, error: "error_interno" }, { status: 500 });
  }
});

export default { fetch: conCors(manejador) };
