// =============================================
// Iglesias pegadas desde Excel (o desde el CSV de la plantilla)
// =============================================
// Una fila por iglesia: Nombre | Distrito | Dirección | Ubicación | Teléfono | Misas | Notas.
// Las columnas de más (p. ej. "Fuente") se ignoran. La base vuelve a validar todo.

import { celda } from "@/lib/staff/reporte";
import { formatearMisas, parsearMisas, type Misa } from "./horarios";
import { formatearUbicacion, parsearUbicacion } from "./ubicacion";

/** Los 12 distritos de la provincia de Trujillo (los mismos que acepta la base) */
export const DISTRITOS = [
  "Trujillo",
  "Víctor Larco Herrera",
  "La Esperanza",
  "El Porvenir",
  "Florencia de Mora",
  "Alto Trujillo",
  "Huanchaco",
  "Moche",
  "Laredo",
  "Salaverry",
  "Poroto",
  "Simbal",
] as const;

export type Distrito = (typeof DISTRITOS)[number];

export const COLUMNAS = ["Nombre", "Distrito", "Dirección", "Ubicación", "Teléfono", "Misas", "Notas"] as const;

/** Lo que recibe guardar_iglesia / importar_iglesias */
export interface DatosIglesia {
  nombre: string;
  distrito: Distrito;
  direccion: string;
  latitud: number;
  longitud: number;
  telefono: string | null;
  notas: string | null;
  misas: Misa[];
}

/** Los campos tal como se escriben en el Excel o en el formulario */
export interface CamposIglesia {
  nombre: string;
  distrito: string;
  direccion: string;
  ubicacion: string;
  telefono: string;
  misas: string;
  notas: string;
}

const sinTildes = (texto: string) =>
  texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
const espacios = (texto: string) => texto.replace(/\s+/g, " ").trim();

/** "victor larco" o "VÍCTOR LARCO HERRERA" → "Víctor Larco Herrera"; null si no es de la provincia */
export function normalizarDistrito(texto: string): Distrito | null {
  const buscado = sinTildes(texto);
  if (buscado === "victor larco") return "Víctor Larco Herrera";
  return DISTRITOS.find((d) => sinTildes(d) === buscado) ?? null;
}

/** Valida una iglesia (fila del Excel o formulario) y la deja lista para la base */
export function validarIglesia(campos: CamposIglesia): { datos: DatosIglesia | null; errores: string[] } {
  const errores: string[] = [];
  const nombre = espacios(campos.nombre);
  const direccion = espacios(campos.direccion);
  const telefono = espacios(campos.telefono);
  const notas = espacios(campos.notas);

  if (!nombre) errores.push("Falta el nombre.");
  else if (nombre.length > 120) errores.push("El nombre es muy largo (máximo 120 caracteres).");

  const distrito = normalizarDistrito(campos.distrito);
  if (!distrito) {
    errores.push(
      campos.distrito.trim()
        ? `«${campos.distrito.trim()}» no es un distrito de la provincia de Trujillo.`
        : "Falta el distrito."
    );
  }

  if (direccion.length > 200) errores.push("La dirección es muy larga (máximo 200 caracteres).");
  if (telefono.length > 40) errores.push("El teléfono es muy largo (máximo 40 caracteres).");
  if (notas.length > 300) errores.push("Las notas son muy largas (máximo 300 caracteres).");

  const ubicacion = parsearUbicacion(campos.ubicacion);
  if ("error" in ubicacion) errores.push(ubicacion.error);

  const misas = parsearMisas(campos.misas);
  errores.push(...misas.errores);

  if (errores.length > 0 || !distrito || "error" in ubicacion) return { datos: null, errores };
  return {
    datos: {
      nombre,
      distrito,
      direccion,
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
      telefono: telefono || null,
      notas: notas || null,
      misas: misas.misas,
    },
    errores: [],
  };
}

/** Celdas de una fila: Excel pega con tabuladores; un CSV, con comas y comillas */
export function dividirFila(linea: string): string[] {
  const celdas = linea.includes("\t") ? linea.split("\t") : leerCsv(linea);
  // Un apóstrofo al inicio es como Excel marca "esto es texto" (p. ej. en la ubicación "-8.11…")
  return celdas.map((c) => c.trim().replace(/^'/, ""));
}

function leerCsv(linea: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const caracter = linea[i];
    if (entreComillas) {
      if (caracter === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (caracter === '"') entreComillas = false;
      else actual += caracter;
    } else if (caracter === '"') entreComillas = true;
    else if (caracter === ",") {
      celdas.push(actual);
      actual = "";
    } else actual += caracter;
  }
  celdas.push(actual);
  return celdas;
}

export interface FilaImportada {
  /** Número de línea en lo pegado (para encontrarla en el Excel) */
  numero: number;
  nombre: string;
  datos: DatosIglesia | null;
  errores: string[];
}

/** Lee lo pegado: salta líneas vacías y el encabezado, y marca las iglesias repetidas */
export function parsearFilasIglesias(texto: string): FilaImportada[] {
  const filas: FilaImportada[] = [];
  const vistas = new Map<string, number>();

  texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .forEach((linea, indice) => {
      if (!linea.trim()) return;
      const [nombre = "", distrito = "", direccion = "", ubicacion = "", telefono = "", misas = "", notas = ""] =
        dividirFila(linea);
      if (indice === 0 && sinTildes(nombre) === "nombre") return;

      const numero = indice + 1;
      const { datos, errores } = validarIglesia({ nombre, distrito, direccion, ubicacion, telefono, misas, notas });
      if (datos) {
        const clave = `${sinTildes(datos.nombre)}|${datos.distrito}`;
        const anterior = vistas.get(clave);
        if (anterior) {
          filas.push({ numero, nombre: datos.nombre, datos: null, errores: [`Repetida: ya está en la línea ${anterior}.`] });
          return;
        }
        vistas.set(clave, numero);
      }
      filas.push({ numero, nombre: espacios(nombre) || "(sin nombre)", datos, errores });
    });

  return filas;
}

/** CSV de iglesias en el formato de la plantilla (para editarlas en Excel y volver a importarlas) */
export function armarCsvIglesias(iglesias: DatosIglesia[]): string {
  const filas = iglesias.map((i) => [
    i.nombre,
    i.distrito,
    i.direccion,
    formatearUbicacion(i),
    i.telefono ?? "",
    formatearMisas(i.misas),
    i.notas ?? "",
  ]);
  return "﻿" + [[...COLUMNAS], ...filas].map((fila) => fila.map(celda).join(",")).join("\r\n");
}

/** Plantilla vacía con una fila de ejemplo */
export function plantillaCsv(): string {
  return armarCsvIglesias([
    {
      nombre: "Parroquia de Ejemplo (bórrala)",
      distrito: "Trujillo",
      direccion: "Jr. Ejemplo 123",
      latitud: -8.1116,
      longitud: -79.0287,
      telefono: "044 000000",
      notas: "Misa de jóvenes el domingo a las 19:00.",
      misas: [
        { dia: 6, hora: "19:00" },
        { dia: 7, hora: "07:00" },
        { dia: 7, hora: "11:00" },
      ],
    },
  ]);
}
