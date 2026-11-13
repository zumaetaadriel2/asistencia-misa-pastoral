// =============================================
// Resumen del administrador (Administración → Resumen) y del guía (Mi comunidad → Resumen)
// =============================================
// La base solo cuenta (RPC resumen_admin, o resumen_guia con solo las comunidades donde es guía); aquí se aplican las mismas reglas que el Excel de
// asistencia (resumirAlumno): faltas son las inasistencias y las fotos rechazadas, y las
// justificadas y las pendientes no cuentan para el porcentaje.

import { supabase } from "@/lib/supabase/client";
import type { Programa } from "./revision";

/** Desde cuántas faltas seguidas un alumno sale en "Necesitan atención" */
export const FALTAS_PARA_ALERTA = 3;

export interface SemanaResumen {
  semana: number;
  /** "AAAA-MM-DD" */
  domingo: string;
  /** Ya venció su reenvío (el jueves se cierra sola) */
  cerrada: boolean;
}

export interface ConteoMisa {
  semana: number;
  validado: number;
  rechazado: number;
  inasistencia: number;
  justificada: number;
  pendiente: number;
}

export interface ComunidadResumen {
  id: number;
  nombre: string;
  programa: Programa;
  activos: number;
  guias: number;
  por_revisar: number;
  /** La foto pendiente más antigua de la comunidad */
  esperando_desde: string | null;
  catequesis: { asistio: number; faltas: number };
  /** Solo las semanas con registros */
  misa: ConteoMisa[];
}

export interface AlumnoAlejandose {
  alumno_id: number;
  nombre: string;
  comunidad_id: number;
  comunidad: string;
  faltas_seguidas: number;
}

/** Lo que devuelve resumen_admin (y resumen_guia, con iglesias_sin_horario en 0) */
export interface DatosResumen {
  semana_reciente: number;
  semanas: SemanaResumen[];
  comunidades: ComunidadResumen[];
  alejandose: AlumnoAlejandose[];
  iglesias_sin_horario: number;
}

/** De quién es el resumen: el admin ve todas las comunidades; el guía, solo donde es guía */
export type AlcanceResumen = "admin" | "guia";

/** null si no hay ciclo activo */
export async function obtenerResumen(alcance: AlcanceResumen = "admin"): Promise<DatosResumen | null> {
  const funcion = alcance === "admin" ? "resumen_admin" : "resumen_guia";
  const { data, error } = await supabase.rpc(funcion, { p_faltas_seguidas: FALTAS_PARA_ALERTA });
  if (error) throw error;
  return data as unknown as DatosResumen | null;
}

// ---------------------------------------------
// Lógica pura
// ---------------------------------------------

/** Igual que resumirAlumno: sin semanas que cuenten no hay porcentaje */
export function porcentaje(asistio: number, faltas: number): number | null {
  return asistio + faltas > 0 ? Math.round((asistio / (asistio + faltas)) * 100) : null;
}

interface Suma {
  asistio: number;
  faltas: number;
  /** Validadas, pendientes y rechazadas: los que mandaron foto */
  conFoto: number;
}

function sumar(conteos: ConteoMisa[]): Suma {
  const suma: Suma = { asistio: 0, faltas: 0, conFoto: 0 };
  for (const c of conteos) {
    suma.asistio += c.validado;
    suma.faltas += c.inasistencia + c.rechazado;
    suma.conFoto += c.validado + c.pendiente + c.rechazado;
  }
  return suma;
}

const deLaSemana = (comunidades: ComunidadResumen[], semana: number) =>
  comunidades.flatMap((c) => c.misa.filter((m) => m.semana === semana));

export interface FilaComunidad {
  id: number;
  nombre: string;
  programa: Programa;
  activos: number;
  guias: number;
  porRevisar: number;
  esperandoDesde: string | null;
  /** % de misa de la última semana cerrada */
  semana: number | null;
  /** % de misa del ciclo hasta la semana reciente (como el Excel) */
  ciclo: number | null;
  catequesis: number | null;
}

