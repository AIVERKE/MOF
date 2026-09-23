import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS, parseApiError } from "../config/api";

function safeParseUser() {
  const raw = localStorage.getItem("user");
  if (raw == null || raw === "") return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem("token") || null);
  const user = ref(safeParseUser());

  async function login(email, password) {
    try {
      const response = await fetch(ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        // El backend distingue el caso "todavía no definió su contraseña"
        // mediante errorCode; conservarlo evita el mensaje genérico.
        throw new Error(
          await parseApiError(response, {
            default400Message: "Credenciales inválidas o error de conexión",
          }),
        );
      }

      const data = await response.json();

      token.value = data.access_token || (data.data && data.data.access_token);
      localStorage.setItem("token", token.value);

      const apiUser = data.user || (data.data && data.data.user) || {};
      const roles = apiUser.roles || [];

      user.value = {
        id: apiUser.id,
        email: apiUser.email || email,
        nombre: apiUser.nombre || apiUser.email || email,
        roles,
        rol: roles.length ? roles.join(", ") : "Usuario",
      };
      localStorage.setItem("user", JSON.stringify(user.value));

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Primer acceso: identifica al usuario nuevo con email + C.I. y devuelve el
   * token temporal para definir su contraseña. No crea sesión.
   */
  async function primerAcceso(email, ci) {
    const response = await fetch(ENDPOINTS.AUTH.PRIMER_ACCESO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ci }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const data = await response.json();
    const tempToken = data.token || (data.data && data.data.token);
    if (!tempToken) {
      throw new Error("No se pudo iniciar el primer acceso");
    }
    return tempToken;
  }

  /** Define la contraseña definitiva usando el token temporal. */
  async function cambiarPassword(tempToken, password) {
    const response = await fetch(ENDPOINTS.AUTH.CAMBIAR_PASSWORD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tempToken, password }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    return true;
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  function getAuthHeader() {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {};
  }

  function hasRole(codigo) {
    const roles = user.value?.roles;
    return Array.isArray(roles) && roles.includes(codigo);
  }

  function isAdmin() {
    return hasRole("ADMIN");
  }

  return {
    token,
    user,
    login,
    primerAcceso,
    cambiarPassword,
    logout,
    getAuthHeader,
    hasRole,
    isAdmin,
  };
});
