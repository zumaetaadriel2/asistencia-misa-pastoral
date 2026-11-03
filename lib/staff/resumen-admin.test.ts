import { describe, expect, it, vi } from "vitest";
import { resumirAlumno } from "./estadisticas";

// El cliente real de Supabase exige variables de entorno: aquí solo se prueba la lógica pura
vi.mock("@/lib/supabase/client", () => ({ supabase: {} }));

const { armarResumen, porcentaje, textoEspera } = await import("./resumen-admin");
type DatosResumen = import("./resumen-admin").DatosResumen;

const conteo = (semana: number, valores: Partial<Record<"validado" | "rechazado" | "inasistencia" | "justificada" | "pendiente", number>>) => ({
  semana,
  validado: 0,
  rechazado: 0,
  inasistencia: 0,
  justificada: 0,
  pendiente: 0,
  ...valores,
});

const datos: DatosResumen = {
  semana_reciente: 35,
  semanas: [
    { semana: 33, domingo: "2026-10-11", cerrada: true },
    { semana: 34, domingo: "2026-10-18", cerrada: true },
    { semana: 35, domingo: "2026-10-25", cerrada: false },
  ],
  comunidades: [
    {
      id: 1,
      nombre: "San Pablo",
      programa: "confirmacion",
      activos: 3,
      guias: 1,
      por_revisar: 2,
      esperando_desde: "2026-10-26T15:00:00Z",
      catequesis: { asistio: 3, faltas: 1 },
      misa: [
        conteo(33, { validado: 2, inasistencia: 1 }),
        conteo(34, { validado: 1, rechazado: 1, justificada: 1 }),
        conteo(35, { validado: 1, pendiente: 2 }),
      ],
    },
    {
      id: 2,
      nombre: "Santa María",
      programa: "primera_comunion",
      activos: 2,
      guias: 0,
      por_revisar: 0,
      esperando_desde: null,
      catequesis: { asistio: 0, faltas: 0 },
      misa: [conteo(33, { validado: 1, inasistencia: 1 }), conteo(34, { inasistencia: 2 })],
    },
  ],
  alejandose: [{ alumno_id: 9, nombre: "Hugo Prueba", comunidad_id: 2, comunidad: "Santa María", faltas_seguidas: 3 }],
  iglesias_sin_horario: 4,
};

describe("porcentaje", () => {
  it("usa la misma regla que el Excel (resumirAlumno)", () => {
    const estados = new Map([
      [1, "validado" as const],
      [2, "rechazado" as const],
      [3, "justificada" as const],
      [4, "pendiente" as const],
      [5, "validado" as const],
    ]);
    expect(porcentaje(2, 1)).toBe(resumirAlumno(estados, 5).porcentaje);
    expect(porcentaje(0, 0)).toBeNull();
  });
});

describe("armarResumen", () => {
  const resumen = armarResumen(datos);

  it("la última semana cerrada, con la diferencia contra la anterior", () => {
    expect(resumen.tendencia).toEqual([
      { semana: 33, domingo: "2026-10-11", porcentaje: 60 },
      { semana: 34, domingo: "2026-10-18", porcentaje: 25 },
    ]);
    expect(resumen.cerrada).toEqual({ semana: 34, domingo: "2026-10-18", porcentaje: 25, diferencia: -35 });
  });

  it("la semana en curso cuenta las fotos enviadas (validadas, pendientes y rechazadas)", () => {
    expect(resumen.enCurso).toEqual({ semana: 35, domingo: "2026-10-25", conFoto: 3, activos: 5 });
  });

  it("fotos por revisar y catequesis del ciclo", () => {
    expect(resumen.porRevisar).toEqual({
      total: 2,
      mayor: { nombre: "San Pablo", cantidad: 2, desde: "2026-10-26T15:00:00Z" },
    });
    expect(resumen.catequesis).toBe(75);
  });

  it("cada comunidad con su semana, su ciclo (hasta la semana reciente) y su catequesis", () => {
    expect(resumen.comunidades.map(({ nombre, semana, ciclo, catequesis }) => ({ nombre, semana, ciclo, catequesis }))).toEqual([
      { nombre: "San Pablo", semana: 50, ciclo: 67, catequesis: 75 },
      { nombre: "Santa María", semana: 0, ciclo: 25, catequesis: null },
    ]);
  });

  it("avisa de las comunidades sin guía y pasa los alumnos y las iglesias", () => {
    expect(resumen.sinGuia).toEqual([{ id: 2, nombre: "Santa María", programa: "primera_comunion" }]);
    expect(resumen.alejandose).toHaveLength(1);
    expect(resumen.iglesiasSinHorario).toBe(4);
  });

  it("sin semanas cerradas ni semana abierta", () => {
    const vacio = armarResumen({ ...datos, semanas: [{ semana: 1, domingo: "2026-03-01", cerrada: true }], comunidades: [] });
    expect(vacio.cerrada).toBeNull();
    expect(vacio.enCurso).toBeNull();
    expect(vacio.porRevisar).toEqual({ total: 0, mayor: null });
  });
});

describe("textoEspera", () => {
  const ahora = new Date("2026-10-29T15:00:00Z");

  it("de hoy, de ayer o de hace varios días", () => {
    expect(textoEspera("2026-10-29T08:00:00Z", ahora)).toBe("de hoy");
    expect(textoEspera("2026-10-28T10:00:00Z", ahora)).toBe("de ayer");
    expect(textoEspera("2026-10-26T15:00:00Z", ahora)).toBe("de hace 3 días");
  });
});
