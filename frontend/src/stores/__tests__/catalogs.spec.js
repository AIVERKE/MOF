import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAllTiposMofStore } from "../tipos_mof";
import { useAllNivelesMofStore } from "../niveles_mof";
import { useAllRelacionesMofStore } from "../relaciones_mof";
import { useAllClasesMofStore } from "../clases_mof";
import { useAllCargosMofStore } from "../cargos_mof";

describe("Catálogos migrados con fábrica createCatalogStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("tipos_mof: expone la interfaz y métodos esperados", () => {
    const store = useAllTiposMofStore();
    expect(store.tipos).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(typeof store.getFetchTipos).toBe("function");
    expect(typeof store.createTipo).toBe("function");
    expect(typeof store.updateTipo).toBe("function");
    expect(typeof store.deleteTipo).toBe("function");
  });

  it("niveles_mof: expone la interfaz y métodos esperados", () => {
    const store = useAllNivelesMofStore();
    expect(store.niveles).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(typeof store.getFetchNiveles).toBe("function");
    expect(typeof store.createNivel).toBe("function");
    expect(typeof store.updateNivel).toBe("function");
    expect(typeof store.deleteNivel).toBe("function");
  });

  it("relaciones_mof: expone la interfaz y métodos esperados", () => {
    const store = useAllRelacionesMofStore();
    expect(store.relaciones).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(typeof store.getFetchRelaciones).toBe("function");
    expect(typeof store.createRelacion).toBe("function");
    expect(typeof store.updateRelacion).toBe("function");
    expect(typeof store.deleteRelacion).toBe("function");
  });

  it("clases_mof: expone métodos estándar y acciones especiales subirClase/bajarClase", async () => {
    const mockFetch = vi.fn().mockImplementation((url, opts = {}) => {
      if (url.includes("/subir") || url.includes("/bajar")) {
        return Promise.resolve(new Response(JSON.stringify({ status: true }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ status: true, data: [] }), { status: 200 }));
    });
    globalThis.fetch = mockFetch;

    const store = useAllClasesMofStore();
    expect(store.clases).toEqual([]);
    expect(typeof store.getFetchClases).toBe("function");
    expect(typeof store.createClase).toBe("function");
    expect(typeof store.updateClase).toBe("function");
    expect(typeof store.deleteClase).toBe("function");
    expect(typeof store.subirClase).toBe("function");
    expect(typeof store.bajarClase).toBe("function");

    const subirOk = await store.subirClase(1);
    expect(subirOk).toBe(true);

    const bajarOk = await store.bajarClase(1);
    expect(bajarOk).toBe(true);
  });

  it("cargos_mof: expone métodos estándar y acción especial setParentCargo", async () => {
    const mockFetch = vi.fn().mockImplementation((url, opts = {}) => {
      if (url.includes("/setparent")) {
        return Promise.resolve(new Response(JSON.stringify({ status: true }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ status: true, data: [] }), { status: 200 }));
    });
    globalThis.fetch = mockFetch;

    const store = useAllCargosMofStore();
    expect(store.cargos).toEqual([]);
    expect(typeof store.getFetchCargos).toBe("function");
    expect(typeof store.createCargo).toBe("function");
    expect(typeof store.updateCargo).toBe("function");
    expect(typeof store.deleteCargo).toBe("function");
    expect(typeof store.setParentCargo).toBe("function");

    const setParentOk = await store.setParentCargo(2, 1, "Reestructuración");
    expect(setParentOk).toBe(true);
  });
});
