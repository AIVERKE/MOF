import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useUnidadActions } from "../useUnidadActions";

describe("useUnidadActions", () => {
  let unidadesStore;
  let saveUnidad;
  let onRefresh;
  let addDialog;
  let deleteDialog;
  let selectedNode;

  beforeEach(() => {
    addDialog = ref(true);
    deleteDialog = ref(true);
    selectedNode = ref({ id: 10, nombre: "Nodo a Borrar" });
    onRefresh = vi.fn();
    saveUnidad = vi.fn().mockResolvedValue({ success: true });
    unidadesStore = {
      unidades: [
        { id: 10, nombre: "Nodo 10", parent: null },
        { id: 20, nombre: "Nodo 20", parent: 10 },
      ],
      deletePersonalUnidad: vi.fn().mockResolvedValue(true),
      deleteUnidad: vi.fn().mockResolvedValue(true),
      getFetchUnidades: vi.fn().mockResolvedValue([]),
      error: null,
    };
  });

  it("confirmAddItem: guarda exitosamente, cierra diálogo y ejecuta onRefresh", async () => {
    const actions = useUnidadActions({
      unidadesStore,
      saveUnidad,
      onRefresh,
      addDialog,
      deleteDialog,
      selectedNode,
    });

    const res = await actions.confirmAddItem();
    expect(res.success).toBe(true);
    expect(addDialog.value).toBe(false);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("confirmAddItem: si falla no cierra addDialog", async () => {
    saveUnidad.mockResolvedValue({ success: false, error: "Faltan campos obligatorios" });

    const actions = useUnidadActions({
      unidadesStore,
      saveUnidad,
      onRefresh,
      addDialog,
      deleteDialog,
      selectedNode,
    });

    const res = await actions.confirmAddItem();
    expect(res.success).toBe(false);
    expect(addDialog.value).toBe(true);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("confirmDelete: previene la eliminación si tiene dependientes", async () => {
    const actions = useUnidadActions({
      unidadesStore,
      saveUnidad,
      onRefresh,
      addDialog,
      deleteDialog,
      selectedNode, // id: 10 tiene como hijo a id: 20
    });

    await actions.confirmDelete();
    expect(unidadesStore.deleteUnidad).not.toHaveBeenCalled();
    expect(deleteDialog.value).toBe(false);
  });

  it("confirmDelete: elimina exitosamente si no tiene dependientes", async () => {
    selectedNode.value = { id: 20, nombre: "Nodo Hoja" }; // id: 20 no tiene hijos

    const actions = useUnidadActions({
      unidadesStore,
      saveUnidad,
      onRefresh,
      addDialog,
      deleteDialog,
      selectedNode,
    });

    await actions.confirmDelete();
    expect(unidadesStore.deletePersonalUnidad).toHaveBeenCalledWith(20);
    expect(unidadesStore.deleteUnidad).toHaveBeenCalledWith(20);
    expect(deleteDialog.value).toBe(false);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
