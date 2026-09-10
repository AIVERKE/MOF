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
    DASHBOARD_STATS: `${API_BASE_URL}/api/v1/mof/dashboard/stats`,
    DESCENDIENTES_STATS: (id) => `${API_BASE_URL}/api/v1/mof/unidades/${id}/descendientes-stats`,
    PDF_UNIDAD: (id) => `${API_BASE_URL}/api/v1/mof/unidades/pdf/${id}`,
  },
  UNIDADES: {
    CARGOS: `${API_BASE_URL}/api/v1/unidades/cargos`,
    PERSONAL: `${API_BASE_URL}/api/v1/unidades`,
  },
};

/**
 * Cliente HTTP centralizado con token automático y Cache-Control: no-store.
 *
 * @param {string} url - URL completa o relativa
 * @param {RequestInit} [options] - Opciones estándar de fetch
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});

  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Función unificada y dinámica para extraer el mensaje de error de una respuesta de API.
 * Prioriza cualquier mensaje textual explícito devuelto por el backend.
 *
 * @param {Response|Object} responseOrData - Objeto Response de fetch o payload de respuesta
 * @param {string|Object} [options] - Mensaje 400 por defecto o configuración { default400Message, status }
 * @returns {Promise<string>} Mensaje de error extraído o fallback amigable
 */
export async function parseApiError(responseOrData, options = {}) {
  const config =
    typeof options === "string"
      ? { default400Message: options }
      : { ...options };

  let status = config.status ?? 0;
  let statusText = "";
  let data = null;
  let rawText = "";

  if (responseOrData && typeof responseOrData === "object" && typeof responseOrData.text === "function") {
    status = responseOrData.status;
    statusText = responseOrData.statusText || "";
    try {
      rawText = await responseOrData.text();
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }
  } else {
    data = responseOrData;
  }

  const default400 =
    config.default400Message ||
    "No se puede realizar la acción: Existen dependencias o restricciones de integridad.";

  if (data && typeof data === "object") {
    // 1. data.data.mensaje (error de lógica UMSA-CORE)
    if (data.data && typeof data.data === "object" && data.data.mensaje) {
      return String(data.data.mensaje);
    }
    // 2. data.mensaje
    if (data.mensaje && typeof data.mensaje === "string") {
      return data.mensaje;
    }
    // 3. data.message cuando no es el genérico 'Hay errores en la solicitud'
    if (
      typeof data.message === "string" &&
      data.message.trim() &&
      data.message !== "Hay errores en la solicitud"
    ) {
      return data.message;
    }
    // 4. data.message cuando es un array de validaciones (p. ej. class-validator de NestJS)
    if (Array.isArray(data.message) && data.message.length > 0) {
      return data.message.join(", ");
    }
    // 5. data.errors (objeto o array)
    if (data.errors) {
      if (Array.isArray(data.errors)) {
        return data.errors.join(", ");
      }
      if (typeof data.errors === "object") {
        const flattened = Object.values(data.errors).flat().filter(Boolean);
        if (flattened.length > 0) return flattened.join(", ");
      }
    }
    // 6. data.error (cuando es string explicativo)
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
    // 7. data.data cuando es string directo
    if (typeof data.data === "string" && data.data.trim()) {
      return data.data;
    }
    // 8. data.detail / data.details
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
    if (typeof data.details === "string" && data.details.trim()) {
      return data.details;
    }

    // Si status es 400 y el mensaje es genérico o no vino mensaje específico
    if (status === 400) {
      return default400;
    }

    // Si había un data.message residual
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  if (rawText && typeof rawText === "string" && rawText.trim() && !rawText.startsWith("<")) {
    return rawText;
  }

  if (status === 400) {
    return default400;
  }

  if (statusText) {
    return `Error en la solicitud: ${statusText}`;
  }

  if (status) {
    return `Error en la solicitud (Código: ${status})`;
  }

  return "Error en la operación";
}

