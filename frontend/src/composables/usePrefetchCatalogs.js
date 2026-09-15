import { ref, computed } from "vue";
import { getActivePinia } from "pinia";
import { useAllClasesMofStore } from "@/stores/clases_mof";
import { useAllNivelesMofStore } from "@/stores/niveles_mof";
import { useAllTiposMofStore } from "@/stores/tipos_mof";
import { useAllRelacionesMofStore } from "@/stores/relaciones_mof";
import { useAllCargosMofStore } from "@/stores/cargos_mof";
import { useConfigMofStore } from "@/stores/config_mof";

/**
 * Registro a nivel de módulo para deduplicar peticiones concurrentes en vuelo.
 * Si múltiples vistas o componentes solicitan el mismo catálogo simultáneamente,
 * comparten la misma promesa sin duplicar tráfico HTTP.
 */
const inFlightRequests = new Map();

/**
 * Resetea el registro de promesas en vuelo (útil para testing o reset completo de sesión).
 */
export function resetInFlightCatalogs() {
  inFlightRequests.clear();
}

/**
 * Composable para precargar catálogos MOF de forma eficiente:
 * - Carga únicamente catálogos que estén vacíos (sin recargas innecesarias al navegar).
 * - Deduplica peticiones concurrentes en vuelo para evitar llamadas HTTP redundantes.
 * - Provee punto de extensión para MOF-023 (configuración dinámica).
 *
 * @param {Object} [customStores] Opcional: inyección de stores (para pruebas unitarias).
 */
export function usePrefetchCatalogs(customStores = {}) {
  const hasPinia = Boolean(getActivePinia());
  const clasesStore = customStores.clasesStore || (hasPinia ? useAllClasesMofStore() : {});
  const nivelesStore = customStores.nivelesStore || (hasPinia ? useAllNivelesMofStore() : {});
  const tiposStore = customStores.tiposStore || (hasPinia ? useAllTiposMofStore() : {});
  const relacionesStore = customStores.relacionesStore || (hasPinia ? useAllRelacionesMofStore() : {});
  const cargosStore = customStores.cargosStore || (hasPinia ? useAllCargosMofStore() : {});
  const configStore = customStores.configStore || (hasPinia ? useConfigMofStore() : null);

  const loading = computed(
    () =>
      Boolean(
        clasesStore.loading ||
        nivelesStore.loading ||
        tiposStore.loading ||
        relacionesStore.loading ||
        cargosStore?.loading
      )
  );

  const error = computed(
    () =>
      clasesStore.error ||
      nivelesStore.error ||
      tiposStore.error ||
      relacionesStore.error ||
      cargosStore?.error ||
      null
  );

  /**
   * Carga un catálogo específico sólo si está vacío o si force es true.
   * Si ya hay una petición en curso para la clave, reutiliza la promesa.
   */
  const fetchCatalogIfNeeded = async (key, store, fetchFnName, options = {}) => {
    const isForce = Boolean(options.force);
    const items = store[key];

    // 1. Si no es forzado y el store ya tiene elementos poblados, retornar sin llamada de red
    if (!isForce && Array.isArray(items) && items.length > 0) {
      return items;
    }

    // 2. Si ya hay una petición en vuelo para este catálogo, reutilizarla (deduplicación)
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key);
    }

    // 3. Ejecutar la llamada y registrarla en el mapa de promesas en vuelo
    const fetchFn = store[fetchFnName];
    if (typeof fetchFn !== "function") {
      return store[key] ?? [];
    }

    const promise = (async () => {
      try {
        await store[fetchFnName]();
        return store[key] ?? [];
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, promise);
    return promise;
  };

  /**
   * Precarga todos los catálogos requeridos en paralelo.
   *
   * @param {Object} [options]
   * @param {boolean} [options.force=false] Si es true, ignora el cache en memoria y recarga.
   * @param {boolean} [options.includeCargos=true] Si debe incluir el catálogo de cargos.
   * @param {string[]} [options.catalogs] Lista específica de catálogos a precargar.
   * @returns {Promise<Object>} Resumen de los catálogos precargados.
   */
  const prefetchCatalogs = async (options = {}) => {
    const includeCargos = options.includeCargos !== false;
    const requestedCatalogs = options.catalogs || [
      "clases",
      "niveles",
      "tipos",
      "relaciones",
      ...(includeCargos ? ["cargos"] : []),
    ];

    const tasks = [];

    if (requestedCatalogs.includes("clases")) {
      tasks.push(
        fetchCatalogIfNeeded("clases", clasesStore, "getFetchClases", options).then(
          (data) => ({ key: "clases", data })
        )
      );
    }
    if (requestedCatalogs.includes("niveles")) {
      tasks.push(
        fetchCatalogIfNeeded("niveles", nivelesStore, "getFetchNiveles", options).then(
          (data) => ({ key: "niveles", data })
        )
      );
    }
    if (requestedCatalogs.includes("tipos")) {
      tasks.push(
        fetchCatalogIfNeeded("tipos", tiposStore, "getFetchTipos", options).then(
          (data) => ({ key: "tipos", data })
        )
      );
    }
    if (requestedCatalogs.includes("relaciones")) {
      tasks.push(
        fetchCatalogIfNeeded(
          "relaciones",
          relacionesStore,
          "getFetchRelaciones",
          options
        ).then((data) => ({ key: "relaciones", data }))
      );
    }
    if (requestedCatalogs.includes("cargos") && cargosStore) {
      tasks.push(
        fetchCatalogIfNeeded("cargos", cargosStore, "getFetchCargos", options).then(
          (data) => ({ key: "cargos", data })
        )
      );
    }

    if (requestedCatalogs.includes("config") || options.includeConfig) {
      tasks.push(
        prefetchDynamicConfig(options).then((data) => ({ key: "config", data }))
      );
    }

    const results = await Promise.all(tasks);
    const catalogMap = {};
    for (const r of results) {
      catalogMap[r.key] = r.data;
    }
    return catalogMap;
  };

  /**
   * Precarga la configuración dinámica del MOF (defaults, paleta, reglas) desde el backend
   * con degradación segura a DEFAULT_CONFIG si falla la red.
   */
  const prefetchDynamicConfig = async (configOptions = {}) => {
    if (!configStore?.fetchConfig) return null;
    return await configStore.fetchConfig(configOptions);
  };

  return {
    prefetchCatalogs,
    prefetchDynamicConfig,
    clasesStore,
    nivelesStore,
    tiposStore,
    relacionesStore,
    cargosStore,
    configStore,
    loading,
    error,
  };
}
