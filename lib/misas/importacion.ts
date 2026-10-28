// =============================================
// Iglesias desde Excel: la plantilla .xlsx, el archivo subido o filas pegadas
// =============================================
// Una fila por iglesia. Con encabezado, las columnas se reconocen por su nombre y en
// cualquier orden (las de más, p. ej. "Fuente", se ignoran); sin encabezado van en el
// orden de la plantilla. La base vuelve a validar todo.

import type { Tabla } from "@/lib/excel/tabla";
import { horasDelDia, parsearMisas, type Misa } from "./horarios";
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

/** Celdas de una fila pegada: Excel pega con tabuladores; un CSV, con comas y comillas */
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

/** Lo que puede traer una columna: las misas van juntas ("Misas") o por día ("Sábado", "Domingo") */
type Campo = keyof CamposIglesia | "sabado" | "domingo";

/** Encabezado sin tildes ni mayúsculas → campo */
const CAMPOS = new Map<string, Campo>(
  (["nombre", "distrito", "direccion", "ubicacion", "telefono", "misas", "sabado", "domingo", "notas"] as const).map(
    (campo) => [campo, campo]
  )
);

/** Sin encabezado, las columnas van en el orden de la plantilla */
const ORDEN_PLANTILLA: Campo[] = ["nombre", "distrito", "direccion", "ubicacion", "telefono", "sabado", "domingo", "notas"];

export interface FilaImportada {
  /** Número de fila en el Excel (o de línea en lo pegado) */
  numero: number;
  nombre: string;
  datos: DatosIglesia | null;
  errores: string[];
}

export interface LecturaIglesias {
  filas: FilaImportada[];
  /** Número de la fila del encabezado (null si no lo había) */
  encabezado: number | null;
}

/** Las columnas Misas, Sábado y Domingo en un solo texto: "Sáb 19:00; Dom 7:00, 9:00" */
function unirMisas(misas: string, sabado: string, domingo: string): string {
  return [misas, sabado && `Sáb ${sabado}`, domingo && `Dom ${domingo}`].filter(Boolean).join("; ");
}

/**
 * Lee las filas de la hoja (o de lo pegado): reconoce el encabezado, salta las filas vacías y
 * la de ejemplo de la plantilla, y marca las iglesias repetidas.
 */
export function parsearCeldasIglesias(celdas: string[][]): LecturaIglesias {
  const filas: FilaImportada[] = [];
  const vistas = new Map<string, number>();
  let columnas: (Campo | undefined)[] = ORDEN_PLANTILLA;
  let encabezado: number | null = null;
  let primera = true;

  celdas.forEach((fila, indice) => {
    if (fila.every((c) => !c.trim())) return;
    const numero = indice + 1;

    // Solo la primera fila con algo puede ser el encabezado
    if (primera) {
      primera = false;
      const nombres = fila.map((c) => CAMPOS.get(sinTildes(c)));
      if (nombres.includes("nombre")) {
        columnas = nombres;
        encabezado = numero;
        return;
      }
    }

    const campo = (buscado: Campo) => {
      const posicion = columnas.indexOf(buscado);
      return posicion === -1 ? "" : (fila[posicion] ?? "");
    };
    const nombre = campo("nombre");
    if (sinTildes(nombre) === sinTildes(EJEMPLO.nombre)) return;

    const { datos, errores } = validarIglesia({
      nombre,
      distrito: campo("distrito"),
      direccion: campo("direccion"),
      ubicacion: campo("ubicacion"),
      telefono: campo("telefono"),
      misas: unirMisas(campo("misas"), campo("sabado"), campo("domingo")),
      notas: campo("notas"),
    });
    if (datos) {
      const clave = `${sinTildes(datos.nombre)}|${datos.distrito}`;
      const anterior = vistas.get(clave);
      if (anterior) {
        filas.push({ numero, nombre: datos.nombre, datos: null, errores: [`Repetida: ya está en la fila ${anterior}.`] });
        return;
      }
      vistas.set(clave, numero);
    }
    filas.push({ numero, nombre: espacios(nombre) || "(sin nombre)", datos, errores });
  });

  return { filas, encabezado };
}

/** Lo pegado desde Excel (tabuladores) o desde un CSV */
export function parsearFilasIglesias(texto: string): LecturaIglesias {
  return parsearCeldasIglesias(texto.replace(/^﻿/, "").split(/\r?\n/).map(dividirFila));
}

