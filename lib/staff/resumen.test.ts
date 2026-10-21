import { describe, expect, it } from "vitest";
import { armarResumenWhatsApp } from "./resumen";
import type { FilaResumen } from "./revision";

function fila(alumno: string, estado: FilaResumen["estado"], extra: Partial<FilaResumen> = {}): FilaResumen {
  return {
    alumno_id: alumno.length,
    alumno,
    comunidad_id: 1,
    comunidad: "San Pablo",
    programa: "confirmacion",
    estado,
    motivo: null,
    ...extra,
  };
}

describe("armarResumenWhatsApp", () => {
  it("agrupa por estado, con el motivo de los rechazos, y omite grupos vacíos", () => {
    const texto = armarResumenWhatsApp(34, [
      fila("Ana", "validado"),
      fila("Bruno", "rechazado", { motivo: "foto borrosa" }),
      fila("Carla", "sin_registro"),
      fila("Diego", "inasistencia"),
    ]);

    expect(texto).toBe(
      [
        "*Asistencia a misa · Semana 34*",
        "",
        "*San Pablo* (Confirmación)",
        "✅ Asistieron (1): Ana",
        "❌ Foto rechazada (1): Bruno (foto borrosa)",
        "⚠️ Sin foto (2): Carla, Diego",
      ].join("\n")
    );
  });

  it("separa las comunidades en bloques", () => {
    const texto = armarResumenWhatsApp(34, [
      fila("Ana", "validado"),
      fila("Gabi", "justificada", { comunidad_id: 2, comunidad: "San José", programa: "primera_comunion" }),
    ]);

    expect(texto).toContain("*San Pablo* (Confirmación)\n✅ Asistieron (1): Ana");
    expect(texto).toContain("*San José* (Primera Comunión)\n📝 Falta justificada (1): Gabi");
  });
});
