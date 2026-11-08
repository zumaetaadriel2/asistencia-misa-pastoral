import { armarIcs } from "@/lib/alumno/calendario";

// Archivo fijo, armado al compilar: no hay nada del alumno en él
export const dynamic = "force-static";

// Vercel da el dominio de producción al compilar; en local, la dirección de siempre
const SITIO = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://asistencia-misa-pastoral-mariana.vercel.app";

/** Recordatorio semanal (sábado 7 p. m.) para agregar al calendario del celular */
export function GET() {
  return new Response(armarIcs(`${SITIO}/alumno`), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="recordatorio-misa.ics"',
    },
  });
}