// ---------------------------------------------
// El Excel de iglesias (plantilla y "Descargar la lista")
// ---------------------------------------------

export const HOJA_IGLESIAS = "Iglesias";

/** La fila de ejemplo de la plantilla: si nadie la borra, no se importa */
const EJEMPLO: DatosIglesia = {
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
    { dia: 7, hora: "19:00" },
  ],
};

/** La hoja para llenar: distritos en lista desplegable y formato texto donde Excel cambiaría lo escrito */
export function tablaIglesias(iglesias: DatosIglesia[]): Tabla {
  return {
    nombre: HOJA_IGLESIAS,
    columnas: [
      { titulo: "Nombre", ancho: 36, nota: "Como la conoce la gente: «Parroquia San José»." },
      { titulo: "Distrito", ancho: 22, opciones: DISTRITOS, nota: "Elige uno de la lista." },
      { titulo: "Dirección", ancho: 32 },
      {
        titulo: "Ubicación",
        ancho: 24,
        formato: "texto",
        nota: "En Google Maps, clic derecho (o mantén presionada) la iglesia y copia los números: -8.1116, -79.0287",
      },
      { titulo: "Teléfono", ancho: 14, formato: "texto" },
      { titulo: "Sábado", ancho: 16, formato: "texto", nota: "Solo desde las 17:00. Varias horas, con coma: 18:00, 20:00" },
      { titulo: "Domingo", ancho: 26, formato: "texto", nota: "Horas separadas por coma: 7:00, 9:00, 11:00" },
      { titulo: "Notas", ancho: 40 },
    ],
    filas: iglesias.map((i) => [
      i.nombre,
      i.distrito,
      i.direccion,
      formatearUbicacion(i),
      i.telefono,
      horasDelDia(i.misas, 6),
      horasDelDia(i.misas, 7),
      i.notas,
    ]),
    filasEditables: 300,
  };
}

const COMO_LLENAR: Tabla = {
  nombre: "Cómo llenar",
  filtros: false,
  columnas: [
    { titulo: "Columna", ancho: 14 },
    { titulo: "Qué escribir", ancho: 72, ajustar: true },
    { titulo: "Ejemplo", ancho: 28, ajustar: true },
  ],
  filas: [
    ["Nombre", "El nombre de la parroquia o capilla, como la conoce la gente. Obligatorio.", "Parroquia San José"],
    ["Distrito", "Elige uno de la lista: los 12 distritos de la provincia de Trujillo. Obligatorio.", "Víctor Larco Herrera"],
    ["Dirección", "Calle y número, o una referencia para llegar.", "Jr. Ejemplo 123"],
    [
      "Ubicación",
      "En Google Maps, haz clic derecho sobre la iglesia (en el celular, mantenla presionada) y copia los dos números. Primero va el que empieza con -8. Obligatorio.",
      "-8.1116, -79.0287",
    ],
    ["Teléfono", "Opcional.", "044 000000"],
    [
      "Sábado",
      "Solo las misas desde las 17:00, que cuentan para el domingo. Varias horas separadas por coma; vacío si no hay.",
      "19:00",
    ],
    ["Domingo", "Todas las misas del domingo, separadas por coma. Sirve 19:00 o 7 pm.", "7:00, 9:00, 11:00, 19:00"],
    ["Notas", "Lo que ayude a quien busca misa: misa de jóvenes, horario de verano…", "Misa de jóvenes a las 19:00"],
    [null, null, null],
    [
      "Importante",
      "Una fila por iglesia. La fila de ejemplo no se importa. Si una iglesia ya existe (mismo nombre y distrito), se actualiza y sus misas se reemplazan. Una iglesia sin misas se guarda, pero no sale en la página hasta tenerlas.",
      null,
    ],
    ["Subir", "Guarda el archivo como Libro de Excel (.xlsx) y súbelo en Administración → Misas → «Subir Excel».", null],
  ],
};

/** El Excel de iglesias: la hoja para llenar (o editar y volver a subir) y la de ayuda */
export function libroIglesias(iglesias: DatosIglesia[]): Tabla[] {
  return [tablaIglesias(iglesias), COMO_LLENAR];
}

/** La plantilla vacía, con una fila de ejemplo */
export function plantillaIglesias(): Tabla[] {
  return libroIglesias([EJEMPLO]);
}
