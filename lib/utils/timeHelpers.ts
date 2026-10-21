import { supabase } from "@/lib/supabase/client";

// =============================================
// Tipos
// =============================================

export interface ConfiguracionCiclo {
  id: number;
  nombre_ciclo: string;
  fecha_inicio: string; // ISO date string (YYYY-MM-DD)
  fecha_fin: string | null;
  activo: boolean;
  abierto_manual?: boolean | null;
}

export interface EstadoFormulario {
  /** Número de semana dentro del ciclo actual (1-indexed) */
  semanaActual: number;
  /** Si el formulario está abierto para recibir asistencias */
  abierto: boolean;
  /** Nombre descriptivo del ciclo activo */
  nombreCiclo: string;
  /** Mensaje legible sobre el estado del formulario */
  mensaje: string;
  /**
   * Fecha/hora en que abrirá o cerrará el formulario (próximo cambio de estado).
   * `null` cuando el administrador forzó el estado manualmente: no hay cambio programado.
   */
  proximoCambio: Date | null;
}

// =============================================
// Constantes de la ventana de asistencia
// =============================================

/** Día de apertura: Sábado (6 en JS: 0=Dom, 1=Lun, ..., 6=Sáb) */
const DIA_APERTURA = 6;
/** Hora de apertura: 19:00 (7:00 PM) */
const HORA_APERTURA = 19;

/** Día de cierre: Lunes (1) */
const DIA_CIERRE = 1;
/** Hora de cierre: 23:59 (11:59 PM) */
const HORA_CIERRE = 23;
const MINUTO_CIERRE = 59;

// =============================================
// Funciones auxiliares puras (exportadas para testing)
// =============================================

/**
 * Calcula el número de semana del ciclo en la que cae una fecha dada,
 * tomando como referencia la fecha de inicio del ciclo.
 *
 * Semana 1 = la semana que contiene `fechaInicio`.
 * Cada semana empieza en Domingo (para alinearse con el ciclo litúrgico).
 */
export function calcularSemana(fechaInicio: Date, fechaActual: Date): number {
  // Normalizar ambas fechas a medianoche para evitar desfases por hora
  const inicio = new Date(
    fechaInicio.getFullYear(),
    fechaInicio.getMonth(),
    fechaInicio.getDate()
  );
  const actual = new Date(
    fechaActual.getFullYear(),
    fechaActual.getMonth(),
    fechaActual.getDate()
  );

  // Retroceder `inicio` al Domingo de esa semana
  const domingoInicio = new Date(inicio);
  domingoInicio.setDate(domingoInicio.getDate() - domingoInicio.getDay());

  const diffMs = actual.getTime() - domingoInicio.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Semana 1-indexed
  return Math.floor(diffDias / 7) + 1;
}

/**
 * Determina si el formulario está abierto según la regla:
 *   - Si `abiertoManual` es true/false, fuerza ese estado.
 *   - Si `abiertoManual` es null/undefined, evalúa el horario automático (Sáb 7PM - Lun 11:59PM).
 *
 * @param ahora - Fecha/hora actual
 * @param abiertoManual - Override opcional de apertura manual (true=abierto, false=cerrado, null=automático)
 * @returns true si el formulario está dentro de la ventana de registro
 */
export function estaAbierto(
  ahora: Date,
  abiertoManual?: boolean | null
): boolean {
  if (abiertoManual === true) return true;
  if (abiertoManual === false) return false;

  const dia = ahora.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  const hora = ahora.getHours();
  const minuto = ahora.getMinutes();

  // Sábado después de las 7:00 PM
  if (dia === DIA_APERTURA && hora >= HORA_APERTURA) {
    return true;
  }

  // Domingo todo el día
  if (dia === 0) {
    return true;
  }

  // Lunes hasta las 11:59 PM
  if (
    dia === DIA_CIERRE &&
    (hora < HORA_CIERRE || (hora === HORA_CIERRE && minuto <= MINUTO_CIERRE))
  ) {
    return true;
  }

  return false;
}

/**
 * Calcula la fecha/hora del próximo cambio de estado del formulario.
 *
 * - Si está abierto → retorna cuándo cerrará (Lunes 11:59 PM)
 * - Si está cerrado → retorna cuándo abrirá (Sábado 7:00 PM)
 */
export function calcularProximoCambio(ahora: Date, abierto: boolean): Date {
  const resultado = new Date(ahora);

  if (abierto) {
    // Próximo cierre: Lunes 23:59 de esta semana
    const dia = resultado.getDay();
    let diasHastaLunes: number;

    if (dia === DIA_APERTURA) {
      // Sábado → Lunes = 2 días
      diasHastaLunes = 2;
    } else if (dia === 0) {
      // Domingo → Lunes = 1 día
      diasHastaLunes = 1;
    } else {
      // Lunes (estamos en el día de cierre)
      diasHastaLunes = 0;
    }

    resultado.setDate(resultado.getDate() + diasHastaLunes);
    resultado.setHours(HORA_CIERRE, MINUTO_CIERRE, 59, 999);
  } else {
    // Próxima apertura: Sábado 19:00
    const diasHastaSabado = (DIA_APERTURA - resultado.getDay() + 7) % 7;

    resultado.setDate(resultado.getDate() + diasHastaSabado);
    resultado.setHours(HORA_APERTURA, 0, 0, 0);

    // Sábado después de las 7 PM estando cerrado: la apertura es el sábado siguiente
    if (resultado <= ahora) {
      resultado.setDate(resultado.getDate() + 7);
    }
  }

  return resultado;
}

// =============================================
// Función principal (consulta Supabase)
// =============================================

/**
 * Consulta la tabla `configuracion_ciclo` en Supabase y retorna
 * el estado completo del formulario: semana actual, si está abierto,
 * y cuándo será el próximo cambio de estado.
 *
 * @param ahora - Fecha/hora actual (inyectable para testing). Por defecto `new Date()`.
 */
export async function obtenerEstadoFormulario(
  ahora: Date = new Date()
): Promise<EstadoFormulario> {
  // Consultar el ciclo activo
  const { data, error } = await supabase
    .from("configuracion_ciclo")
    .select("*")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      `No se encontró un ciclo activo en la tabla configuracion_ciclo. ${
        error?.message ?? ""
      }`
    );
  }

  const ciclo = data as ConfiguracionCiclo;
  const fechaInicio = new Date(ciclo.fecha_inicio + "T00:00:00");

  const semanaActual = calcularSemana(fechaInicio, ahora);
  const formularioAbierto = estaAbierto(ahora, ciclo.abierto_manual);
  const esManual =
    ciclo.abierto_manual === true || ciclo.abierto_manual === false;
  const proximoCambio = esManual
    ? null
    : calcularProximoCambio(ahora, formularioAbierto);

  const mensaje = formularioAbierto
    ? `El formulario está ABIERTO.${
        ciclo.abierto_manual === true
          ? " (Apertura manual activada por administrador)"
          : " Cierra el Lunes a las 11:59 PM."
      }`
    : `El formulario está CERRADO.${
        ciclo.abierto_manual === false
          ? " (Cierre manual activado por administrador)"
          : " Abre el Sábado a las 7:00 PM."
      }`;

  return {
    semanaActual,
    abierto: formularioAbierto,
    nombreCiclo: ciclo.nombre_ciclo,
    mensaje,
    proximoCambio,
  };
}
