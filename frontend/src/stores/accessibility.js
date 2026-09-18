import { defineStore } from "pinia";
import { ref } from "vue";

export const STORAGE_KEY_COLORBLIND = "mof_colorblind_mode";
export const STORAGE_KEY_THEME = "mof_theme";

function readStoredColorblindMode() {
  if (typeof window === "undefined" || !window.localStorage) return false;
  return localStorage.getItem(STORAGE_KEY_COLORBLIND) === "true";
}

function readStoredThemeMode() {
  if (typeof window === "undefined" || !window.localStorage) return "light";
  const stored = localStorage.getItem(STORAGE_KEY_THEME);
  return stored === "dark" ? "dark" : "light";
}

function updateRootClass(enabled) {
  if (typeof document !== "undefined" && document.documentElement) {
    if (enabled) {
      document.documentElement.classList.add("colorblind-mode");
    } else {
      document.documentElement.classList.remove("colorblind-mode");
    }
  }
}

export const useAccessibilityStore = defineStore("accessibility", () => {
  const colorblindMode = ref(readStoredColorblindMode());
  /** Preferencia de tema Vuetify: 'light' | 'dark' (persistida). */
  const themeMode = ref(readStoredThemeMode());

  updateRootClass(colorblindMode.value);

  function setColorblindMode(value) {
    colorblindMode.value = Boolean(value);
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_COLORBLIND, String(colorblindMode.value));
    }
    updateRootClass(colorblindMode.value);
  }

  function toggleColorblindMode() {
    setColorblindMode(!colorblindMode.value);
  }

  function setThemeMode(mode) {
    themeMode.value = mode === "dark" ? "dark" : "light";
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_THEME, themeMode.value);
    }
  }

  function toggleThemeMode() {
    setThemeMode(themeMode.value === "dark" ? "light" : "dark");
  }

  return {
    colorblindMode,
    themeMode,
    setColorblindMode,
    toggleColorblindMode,
    setThemeMode,
    toggleThemeMode,
  };
});