export interface Resumen {
  activos: number;
  /** Última semana cerrada con registros, y la diferencia con la cerrada anterior */
  cerrada: { semana: number; domingo: string; porcentaje: number | null; diferencia: number | null } | null;
  /** La semana en que todavía se envían o reenvían fotos */
  enCurso: { semana: number; domingo: string; conFoto: number; activos: number } | null;
  porRevisar: { total: number; mayor: { nombre: string; cantidad: number; desde: string | null } | null };
  catequesis: number | null;
  comunidades: FilaComunidad[];
  tendencia: { semana: number; domingo: string; porcentaje: number | null }[];
  alejandose: AlumnoAlejandose[];
  sinGuia: Pick<ComunidadResumen, "id" | "nombre" | "programa">[];
  iglesiasSinHorario: number;
}

export function armarResumen(datos: DatosResumen): Resumen {
  const { comunidades } = datos;
  const activos = comunidades.reduce((n, c) => n + c.activos, 0);

  // Semanas cerradas con registros, de la más antigua a la más nueva
  const tendencia = datos.semanas
    .filter((s) => s.cerrada)
    .map((s) => ({ s, suma: sumar(deLaSemana(comunidades, s.semana)) }))
    .filter(({ suma }) => suma.asistio + suma.faltas > 0)
    .map(({ s, suma }) => ({ semana: s.semana, domingo: s.domingo, porcentaje: porcentaje(suma.asistio, suma.faltas) }));

  const ultima = tendencia.at(-1);
  const anterior = tendencia.at(-2);
  const cerrada = ultima
    ? {
        ...ultima,
        diferencia:
          anterior && ultima.porcentaje !== null && anterior.porcentaje !== null
            ? ultima.porcentaje - anterior.porcentaje
            : null,
      }
    : null;

  const abierta = datos.semanas.at(-1);
  const enCurso =
    abierta && !abierta.cerrada
      ? {
          semana: abierta.semana,
          domingo: abierta.domingo,
          conFoto: sumar(deLaSemana(comunidades, abierta.semana)).conFoto,
          activos,
        }
      : null;

  const total = comunidades.reduce((n, c) => n + c.por_revisar, 0);
  // La que tiene más fotos esperando; si empatan, la que espera desde antes
  const mayor = [...comunidades]
    .filter((c) => c.por_revisar > 0)
    .sort((a, b) => b.por_revisar - a.por_revisar || (a.esperando_desde ?? "").localeCompare(b.esperando_desde ?? ""))[0];

  const catequesis = comunidades.reduce(
    (suma, c) => ({ asistio: suma.asistio + c.catequesis.asistio, faltas: suma.faltas + c.catequesis.faltas }),
    { asistio: 0, faltas: 0 }
  );

  return {
    activos,
    cerrada,
    enCurso,
    porRevisar: {
      total,
      mayor: mayor ? { nombre: mayor.nombre, cantidad: mayor.por_revisar, desde: mayor.esperando_desde } : null,
    },
    catequesis: porcentaje(catequesis.asistio, catequesis.faltas),
    comunidades: comunidades.map((c) => {
      const semana = cerrada ? sumar(c.misa.filter((m) => m.semana === cerrada.semana)) : null;
      const ciclo = sumar(c.misa.filter((m) => m.semana <= datos.semana_reciente));
      return {
        id: c.id,
        nombre: c.nombre,
        programa: c.programa,
        activos: c.activos,
        guias: c.guias,
        porRevisar: c.por_revisar,
        esperandoDesde: c.esperando_desde,
        semana: semana ? porcentaje(semana.asistio, semana.faltas) : null,
        ciclo: porcentaje(ciclo.asistio, ciclo.faltas),
        catequesis: porcentaje(c.catequesis.asistio, c.catequesis.faltas),
      };
    }),
    tendencia,
    alejandose: datos.alejandose,
    sinGuia: comunidades.filter((c) => c.guias === 0).map(({ id, nombre, programa }) => ({ id, nombre, programa })),
    iglesiasSinHorario: datos.iglesias_sin_horario,
  };
}

/** "de hoy", "de ayer" o "de hace 3 días", según cuándo llegó la foto más antigua */
export function textoEspera(desde: string, ahora: Date = new Date()): string {
  const dias = Math.max(0, Math.floor((ahora.getTime() - new Date(desde).getTime()) / 86_400_000));
  if (dias === 0) return "de hoy";
  if (dias === 1) return "de ayer";
  return `de hace ${dias} días`;
}
