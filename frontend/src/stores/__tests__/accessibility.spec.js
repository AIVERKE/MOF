import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import {
  useAccessibilityStore,
  STORAGE_KEY_COLORBLIND,
  STORAGE_KEY_THEME,
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

describe("accessibility store - Tema", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("inicializa en light por defecto", () => {
    const store = useAccessibilityStore();
    expect(store.themeMode).toBe("light");
  });

  it("inicializa en dark si localStorage lo indica", () => {
    localStorage.setItem(STORAGE_KEY_THEME, "dark");
    const store = useAccessibilityStore();
    expect(store.themeMode).toBe("dark");
  });

  it("toggleThemeMode alterna y persiste", () => {
    const store = useAccessibilityStore();
    store.toggleThemeMode();
    expect(store.themeMode).toBe("dark");
    expect(localStorage.getItem(STORAGE_KEY_THEME)).toBe("dark");

    store.toggleThemeMode();
    expect(store.themeMode).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY_THEME)).toBe("light");
  });

  it("setThemeMode normaliza valores inválidos a light", () => {
    const store = useAccessibilityStore();
    store.setThemeMode("dark");
    expect(store.themeMode).toBe("dark");
    store.setThemeMode("otro");
    expect(store.themeMode).toBe("light");
  });
});
