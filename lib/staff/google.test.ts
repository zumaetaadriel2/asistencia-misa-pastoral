import { describe, expect, it } from "vitest";
import { crearNonce, mensajeLoginGoogle, sha256Hex } from "./google";

describe("crearNonce", () => {
  it("el cifrado es el SHA-256 del nonce, que es lo que Supabase comprueba", async () => {
    const { nonce, cifrado } = await crearNonce();
    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(cifrado).toBe(await sha256Hex(nonce));
  });

  it("cada nonce es distinto", async () => {
    const [a, b] = await Promise.all([crearNonce(), crearNonce()]);
    expect(a.nonce).not.toBe(b.nonce);
  });
});

describe("sha256Hex", () => {
  it("coincide con el valor conocido", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("mensajeLoginGoogle", () => {
  it("deja pasar los mensajes del hook", () => {
    const delHook = "Tu correo no está registrado como staff de la pastoral. Pide al administrador que lo agregue.";
    expect(mensajeLoginGoogle(delHook)).toBe(delHook);
  });

  it("resume los errores técnicos en inglés", () => {
    expect(mensajeLoginGoogle("Unacceptable audience in id_token")).toMatch(/^No se pudo comprobar/);
  });
});
