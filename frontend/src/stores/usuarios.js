import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS, apiFetch, parseApiError } from "../config/api";

export const useUsuariosStore = defineStore("usuarios", () => {
  const usuarios = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function fetchUsuarios() {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiFetch(ENDPOINTS.SEGURIDAD.USUARIOS);
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const data = await response.json();
      usuarios.value = Array.isArray(data.data) ? data.data : [];
    } catch (err) {
      usuarios.value = [];
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function executeWithLoading(actionFn) {
    loading.value = true;
    error.value = null;
    try {
      await actionFn();
      // Refetch without nesting loading toggles: reuse GET path inline
      const response = await apiFetch(ENDPOINTS.SEGURIDAD.USUARIOS);
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const data = await response.json();
      usuarios.value = Array.isArray(data.data) ? data.data : [];
      return true;
    } catch (err) {
      error.value = err.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function createUsuario(payload) {
    return executeWithLoading(async () => {
      const response = await apiFetch(ENDPOINTS.SEGURIDAD.USUARIOS, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    });
  }

  async function updateUsuario(id, payload) {
    return executeWithLoading(async () => {
      const response = await apiFetch(`${ENDPOINTS.SEGURIDAD.USUARIOS}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    });
  }

  async function setUsuarioEnabled(id, enabled) {
    return executeWithLoading(async () => {
      const response = await apiFetch(ENDPOINTS.SEGURIDAD.USUARIO_ESTADO(id), {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    });
  }

  return {
    usuarios,
    loading,
    error,
    fetchUsuarios,
    createUsuario,
    updateUsuario,
    setUsuarioEnabled,
  };
});
