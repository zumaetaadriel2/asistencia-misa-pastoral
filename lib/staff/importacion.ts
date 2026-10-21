// =============================================
// Lista de alumnos pegada desde Excel
// =============================================
// Excel copia las celdas separadas por tabuladores: se toma la primera columna
// de cada fila. La base vuelve a limpiar y descarta los ya registrados.

export interface ListaImportada {
  nombres: string[];
  /** Nombres que aparecían más de una vez en lo pegado (se importan una sola vez) */
  repetidos: string[];
}

export function parsearNombres(texto: string): ListaImportada {
  const vistos = new Set<string>();
  const nombres: string[] = [];
  const repetidos: string[] = [];

  for (const fila of texto.split(/\r?\n/)) {
    const nombre = fila.split("\t")[0].replace(/\s+/g, " ").trim();
    if (!nombre) continue;

    const clave = nombre.toLocaleLowerCase("es");
    if (vistos.has(clave)) {
      repetidos.push(nombre);
    } else {
      vistos.add(clave);
      nombres.push(nombre);
    }
  }

  return { nombres, repetidos };
}
