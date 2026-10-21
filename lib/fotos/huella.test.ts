import { describe, expect, it } from "vitest";
import { aGrises, ALTO_HUELLA, ANCHO_HUELLA, dHash, distanciaHamming } from "./huella";

/** Imagen de 9×8 en grises a partir de una función de (x, y) */
function imagen(valor: (x: number, y: number) => number): number[] {
  const grises: number[] = [];
  for (let y = 0; y < ALTO_HUELLA; y++) {
    for (let x = 0; x < ANCHO_HUELLA; x++) grises.push(valor(x, y));
  }
  return grises;
}

// Patrón pseudoaleatorio fijo (sin Math.random, para que el test sea reproducible)
const foto = imagen((x, y) => ((x * 37 + y * 101 + x * y * 13) % 200) + 20);

describe("dHash", () => {
  it("un degradado que sube a la derecha prende los 64 bits (-1 con signo)", () => {
    expect(dHash(imagen((x) => x * 10))).toBe(BigInt(-1));
  });

  it("un degradado que baja a la derecha da 0", () => {
    expect(dHash(imagen((x) => 200 - x * 10))).toBe(BigInt(0));
  });

  it("la misma foto más clara u oscura tiene la misma huella", () => {
    const masClara = foto.map((g) => Math.min(255, g * 1.1 + 10));
    expect(dHash(masClara)).toBe(dHash(foto));
  });

  it("una recompresión con poco ruido cae dentro del umbral de 8 bits", () => {
    const conRuido = foto.map((g, i) => g + ((i * 7) % 3) - 1);
    expect(distanciaHamming(dHash(conRuido), dHash(foto))).toBeLessThanOrEqual(8);
  });

  it("dos fotos distintas quedan lejos", () => {
    const otra = imagen((x, y) => ((x * 53 + y * 29 + 7) % 190) + 30);
    expect(distanciaHamming(dHash(otra), dHash(foto))).toBeGreaterThan(8);
  });

  it("rechaza miniaturas de otro tamaño", () => {
    expect(() => dHash([1, 2, 3])).toThrow();
  });
});

describe("distanciaHamming", () => {
  it("cuenta los bits distintos, también con valores negativos", () => {
    expect(distanciaHamming(BigInt(5), BigInt(4))).toBe(1);
    expect(distanciaHamming(BigInt(-1), BigInt(0))).toBe(64);
    expect(distanciaHamming(BigInt(42), BigInt(43))).toBe(1);
  });
});

describe("aGrises", () => {
  it("convierte RGBA a luminancia", () => {
    const [blanco, negro, rojo] = aGrises([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255]);
    expect(blanco).toBeCloseTo(255);
    expect(negro).toBe(0);
    expect(rojo).toBeCloseTo(76.245);
  });
});
