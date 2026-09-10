import { defineStore } from "pinia";
import { ref } from "vue";
import { apiFetch, parseApiError } from "../config/api";

/**
 * Fábrica para generar stores de catálogos CRUD con gestión unificada de estado,
 * loading, errores y llamadas HTTP centralizadas.
 *
 * @param {Object} options
 * @param {string} options.storeId - Identificador único del store en Pinia
 * @param {string} options.endpoint - URL base del recurso en el backend
 * @param {string} options.stateKey - Nombre de la colección en el estado (p. ej. 'tipos')
 * @param {Object} options.actionNames - Mapeo de nombres de acciones públicas { fetch, create, update, delete }
 * @param {Function} [options.buildCreatePayload] - Adaptador para el cuerpo de creación
 * @param {Function} [options.buildUpdatePayload] - Adaptador para el cuerpo de actualización
 * @param {string} [options.error400Message] - Mensaje personalizado para errores HTTP 400
 * @param {Function} [options.extraActions] - Generador de acciones adicionales ({ state, loading, error, endpoint, fetchItems, executeWithLoading })
 * @returns {Function} Hook del store de Pinia (p. ej. useAllTiposMofStore)
 */
export function createCatalogStore({
  storeId,
  endpoint,
  stateKey,
  actionNames = {},
  buildCreatePayload,
  buildUpdatePayload,
  error400Message,
  extraActions,
}) {
  const fetchName = actionNames.fetch || `getFetch${capitalize(stateKey)}`;
  const createName = actionNames.create || `create${capitalize(stateKey)}`;
  const updateName = actionNames.update || `update${capitalize(stateKey)}`;
  const deleteName = actionNames.delete || `delete${capitalize(stateKey)}`;

  return defineStore(storeId, () => {
    const items = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const executeWithLoading = async (actionFn) => {
      loading.value = true;
      error.value = null;
      try {
        const result = await actionFn();
        return result !== undefined ? result : true;
      } catch (err) {
        error.value = err.message;
        return false;
      } finally {
        loading.value = false;
      }
    };

    const fetchItems = async () => {
      loading.value = true;
      error.value = null;
      try {
        const response = await apiFetch(endpoint);
        if (!response.ok) {
          throw new Error(await parseApiError(response, error400Message));
        }
        const data = await response.json();
        items.value = Array.isArray(data.data) ? data.data : (data.data || []);
      } catch (err) {
        items.value = [];
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    const createItem = async (...args) => {
      return executeWithLoading(async () => {
        const body = buildCreatePayload
          ? buildCreatePayload(...args)
          : { descripcion: args[0], activo: args[1] ?? true };

        const response = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response, error400Message));
        }

        await fetchItems();
        return true;
      });
    };

    const updateItem = async (id, ...args) => {
      return executeWithLoading(async () => {
        const body = buildUpdatePayload
          ? buildUpdatePayload(...args)
          : { descripcion: args[0], activo: args[1] ?? true };

        const response = await apiFetch(`${endpoint}/${id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response, error400Message));
        }

        await fetchItems();
        return true;
      });
    };

    const deleteItem = async (id) => {
      return executeWithLoading(async () => {
        const response = await apiFetch(`${endpoint}/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response, error400Message));
        }

        await fetchItems();
        return true;
      });
    };

    const storeState = {
      [stateKey]: items,
      loading,
      error,
      [fetchName]: fetchItems,
      [createName]: createItem,
      [updateName]: updateItem,
      [deleteName]: deleteItem,
    };

    if (typeof extraActions === "function") {
      const customs = extraActions({
        items,
        loading,
        error,
        endpoint,
        fetchItems,
        executeWithLoading,
        apiFetch,
        parseApiError,
        error400Message,
      });
      Object.assign(storeState, customs);
    }

    return storeState;
  });
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
