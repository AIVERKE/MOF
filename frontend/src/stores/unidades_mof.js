import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "./auth";
import { ENDPOINTS } from "../config/api";

export const useAllUnidadesMofStore = defineStore(
    "unidades_mof",
    () => {
        const unidades = ref([]);
        const dashboardStats = ref(null);
        const loading = ref(false);
        const error = ref(null);
        const authStore = useAuthStore();

        const API_URL = ENDPOINTS.MOF.UNIDADES;

        const getHeaders = () => {
            const headers = {
                'Content-Type': 'application/json',
            };
            if (authStore.token) {
                headers['Authorization'] = `Bearer ${authStore.token}`;
            }
            return headers;
        };

        const extractError = (dataResponse, status) => {
            if (!dataResponse) return `Error en la solicitud (Código: ${status})`;
            
            // Prioridad 1: data.mensaje (Formato estándar del API de UMSA-CORE para errores de lógica)
            if (dataResponse.data && dataResponse.data.mensaje) return dataResponse.data.mensaje;
            
            // Prioridad 2: Otros formatos posibles
            if (dataResponse.mensaje) return dataResponse.mensaje;
            if (dataResponse.message && dataResponse.message !== 'Hay errores en la solicitud') return dataResponse.message;
            if (dataResponse.error && typeof dataResponse.error === 'string') return dataResponse.error;
            if (dataResponse.errors) return Object.values(dataResponse.errors).flat().join(', ');
            if (dataResponse.message) return dataResponse.message;
            if (dataResponse.data && typeof dataResponse.data === 'string') return dataResponse.data;
            
            return `Error en la solicitud (Código: ${status})`;
        };

        const getFetchUnidades = async () => {
            loading.value = true;
            error.value = null;
            try {
                // Añadimos un timestamp para evitar caché
                const response = await fetch(`${API_URL}?t=${Date.now()}`, { headers: getHeaders() });
                if (!response) {
                    throw new Error('Error en el Servidor. Comuniquese con el administrador del sistema');
                }
                let data = null;
                try {
                    data = await response.json();
                } catch {
                    data = null;
                }
                if (!response.ok) {
                    throw new Error(extractError(data, response.status));
                }
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
                const endpoint = API_URL;
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(dataForm)
                });

                let dataResponse;
                try {
                    dataResponse = await response.json();
                } catch (e) {
                    if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
                    throw new Error('Error al procesar la respuesta del servidor');
                }

                // --- MANEJO DE INCONSISTENCIA DEL BACKEND ---
                // Si el backend devuelve status:true pero data.status:false, es un ERROR de lógica
                if (dataResponse.data && dataResponse.data.status === false) {
                    throw new Error(dataResponse.data.mensaje || 'Error de lógica en el servidor');
                }

                if (!response.ok) {
                    throw new Error(extractError(dataResponse, response.status));
                }

                await getFetchUnidades();
                return dataResponse.data;
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
                const response = await fetch(endpoint, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(dataForm)
                });

                let dataResponse;
                try {
                    dataResponse = await response.json();
                } catch (e) {
                    if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
                    throw new Error('Error al procesar la respuesta del servidor');
                }

                // --- MANEJO DE INCONSISTENCIA DEL BACKEND ---
                if (dataResponse.data && dataResponse.data.status === false) {
                    throw new Error(dataResponse.data.mensaje || 'Error de lógica en el servidor');
                }

                if (!response.ok) {
                    throw new Error(extractError(dataResponse, response.status));
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
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });

                let dataResponse;
                try {
                    dataResponse = await response.json();
                } catch (e) {
                    if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
                    throw new Error('Error al procesar la respuesta del servidor');
                }

                // --- MANEJO DE INCONSISTENCIA DEL BACKEND ---
                if (dataResponse.data && dataResponse.data.status === false) {
                    throw new Error(dataResponse.data.mensaje || 'Error de lógica en el servidor');
                }

                if (!response.ok) {
                    throw new Error(extractError(dataResponse, response.status));
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
                const response = await fetch(endpoint, { headers: getHeaders() });
                if (!response.ok) throw new Error('Error al obtener la unidad');
                const data = await response.json();
                return data.data;
            } catch (err) {
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
                const response = await fetch(`${API_URL}/${unidadId}/funciones`, { headers: getHeaders() });
                if (!response.ok) throw new Error('Error al obtener funciones');
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
                const response = await fetch(`${API_URL}/${unidadId}/funciones`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ funcion, baseLegal })
                });
                if (!response.ok) throw new Error('Error al crear función');
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
                const response = await fetch(`${API_URL}/${unidadId}/funciones/${funcionId}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ funcion, baseLegal })
                });
                if (!response.ok) throw new Error('Error al actualizar función');
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
                const response = await fetch(`${API_URL}/${unidadId}/funciones/${funcionId}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!response.ok) throw new Error('Error al eliminar función');
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
                const response = await fetch(`${API_URL}/${unidadId}/funciones/${funcionId}/subir`, {
                    method: 'PUT',
                    headers: getHeaders()
                });
                if (!response.ok) throw new Error('Error al subir función');
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
                const response = await fetch(`${API_URL}/${unidadId}/funciones/${funcionId}/bajar`, {
                    method: 'PUT',
                    headers: getHeaders()
                });
                if (!response.ok) throw new Error('Error al bajar función');
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
                const response = await fetch(`${API_URL}/${id}/setparent`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(dataForm)
                });

                if (!response.ok) throw new Error('Error al actualizar');
                await getFetchUnidades();
            } catch (err) {
                error.value = 'Error al actualizar';
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
                const payload = { dependenciaId: dependenciaId };
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error('Error al agregar dependencia');
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
                const response = await fetch(endpoint, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                if (!response.ok) throw new Error('Error al remover dependencia');
                return response.ok;
            } catch (err) {
                error.value = err.message;
                return false;
            } finally {
                loading.value = false;
            }
        };

        const API_PERSONAL_URL = ENDPOINTS.UNIDADES.PERSONAL;

        const getPersonalUnidad = async (unidadId) => {
            try {
                const response = await fetch(`${API_PERSONAL_URL}/${unidadId}/personal`, { headers: getHeaders() });
                if (!response.ok) return null;
                const data = await response.json();
                return data.data; 
            } catch (err) { return null; }
        };

        const updatePersonalUnidad = async (unidadId, cargoId) => {
            loading.value = true;
            try {
                const response = await fetch(`${API_PERSONAL_URL}/${unidadId}/personal`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ cargoId: cargoId })
                });
                return response.ok;
            } catch (err) { return false; }
            finally { loading.value = false; }
        };

        const deletePersonalUnidad = async (unidadId) => {
            loading.value = true;
            try {
                const personal = await getPersonalUnidad(unidadId);
                if (!personal || !Array.isArray(personal)) return true;
                for (const p of personal) {
                    if (p.id) {
                        await fetch(`${API_PERSONAL_URL}/${unidadId}/personal/${p.id}`, {
                            method: 'DELETE',
                            headers: getHeaders()
                        });
                    }
                }
                return true;
            } catch (err) { return false; }
            finally { loading.value = false; }
        };

        const deleteCargoDeUnidad = async (unidadId, assignmentId) => {
            loading.value = true;
            try {
                const response = await fetch(`${API_PERSONAL_URL}/${unidadId}/personal/${assignmentId}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                return response.ok;
            } catch (err) { return false; }
            finally { loading.value = false; }
        };

        // --- CRUD: RELACIONES INTERNAS ---
        const getRelacionesInternas = async (unidadId) => {
            try {
                const response = await fetch(`${API_URL}/${unidadId}/relaciones-internas`, { headers: getHeaders() });
                if (!response.ok) return [];
                const data = await response.json();
                return data.data || [];
            } catch (err) { return []; }
        };

        const createRelacionInterna = async (unidadId, { relacionadaId, tipo }) => {
            loading.value = true;
            try {
                const response = await fetch(`${API_URL}/${unidadId}/relaciones-internas`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ relacionadaId: Number(relacionadaId), tipo })
                });
                if (!response.ok) throw new Error('Error al agregar relación interna');
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
                const response = await fetch(`${API_URL}/${unidadId}/relaciones-internas/${relacionId}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                return response.ok;
            } catch (err) { return false; }
            finally { loading.value = false; }
        };

        // --- CRUD: RELACIONES EXTERNAS ---
        const getRelacionesExternas = async (unidadId) => {
            try {
                const response = await fetch(`${API_URL}/${unidadId}/relaciones-externas`, { headers: getHeaders() });
                if (!response.ok) return [];
                const data = await response.json();
                return data.data || [];
            } catch (err) { return []; }
        };

        const createRelacionExterna = async (unidadId, { descripcion }) => {
            loading.value = true;
            try {
                const response = await fetch(`${API_URL}/${unidadId}/relaciones-externas`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ descripcion })
                });
                if (!response.ok) throw new Error('Error al registrar relación externa');
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
                const response = await fetch(`${API_URL}/${unidadId}/relaciones-externas/${relacionId}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ descripcion })
                });
                if (!response.ok) throw new Error('Error al actualizar relación externa');
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
                const response = await fetch(`${API_URL}/${unidadId}/relaciones-externas/${relacionId}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                return response.ok;
            } catch (err) { return false; }
            finally { loading.value = false; }
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
                params.append('t', Date.now());

                const url = `${ENDPOINTS.MOF.DASHBOARD_STATS}?${params.toString()}`;
                const response = await fetch(url, { headers: getHeaders() });
                if (!response.ok) return null;
                const data = await response.json();
                if (data && data.data) {
                    dashboardStats.value = data.data;
                    return data.data;
                }
                return null;
            } catch (err) {
                return null;
            } finally {
                loading.value = false;
            }
        };

        const getDescendientesStats = async (unidadId) => {
            loading.value = true;
            try {
                const url = `${ENDPOINTS.MOF.DESCENDIENTES_STATS(unidadId)}?t=${Date.now()}`;
                const response = await fetch(url, { headers: getHeaders() });
                if (!response.ok) return null;
                const data = await response.json();
                return data?.data || null;
            } catch (err) {
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
        }
    }
)
