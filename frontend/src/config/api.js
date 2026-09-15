/**
 * Configuración centralizada de las URLs y endpoints de la API.
 * Permite cambiar la URL base desde la variable VITE_API_BASE_URL en .env
 */
import { useSnackbar } from "@/composables/useSnackbar";

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
    CONFIG: `${API_BASE_URL}/api/v1/mof/config`,
  },
  UNIDADES: {
    CARGOS: `${API_BASE_URL}/api/v1/unidades/cargos`,
    PERSONAL: `${API_BASE_URL}/api/v1/unidades`,
  },
};

/** Diccionario alineado a backend/src/common/errors.ts */
export const ERROR_CODE_MESSAGES = {
  CATALOG_REF_NOT_FOUND: "Referencia de catálogo no encontrada",
  UNIDAD_CODIGO_DUPLICADO: "Ya existe una unidad con ese código",
  UNIDAD_PARENT_SELF: "Una unidad no puede ser padre de sí misma",
  UNIDAD_PARENT_CYCLE: "La asignación generaría un ciclo en la jerarquía",
  FUNCION_YA_PRIMERA: "La función ya está en la primera posición",
  FUNCION_YA_ULTIMA: "La función ya está en la última posición",
  DEPENDENCIA_SELF: "No se puede depender de sí misma",
  DEPENDENCIA_DUPLICADA: "La dependencia funcional ya existe",
  CLASE_YA_PRIMERA: "La clase ya está en la primera posición",
  CLASE_YA_ULTIMA: "La clase ya está en la última posición",
  CARGO_YA_ASIGNADO_UNICO: "Ese cargo único ya está asignado en la unidad",
  VALIDATION_FAILED: "Error de validación",
  UNAUTHORIZED: "No autenticado",
  FORBIDDEN: "Sin permisos para realizar esta acción",
  NOT_FOUND: "Registro no encontrado",
  INTERNAL_ERROR:
    "Se genero un error en el servidor, contacte con administracion",
  REQUEST_ERROR: "Error en la solicitud",
};

const VALIDATION_TRANSLATIONS = [
  [/must be an email/i, "debe ser un correo válido"],
  [/should not be empty/i, "no debe estar vacío"],
  [/must be longer than or equal to (\d+) characters/i, "debe tener al menos $1 caracteres"],
  [/must be shorter than or equal to (\d+) characters/i, "debe tener como máximo $1 caracteres"],
  [/must be a string/i, "debe ser texto"],
  [/must be a number/i, "debe ser un número"],
  [/must be a boolean/i, "debe ser booleano"],
  [/must be an integer/i, "debe ser un entero"],
  [/must be an array/i, "debe ser una lista"],
  [/must be a valid enum value/i, "debe ser un valor permitido"],
  [/property .+ should not exist/i, "propiedad no permitida"],
  [/must match .+ regular expression/i, "formato inválido"],
];

/**
 * Traduce mensajes típicos de class-validator (inglés → español).
 * @param {string} text
 * @returns {string}
 */
export function translateValidationMessage(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .split(", ")
    .map((part) => {
      let out = part.trim();
      for (const [pattern, replacement] of VALIDATION_TRANSLATIONS) {
        if (pattern.test(out)) {
          out = out.replace(pattern, replacement);
          break;
        }
      }
      return out;
    })
    .join(", ");
}

function clearSessionAndRedirectToLogin() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.assign("/");
  }
}

function notifyForbidden() {
  try {
    useSnackbar().mostrar(ERROR_CODE_MESSAGES.FORBIDDEN, "error");
  } catch {
    /* snackbar no disponible */
  }
}

/**
 * Cliente HTTP centralizado con token automático y Cache-Control: no-store.
 * Maneja 401 (logout + redirect) y 403 (aviso de permisos).
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

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isLoginRequest =
    typeof url === "string" && url.includes("/auth/login");

  if (response.status === 401 && !isLoginRequest) {
    clearSessionAndRedirectToLogin();
  } else if (response.status === 403) {
    notifyForbidden();
  }

  return response;
}

/**
 * Extrae metadatos de error (errorCode, status, message) sin consumir Response dos veces
 * si ya se pasó el payload parseado.
 *
 * @param {Response|Object} responseOrData
 * @param {string|Object} [options]
 * @returns {Promise<{ message: string, errorCode: string|null, status: number }>}
 */
