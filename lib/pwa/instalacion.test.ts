import { describe, expect, it } from "vitest";
import { plataformaDe } from "./instalacion";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_COMO_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("plataformaDe", () => {
  it("reconoce iPhone y Android", () => {
    expect(plataformaDe(IPHONE)).toBe("ios");
    expect(plataformaDe(ANDROID)).toBe("android");
  });

  it("el iPad que dice ser Mac cuenta como iOS por su pantalla táctil; una Mac no", () => {
    expect(plataformaDe(IPAD_COMO_MAC, 5)).toBe("ios");
    expect(plataformaDe(IPAD_COMO_MAC, 0)).toBe("otra");
  });

  it("una computadora es otra", () => {
    expect(plataformaDe(WINDOWS)).toBe("otra");
  });
});
