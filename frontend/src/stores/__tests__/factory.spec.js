import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { createCatalogStore } from "../factory";

describe("stores/factory.js - createCatalogStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("debe crear un store con las propiedades y acciones especificadas", async () => {
    const mockData = [
      { id: 1, descripcion: "Tipo A", activo: true },
      { id: 2, descripcion: "Tipo B", activo: false },
    ];

    const mockFetch = vi.fn().mockImplementation((url, options = {}) => {
      const method = options.method || "GET";
      if (method === "GET") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: true, data: mockData }), { status: 200 })
        );
      }
      if (method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: true, message: "Creado" }), { status: 201 })
        );
      }
      if (method === "PUT") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: true, message: "Actualizado" }), { status: 200 })
        );
      }
      if (method === "DELETE") {
        return Promise.resolve(
          new Response(JSON.stringify({ status: true, message: "Eliminado" }), { status: 200 })
        );
      }
      return Promise.reject(new Error("Unknown method"));
    });

    globalThis.fetch = mockFetch;

    const useMockStore = createCatalogStore({
      storeId: "test_catalog",
      endpoint: "http://localhost:3000/api/v1/test",
      stateKey: "items",
      actionNames: {
        fetch: "getFetchItems",
        create: "createItem",
        update: "updateItem",
        delete: "deleteItem",
      },
    });

    const store = useMockStore();

    expect(store.items).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();

    // Test GET
    await store.getFetchItems();
    expect(store.items).toEqual(mockData);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();

    // Test CREATE
    const created = await store.createItem("Nuevo Item", true);
    expect(created).toBe(true);

    // Test UPDATE
    const updated = await store.updateItem(1, "Item Actualizado", true);
    expect(updated).toBe(true);

    // Test DELETE
    const deleted = await store.deleteItem(1);
    expect(deleted).toBe(true);
  });

  it("debe capturar errores en operaciones y retornar false", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: false,
          message: "No se puede eliminar porque tiene referencias",
        }),
        { status: 400 }
      )
    );

    globalThis.fetch = mockFetch;

    const useMockStore = createCatalogStore({
      storeId: "test_error_catalog",
      endpoint: "http://localhost:3000/api/v1/test",
      stateKey: "items",
      actionNames: {
        fetch: "getFetchItems",
        delete: "deleteItem",
      },
    });

    const store = useMockStore();

    const result = await store.deleteItem(5);
    expect(result).toBe(false);
    expect(store.error).toBe("No se puede eliminar porque tiene referencias");
    expect(store.loading).toBe(false);
  });

  it("debe permitir integrar acciones adicionales (extraActions)", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: [] }), { status: 200 })
    );
    globalThis.fetch = mockFetch;

    const useMockStore = createCatalogStore({
      storeId: "test_extra_actions",
      endpoint: "http://localhost:3000/api/v1/test",
      stateKey: "items",
      actionNames: {
        fetch: "getFetchItems",
      },
      extraActions: ({ endpoint, fetchItems, executeWithLoading, apiFetch }) => ({
        customAction: (id) =>
          executeWithLoading(async () => {
            await apiFetch(`${endpoint}/${id}/custom`, { method: "PUT" });
            await fetchItems();
            return true;
          }),
      }),
    });

    const store = useMockStore();
    expect(typeof store.customAction).toBe("function");

    const result = await store.customAction(10);
    expect(result).toBe(true);
  });
});
