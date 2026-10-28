import { describe, expect, it, vi } from "vitest";

// El cliente real de Supabase exige variables de entorno: aquí solo se prueba la lógica pura
vi.mock("@/lib/supabase/client", () => ({ supabase: {} }));

const { marcasPorAlumno, resumirCatequesis, tablaCatequesis, tablaCatequesisCiclo } = await import("./catequesis");

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

describe("tablaCatequesis", () => {
  const tabla = tablaCatequesis(sesiones, filas);

  it("ordena las sesiones de la más antigua a la más reciente, con el alumno fijo", () => {
    expect(tabla.columnas.map((c) => c.titulo)).toEqual([
      "Alumno",
      "sáb 17 oct · Catequesis",
      "dom 18 oct · Retiro",
      "Asistió",
      "Tardanzas",
      "Faltas",
      "Justificadas",
      "% asistencia",
    ]);
    expect(tabla.columnasFijas).toBe(1);
  });

  it("pone la marca de cada sesión y los totales (el porcentaje de 0 a 1)", () => {
    expect(tabla.filas[0]).toEqual(["Ana Pérez", "Presente", "Tardanza", 2, 1, 0, 0, 1]);
  });

  it("marca a los inactivos y deja vacío lo sin marcar", () => {
    expect(tabla.filas[1]).toEqual(["Bruno Díaz (inactivo)", null, null, 0, 0, 0, 0, null]);
  });
});

describe("tablaCatequesisCiclo", () => {
  const sesionesCiclo = [
    { id: 3, comunidad_id: 2, comunidad: "Santa Rosa", programa: "confirmacion" as const, fecha: "2026-10-17", titulo: "Catequesis" },
    { id: 1, comunidad_id: 1, comunidad: "San José", programa: "primera_comunion" as const, fecha: "2026-10-17", titulo: "Catequesis" },
  ];
  const alumnosCiclo = [
    { id: 10, nombre: "Ana Pérez", activo: true, comunidad_id: 1 },
    { id: 11, nombre: "Bruno Díaz", activo: false, comunidad_id: 1 },
    { id: 12, nombre: "Carla Ruiz", activo: true, comunidad_id: 2 },
    { id: 13, nombre: "Diego Solís", activo: false, comunidad_id: 2 },
  ];
  const marcasCiclo = [
    { sesion_id: 1, alumno_id: 11, estado: "justificada" as const, motivo: "Viaje" },
    { sesion_id: 3, alumno_id: 12, estado: "tardanza" as const, motivo: null },
  ];
  const tabla = tablaCatequesisCiclo(sesionesCiclo, alumnosCiclo, marcasCiclo);

  it("una fila por alumno y sesión, ordenadas por comunidad", () => {
    expect(tabla.columnas.map((c) => c.titulo)).toEqual(["Comunidad", "Programa", "Fecha", "Sesión", "Alumno", "Estado", "Motivo"]);
    expect(tabla.filas).toEqual([
      ["San José", "Primera Comunión", "2026-10-17", "Catequesis", "Ana Pérez", "Sin marcar", null],
      ["San José", "Primera Comunión", "2026-10-17", "Catequesis", "Bruno Díaz (inactivo)", "Justificada", "Viaje"],
      ["Santa Rosa", "Confirmación", "2026-10-17", "Catequesis", "Carla Ruiz", "Tardanza", null],
    ]);
  });
});
