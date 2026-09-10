import { defineStore } from "pinia";
import { ref } from "vue";
import { ENDPOINTS, apiFetch, parseApiError } from "../config/api";

export const useAllUnidadesMofStore = defineStore(
    "unidades_mof",
    () => {
        const unidades = ref([]);
        const dashboardStats = ref(null);
        const loading = ref(false);
        const error = ref(null);

        const API_URL = ENDPOINTS.MOF.UNIDADES;
        const API_PERSONAL_URL = ENDPOINTS.UNIDADES.PERSONAL;

        const getFetchUnidades = async () => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(API_URL);
                if (!response.ok) {
                    throw new Error(await parseApiError(response));
                }
                const data = await response.json();
                unidades.value = Array.isArray(data?.data) ? data.data : [];
            } catch (err) {
                unidades.value = [];
                error.value = err.message === 'Falla en fetch'
                    ? 'No se puede conectar al servidor. Comuniquese con el administrador del sistema.'
                    : err.message;
            } finally {
                loading.value = false;
            }
        };

        const createUnidad = async (dataForm) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify(dataForm)
                });

                let dataResponse = null;
                try {
                    dataResponse = await response.json();
                } catch {
                    if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
                    throw new Error('Error al procesar la respuesta del servidor');
                }

                // Manejo de inconsistencia del backend
                if (dataResponse?.data && dataResponse.data.status === false) {
                    throw new Error(dataResponse.data.mensaje || 'Error de lógica en el servidor');
                }

                if (!response.ok) {
                    throw new Error(await parseApiError(dataResponse || response, { status: response.status }));
                }

                await getFetchUnidades();
                return dataResponse?.data;
            } catch (err) {
                error.value = err.message;
                return null;
            } finally {
                loading.value = false;
            }
        };

        const updateUnidad = async (id, dataForm) => {
            loading.value = true;
            error.value = null;
            try {
                const endpoint = `${API_URL}/${id}`;
                const response = await apiFetch(endpoint, {
                    method: 'PUT',
                    body: JSON.stringify(dataForm)
                });

                let dataResponse = null;
                try {
                    dataResponse = await response.json();
                } catch {
                    if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
                    throw new Error('Error al procesar la respuesta del servidor');
                }

                // Manejo de inconsistencia del backend
                if (dataResponse?.data && dataResponse.data.status === false) {
                    throw new Error(dataResponse.data.mensaje || 'Error de lógica en el servidor');
                }

                if (!response.ok) {
                    throw new Error(await parseApiError(dataResponse || response, { status: response.status }));
                }
                await getFetchUnidades();
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        const deleteUnidad = async (id) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(`${API_URL}/${id}`, {
                    method: 'DELETE'
                });

                let dataResponse = null;
                try {
                    dataResponse = await response.json();
                } catch {
                    if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
                    throw new Error('Error al procesar la respuesta del servidor');
                }

                // Manejo de inconsistencia del backend
                if (dataResponse?.data && dataResponse.data.status === false) {
                    throw new Error(dataResponse.data.mensaje || 'Error de lógica en el servidor');
                }

                if (!response.ok) {
                    throw new Error(await parseApiError(dataResponse || response, { status: response.status }));
                }

                await getFetchUnidades();
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        const getUnidadById = async (id) => {
            loading.value = true;
            error.value = null;
            try {
                const endpoint = `${API_URL}/${id}`;
                const response = await apiFetch(endpoint);
                if (!response.ok) throw new Error(await parseApiError(response));
                const data = await response.json();
                return data.data;
            } catch {
                error.value = 'No se puede obtener la unidad';
                return null;
            } finally {
                loading.value = false;
            }
        };

        // --- CRUD COMPLETO: FUNCIONES (Entidad Débil) ---

        const getFunciones = async (unidadId) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/funciones`);
                if (!response.ok) throw new Error(await parseApiError(response));
                const data = await response.json();
                return data.data || [];
            } catch (err) {
                error.value = err.message;
                return [];
            } finally {
                loading.value = false;
            }
        };

        const createFuncion = async (unidadId, { funcion, baseLegal }) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/funciones`, {
                    method: 'POST',
                    body: JSON.stringify({ funcion, baseLegal })
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                const data = await response.json();
                return data.data;
            } catch (err) {
                error.value = err.message;
                return null;
            } finally {
                loading.value = false;
            }
        };

        const updateFuncion = async (unidadId, funcionId, { funcion, baseLegal }) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/funciones/${funcionId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ funcion, baseLegal })
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                const data = await response.json();
                return data.data;
            } catch (err) {
                error.value = err.message;
                return null;
            } finally {
                loading.value = false;
            }
        };

        const deleteFuncion = async (unidadId, funcionId) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/funciones/${funcionId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                return true;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        };

        const subirFuncion = async (unidadId, funcionId) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/funciones/${funcionId}/subir`, {
                    method: 'PUT'
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                const data = await response.json();
                return data.data;
            } catch (err) {
                error.value = err.message;
                return null;
            } finally {
                loading.value = false;
            }
        };

        const bajarFuncion = async (unidadId, funcionId) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/funciones/${funcionId}/bajar`, {
                    method: 'PUT'
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                const data = await response.json();
                return data.data;
            } catch (err) {
                error.value = err.message;
                return null;
            } finally {
                loading.value = false;
            }
        };

        const updateNodo = async (id, dataForm) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await apiFetch(`${API_URL}/${id}/setparent`, {
                    method: 'PUT',
                    body: JSON.stringify(dataForm)
                });

                if (!response.ok) throw new Error(await parseApiError(response));
                await getFetchUnidades();
            } catch (err) {
                error.value = err.message || 'Error al actualizar';
            } finally {
                loading.value = false;
            }
        };

        // --- CRUD PARA DEPENDENCIAS FUNCIONALES ---
        
        const addDependenciaFuncional = async (unidadId, dependenciaId) => {
            loading.value = true;
            error.value = null;
            try {
                const endpoint = `${API_URL}/${unidadId}/dependencias-funcionales`;
                const payload = { dependenciaId };
                const response = await apiFetch(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                return response.ok;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        };

        const removeDependenciaFuncional = async (unidadId, dependenciaId) => {
            loading.value = true;
            error.value = null;
            try {
                const endpoint = `${API_URL}/${unidadId}/dependencias-funcionales/${dependenciaId}`;
                const response = await apiFetch(endpoint, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                return response.ok;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        };

        const getPersonalUnidad = async (unidadId) => {
            try {
                const response = await apiFetch(`${API_PERSONAL_URL}/${unidadId}/personal`);
                if (!response.ok) return null;
                const data = await response.json();
                return data.data; 
            } catch {
                return null;
            }
        };

        const updatePersonalUnidad = async (unidadId, cargoId) => {
            loading.value = true;
            try {
                const response = await apiFetch(`${API_PERSONAL_URL}/${unidadId}/personal`, {
                    method: 'POST',
                    body: JSON.stringify({ cargoId })
                });
                return response.ok;
            } catch {
                return false;
            } finally {
                loading.value = false;
            }
        };

        const deletePersonalUnidad = async (unidadId) => {
            loading.value = true;
            try {
                const personal = await getPersonalUnidad(unidadId);
                if (!personal || !Array.isArray(personal)) return true;
                for (const p of personal) {
                    if (p.id) {
                        await apiFetch(`${API_PERSONAL_URL}/${unidadId}/personal/${p.id}`, {
                            method: 'DELETE'
                        });
                    }
                }
                return true;
            } catch {
                return false;
            } finally {
                loading.value = false;
            }
        };

        const deleteCargoDeUnidad = async (unidadId, assignmentId) => {
            loading.value = true;
            try {
                const response = await apiFetch(`${API_PERSONAL_URL}/${unidadId}/personal/${assignmentId}`, {
                    method: 'DELETE'
                });
                return response.ok;
            } catch {
                return false;
            } finally {
                loading.value = false;
            }
        };

        // --- CRUD: RELACIONES INTERNAS ---
        const getRelacionesInternas = async (unidadId) => {
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/relaciones-internas`);
                if (!response.ok) return [];
                const data = await response.json();
                return data.data || [];
            } catch {
                return [];
            }
        };

        const createRelacionInterna = async (unidadId, { relacionadaId, tipo }) => {
            loading.value = true;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/relaciones-internas`, {
                    method: 'POST',
                    body: JSON.stringify({ relacionadaId: Number(relacionadaId), tipo })
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                const data = await response.json();
                return data.data;
            } catch (err) {
                error.value = err.message;
                return null;
            } finally {
                loading.value = false;
            }
        };

        const deleteRelacionInterna = async (unidadId, relacionId) => {
            loading.value = true;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/relaciones-internas/${relacionId}`, {
                    method: 'DELETE'
                });
                return response.ok;
            } catch {
                return false;
            } finally {
                loading.value = false;
            }
        };

        // --- CRUD: RELACIONES EXTERNAS ---
        const getRelacionesExternas = async (unidadId) => {
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/relaciones-externas`);
                if (!response.ok) return [];
                const data = await response.json();
                return data.data || [];
            } catch {
                return [];
            }
        };

        const createRelacionExterna = async (unidadId, { descripcion }) => {
            loading.value = true;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/relaciones-externas`, {
                    method: 'POST',
                    body: JSON.stringify({ descripcion })
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                const data = await response.json();
                return data.data;
            } catch (err) {
                error.value = err.message;
                return null;
            } finally {
                loading.value = false;
            }
        };

        const updateRelacionExterna = async (unidadId, relacionId, { descripcion }) => {
            loading.value = true;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/relaciones-externas/${relacionId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ descripcion })
                });
                if (!response.ok) throw new Error(await parseApiError(response));
                const data = await response.json();
                return data.data;
            } catch (err) {
                error.value = err.message;
                return null;
            } finally {
                loading.value = false;
            }
        };

        const deleteRelacionExterna = async (unidadId, relacionId) => {
            loading.value = true;
            try {
                const response = await apiFetch(`${API_URL}/${unidadId}/relaciones-externas/${relacionId}`, {
                    method: 'DELETE'
                });
                return response.ok;
            } catch {
                return false;
            } finally {
                loading.value = false;
            }
        };

        // --- DASHBOARD & JERARQUÍA OPTIMIZADOS (BACKEND AGGREGATIONS) ---
        const getDashboardStats = async (filters = {}) => {
            loading.value = true;
            try {
                const params = new URLSearchParams();
                if (filters.clase) params.append('clase', filters.clase);
                if (filters.nivel) params.append('nivel', filters.nivel);
                if (filters.tipo) params.append('tipo', filters.tipo);
                if (filters.relacion) params.append('relacion', filters.relacion);

                const queryString = params.toString();
                const url = queryString
                    ? `${ENDPOINTS.MOF.DASHBOARD_STATS}?${queryString}`
                    : ENDPOINTS.MOF.DASHBOARD_STATS;
                const response = await apiFetch(url);
                if (!response.ok) return null;
                const data = await response.json();
                if (data && data.data) {
                    dashboardStats.value = data.data;
                    return data.data;
                }
                return null;
            } catch {
                return null;
            } finally {
                loading.value = false;
            }
        };

        const getDescendientesStats = async (unidadId) => {
            loading.value = true;
            try {
                const url = ENDPOINTS.MOF.DESCENDIENTES_STATS(unidadId);
                const response = await apiFetch(url);
                if (!response.ok) return null;
                const data = await response.json();
                return data?.data || null;
            } catch {
                return null;
            } finally {
                loading.value = false;
            }
        };

        return {
            unidades,
            dashboardStats,
            loading,
            error,
            getFetchUnidades,
            createUnidad,
            deleteUnidad,
            updateUnidad,
            getUnidadById,
            updateNodo,
            addDependenciaFuncional,
            removeDependenciaFuncional,
            getFunciones,
            createFuncion,
            updateFuncion,
            deleteFuncion,
            subirFuncion,
            bajarFuncion,
            getPersonalUnidad,
            updatePersonalUnidad,
            deletePersonalUnidad,
            deleteCargoDeUnidad,
            getRelacionesInternas,
            createRelacionInterna,
            deleteRelacionInterna,
            getRelacionesExternas,
            createRelacionExterna,
            updateRelacionExterna,
            deleteRelacionExterna,
            getDashboardStats,
            getDescendientesStats
        };
    }
);
