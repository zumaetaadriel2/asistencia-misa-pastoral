import { describe, expect, it } from "vitest";
import { armarIcs } from "./calendario";

const URL_APP = "https://asistencia-misa-pastoral-mariana.vercel.app/alumno";

describe("armarIcs", () => {
  const ics = armarIcs(URL_APP);
  const lineas = ics.split("\r\n");

  it("un evento que se repite cada semana, el sábado a las 7 p. m. de Lima (00:00 UTC del domingo)", () => {
    expect(lineas[0]).toBe("BEGIN:VCALENDAR");
    expect(lineas).toContain("DTSTART:20260301T000000Z");
    expect(lineas).toContain("RRULE:FREQ=WEEKLY");
    const enLima = new Date("2026-03-01T00:00:00Z").toLocaleString("en-US", {
      timeZone: "America/Lima",
      weekday: "long",
      hour: "numeric",
      hourCycle: "h23",
    });
    expect(enLima).toBe("Saturday, 19");
  });

  it("líneas separadas por CRLF, de 75 caracteres como máximo y con el enlace a la app", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(lineas.every((l) => l.length <= 75)).toBe(true);
    // Al desdoblar las líneas vuelve el enlace completo
    expect(ics.replace(/\r\n /g, "")).toContain(`URL:${URL_APP}`);
  });

  it("escapa las comas y los saltos de línea del texto", () => {
    const descripcion = ics.replace(/\r\n /g, "").split("\r\n").find((l) => l.startsWith("DESCRIPTION:Ya"));
    expect(descripcion).toBe(`DESCRIPTION:Ya puedes subir tu foto de misa: hasta el lunes a las 11:59 p. m.\\n${URL_APP}`);
  });
});
