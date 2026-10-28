import { describe, expect, it } from "vitest";
import type { Misa } from "./horarios";
import { marcarMisas, momentoEnLima } from "./proxima";

const misas: Misa[] = [
  { dia: 7, hora: "11:00" },
  { dia: 6, hora: "17:00" },
  { dia: 7, hora: "08:00" },
  { dia: 6, hora: "19:00" },
];

/** Cuál está pasada y cuál es la próxima, en orden: "S17 S19 D08 D11" */
const resumen = (ahora: string) =>
  marcarMisas(misas, new Date(ahora))
    .map((m) => `${m.dia === 6 ? "S" : "D"}${m.hora.slice(0, 2)}${m.pasada ? "-pasada" : ""}${m.proxima ? "-proxima" : ""}`)
    .join(" ");

describe("momentoEnLima", () => {
  it("usa la hora de Lima, no la del servidor", () => {
    // 03:00 UTC del domingo es todavía sábado 22:00 en Lima
    expect(momentoEnLima(new Date("2026-10-25T03:00:00Z"))).toEqual({ dia: 6, hora: "22:00" });
    expect(momentoEnLima(new Date("2026-10-25T05:00:00Z"))).toEqual({ dia: 7, hora: "00:00" });
  });
});

describe("marcarMisas", () => {
  it("entre semana: ninguna pasó y la próxima es la primera del sábado", () => {
    expect(resumen("2026-10-21T12:00:00-05:00")).toBe("S17-proxima S19 D08 D11");
  });

  it("sábado 18:00: la de las 17:00 ya pasó y la próxima es la de las 19:00", () => {
    expect(resumen("2026-10-24T18:00:00-05:00")).toBe("S17-pasada S19-proxima D08 D11");
  });

  it("domingo 9:30: ya pasaron las del sábado y la de las 8:00", () => {
    expect(resumen("2026-10-25T09:30:00-05:00")).toBe("S17-pasada S19-pasada D08-pasada D11-proxima");
  });

  it("domingo 20:00: todas pasaron y no hay próxima", () => {
    expect(resumen("2026-10-25T20:00:00-05:00")).toBe("S17-pasada S19-pasada D08-pasada D11-pasada");
  });

  it("una misa que empieza justo ahora ya cuenta como pasada", () => {
    expect(resumen("2026-10-24T19:00:00-05:00")).toBe("S17-pasada S19-pasada D08-proxima D11");
  });
});
