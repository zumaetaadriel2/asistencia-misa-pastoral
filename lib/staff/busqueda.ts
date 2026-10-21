// =============================================
// Búsqueda por nombre en las listas del staff (matriz, alumnos, staff)
// =============================================

/** Minúsculas y sin tildes: "José Pérez" → "jose perez" */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * true si cada palabra de la consulta aparece en alguno de los textos, sin importar
 * mayúsculas ni tildes ("perez ana" encuentra a "Ana Pérez Torres"). Consulta vacía: true.
 */
export function coincide(consulta: string, ...textos: string[]): boolean {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  const donde = normalizar(textos.join(" "));
  return palabras.every((palabra) => donde.includes(palabra));
}
