import { describe, expect, it } from "vitest";
import { distanciaKm, enlaceComoLlegar, formatearDistancia, formatearUbicacion, parsearUbicacion } from "./ubicacion";

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

describe("distanciaKm", () => {
  const plazaDeArmas = { latitud: -8.1116, longitud: -79.0287 };

  it("en línea recta: de la Plaza de Armas a Huanchaco son unos 11 km", () => {
    expect(distanciaKm(plazaDeArmas, { latitud: -8.0784, longitud: -79.1214 })).toBeCloseTo(10.9, 0);
  });

  it("cero en el mismo punto y simétrica", () => {
    const otra = { latitud: -8.09, longitud: -79.0 };
    expect(distanciaKm(plazaDeArmas, plazaDeArmas)).toBe(0);
    expect(distanciaKm(plazaDeArmas, otra)).toBeCloseTo(distanciaKm(otra, plazaDeArmas), 9);
  });
});

describe("formatearDistancia", () => {
  it("metros de 50 en 50, km con un decimal y sin decimales desde 10 km", () => {
    expect(formatearDistancia(0.01)).toBe("50 m");
    expect(formatearDistancia(0.34)).toBe("350 m");
    expect(formatearDistancia(1.25)).toBe("1.3 km");
    expect(formatearDistancia(3)).toBe("3 km");
    expect(formatearDistancia(12.4)).toBe("12 km");
  });
});

describe("enlaceComoLlegar", () => {
  it("abre la ruta en Google Maps", () => {
    expect(enlaceComoLlegar({ latitud: -8.1116, longitud: -79.0287 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-8.1116,-79.0287"
    );
  });
});
