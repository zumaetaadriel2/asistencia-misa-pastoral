import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Comprueba que los colores de app/globals.css se lean bien en los dos temas
// (WCAG AA: contraste ≥ 4.5:1 para texto normal).

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

/** Variables `--nombre: #rrggbb` del primer bloque que empiece con `inicio` */
function variables(inicio: string): Record<string, string> {
  const desde = css.indexOf(inicio);
  const bloque = css.slice(desde, css.indexOf("}", desde));
  return Object.fromEntries([...bloque.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

const claro = variables(":root {");
const oscuro = { ...claro, ...variables("@media screen and (prefers-color-scheme: dark)") };

const TEXTOS = ["texto", "texto-suave", "texto-tenue", "marca", "exito", "error", "aviso", "info"];
const FONDOS = ["fondo", "superficie", "superficie-2"];
const SOLIDOS = ["marca-solido", "exito-solido", "error-solido", "aviso-solido", "info-solido"];

describe.each([
  ["claro", claro],
  ["oscuro", oscuro],
])("tema %s", (_, tema) => {
  it("tiene todas las variables", () => {
    for (const nombre of [...TEXTOS, ...FONDOS, ...SOLIDOS]) expect(tema[nombre], nombre).toMatch(/^#/);
  });

  it.each(TEXTOS)("%s se lee sobre cada fondo", (texto) => {
    for (const fondo of FONDOS) {
      expect(contraste(tema[texto], tema[fondo]), `${texto} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(SOLIDOS)("el texto blanco se lee sobre %s", (solido) => {
    expect(contraste("#ffffff", tema[solido])).toBeGreaterThanOrEqual(4.5);
  });
});
