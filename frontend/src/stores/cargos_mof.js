import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS } from "../config/api";

/**
 * Store para la gestión de cargos del Manual de Organización y Funciones (MOF)
 */
export const useAllCargosMofStore = defineStore(
    "cargos_mof",
    () => {
        // --- Estado (State) ---
        const cargos = ref([]);      // Listado de cargos obtenidos de la API
        const loading = ref(false);  // Indicador de carga para procesos asíncronos
        const error = ref(null);    // Almacena mensajes de error en caso de fallos
        
        // URL base para las peticiones de cargos
        const API_URL = ENDPOINTS.UNIDADES.CARGOS;

        const getHeaders = () => {
          const token = localStorage.getItem('token') || '';
          return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          };
        };

        // --- Acciones (Actions) ---
        
        /**
         * Obtiene la lista completa de cargos desde el servidor
         */
        const getFetchCargos = async () => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}?t=${Date.now()}`, { headers: getHeaders() });
                if (!response.ok) throw new Error("Error al obtener los cargos");
                
                const data = await response.json();
                // Se asume que la respuesta tiene una estructura { data: [...] }
                cargos.value = data.data;
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        }

        /**
         * Crea un nuevo cargo en el catálogo maestro.
         * @param {string} descripcion - Nombre del nuevo cargo.
         * @param {boolean} activo - Estado del cargo
         * @returns {Promise<boolean>}
         */
        const createCargo = async (descripcion, activo = true) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ descripcion, activo })
                });
                if (!response.ok) throw new Error("Error al crear el cargo");
                await getFetchCargos(); // Refrescar catálogo local
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        /**
         * Actualiza el nombre de un cargo en el catálogo maestro.
         * Este cambio afecta a todas las unidades que usen este cargo.
         * @param {number|string} id - ID del cargo en el catálogo.
         * @param {string} descripcion - Nuevo nombre del cargo.
         * @param {boolean} activo - Estado del cargo
         * @returns {Promise<boolean>}
         */
        const updateCargo = async (id, descripcion, activo = true) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ descripcion, activo })
                });
                if (!response.ok) throw new Error("Error al actualizar el cargo");
                await getFetchCargos(); // Refrescar catálogo local
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        }

        return {
            // Exposición de estado y acciones
            cargos,
            error,
            loading,
            getFetchCargos,
            createCargo,
            updateCargo
        }
    }
);
