import { describe, expect, it, vi } from "vitest";

// El cliente real de Supabase exige variables de entorno: aquí solo se prueba la lógica pura
vi.mock("@/lib/supabase/client", () => ({ supabase: {} }));

const { armarCsvCatequesis, marcasPorAlumno, resumirCatequesis } = await import("./catequesis");

describe("resumirCatequesis", () => {
  it("la tardanza cuenta como asistencia y se cuenta aparte", () => {
    expect(resumirCatequesis(["presente", "tardanza", "falta", "presente"])).toEqual({
      asistio: 3,
      tardanzas: 1,
      faltas: 1,
      justificadas: 0,
      porcentaje: 75,
    });
  });

  it("no cuenta las justificadas ni las sin marcar", () => {
    expect(resumirCatequesis(["presente", "justificada", null, "falta"]).porcentaje).toBe(50);
  });

  it("sin marcas que cuenten no hay porcentaje", () => {
    expect(resumirCatequesis([null, "justificada"]).porcentaje).toBeNull();
  });
});

const sesiones = [
  { id: 2, fecha: "2026-10-18", titulo: "Retiro" },
  { id: 1, fecha: "2026-10-17", titulo: "Catequesis" },
];
const filas = [
  { alumno_id: 10, nombre_completo: "Ana Pérez", activo: true, sesion_id: 1, estado: "presente" as const, motivo: null },
  { alumno_id: 10, nombre_completo: "Ana Pérez", activo: true, sesion_id: 2, estado: "tardanza" as const, motivo: null },
  { alumno_id: 11, nombre_completo: "Bruno Díaz", activo: false, sesion_id: null, estado: null, motivo: null },
];

describe("marcasPorAlumno", () => {
  it("agrupa las marcas de cada alumno, incluido el que no tiene ninguna", () => {
    const alumnos = marcasPorAlumno(filas);
    expect(alumnos).toHaveLength(2);
    expect(alumnos[0].marcas.get(2)?.estado).toBe("tardanza");
    expect(alumnos[1].marcas.size).toBe(0);
  });
});

describe("armarCsvCatequesis", () => {
  const lineas = armarCsvCatequesis(sesiones, filas).replace("﻿", "").split("\r\n");

  it("ordena las sesiones de la más antigua a la más reciente", () => {
    expect(lineas[0]).toBe(
      '"Alumno","sáb 17 oct · Catequesis","dom 18 oct · Retiro","Asistió","Tardanzas","Faltas","Justificadas","% asistencia"'
    );
  });

  it("pone la marca de cada sesión y los totales", () => {
    expect(lineas[1]).toBe('"Ana Pérez","Presente","Tardanza","2","1","0","0","100%"');
  });

  it("marca a los inactivos y deja vacío lo sin marcar", () => {
    expect(lineas[2]).toBe('"Bruno Díaz (inactivo)","","","0","0","0","0",""');
  });
});
