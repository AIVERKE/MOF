import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { apiFetch, ENDPOINTS, parseApiError } from "@/config/api";
import { setSwatches } from "@/utils/mofHelpers";

/**
 * Configuración por defecto del MOF (fallback seguro para degradación sin backend)
 */
export const DEFAULT_CONFIG = {
  defaults: {
    tipo: 1,
    nivel: 1,
    relacion: 1,
    clase: 1,
    color: "#1976D2",
    lado: "AUTOMATICO",
    oficial: true,
    es_troncal: false,
  },
  reglas: {
    pesoNulo: 99,
    pesoDefault: 10,
    defaultClaseColor: "#757575",
    staffRelacionCodigos: ["S"],
    ladoTroncalForzado: "CENTRO",
  },
  paleta: [
    ["#1976D2", "#2196F3", "#03A9F4", "#00BCD4", "#00ACC1"],
    ["#2E7D32", "#4CAF50", "#8BC34A", "#CDDC39", "#C0CA33"],
    ["#FF8F00", "#FFA000", "#FFC107", "#FFEB3B", "#FDD835"],
    ["#C62828", "#E53935", "#F44336", "#EF5350", "#E91E63"],
    ["#6A1B9A", "#8E24AA", "#9C27B0", "#AB47BC", "#BA68C8"],
    ["#E65100", "#EF6C00", "#F57C00", "#FB8C00", "#FF9800"],
    ["#00695C", "#00796B", "#00897B", "#009688", "#26A69A"],
    ["#1A237E", "#283593", "#303F9F", "#3949AB", "#3F51B5"],
    ["#37474F", "#455A64", "#607D8B", "#78909C", "#90A4AE"],
    ["#4E342E", "#5D4037", "#6D4C41", "#795548", "#8D6E63"],
    ["#212121", "#424242", "#616161", "#757575", "#9E9E9E"],
    ["#BF360C", "#D84315", "#E64A19", "#F4511E", "#FF5722"],
  ],
  passwordPolicy: {
    minLength: 6,
  },
};

function applyPayload(data) {
  return {
    defaults: { ...DEFAULT_CONFIG.defaults, ...(data.defaults || {}) },
    reglas: { ...DEFAULT_CONFIG.reglas, ...(data.reglas || {}) },
    paleta:
      Array.isArray(data.paleta) && data.paleta.length > 0
        ? data.paleta
        : DEFAULT_CONFIG.paleta,
    passwordPolicy: {
      ...DEFAULT_CONFIG.passwordPolicy,
      ...(data.passwordPolicy || {}),
    },
  };
}

/**
 * Store Pinia para gestionar la configuración dinámica y reglas de negocio del MOF
 */
export const useConfigMofStore = defineStore("config_mof", () => {
  const config = ref(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);

  const defaults = computed(() => config.value.defaults || DEFAULT_CONFIG.defaults);
  const reglas = computed(() => config.value.reglas || DEFAULT_CONFIG.reglas);
  const paleta = computed(() => config.value.paleta || DEFAULT_CONFIG.paleta);
  const passwordPolicy = computed(
    () => config.value.passwordPolicy || DEFAULT_CONFIG.passwordPolicy,
  );
  const passwordMinLength = computed(() => {
    const n = Number(passwordPolicy.value?.minLength);
    return Number.isFinite(n) && n >= 6 ? n : 6;
  });
  const swatches = computed(() => paleta.value);

  function syncSwatches(paletaValue) {
    if (typeof setSwatches === "function") {
      setSwatches(paletaValue);
    }
  }

  /**
   * Carga la configuración del backend una sola vez (o forzado si force=true)
   */
  async function fetchConfig({ force = false } = {}) {
    if (isLoaded.value && !force) {
      return config.value;
    }
    loading.value = true;
    error.value = null;

    try {
      const response = await apiFetch(ENDPOINTS.MOF.CONFIG);
      if (response.ok) {
        const json = await response.json();
        const data = json.data || json;
        if (data && typeof data === "object") {
          config.value = applyPayload(data);
          syncSwatches(config.value.paleta);
          isLoaded.value = true;
        }
      } else {
        error.value = `Error ${response.status} al cargar configuración MOF`;
      }
    } catch (err) {
      // Degradación segura documentada: se conserva DEFAULT_CONFIG
      error.value = err.message || "Error de red al cargar configuración MOF";
    } finally {
      loading.value = false;
    }

    return config.value;
  }

  /**
   * Persiste un patch parcial (defaults / reglas / paleta / passwordPolicy).
   * Solo ADMIN; el backend valida y fusiona.
   */
  async function saveConfig(partial) {
    saving.value = true;
    error.value = null;
    try {
      const response = await apiFetch(ENDPOINTS.MOF.CONFIG, {
        method: "PUT",
        body: JSON.stringify(partial),
      });
      if (!response.ok) {
        const message = await parseApiError(response, {
          default400Message: "No se pudo guardar la configuración MOF",
        });
        error.value = message;
        throw new Error(message);
      }
      const json = await response.json();
      const data = json.data || json;
      config.value = applyPayload(data);
      syncSwatches(config.value.paleta);
      isLoaded.value = true;
      return config.value;
    } finally {
      saving.value = false;
    }
  }

  return {
    config,
    loading,
    saving,
    error,
    isLoaded,
    defaults,
    reglas,
    paleta,
    passwordPolicy,
    passwordMinLength,
    swatches,
    fetchConfig,
    saveConfig,
  };
});
