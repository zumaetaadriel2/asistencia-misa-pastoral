import { describe, expect, it } from "vitest";
import { crearLibro, leerExcel } from "@/lib/excel/libro";
import {
  dividirFila,
  HOJA_IGLESIAS,
  libroIglesias,
  normalizarDistrito,
  parsearCeldasIglesias,
  parsearFilasIglesias,
  plantillaIglesias,
} from "./importacion";

const fila = (...celdas: string[]) => celdas.join("\t");

describe("normalizarDistrito", () => {
  it("sin importar mayúsculas ni tildes, y el nombre corto de Víctor Larco", () => {
    expect(normalizarDistrito("LA ESPERANZA")).toBe("La Esperanza");
    expect(normalizarDistrito("victor larco")).toBe("Víctor Larco Herrera");
    expect(normalizarDistrito("Lima")).toBeNull();
  });
});

describe("dividirFila", () => {
  it("tabuladores de Excel o CSV con comillas, y quita el apóstrofo de texto", () => {
    expect(dividirFila("San José\tTrujillo\t'-8.1, -79.0")).toEqual(["San José", "Trujillo", "-8.1, -79.0"]);
    expect(dividirFila('"San José","Trujillo","-8.1, -79.0","Dice ""hola"""')).toEqual([
      "San José",
      "Trujillo",
      "-8.1, -79.0",
      'Dice "hola"',
    ]);
  });
});

describe("parsearFilasIglesias (formato de antes, con columna Misas)", () => {
  const texto = [
    fila("Nombre", "Distrito", "Dirección", "Ubicación", "Teléfono", "Misas", "Notas", "Fuente"),
    fila("Parroquia San José", "trujillo", "Jr. Uno 1", "-8.1116, -79.0287", "044 111111", "Sáb 19:00; Dom 9:00", "", "web"),
    "",
    fila("Capilla Santa Rosa", "Moche", "", "-79.0, -8.17", "", "Lun 7:00", ""),
    fila("parroquia san josé", "Trujillo", "Otra dirección", "-8.1116, -79.0287", "", "", ""),
    fila("Parroquia Sin Misas", "Huanchaco", "", "-8.0784, -79.1214", "", "", "POR CONFIRMAR"),
  ].join("\r\n");
  const { filas, encabezado } = parsearFilasIglesias(texto);

  it("reconoce el encabezado, salta las líneas vacías y numera como en lo pegado", () => {
    expect(encabezado).toBe(1);
    expect(filas.map((f) => f.numero)).toEqual([2, 4, 5, 6]);
  });

  it("deja lista la fila válida", () => {
    expect(filas[0]).toEqual({
      numero: 2,
      nombre: "Parroquia San José",
      datos: {
        nombre: "Parroquia San José",
        distrito: "Trujillo",
        direccion: "Jr. Uno 1",
        latitud: -8.1116,
        longitud: -79.0287,
        telefono: "044 111111",
        notas: null,
        misas: [
          { dia: 6, hora: "19:00" },
          { dia: 7, hora: "09:00" },
        ],
      },
      errores: [],
    });
  });

  it("junta todos los errores de una fila", () => {
    expect(filas[1].datos).toBeNull();
    expect(filas[1].errores).toEqual([
      "La latitud y la longitud están al revés: primero va la latitud (-8.…).",
      "Solo se cargan misas de sábado y domingo («lun» no).",
    ]);
  });

  it("marca la iglesia repetida (mismo nombre y distrito, sin importar mayúsculas ni tildes)", () => {
    expect(filas[2].errores).toEqual(["Repetida: ya está en la fila 2."]);
  });

  it("una iglesia sin misas es válida (no sale en /misas hasta tenerlas)", () => {
    expect(filas[3].datos?.misas).toEqual([]);
    expect(filas[3].datos?.notas).toBe("POR CONFIRMAR");
  });
});

describe("parsearCeldasIglesias (plantilla con Sábado y Domingo)", () => {
  it("une Sábado y Domingo, en cualquier orden de columnas", () => {
    const { filas } = parsearCeldasIglesias([
      ["Domingo", "Ubicación", "Nombre", "Sábado", "Distrito"],
      ["7:00, 9:00 y 11:00", "-8.1116, -79.0287", "Parroquia San José", "19:00:00", "Trujillo"],
    ]);
    expect(filas[0].datos?.misas).toEqual([
      { dia: 6, hora: "19:00" },
      { dia: 7, hora: "07:00" },
      { dia: 7, hora: "09:00" },
      { dia: 7, hora: "11:00" },
    ]);
  });

  it("sin encabezado usa el orden de la plantilla", () => {
    const { filas, encabezado } = parsearCeldasIglesias([
      ["Capilla Santa Rosa", "Moche", "", "-8.17, -79.0", "", "", "8 am, 6 pm", ""],
    ]);
    expect(encabezado).toBeNull();
    expect(filas[0].datos?.misas).toEqual([
      { dia: 7, hora: "08:00" },
      { dia: 7, hora: "18:00" },
    ]);
  });

  it("explica la misa del sábado antes de las 17:00", () => {
    const { filas } = parsearCeldasIglesias([
      ["Nombre", "Distrito", "Ubicación", "Sábado"],
      ["Capilla", "Moche", "-8.17, -79.0", "8:00"],
    ]);
    expect(filas[0].errores).toEqual(["El sábado solo cuentan las misas desde las 17:00 (8:00 no)."]);
  });
});

describe("el Excel de iglesias", () => {
  it("la plantilla trae la hoja Iglesias, la de ayuda y una fila de ejemplo que no se importa", async () => {
    const tablas = plantillaIglesias();
    expect(tablas.map((t) => t.nombre)).toEqual([HOJA_IGLESIAS, "Cómo llenar"]);
    expect(tablas[0].columnas.map((c) => c.titulo)).toEqual([
      "Nombre",
      "Distrito",
      "Dirección",
      "Ubicación",
      "Teléfono",
      "Sábado",
      "Domingo",
      "Notas",
    ]);
    const celdas = await leerExcel(await crearLibro(tablas), HOJA_IGLESIAS);
    expect(celdas[1].slice(5, 7)).toEqual(["19:00", "7:00, 11:00, 19:00"]);
    expect(parsearCeldasIglesias(celdas)).toEqual({ filas: [], encabezado: 1 });
  });

  it("la lista descargada se vuelve a subir igual", async () => {
    const { filas } = parsearFilasIglesias(
      fila("Parroquia San José", "Trujillo", "Jr. Uno 1", "-8.1116, -79.0287", "044 111111", "18:00, 20:00", "9:00 y 11:00", "")
    );
    const original = filas[0].datos!;
    const celdas = await leerExcel(await crearLibro(libroIglesias([original])), HOJA_IGLESIAS);
    expect(parsearCeldasIglesias(celdas).filas[0].datos).toEqual(original);
  });
});
