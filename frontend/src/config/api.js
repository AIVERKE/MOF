/**
 * Configuración centralizada de las URLs y endpoints de la API.
 * Permite cambiar la URL base desde la variable VITE_API_BASE_URL en .env
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
  },
  MOF: {
    TIPOS: `${API_BASE_URL}/api/v1/mof/tipos`,
    NIVELES: `${API_BASE_URL}/api/v1/mof/niveles`,
    RELACIONES: `${API_BASE_URL}/api/v1/mof/relaciones`,
    CLASES: `${API_BASE_URL}/api/v1/mof/clases`,
    UNIDADES: `${API_BASE_URL}/api/v1/mof/unidades`,
    PDF_UNIDAD: (id) => `${API_BASE_URL}/api/v1/mof/unidades/pdf/${id}`,
  },
  UNIDADES: {
    CARGOS: `${API_BASE_URL}/api/v1/unidades/cargos`,
    PERSONAL: `${API_BASE_URL}/api/v1/unidades`,
  },
};
