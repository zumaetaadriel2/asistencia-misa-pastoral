import { describe, expect, it } from "vitest";
import { avisoFechaExif, avisoParecida } from "./avisos";
import type { ItemCola } from "./revision";

describe("avisoFechaExif", () => {
  // Semana cuyo domingo es el 18 de octubre: vale desde el sábado 17
  const domingo = "2026-10-18";

  it("sin fecha EXIF solo informa", () => {
    expect(avisoFechaExif(null, domingo).nivel).toBe("info");
  });

  it("una foto de la misa del sábado en la noche es normal", () => {
    const aviso = avisoFechaExif("2026-10-17T19:30:00-05:00", domingo);
    expect(aviso.nivel).toBe("info");
    expect(aviso.texto).toMatch(/sábado/);
  });

  it("una foto del domingo enviada el martes también es normal", () => {
    expect(avisoFechaExif("2026-10-18T10:30:00-05:00", domingo).nivel).toBe("info");
  });

  it("alerta si la foto es anterior a ese fin de semana", () => {
    const aviso = avisoFechaExif("2026-10-11T10:30:00-05:00", domingo);
    expect(aviso.nivel).toBe("alerta");
    expect(aviso.texto).toMatch(/^Tomada antes de ese fin de semana: domingo, 11 de octubre/);
  });
});

describe("avisoParecida", () => {
  const base = { alumno: "Ana Prueba Uno", similar_envio_id: null } as ItemCola;

  it("sin foto parecida no hay aviso", () => {
    expect(avisoParecida(base)).toBeNull();
  });

  it("distingue si se parece a otra foto suya o a la de un compañero", () => {
    expect(
      avisoParecida({ ...base, similar_envio_id: 7, similar_alumno: "Ana Prueba Uno", similar_semana: 32 })?.texto
    ).toBe("Se parece mucho a su foto de la semana 32.");
    expect(
      avisoParecida({ ...base, similar_envio_id: 8, similar_alumno: "Bruno Prueba Dos", similar_semana: 33 })?.texto
    ).toBe("Se parece mucho a la foto de Bruno Prueba Dos (semana 33).");
  });
});
