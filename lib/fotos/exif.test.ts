import { describe, expect, it } from "vitest";
import { fechaExifValida } from "./exif";

const ahora = new Date("2026-10-18T15:00:00-05:00");

describe("fechaExifValida", () => {
  it("acepta una fecha razonable", () => {
    const fecha = new Date("2026-10-18T10:30:00-05:00");
    expect(fechaExifValida(fecha, ahora)).toEqual(fecha);
  });

  it("descarta valores que no son fechas", () => {
    expect(fechaExifValida(undefined, ahora)).toBeNull();
    expect(fechaExifValida("2026:10:18 10:30:00", ahora)).toBeNull();
    expect(fechaExifValida(new Date("no es fecha"), ahora)).toBeNull();
  });

  it("descarta cámaras sin hora configurada (años muy viejos)", () => {
    expect(fechaExifValida(new Date("2000-01-01T00:00:00Z"), ahora)).toBeNull();
  });

  it("descarta fechas en el futuro, con un día de margen", () => {
    expect(fechaExifValida(new Date("2026-10-19T10:00:00-05:00"), ahora)).not.toBeNull();
    expect(fechaExifValida(new Date("2026-10-25T10:00:00-05:00"), ahora)).toBeNull();
  });
});
