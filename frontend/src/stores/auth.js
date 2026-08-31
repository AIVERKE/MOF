import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS } from "../config/api";

export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem("token") || null);
  const user = ref(JSON.parse(localStorage.getItem("user") || "null"));

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
        throw new Error("Credenciales inválidas o error de conexión");
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
      console.error("Error en login:", error);
      throw error;
    }
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

  return { token, user, login, logout, getAuthHeader };
});
