import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  usePrefetchCatalogs,
  resetInFlightCatalogs,
} from "../usePrefetchCatalogs";

describe("usePrefetchCatalogs", () => {
  beforeEach(() => {
    resetInFlightCatalogs();
  });

  const createMockStores = (overrides = {}) => {
    return {
      clasesStore: {
        clases: overrides.clases ?? [],
        loading: false,
        error: null,
        getFetchClases: vi.fn().mockImplementation(async function () {
          this.clases = [{ id: 1, descripcion: "DIRECCIÓN" }];
        }),
        ...overrides.clasesStore,
      },
      nivelesStore: {
        niveles: overrides.niveles ?? [],
        loading: false,
        error: null,
        getFetchNiveles: vi.fn().mockImplementation(async function () {
          this.niveles = [{ id: 1, descripcion: "Nivel 1" }];
        }),
        ...overrides.nivelesStore,
      },
      tiposStore: {
        tipos: overrides.tipos ?? [],
        loading: false,
        error: null,
        getFetchTipos: vi.fn().mockImplementation(async function () {
          this.tipos = [{ id: 1, descripcion: "Tipo A" }];
        }),
        ...overrides.tiposStore,
      },
      relacionesStore: {
        relaciones: overrides.relaciones ?? [],
        loading: false,
        error: null,
        getFetchRelaciones: vi.fn().mockImplementation(async function () {
          this.relaciones = [{ id: 1, descripcion: "Lineal" }];
        }),
        ...overrides.relacionesStore,
      },
      cargosStore: {
        cargos: overrides.cargos ?? [],
        loading: false,
        error: null,
        getFetchCargos: vi.fn().mockImplementation(async function () {
          this.cargos = [{ id: 1, nombre: "Director" }];
        }),
        ...overrides.cargosStore,
      },
    };
  };

  it("carga todos los catálogos cuando los stores están vacíos", async () => {
    const stores = createMockStores();
    const { prefetchCatalogs } = usePrefetchCatalogs(stores);

    const result = await prefetchCatalogs();

    expect(stores.clasesStore.getFetchClases).toHaveBeenCalledTimes(1);
    expect(stores.nivelesStore.getFetchNiveles).toHaveBeenCalledTimes(1);
    expect(stores.tiposStore.getFetchTipos).toHaveBeenCalledTimes(1);
    expect(stores.relacionesStore.getFetchRelaciones).toHaveBeenCalledTimes(1);
    expect(stores.cargosStore.getFetchCargos).toHaveBeenCalledTimes(1);

    expect(result.clases).toHaveLength(1);
    expect(result.niveles).toHaveLength(1);
    expect(result.tipos).toHaveLength(1);
    expect(result.relaciones).toHaveLength(1);
    expect(result.cargos).toHaveLength(1);
  });

  it("omite la llamada a red para catálogos que ya están poblados en memoria", async () => {
    const stores = createMockStores({
      clases: [{ id: 1, descripcion: "DIRECCIÓN" }],
      niveles: [{ id: 1, descripcion: "Nivel 1" }],
    });
    const { prefetchCatalogs } = usePrefetchCatalogs(stores);

    await prefetchCatalogs();

    // Ya estaban en memoria: 0 llamadas de red
    expect(stores.clasesStore.getFetchClases).not.toHaveBeenCalled();
    expect(stores.nivelesStore.getFetchNiveles).not.toHaveBeenCalled();

    // Estaban vacíos: se debieron cargar
    expect(stores.tiposStore.getFetchTipos).toHaveBeenCalledTimes(1);
    expect(stores.relacionesStore.getFetchRelaciones).toHaveBeenCalledTimes(1);
    expect(stores.cargosStore.getFetchCargos).toHaveBeenCalledTimes(1);
  });

  it("recarga catálogos poblados si se especifica { force: true }", async () => {
    const stores = createMockStores({
      clases: [{ id: 1, descripcion: "DIRECCIÓN" }],
    });
    const { prefetchCatalogs } = usePrefetchCatalogs(stores);

    await prefetchCatalogs({ force: true });

    expect(stores.clasesStore.getFetchClases).toHaveBeenCalledTimes(1);
  });

  it("deduplica peticiones concurrentes en vuelo evitando cargas duplicadas", async () => {
    let resolveClases;
    const delayedPromise = new Promise((res) => {
      resolveClases = res;
    });

    const stores = createMockStores();
    stores.clasesStore.getFetchClases = vi.fn().mockImplementation(async () => {
      await delayedPromise;
      stores.clasesStore.clases = [{ id: 1, descripcion: "DIRECCIÓN" }];
    });

    const composable1 = usePrefetchCatalogs(stores);
    const composable2 = usePrefetchCatalogs(stores);

    // Dos llamadas concurrentes al mismo tiempo
    const promise1 = composable1.prefetchCatalogs();
    const promise2 = composable2.prefetchCatalogs();

    resolveClases();
    await Promise.all([promise1, promise2]);

    // Aunque dos vistas llamaron concurrentemente, solo se disparó 1 vez por catálogo
    expect(stores.clasesStore.getFetchClases).toHaveBeenCalledTimes(1);
    expect(stores.nivelesStore.getFetchNiveles).toHaveBeenCalledTimes(1);
  });

  it("permite excluir cargos pasando { includeCargos: false }", async () => {
    const stores = createMockStores();
    const { prefetchCatalogs } = usePrefetchCatalogs(stores);

    await prefetchCatalogs({ includeCargos: false });

    expect(stores.clasesStore.getFetchClases).toHaveBeenCalledTimes(1);
    expect(stores.cargosStore.getFetchCargos).not.toHaveBeenCalled();
  });

  it("expone método prefetchDynamicConfig para integración con MOF-023", async () => {
    const stores = createMockStores();
    const { prefetchDynamicConfig } = usePrefetchCatalogs(stores);

    expect(typeof prefetchDynamicConfig).toBe("function");
    const res = await prefetchDynamicConfig();
    expect(res).toBeNull();
  });
});
