import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAllUnidadesMofStore, resetInFlightUnidades } from "../unidades_mof";

describe("unidades_mof store (MOF-044 caching and deduplication)", () => {
  let originalFetch;

  beforeEach(() => {
    setActivePinia(createPinia());
    resetInFlightUnidades();
    originalFetch = globalThis.fetch;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetInFlightUnidades();
  });

  it("getFetchUnidades: carga unidades cuando el store está vacío (1 HTTP request)", async () => {
    const mockData = [
      { id: 1, nombre: "Rectorado", parent: null },
      { id: 2, nombre: "Decanato", parent: 1 },
    ];
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: mockData }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    globalThis.fetch = mockFetch;

    const store = useAllUnidadesMofStore();
    expect(store.unidades).toEqual([]);

    const result = await store.getFetchUnidades();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(store.unidades).toEqual(mockData);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("getFetchUnidades: omite petición HTTP si las unidades ya están cacheadas en memoria (0 HTTP requests adicionales)", async () => {
    const mockData = [{ id: 1, nombre: "Rectorado" }];
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: mockData }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    globalThis.fetch = mockFetch;

    const store = useAllUnidadesMofStore();

    // Primera llamada: llena la cache (1 llamada)
    await store.getFetchUnidades();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Segunda y tercera llamada (simulando navegación entre Organigrama, Árbol y Dashboard)
    const result2 = await store.getFetchUnidades();
    const result3 = await store.getFetchUnidades();

    expect(mockFetch).toHaveBeenCalledTimes(1); // Cero peticiones adicionales
    expect(result2).toEqual(mockData);
    expect(result3).toEqual(mockData);
  });

  it("getFetchUnidades: fuerza la recarga con { force: true } aun cuando ya hay datos cargados", async () => {
    const initialData = [{ id: 1, nombre: "Rectorado" }];
    const updatedData = [
      { id: 1, nombre: "Rectorado" },
      { id: 2, nombre: "Nueva Unidad" },
    ];

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      const data = callCount === 1 ? initialData : updatedData;
      return Promise.resolve(
        new Response(JSON.stringify({ status: true, data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });
    globalThis.fetch = mockFetch;

    const store = useAllUnidadesMofStore();
    await store.getFetchUnidades();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(store.unidades).toHaveLength(1);

    // Llamada con force: true debe ejecutar HTTP de nuevo
    const resultForce = await store.getFetchUnidades({ force: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(resultForce).toHaveLength(2);
    expect(store.unidades).toHaveLength(2);
  });

  it("getFetchUnidades: deduplica llamadas concurrentes en vuelo a una sola petición HTTP", async () => {
    let resolveNetwork;
    const networkPromise = new Promise((res) => {
      resolveNetwork = res;
    });

    const mockData = [{ id: 1, nombre: "Rectorado" }];
    const mockFetch = vi.fn().mockImplementation(async () => {
      await networkPromise;
      return new Response(JSON.stringify({ status: true, data: mockData }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    globalThis.fetch = mockFetch;

    const store = useAllUnidadesMofStore();

    // Lanzar llamadas concurrentes simultáneas
    const promise1 = store.getFetchUnidades();
    const promise2 = store.getFetchUnidades();
    const promise3 = store.getFetchUnidades();

    resolveNetwork();
    const [res1, res2, res3] = await Promise.all([promise1, promise2, promise3]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res1).toEqual(mockData);
    expect(res2).toEqual(mockData);
    expect(res3).toEqual(mockData);
  });

  it("createUnidad: invalida dashboardStats y refresca unidades con force: true", async () => {
    let getCallCount = 0;
    const mockFetch = vi.fn().mockImplementation((url, opts = {}) => {
      const method = opts.method || "GET";
      if (method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: true, data: { id: 3, nombre: "Secretaría" } }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      getCallCount++;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: true,
            data: [{ id: 1, nombre: "Rectorado" }, { id: 3, nombre: "Secretaría" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    });
    globalThis.fetch = mockFetch;

    const store = useAllUnidadesMofStore();
    store.unidades = [{ id: 1, nombre: "Rectorado" }];
    store.dashboardStats = { resumen: { total: 1 } };

    await store.createUnidad({ nombre: "Secretaría" });

    // dashboardStats debe haber sido invalidado a null
    expect(store.dashboardStats).toBeNull();
    // getFetchUnidades debió haberse ejecutado con force: true recargando las unidades
    expect(getCallCount).toBe(1);
    expect(store.unidades).toHaveLength(2);
  });

  it("updateUnidad: invalida dashboardStats y refresca unidades con force: true", async () => {
    let getCallCount = 0;
    const mockFetch = vi.fn().mockImplementation((url, opts = {}) => {
      const method = opts.method || "GET";
      if (method === "PUT") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: true, data: { id: 1, nombre: "Rectorado Actualizado" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      getCallCount++;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: true,
            data: [{ id: 1, nombre: "Rectorado Actualizado" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    });
    globalThis.fetch = mockFetch;

    const store = useAllUnidadesMofStore();
    store.unidades = [{ id: 1, nombre: "Rectorado" }];
    store.dashboardStats = { resumen: { total: 1 } };

    await store.updateUnidad(1, { nombre: "Rectorado Actualizado" });

    expect(store.dashboardStats).toBeNull();
    expect(getCallCount).toBe(1);
    expect(store.unidades[0].nombre).toBe("Rectorado Actualizado");
  });

  it("deleteUnidad: invalida dashboardStats y refresca unidades con force: true", async () => {
    let getCallCount = 0;
    const mockFetch = vi.fn().mockImplementation((url, opts = {}) => {
      const method = opts.method || "GET";
      if (method === "DELETE") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: true, data: { id: 1 } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      getCallCount++;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: true,
            data: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    });
    globalThis.fetch = mockFetch;

    const store = useAllUnidadesMofStore();
    store.unidades = [{ id: 1, nombre: "Rectorado" }];
    store.dashboardStats = { resumen: { total: 1 } };

    await store.deleteUnidad(1);

    expect(store.dashboardStats).toBeNull();
    expect(getCallCount).toBe(1);
    expect(store.unidades).toHaveLength(0);
  });

  it("updateNodo: invalida dashboardStats y refresca unidades con force: true", async () => {
    let getCallCount = 0;
    const mockFetch = vi.fn().mockImplementation((url, opts = {}) => {
      const method = opts.method || "GET";
      if (method === "PUT") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: true, data: { id: 2, parentId: 1 } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      getCallCount++;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: true,
            data: [
              { id: 1, nombre: "Rectorado", parent: null },
              { id: 2, nombre: "Decanato", parent: 1 },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    });
    globalThis.fetch = mockFetch;

    const store = useAllUnidadesMofStore();
    store.unidades = [{ id: 1, nombre: "Rectorado", parent: null }, { id: 2, nombre: "Decanato", parent: null }];
    store.dashboardStats = { resumen: { total: 2 } };

    await store.updateNodo(2, { parentId: 1, razon: "Cambio de jerarquía" });

    expect(store.dashboardStats).toBeNull();
    expect(getCallCount).toBe(1);
  });
});
