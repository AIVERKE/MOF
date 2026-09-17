import { defineStore } from "pinia";
import { ref } from "vue";

export const STORAGE_KEY_COLORBLIND = "mof_colorblind_mode";

function readStoredColorblindMode() {
  if (typeof window === "undefined" || !window.localStorage) return false;
  return localStorage.getItem(STORAGE_KEY_COLORBLIND) === "true";
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

  // Inicializar clase raíz al cargar la tienda
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

  return {
    colorblindMode,
    setColorblindMode,
    toggleColorblindMode,
  };
});
