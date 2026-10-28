import { describe, expect, it } from "vitest";
import { formatearUbicacion, parsearUbicacion } from "./ubicacion";

describe("parsearUbicacion", () => {
  it("lee lo que copia Google Maps", () => {
    expect(parsearUbicacion("-8.1116, -79.0287")).toEqual({ latitud: -8.1116, longitud: -79.0287 });
  });

  it("acepta coma decimal de un Excel en español", () => {
    expect(parsearUbicacion("-8,1116; -79,0287")).toEqual({ latitud: -8.1116, longitud: -79.0287 });
    expect(parsearUbicacion("-8,1116 -79,0287")).toEqual({ latitud: -8.1116, longitud: -79.0287 });
  });

  it("redondea a 6 decimales, como la base", () => {
    expect(parsearUbicacion("-8.11160012345, -79.02870098765")).toEqual({ latitud: -8.1116, longitud: -79.028701 });
  });

  it("avisa si la latitud y la longitud están al revés", () => {
    expect(parsearUbicacion("-79.0287, -8.1116")).toEqual({
      error: "La latitud y la longitud están al revés: primero va la latitud (-8.…).",
    });
  });

  it("rechaza lo que está fuera de la provincia, vacío o con otro formato", () => {
    expect(parsearUbicacion("-12.0464, -77.0428")).toEqual({ error: "La ubicación no está en la provincia de Trujillo." });
    expect(parsearUbicacion("")).toHaveProperty("error");
    expect(parsearUbicacion("Av. España 123")).toHaveProperty("error");
  });
});

describe("formatearUbicacion", () => {
  it("con 6 decimales", () => {
    expect(formatearUbicacion({ latitud: -8.1116, longitud: -79.0287 })).toBe("-8.111600, -79.028700");
  });
});
