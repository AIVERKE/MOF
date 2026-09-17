import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import {
  useAccessibilityStore,
  STORAGE_KEY_COLORBLIND,
} from "../accessibility";

describe("accessibility store - Modo Daltónico", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.documentElement.classList.remove("colorblind-mode");
    vi.restoreAllMocks();
  });

  it("inicializa desactivado por defecto si no existe en localStorage", () => {
    const store = useAccessibilityStore();
    expect(store.colorblindMode).toBe(false);
    expect(document.documentElement.classList.contains("colorblind-mode")).toBe(false);
  });

  it("inicializa activado si localStorage tiene 'true'", () => {
    localStorage.setItem(STORAGE_KEY_COLORBLIND, "true");
    const store = useAccessibilityStore();
    expect(store.colorblindMode).toBe(true);
    expect(document.documentElement.classList.contains("colorblind-mode")).toBe(true);
  });

  it("toggleColorblindMode alterna el estado y persiste en localStorage", () => {
    const store = useAccessibilityStore();
    expect(store.colorblindMode).toBe(false);

    store.toggleColorblindMode();
    expect(store.colorblindMode).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY_COLORBLIND)).toBe("true");
    expect(document.documentElement.classList.contains("colorblind-mode")).toBe(true);

    store.toggleColorblindMode();
    expect(store.colorblindMode).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY_COLORBLIND)).toBe("false");
    expect(document.documentElement.classList.contains("colorblind-mode")).toBe(false);
  });

  it("setColorblindMode asigna un valor específico", () => {
    const store = useAccessibilityStore();
    store.setColorblindMode(true);
    expect(store.colorblindMode).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY_COLORBLIND)).toBe("true");

    store.setColorblindMode(false);
    expect(store.colorblindMode).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY_COLORBLIND)).toBe("false");
  });
});
