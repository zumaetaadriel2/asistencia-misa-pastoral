// =============================================
// CORS con lista de orígenes permitidos (ORIGENES_PERMITIDOS, separados por comas)
// =============================================

const origenesPermitidos = (Deno.env.get("ORIGENES_PERMITIDOS") ?? "")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

function encabezadosCors(origen: string | null): Record<string, string> {
  const encabezados: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (origen && origenesPermitidos.includes(origen)) {
    encabezados["Access-Control-Allow-Origin"] = origen;
  }
  return encabezados;
}

/** Responde el preflight y agrega los encabezados CORS a cualquier respuesta */
export function conCors(manejador: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const cors = encabezadosCors(req.headers.get("origin"));

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const respuesta = await manejador(req);
    const conEncabezados = new Response(respuesta.body, respuesta);
    for (const [nombre, valor] of Object.entries(cors)) {
      conEncabezados.headers.set(nombre, valor);
    }
    return conEncabezados;
  };
}
