import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUnidadForm } from "@/composables/useUnidadForm";

function buildStores(personal) {
  const unidadesStore = {
    unidades: [{ id: 5, nombre: "Unidad" }],
    error: null,
    getFetchUnidades: vi.fn(),
    getUnidadById: vi.fn().mockResolvedValue({ id: 5, nombre: "Unidad" }),
    getPersonalUnidad: vi.fn().mockResolvedValue(personal),
    getFunciones: vi.fn().mockResolvedValue([]),
    updateUnidad: vi.fn().mockResolvedValue(true),
    updatePersonalUnidad: vi.fn().mockResolvedValue(true),
    updateNivelCargoUnidad: vi.fn().mockResolvedValue(true),
    deleteCargoDeUnidad: vi.fn().mockResolvedValue(true),
    deleteFuncion: vi.fn(),
    createFuncion: vi.fn(),
    updateFuncion: vi.fn(),
  };
  const catalog = (key, items) => ({ [key]: items, [`getFetch${key[0].toUpperCase()}${key.slice(1)}`]: vi.fn() });
  return {
    unidadesStore,
    cargosStore: catalog("cargos", [
      { id: 10, nombre: "PORTERO I", nivelOrden: 10 },
      { id: 11, nombre: "PORTERO I", nivelOrden: 12 },
      { id: 20, nombre: "DECANO/A", nivelOrden: 22 },
    ]),
    clasesStore: catalog("clases", [{ id: 1, descripcion: "Facultad" }]),
    nivelesStore: catalog("niveles", [{ id: 1 }]),
    tiposStore: catalog("tipos", [{ id: 1 }]),
    relacionesStore: catalog("relaciones", [{ id: 1 }]),
    configStore: { defaults: {}, fetchConfig: vi.fn() },
  };
}

describe("useUnidadForm - sincronización de cargos", () => {
  let stores;

  beforeEach(() => {
    stores = buildStores([
      { id: 1, cargoId: 10, nombre: "PORTERO I", nivelOrden: 10 },
      { id: 2, cargoId: 11, nombre: "PORTERO I", nivelOrden: 12 },
    ]);
  });

  it("guardar sin cambios no crea ni borra asignaciones", async () => {
    const form = useUnidadForm(stores);
    await form.openForm({ id: 5 }, true);

    await form.saveUnidad();
    await form.saveUnidad();

    expect(stores.unidadesStore.updatePersonalUnidad).not.toHaveBeenCalled();
    expect(stores.unidadesStore.deleteCargoDeUnidad).not.toHaveBeenCalled();
    expect(stores.unidadesStore.updateNivelCargoUnidad).not.toHaveBeenCalled();
  });

  it("ignora un segundo guardado mientras el primero sigue en curso", async () => {
    const form = useUnidadForm(stores);
    await form.openForm({ id: 5 }, true);
    form.formData.value.cargos = [
      ...form.formData.value.cargos,
      { assignmentId: null, cargoId: "20", nombre: "DECANO/A", nivelOrden: 22 },
    ];

    const [first, second] = await Promise.all([form.saveUnidad(), form.saveUnidad()]);

    expect(first.success).toBe(true);
    expect(second.busy).toBe(true);
    expect(stores.unidadesStore.updatePersonalUnidad).toHaveBeenCalledTimes(1);
  });

  it("agrega, quita y actualiza nivel por cargoId", async () => {
    const form = useUnidadForm(stores);
    await form.openForm({ id: 5 }, true);

    form.formData.value.cargos = [
      { ...form.formData.value.cargos[0], nivelOrden: 14 },
      { assignmentId: null, cargoId: "20", nombre: "DECANO/A", nivelOrden: 22 },
    ];

    const result = await form.saveUnidad();

    expect(result.success).toBe(true);
    expect(stores.unidadesStore.deleteCargoDeUnidad).toHaveBeenCalledWith(5, "2");
    expect(stores.unidadesStore.updatePersonalUnidad).toHaveBeenCalledWith(5, "20", 22);
    expect(stores.unidadesStore.updateNivelCargoUnidad).toHaveBeenCalledWith(5, "1", 14);
  });
});
