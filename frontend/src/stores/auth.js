import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS } from "../config/api";

export const useAuthStore = defineStore("auth", () => {
  // Iniciamos el token recuperándolo del almacenamiento local si existe
  const token = ref(localStorage.getItem("token") || null);
  const user = ref(JSON.parse(localStorage.getItem("user") || "null"));

  async function login(username, password) {
    try {
      const response = await fetch(ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Credenciales inválidas o error de conexión");
      }

      const data = await response.json();

      // Guardamos el access_token recibido (soporta { access_token } o { data: { access_token } })
      token.value = data.access_token || (data.data && data.data.access_token);
      localStorage.setItem("token", token.value);

      // Guardamos información del usuario
      user.value = data.user || {
        username: username,
        nombre: username,
        rol: "Usuario"
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
    return token.value ? { "Authorization": `Bearer ${token.value}` } : {};
  }

  return { token, user, login, logout, getAuthHeader };
});
