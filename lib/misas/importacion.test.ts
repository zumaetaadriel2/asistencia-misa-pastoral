import { describe, expect, it } from "vitest";
import { armarCsvIglesias, dividirFila, normalizarDistrito, parsearFilasIglesias, plantillaCsv } from "./importacion";

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

describe("parsearFilasIglesias", () => {
  const texto = [
    fila("Nombre", "Distrito", "Dirección", "Ubicación", "Teléfono", "Misas", "Notas", "Fuente"),
    fila("Parroquia San José", "trujillo", "Jr. Uno 1", "-8.1116, -79.0287", "044 111111", "Sáb 19:00; Dom 9:00", "", "web"),
    "",
    fila("Capilla Santa Rosa", "Moche", "", "-79.0, -8.17", "", "Lun 7:00", ""),
    fila("parroquia san josé", "Trujillo", "Otra dirección", "-8.1116, -79.0287", "", "", ""),
    fila("Parroquia Sin Misas", "Huanchaco", "", "-8.0784, -79.1214", "", "", "POR CONFIRMAR"),
  ].join("\r\n");
  const filas = parsearFilasIglesias(texto);

  it("salta el encabezado y las líneas vacías, y numera como en lo pegado", () => {
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
    expect(filas[2].errores).toEqual(["Repetida: ya está en la línea 2."]);
  });

  it("una iglesia sin misas es válida (no sale en /misas hasta tenerlas)", () => {
    expect(filas[3].datos?.misas).toEqual([]);
    expect(filas[3].datos?.notas).toBe("POR CONFIRMAR");
  });
});

describe("armarCsvIglesias", () => {
  it("vuelve a leerse igual (se puede editar en Excel y reimportar)", () => {
    const [original] = parsearFilasIglesias(
      fila("Parroquia San José", "Trujillo", "Jr. Uno 1", "-8.1116, -79.0287", "", "Dom 9:00 y 11:00", "")
    );
    const csv = armarCsvIglesias([original.datos!]);
    expect(csv.startsWith("﻿")).toBe(true);
    const [releida] = parsearFilasIglesias(csv);
    expect(releida.datos).toEqual(original.datos);
  });

  it("la plantilla trae el encabezado y una fila de ejemplo válida", () => {
    const filas = parsearFilasIglesias(plantillaCsv());
    expect(filas).toHaveLength(1);
    expect(filas[0].errores).toEqual([]);
  });
});
