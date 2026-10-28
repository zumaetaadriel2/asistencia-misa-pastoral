// =============================================
// Administración: ciclos, comunidades, staff, alumnos y reportes
// =============================================
// Las escrituras directas solo funcionan para el admin (políticas RLS); las
// operaciones con varias reglas pasan por RPC.

import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { obtenerTodasLasFilas } from "@/lib/supabase/paginacion";
import type { AlumnoCiclo, FuncionComunidad, MarcaCiclo, SesionCiclo } from "./catequesis";
import type { AlumnoReporte, RegistroReporte } from "./reporte";
import type { Programa, RolStaff } from "./revision";

export type Ciclo = Tables<"ciclos">;
export type Comunidad = Pick<Tables<"comunidades">, "id" | "nombre" | "programa" | "activa">;
export type Alumno = Pick<Tables<"alumnos">, "id" | "nombre_completo" | "codigo" | "activo">;

export interface MiembroStaff {
  id: number;
  email: string;
  nombre: string;
  rol: RolStaff;
  activo: boolean;
  /** Comunidades asignadas → si es guía o catequista en cada una */
  funciones: Record<number, FuncionComunidad>;
}

// ---------------------------------------------
// Ciclos
// ---------------------------------------------

export async function listarCiclos(): Promise<Ciclo[]> {
  const { data, error } = await supabase.from("ciclos").select("*").order("anio", { ascending: false });
  if (error) throw error;
  return data;
}

