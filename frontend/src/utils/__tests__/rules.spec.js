import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rules, FEC_CREACION_MIN, fecCreacionMax } from "../rules";

const MENSAJE = "La fecha de creación debe estar entre 01/01/1825 y 31/12/2026";

describe("rules.fechaCreacionRango", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expone los límites del rango", () => {
    expect(FEC_CREACION_MIN).toBe("1825-01-01");
    expect(fecCreacionMax()).toBe("2026-12-31");
  });

  it.each([null, undefined, ""])("acepta un valor vacío (%p)", (value) => {
    expect(rules.fechaCreacionRango(value)).toBe(true);
  });

  it.each(["1825-01-01", "1990-05-10", "2026-12-31"])("acepta %p", (value) => {
    expect(rules.fechaCreacionRango(new Date(`${value}T00:00:00`))).toBe(true);
  });

  it.each(["1824-12-31", "1800-05-01", "2027-01-01", "4000-01-01"])("rechaza %p", (value) => {
    expect(rules.fechaCreacionRango(new Date(`${value}T00:00:00`))).toBe(MENSAJE);
  });

  it("acepta un objeto Date del selector (medianoche local)", () => {
    expect(rules.fechaCreacionRango(new Date(1990, 4, 10))).toBe(true);
  });

  it("rechaza una fecha inválida", () => {
    expect(rules.fechaCreacionRango("no es fecha")).toBe(MENSAJE);
  });
});
