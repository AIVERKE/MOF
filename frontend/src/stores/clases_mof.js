import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS } from "../config/api";

/**
 * Store para la gestión de Clases (Instancias) del MOF
 */
export const useAllClasesMofStore = defineStore(
    "clases_mof",
    () => {
        const clases = ref([]);
        const loading = ref(false);
        const error = ref(null);
        
        const API_URL = ENDPOINTS.MOF.CLASES;

        const getHeaders = () => {
          const token = localStorage.getItem('token') || '';
          return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          };
        };

        const getFetchClases = async () => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}?t=${Date.now()}`, { headers: getHeaders() });
                if (!response.ok) throw new Error("Error al obtener las clases");
                
                const data = await response.json();
                clases.value = data.data;
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        }

        const parseError = async (response) => {
            const errorText = await response.text();
            console.error(">>> ERROR DETALLADO DEL BACKEND:", errorText);
            let message = "Error en la operación";
            try {
                const errorData = JSON.parse(errorText);
                let backendMsg = errorData.message || errorData.data || errorData.error;
                
                if (!backendMsg || backendMsg === "Hay errores en la solicitud") {
                    if (response.status === 400) {
                        backendMsg = "No se puede realizar la acción: Existen dependencias activas en el organigrama.";
                    }
                }
                message = backendMsg || message;
            } catch (e) {
                message = errorText || response.statusText || message;
            }
            return message;
        }

        const createClase = async (descripcion, color, activo = true, oficial = true) => {
            loading.value = true;
            error.value = null;
            try {
                // Probamos con booleano nativo ya que el 1/0 no parece haber funcionado.
                const payload = { 
                    descripcion, 
                    color, 
                    activo: !!activo, 
                    oficial: !!oficial 
                };
                
                console.log(">>> Enviando POST a Clases:", payload);

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(await parseError(response));
                await getFetchClases();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        const updateClase = async (id, descripcion, color, activo = true, oficial = true) => {
            loading.value = true;
            error.value = null;
            try {
                const payload = { 
                    descripcion, 
                    color, 
                    activo: !!activo, 
                    oficial: !!oficial 
                };
                
                console.log(">>> Enviando PUT a Clases (ID " + id + "):", payload);

                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                
                const responseClone = response.clone();
                console.log(">>> Respuesta PUT Clases:", response.status, await responseClone.text());

                if (!response.ok) throw new Error(await parseError(response));
                await getFetchClases();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        const deleteClase = async (id) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!response.ok) throw new Error(await parseError(response));
                await getFetchClases();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        const subirClase = async (id) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}/subir`, {
                    method: 'PUT',
                    headers: getHeaders()
                });
                if (!response.ok) throw new Error("Error al subir la clase");
                await getFetchClases();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        const bajarClase = async (id) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}/bajar`, {
                    method: 'PUT',
                    headers: getHeaders()
                });
                if (!response.ok) throw new Error("Error al bajar la clase");
                await getFetchClases();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        return {
            clases,
            error,
            loading,
            getFetchClases,
            createClase,
            updateClase,
            deleteClase,
            subirClase,
            bajarClase
        }
    }
);