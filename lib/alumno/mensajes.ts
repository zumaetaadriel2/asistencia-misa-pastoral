// =============================================
// Mensajes para el alumno según el error que devuelve la base o la Edge Function
// =============================================

import type { ErrorEnvio } from "@/lib/fotos/subir";
import type { ErrorIdentificacion } from "./identificar";

const REINTENTAR = "No se pudo completar el envío. Vuelve a intentarlo.";

export const MENSAJES_ERROR: Record<ErrorIdentificacion | ErrorEnvio, string> = {
  codigo_invalido: "No encontramos ese código. Revísalo o pídeselo a tu guía.",
  demasiados_intentos:
    "Hubo demasiados intentos con códigos equivocados. Espera 15 minutos y vuelve a intentarlo.",
  sin_ciclo_activo: "La pastoral todavía no ha abierto el ciclo de este año.",
  fuera_de_ciclo: "El ciclo de la pastoral no está en curso esta semana.",
  formulario_cerrado: "El formulario ya está cerrado para esta semana.",
  semana_cerrada: "Esta semana ya se cerró. Si fue un error, habla con tu guía.",
  ya_registrada: "Ya enviaste tu foto de esta semana.",
  envio_no_existe: REINTENTAR,
  envio_expirado: REINTENTAR,
  envio_ya_confirmado: REINTENTAR,
  foto_no_subida: "No se pudo subir la foto. Revisa tu conexión y vuelve a intentarlo.",
  foto_invalida: "La foto no es válida. Toma otra y vuelve a intentarlo.",
  error_interno: "Hubo un problema en el servidor. Inténtalo en unos minutos.",
  error_de_red: "No hay conexión. Revisa tu internet y vuelve a intentarlo.",
};

export const MENSAJE_FOTO_ILEGIBLE = "No pudimos leer esa foto. Prueba con otra.";
