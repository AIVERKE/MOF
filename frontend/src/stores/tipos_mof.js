import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS } from "../config/api";

export const useAllTiposMofStore = defineStore(
  "tipos_mof",
  () => {
    const tipos = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const API_URL = ENDPOINTS.MOF.TIPOS;
    
    const getHeaders = () => {
      const token = localStorage.getItem('token') || '';
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    };
    
    const getFetchTipos = async () => {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(`${API_URL}?t=${Date.now()}`, { headers: getHeaders() });
        const data = await response.json();
        tipos.value = data.data;
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

    const createTipo = async (descripcion, activo = true) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ descripcion, activo })
        });
        if (!response.ok) throw new Error(await parseError(response));
        await getFetchTipos();
        return true;
      } catch (err) {
        error.value = err.message;
        return false;
      } finally {
        loading.value = false;
      }
    }

    const updateTipo = async (id, descripcion, activo = true) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ descripcion, activo })
        });
        if (!response.ok) throw new Error(await parseError(response));
        await getFetchTipos();
        return true;
      } catch (err) {
        error.value = err.message;
        return false;
      } finally {
        loading.value = false;
      }
    }

    const deleteTipo = async (id) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (!response.ok) throw new Error(await parseError(response));
        await getFetchTipos();
        return true;
      } catch (err) {
        error.value = err.message;
        return false;
      } finally {
        loading.value = false;
      }
    }

    return {
      tipos,
      loading,
      error,
      getFetchTipos,
      createTipo,
      updateTipo,
      deleteTipo
    }
  }
)