export async function getApiErrorMeta(responseOrData, options = {}) {
  const config =
    typeof options === "string"
      ? { default400Message: options }
      : { ...options };

  let status = config.status ?? 0;
  let statusText = "";
  let data = null;
  let rawText = "";

  if (
    responseOrData &&
    typeof responseOrData === "object" &&
    typeof responseOrData.text === "function"
  ) {
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

  const errorCode =
    data && typeof data === "object" && typeof data.errorCode === "string"
      ? data.errorCode
      : null;

  if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
    // VALIDATION_FAILED: preferir detalle traducido del message si viene
    if (
      errorCode === "VALIDATION_FAILED" &&
      data &&
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return {
        message: translateValidationMessage(data.message),
        errorCode,
        status,
      };
    }
    if (
      errorCode === "VALIDATION_FAILED" &&
      data &&
      Array.isArray(data.message) &&
      data.message.length
    ) {
      return {
        message: translateValidationMessage(data.message.join(", ")),
        errorCode,
        status,
      };
    }
    return {
      message: ERROR_CODE_MESSAGES[errorCode],
      errorCode,
      status,
    };
  }

  const message = await resolveLegacyErrorMessage(data, {
    status,
    statusText,
    rawText,
    default400Message: config.default400Message,
  });

  return { message, errorCode, status };
}

async function resolveLegacyErrorMessage(
  data,
  { status, statusText, rawText, default400Message },
) {
  const default400 =
    default400Message ||
    "No se puede realizar la acción: Existen dependencias o restricciones de integridad.";

  if (data && typeof data === "object") {
    if (data.data && typeof data.data === "object" && data.data.mensaje) {
      return String(data.data.mensaje);
    }
    if (data.mensaje && typeof data.mensaje === "string") {
      return data.mensaje;
    }
    if (
      typeof data.message === "string" &&
      data.message.trim() &&
      data.message !== "Hay errores en la solicitud"
    ) {
      return translateValidationMessage(data.message);
    }
    if (Array.isArray(data.message) && data.message.length > 0) {
      return translateValidationMessage(data.message.join(", "));
    }
    if (data.errors) {
      if (Array.isArray(data.errors)) {
        return translateValidationMessage(data.errors.join(", "));
      }
      if (typeof data.errors === "object") {
        const flattened = Object.values(data.errors).flat().filter(Boolean);
        if (flattened.length > 0) {
          return translateValidationMessage(flattened.join(", "));
        }
      }
    }
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
    if (typeof data.data === "string" && data.data.trim()) {
      return data.data;
    }
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
    if (typeof data.details === "string" && data.details.trim()) {
      return data.details;
    }
    if (status === 400) {
      return default400;
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return translateValidationMessage(data.message);
    }
  }

  if (rawText && typeof rawText === "string" && rawText.trim() && !rawText.startsWith("<")) {
    return rawText;
  }
  if (status === 400) return default400;
  if (statusText) return `Error en la solicitud: ${statusText}`;
  if (status) return `Error en la solicitud (Código: ${status})`;
  return "Error en la operación";
}

/**
 * Función unificada y dinámica para extraer el mensaje de error de una respuesta de API.
 * Prioriza errorCode del catálogo; degrada al message textual actual.
 *
 * @param {Response|Object} responseOrData - Objeto Response de fetch o payload de respuesta
 * @param {string|Object} [options] - Mensaje 400 por defecto o configuración { default400Message, status }
 * @returns {Promise<string>} Mensaje de error extraído o fallback amigable
 */
export async function parseApiError(responseOrData, options = {}) {
  const meta = await getApiErrorMeta(responseOrData, options);
  return meta.message;
}
