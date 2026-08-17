import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS } from "../config/api";

export const useAllNivelesMofStore = defineStore(
  "niveles_mof",
  () => {
    const niveles = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const API_URL = ENDPOINTS.MOF.NIVELES;

    const getHeaders = () => {
      const token = localStorage.getItem('token') || '';
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    };

    const getFetchNiveles = async () => {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(`${API_URL}?t=${Date.now()}`, { headers: getHeaders() });
        const data = await response.json();
        niveles.value = data.data;
      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    }

    const parseError = async (response) => {
      const errorText = await response.text();
      let message = "Error en la operación";
      try {
        const errorData = JSON.parse(errorText);
        let backendMsg = errorData.message || errorData.data || errorData.error;
        
        // Interceptor para mensajes genéricos del backend
        if (!backendMsg || backendMsg === "Hay errores en la solicitud") {
          if (response.status === 400) {
            backendMsg = "No se puede realizar la acción: Existen dependencias o restricciones de integridad.";
          }
        }
        message = backendMsg || message;
      } catch (e) {
        message = errorText || response.statusText || message;
      }
      return message;
    }

    const createNivel = async (descripcion, activo = true) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ descripcion, activo })
        });
        if (!response.ok) throw new Error(await parseError(response));
        await getFetchNiveles();
        return true;
      } catch (err) {
        error.value = err.message;
        return false;
      } finally {
        loading.value = false;
      }
    }

    const updateNivel = async (id, descripcion, activo = true) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ descripcion, activo })
        });
        if (!response.ok) throw new Error(await parseError(response));
        await getFetchNiveles();
        return true;
      } catch (err) {
        error.value = err.message;
        return false;
      } finally {
        loading.value = false;
      }
    }

    const deleteNivel = async (id) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (!response.ok) throw new Error(await parseError(response));
        await getFetchNiveles();
        return true;
      } catch (err) {
        error.value = err.message;
        return false;
      } finally {
        loading.value = false;
      }
    }

    return {
      niveles,
      error,
      loading,
      getFetchNiveles,
      createNivel,
      updateNivel,
      deleteNivel
    }
  }
)