export async function crearCiclo(ciclo: {
  nombre: string;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<void> {
  const { error } = await supabase.from("ciclos").insert(ciclo);
  if (error) throw error;
}

export async function actualizarCiclo(
  id: number,
  cambios: Partial<Pick<Ciclo, "nombre" | "fecha_inicio" | "fecha_fin" | "abierto_manual">>
): Promise<void> {
  const { error } = await supabase.from("ciclos").update(cambios).eq("id", id);
  if (error) throw error;
}

export async function activarCiclo(id: number): Promise<void> {
  const { error } = await supabase.rpc("activar_ciclo", { p_ciclo_id: id });
  if (error) throw error;
}

export async function copiarComunidades(desdeCicloId: number, haciaCicloId: number): Promise<number> {
  const { data, error } = await supabase.rpc("copiar_comunidades", {
    p_desde_ciclo_id: desdeCicloId,
    p_hacia_ciclo_id: haciaCicloId,
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------
// Comunidades
// ---------------------------------------------

export async function listarComunidades(cicloId: number): Promise<Comunidad[]> {
  const { data, error } = await supabase
    .from("comunidades")
    .select("id, nombre, programa, activa")
    .eq("ciclo_id", cicloId)
    .order("programa")
    .order("nombre");
  if (error) throw error;
  return data;
}

/** Ciclo activo y sus comunidades (activas e inactivas) */
export async function comunidadesDelCicloActivo(): Promise<{ ciclo: Ciclo | null; comunidades: Comunidad[] }> {
  const ciclo = (await listarCiclos()).find((c) => c.activo) ?? null;
  return { ciclo, comunidades: ciclo ? await listarComunidades(ciclo.id) : [] };
}

export async function crearComunidad(cicloId: number, programa: Programa, nombre: string): Promise<void> {
  const { error } = await supabase.from("comunidades").insert({ ciclo_id: cicloId, programa, nombre: nombre.trim() });
  if (error) throw error;
}

export async function cambiarComunidadActiva(id: number, activa: boolean): Promise<void> {
  const { error } = await supabase.from("comunidades").update({ activa }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------
// Staff
// ---------------------------------------------

export async function listarStaff(): Promise<MiembroStaff[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, email, nombre, rol, activo, staff_comunidades(comunidad_id, funcion)")
    .order("nombre");
  if (error) throw error;
  return data.map(({ staff_comunidades, ...miembro }) => ({
    ...miembro,
    funciones: Object.fromEntries(staff_comunidades.map((sc) => [sc.comunidad_id, sc.funcion])),
  }));
}

export async function crearStaff(miembro: { email: string; nombre: string; rol: RolStaff }): Promise<void> {
  const { error } = await supabase
    .from("staff")
    .insert({ ...miembro, email: miembro.email.trim().toLowerCase(), nombre: miembro.nombre.trim() });
  if (error) throw error;
}

export async function actualizarStaff(
  id: number,
  cambios: Partial<Pick<MiembroStaff, "rol" | "activo">>
): Promise<void> {
  const { error } = await supabase.from("staff").update(cambios).eq("id", id);
  if (error) throw error;
}

/** Asigna la comunidad con esa función (o se la cambia); con `funcion` null se la quita */
export async function asignarComunidad(
  staffId: number,
  comunidadId: number,
  funcion: FuncionComunidad | null
): Promise<void> {
  const { error } = funcion
    ? await supabase
        .from("staff_comunidades")
        .upsert({ staff_id: staffId, comunidad_id: comunidadId, funcion }, { onConflict: "staff_id,comunidad_id" })
    : await supabase.from("staff_comunidades").delete().eq("staff_id", staffId).eq("comunidad_id", comunidadId);
  if (error) throw error;
}

// ---------------------------------------------
// Alumnos
// ---------------------------------------------

export async function listarAlumnos(comunidadId: number): Promise<Alumno[]> {
  const { data, error } = await supabase
    .from("alumnos")
    .select("id, nombre_completo, codigo, activo")
    .eq("comunidad_id", comunidadId)
    .order("nombre_completo");
  if (error) throw error;
  return data;
}

export async function importarAlumnos(
  comunidadId: number,
  nombres: string[]
): Promise<{ agregados: number; repetidos: number }> {
  const { data, error } = await supabase.rpc("importar_alumnos", {
    p_comunidad_id: comunidadId,
    p_nombres: nombres,
  });
  if (error) throw error;
  return data as { agregados: number; repetidos: number };
}

export async function cambiarAlumnoActivo(id: number, activo: boolean): Promise<void> {
  const { error } = await supabase.from("alumnos").update({ activo }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------
// Reportes y cierre de semana
// ---------------------------------------------

/** Alumnos y asistencias del ciclo activo que el usuario puede ver, para el Excel */
export async function datosReporte(comunidadId?: number): Promise<{
  alumnos: AlumnoReporte[];
  registros: RegistroReporte[];
}> {
  const alumnos = await obtenerTodasLasFilas((desde, hasta) => {
    let consulta = supabase
      .from("alumnos")
      .select("id, nombre_completo, comunidades!inner(nombre, programa, ciclos!inner(activo))")
      .eq("comunidades.ciclos.activo", true)
      .eq("activo", true);
    if (comunidadId) consulta = consulta.eq("comunidad_id", comunidadId);
    return consulta.order("id").range(desde, hasta);
  });

  const registros = await obtenerTodasLasFilas((desde, hasta) => {
    let consulta = supabase
      .from("asistencias")
      .select("alumno_id, semana_numero, estado, ciclos!inner(activo), alumnos!inner(comunidad_id)")
      .eq("ciclos.activo", true)
      .eq("actividad", "misa");
    if (comunidadId) consulta = consulta.eq("alumnos.comunidad_id", comunidadId);
    return consulta.order("id").range(desde, hasta);
  });

  return {
    alumnos: alumnos
      .map((a) => ({
        id: a.id,
        nombre: a.nombre_completo,
        comunidad: a.comunidades.nombre,
        programa: a.comunidades.programa,
      }))
      .sort((x, y) => x.comunidad.localeCompare(y.comunidad, "es") || x.nombre.localeCompare(y.nombre, "es")),
    registros: registros.map(({ alumno_id, semana_numero, estado }) => ({ alumno_id, semana_numero, estado })),
  };
}

/** Sesiones, alumnos y marcas de catequesis del ciclo activo, para el Excel del ciclo */
export async function datosCatequesisCiclo(): Promise<{
  sesiones: SesionCiclo[];
  alumnos: AlumnoCiclo[];
  marcas: MarcaCiclo[];
}> {
  const [sesiones, alumnos, marcas] = await Promise.all([
    obtenerTodasLasFilas((desde, hasta) =>
      supabase
        .from("sesiones_catequesis")
        .select("id, comunidad_id, fecha, titulo, comunidades!inner(nombre, programa, ciclos!inner(activo))")
        .eq("comunidades.ciclos.activo", true)
        .order("id")
        .range(desde, hasta)
    ),
    obtenerTodasLasFilas((desde, hasta) =>
      supabase
        .from("alumnos")
        .select("id, nombre_completo, activo, comunidad_id, comunidades!inner(ciclos!inner(activo))")
        .eq("comunidades.ciclos.activo", true)
        .order("id")
        .range(desde, hasta)
    ),
    obtenerTodasLasFilas((desde, hasta) =>
      supabase
        .from("asistencias_catequesis")
        .select("sesion_id, alumno_id, estado, motivo, sesiones_catequesis!inner(comunidades!inner(ciclos!inner(activo)))")
        .eq("sesiones_catequesis.comunidades.ciclos.activo", true)
        .order("sesion_id")
        .order("alumno_id")
        .range(desde, hasta)
    ),
  ]);

  return {
    sesiones: sesiones.map((s) => ({
      id: s.id,
      comunidad_id: s.comunidad_id,
      comunidad: s.comunidades.nombre,
      programa: s.comunidades.programa,
      fecha: s.fecha,
      titulo: s.titulo,
    })),
    alumnos: alumnos.map((a) => ({ id: a.id, nombre: a.nombre_completo, activo: a.activo, comunidad_id: a.comunidad_id })),
    marcas: marcas.map(({ sesion_id, alumno_id, estado, motivo }) => ({ sesion_id, alumno_id, estado, motivo })),
  };
}

export async function cerrarSemana(semana: number): Promise<number> {
  const { data, error } = await supabase.rpc("cerrar_semana", { p_semana: semana });
  if (error) throw error;
  return data;
}
