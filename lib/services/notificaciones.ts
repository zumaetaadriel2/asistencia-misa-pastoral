// =============================================
// Servicio de Notificaciones (Mock / Cascarón)
// =============================================
// TODO: Integrar con Resend, SendGrid, o notificaciones push
// cuando el proyecto lo requiera.

export interface DatosNotificacionRechazo {
  alumnoId: number;
  alumnoNombre: string;
  semana: number;
  motivo: string;
  comunidad: string;
}

/**
 * Notifica a un alumno que su foto de asistencia fue rechazada.
 *
 * Actualmente es un mock que registra en consola.
 * Reemplazar con la implementación real (Resend, correo, push, etc.)
 *
 * @example
 * ```ts
 * await notificarRechazo({
 *   alumnoId: 42,
 *   alumnoNombre: "Juan García",
 *   semana: 5,
 *   motivo: "La foto está borrosa, no se distingue la asistencia.",
 *   comunidad: "San Pablo",
 * });
 * ```
 */
export async function notificarRechazo(
  datos: DatosNotificacionRechazo
): Promise<void> {
  // ── Log en consola (desarrollo) ──
  console.log(
    `%c[NOTIFICACIÓN RECHAZO]%c Alumno: ${datos.alumnoNombre} | Semana ${datos.semana} | Motivo: ${datos.motivo}`,
    "color: #f87171; font-weight: bold",
    "color: inherit"
  );

  // ── Futuras implementaciones ──

  // Opción 1: Enviar correo vía API route + Resend
  // await fetch("/api/notificaciones/rechazo", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(datos),
  // });

  // Opción 2: Insertar en tabla de notificaciones para un worker
  // await supabase.from("notificaciones_log").insert({
  //   tipo: "rechazo_foto",
  //   alumno_id: datos.alumnoId,
  //   contenido: `Tu foto de la Semana ${datos.semana} fue rechazada. Motivo: ${datos.motivo}`,
  //   leida: false,
  // });

  // Opción 3: Push notification vía web-push
  // await sendPushNotification(datos.alumnoId, { ... });
}
