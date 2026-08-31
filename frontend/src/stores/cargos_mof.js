import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS } from "../config/api";

/**
 * Store para la gestión de cargos del Manual de Organización y Funciones (MOF)
 */
export const useAllCargosMofStore = defineStore(
    "cargos_mof",
    () => {
        const cargos = ref([]);
        const loading = ref(false);
        const error = ref(null);

        const API_URL = ENDPOINTS.UNIDADES.CARGOS;

        const getHeaders = () => {
          const token = localStorage.getItem('token') || '';
          return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          };
        };

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
        };

        const getFetchCargos = async () => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}?t=${Date.now()}`, { headers: getHeaders() });
                if (!response.ok) throw new Error(await parseError(response));
                const data = await response.json();
                cargos.value = data.data;
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        /**
         * @param {string} nombre
         * @param {string|null} [descripcion]
         * @param {boolean} [activo]
         * @param {number|null} [parentId]
         * @returns {Promise<boolean>}
         */
        const createCargo = async (nombre, descripcion = null, activo = true, parentId = null) => {
            loading.value = true;
            error.value = null;
            try {
                const desc =
                    descripcion == null || String(descripcion).trim() === ''
                        ? null
                        : String(descripcion).trim();
                const body = { nombre: String(nombre).trim(), descripcion: desc, activo };
                if (parentId != null) body.parentId = parentId;

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(body)
                });
                if (!response.ok) throw new Error(await parseError(response));
                await getFetchCargos();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        };

        /**
         * @param {number|string} id
         * @param {string} nombre
         * @param {string|null} [descripcion]
         * @param {boolean} [activo]
         * @returns {Promise<boolean>}
         */
        const updateCargo = async (id, nombre, descripcion = null, activo = true) => {
            loading.value = true;
            error.value = null;
            try {
                const desc =
                    descripcion == null || String(descripcion).trim() === ''
                        ? null
                        : String(descripcion).trim();
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        nombre: String(nombre).trim(),
                        descripcion: desc,
                        activo
                    })
                });
                if (!response.ok) throw new Error(await parseError(response));
                await getFetchCargos();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        };

        /**
         * Soft delete del cargo.
         * @param {number|string} id
         * @returns {Promise<boolean>}
         */
        const deleteCargo = async (id) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!response.ok) throw new Error(await parseError(response));
                await getFetchCargos();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        };

        /**
         * Cambia el cargo padre y registra historial en backend.
         * @param {number|string} id
         * @param {number|null} parentId
         * @param {string} [razon]
         * @returns {Promise<boolean>}
         */
        const setParentCargo = async (id, parentId, razon) => {
            loading.value = true;
            error.value = null;
            try {
                const body = { parentId: parentId == null ? null : Number(parentId) };
                if (razon) body.razon = razon;

                const response = await fetch(`${API_URL}/${id}/setparent`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(body)
                });
                if (!response.ok) throw new Error(await parseError(response));
                await getFetchCargos();
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        };

        return {
            cargos,
            error,
            loading,
            getFetchCargos,
            createCargo,
            updateCargo,
            deleteCargo,
            setParentCargo
        };
    }
);
