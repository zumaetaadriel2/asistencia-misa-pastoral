/**
 * Utilidades generales del proyecto.
 */

/**
 * Combina clases CSS condicionalmente (similar a clsx/cn).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Formatea una fecha en formato legible en español.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
