import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS } from "../config/api";

export const useAllRelacionesMofStore = defineStore(
    "relaciones_mof",
    () => {
        const relaciones = ref([]);
        const loading = ref(false);
        const error = ref(null);
        const API_URL = ENDPOINTS.MOF.RELACIONES;

        const getHeaders = () => {
          const token = localStorage.getItem('token') || '';
          return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          };
        };

        const getFetchRelaciones = async () => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}?t=${Date.now()}`, { headers: getHeaders() });
                const data = await response.json();
                relaciones.value = data.data;
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

        const createRelacion = async (descripcion, activo = true) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ descripcion, activo })
                });
                if (!response.ok) throw new Error(await parseError(response));
                await getFetchRelaciones();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        const updateRelacion = async (id, descripcion, activo = true) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ descripcion, activo })
                });
                if (!response.ok) throw new Error(await parseError(response));
                await getFetchRelaciones();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        const deleteRelacion = async (id) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!response.ok) throw new Error(await parseError(response));
                await getFetchRelaciones();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        return {
            relaciones,
            error,
            loading,
            getFetchRelaciones,
            createRelacion,
            updateRelacion,
            deleteRelacion
        }
    }
);